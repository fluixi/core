import { describe, it, expect, expectTypeOf } from 'vitest';
import { createRequestContext, runWithRequestContext } from '@fluixi/dom';
import { createEffect, createRoot } from '@fluixi/reactive/signal';
import { createAsyncStorage, createStorage, memoryStorage, StorageEncryptionKeyError } from '@fluixi/storage';
import { persisted, useStorage } from './index.js';

type Prefs = { theme: 'light' | 'dark'; count: number };

describe('persisted', () => {
  it('starts from the stored value and writes through', () => {
    const adapter = memoryStorage();
    const storage = createStorage<Prefs>({ adapter, namespace: 'ui' });
    storage.set('theme', 'dark');
    const theme = persisted(storage, 'theme', { fallback: 'light' });
    expect(theme()).toBe('dark');
    theme.set((t) => (t === 'dark' ? 'light' : 'dark'));
    expect(theme()).toBe('light');
    expect(createStorage<Prefs>({ adapter, namespace: 'ui' }).get('theme')).toBe('light');
    theme.remove();
    expect(theme()).toBe('light');
    expect(storage.has('theme')).toBe(false);
  });

  it('follows writes made through another storage over the same adapter, and is reactive', () => {
    const adapter = memoryStorage();
    const seen: unknown[] = [];
    let dispose = () => {};
    createRoot((d) => {
      dispose = d;
      const count = persisted(createStorage<Prefs>({ adapter }), 'count', { fallback: 0 });
      createEffect(() => seen.push(count()));
    });
    const other = createStorage<Prefs>({ adapter });
    other.set('count', 2);
    other.remove('count');
    expect(seen).toEqual([0, 2, 0]);
    dispose();
    other.set('count', 5);
    expect(seen).toEqual([0, 2, 0]);
  });

  it('leaves the signal alone when the write fails', () => {
    const storage = createStorage<{ fn: unknown }>();
    const value = persisted(storage, 'fn');
    expect(() => value.set(() => () => 1)).toThrow();
    expect(value()).toBeNull();
  });

  it('reads the request cookie during a server render', () => {
    const cookie = 'ui%3Atheme=' + encodeURIComponent(JSON.stringify({ v: 1, value: 'dark', createdAt: 1 }));
    const ctx = createRequestContext({ request: new Request('http://x.test/', { headers: { cookie } }) });
    const theme = runWithRequestContext(ctx, () =>
      persisted(useStorage<Prefs>({ scope: 'cookie', namespace: 'ui' }), 'theme', { fallback: 'light' })(),
    );
    expect(theme).toBe('dark');
  });

  it('types the value as non-null with a fallback', () => {
    const storage = createStorage<Prefs>();
    expectTypeOf(persisted(storage, 'theme', { fallback: 'light' })()).toEqualTypeOf<'light' | 'dark'>();
    expectTypeOf(persisted(storage, 'theme')()).toEqualTypeOf<'light' | 'dark' | null>();
  });
});

describe('persisted over an async storage', () => {
  it('holds the fallback until ready, then the stored value', async () => {
    const adapter = memoryStorage();
    await createAsyncStorage<Prefs>({ adapter }).set('count', 3);
    const count = persisted(createAsyncStorage<Prefs>({ adapter }), 'count', { fallback: 0 });
    expect(count()).toBe(0);
    await count.ready;
    expect(count()).toBe(3);
    await count.set((n) => n + 1);
    expect(await createAsyncStorage<Prefs>({ adapter }).get('count')).toBe(4);
  });

  it('sets at once and goes back when the write fails', async () => {
    const count = persisted(createAsyncStorage<Prefs>(), 'count', { fallback: 0, encrypt: true });
    await count.ready;
    const pending = count.set(9);
    expect(count()).toBe(9);
    await expect(pending).rejects.toThrow(StorageEncryptionKeyError);
    expect(count()).toBe(0);
  });
});
