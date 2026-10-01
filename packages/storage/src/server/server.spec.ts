import { describe, it, expect } from 'vitest';
import { createStorage, StorageQuotaError, StorageUnavailableError } from '../index.js';
import { cookieStorage, requestStorage } from './index.js';

const request = (cookie: string) => new Request('http://x.test/', { headers: { cookie } });

describe('cookieStorage', () => {
  it('reads the request cookies and its own writes', () => {
    const headers = new Headers();
    const adapter = cookieStorage({ request: request('a=1; b=2'), response: headers });
    expect(adapter.get('a')).toBe('1');
    adapter.set('a', 'x');
    adapter.remove('b');
    expect(adapter.get('a')).toBe('x');
    expect(adapter.has('b')).toBe(false);
    expect(adapter.keys().sort()).toEqual(['a']);
    expect(headers.getSetCookie()).toEqual([
      'a=x; Path=/; HttpOnly; Secure; SameSite=Lax',
      'b=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax',
    ]);
  });

  it('applies the cookie flags to every write', () => {
    const headers = new Headers();
    const adapter = cookieStorage({ response: headers, path: '/app', domain: 'x.test', maxAge: 60, httpOnly: false, sameSite: 'strict' });
    adapter.set('k', 'v');
    expect(headers.get('set-cookie')).toBe('k=v; Max-Age=60; Domain=x.test; Path=/app; Secure; SameSite=Strict');
  });

  it('encodes namespaced keys into valid cookie names and back', () => {
    const headers = new Headers();
    const store = createStorage<{ theme: string }>({ adapter: cookieStorage({ response: headers }), namespace: 'ui' });
    store.set('theme', 'dark');
    expect(headers.get('set-cookie')).toMatch(/^ui%3Atheme=/);
    const next = createStorage<{ theme: string }>({
      adapter: cookieStorage({ request: request(headers.get('set-cookie')!.split(';')[0]) }),
      namespace: 'ui',
    });
    expect(next.get('theme')).toBe('dark');
  });

  it('clears only its namespace', () => {
    const headers = new Headers();
    const adapter = cookieStorage({ request: request('session=s; ui%3Atheme=t'), response: headers });
    createStorage({ adapter, namespace: 'ui' }).clear();
    expect(adapter.keys()).toEqual(['session']);
    expect(headers.getSetCookie()).toHaveLength(1);
  });

  it('makes the cookie expire with the entry', () => {
    const headers = new Headers();
    const store = createStorage<{ k: string }>({ adapter: cookieStorage({ response: headers, maxAge: 60 }), now: () => Date.UTC(2030, 0, 1) });
    store.set('k', 'v', { ttl: 3_600_000 });
    store.set('k', 'w');
    const [withTtl, without] = headers.getSetCookie();
    expect(withTtl).toContain('Expires=Tue, 01 Jan 2030 01:00:00 GMT');
    expect(withTtl).not.toContain('Max-Age');
    expect(without).toContain('Max-Age=60');
  });

  it('refuses a cookie over the size limit', () => {
    const adapter = cookieStorage({ response: new Headers(), maxSize: 16 });
    expect(() => adapter.set('k', 'x'.repeat(32))).toThrow(StorageQuotaError);
  });

  it('is read-only without a response', () => {
    const adapter = cookieStorage({ request: request('a=1') });
    expect(adapter.get('a')).toBe('1');
    expect(() => adapter.set('a', '2')).toThrow(StorageUnavailableError);
  });

  it('accepts the plain contracts', () => {
    const out: string[] = [];
    const adapter = cookieStorage({ request: { getHeader: () => 'a=1' }, response: { appendHeader: (_n, v) => out.push(v) } });
    adapter.set('b', adapter.get('a')!);
    expect(out[0]).toMatch(/^b=1;/);
  });
});

describe('request isolation', () => {
  it('keeps concurrent requests apart', async () => {
    const handle = async (user: string, delay: number) => {
      const headers = new Headers();
      const cookies = createStorage<{ user: string }>({ adapter: cookieStorage({ request: request(`seen=${user}`), response: headers }) });
      const scratch = createStorage<{ user: string }>({ adapter: requestStorage() });
      scratch.set('user', user);
      await new Promise((r) => setTimeout(r, delay));
      cookies.set('user', scratch.get('user')!);
      return { seen: cookies.keys().sort(), scratch: scratch.get('user'), header: headers.get('set-cookie') };
    };
    const [a, b] = await Promise.all([handle('ann', 20), handle('bob', 0)]);
    expect(a.scratch).toBe('ann');
    expect(b.scratch).toBe('bob');
    expect(a.header).toContain(encodeURIComponent('"ann"'));
    expect(b.header).toContain(encodeURIComponent('"bob"'));
    expect(a.seen).toEqual(['seen', 'user']);
  });

  it('gives each requestStorage its own values', () => {
    const one = requestStorage();
    one.set('k', 'v');
    expect(requestStorage().get('k')).toBeNull();
  });
});
