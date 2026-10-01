import { describe, it, expect } from 'vitest';
import { createRequestContext, runWithRequestContext, takeResponseHeaders } from '@fluixi/dom';
import { createRoot } from '@fluixi/reactive/signal';
import { createStorage, memoryStorage, StorageUnavailableError } from '@fluixi/storage';
import { StorageProvider, hydrateStorage, useAsyncStorage, useStorage } from './index.js';

const inRequest = <T>(fn: () => T, cookie = '') => {
  const request = new Request('http://x.test/', { headers: cookie ? { cookie } : {} });
  const ctx = createRequestContext({ request });
  return { result: runWithRequestContext(ctx, fn), request, ctx };
};

describe('useStorage on the server', () => {
  it('reads request cookies and sends writes as Set-Cookie', () => {
    const { result, request } = inRequest(() => {
      const prefs = useStorage<{ theme: string; lang: string }>({ scope: 'cookie', namespace: 'ui' });
      const before = prefs.get('lang');
      prefs.set('theme', 'dark');
      // A second call in the same request sees the write.
      return { before, after: useStorage<{ theme: string }>({ scope: 'cookie', namespace: 'ui' }).get('theme') };
    }, 'ui%3Alang=' + encodeURIComponent(JSON.stringify({ v: 1, value: 'fr', createdAt: 1 })));
    expect(result).toEqual({ before: 'fr', after: 'dark' });
    const cookies = takeResponseHeaders(request)!.getSetCookie();
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(/^ui%3Atheme=.*; Path=\/; Secure; SameSite=Lax$/);
  });

  it('fails loudly when the cookie can no longer reach the browser', () => {
    const request = new Request('http://x.test/');
    const ctx = createRequestContext({ request });
    takeResponseHeaders(request);
    expect(() => runWithRequestContext(ctx, () => useStorage({ scope: 'cookie' }).set('a', 1))).toThrow(StorageUnavailableError);
  });

  it('keeps request storage per request', () => {
    const one = inRequest(() => {
      useStorage({ scope: 'request' }).set('user', 'ann');
      return useStorage().get('user');
    });
    const two = inRequest(() => useStorage().get('user'));
    expect(one.result).toBe('ann');
    expect(two.result).toBeNull();
  });

  it('refuses to guess outside a request', () => {
    expect(() => useStorage()).toThrow(StorageUnavailableError);
    expect(() => useStorage({ scope: 'cookie' })).toThrow(StorageUnavailableError);
  });

  it('prefers a provided storage', () => {
    const provided = createStorage({ adapter: memoryStorage() });
    provided.set('k', 'v');
    let seen: unknown;
    createRoot((dispose) => {
      StorageProvider({
        storage: provided,
        get children() {
          seen = useStorage().get('k');
          return null;
        },
      });
      dispose();
    });
    expect(seen).toBe('v');
  });

  it('puts hydrated keys in the page data', () => {
    const { ctx } = inRequest(() => {
      const scratch = useStorage<{ a: number; b: number }>({ scope: 'request', namespace: 'ed' });
      scratch.set('a', 1, { ttl: 1000 });
      scratch.set('b', 2);
      hydrateStorage(scratch, ['a']);
    });
    const slot = ctx.data.get('__storage:ed:') as Record<string, { value: unknown; expiresAt?: number }>;
    expect(Object.keys(slot)).toEqual(['a']);
    expect(slot.a).toMatchObject({ value: 1 });
    expect(slot.a.expiresAt).toBeTypeOf('number');
  });
});

describe('useAsyncStorage', () => {
  it('encrypts per item in a request cookie and reads it back', async () => {
    const { generateEncryptionKey, staticKeyProvider } = await import('@fluixi/storage');
    const keyProvider = staticKeyProvider(generateEncryptionKey());
    const request = new Request('http://x.test/');
    const ctx = createRequestContext({ request });
    await runWithRequestContext(ctx, async () => {
      const vault = useAsyncStorage<{ token: string }>({ scope: 'cookie', namespace: 'auth', encryption: { keyProvider } });
      await vault.set('token', 'secret', { encrypt: true });
      expect(await vault.get('token')).toBe('secret');
    });
    const [cookie] = takeResponseHeaders(request)!.getSetCookie();
    expect(cookie).toMatch(/^auth%3Atoken=/);
    expect(cookie).not.toContain('secret');
  });

  it('takes an async storage from the provider, and useStorage ignores it', () => {
    const provided = createStorage({ encryption: { keyProvider: { getKey: () => Promise.reject(new Error('unused')) } } });
    let asyncSeen: unknown;
    let syncThrew = false;
    createRoot((dispose) => {
      StorageProvider({
        storage: provided,
        get children() {
          asyncSeen = useAsyncStorage();
          try {
            useStorage();
          } catch {
            syncThrew = true;
          }
          return null;
        },
      });
      dispose();
    });
    expect(asyncSeen).toBe(provided);
    expect(syncThrew).toBe(true);
  });
});
