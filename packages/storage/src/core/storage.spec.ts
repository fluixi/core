import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  createStorage,
  memoryStorage,
  jsonSerializer,
  createSerializer,
  StorageSerializationError,
  StorageDeserializationError,
  StorageError,
  type StorageEvent,
} from '../index.js';

type AppStorage = {
  theme: 'light' | 'dark';
  count: number;
  user: { id: string; name: string };
};

describe('createStorage', () => {
  it('sets, gets, removes, and reports what it holds', () => {
    const storage = createStorage<AppStorage>();
    expect(storage.get('theme')).toBeNull();
    storage.set('theme', 'dark');
    storage.set('user', { id: '1', name: 'Ada' });
    expect(storage.get('theme')).toBe('dark');
    expect(storage.get('user')).toEqual({ id: '1', name: 'Ada' });
    expect(storage.has('theme')).toBe(true);
    expect(storage.keys().sort()).toEqual(['theme', 'user']);
    storage.remove('theme');
    expect(storage.has('theme')).toBe(false);
    storage.clear();
    expect(storage.keys()).toEqual([]);
  });

  it('keeps namespaces apart, nested ones included', () => {
    const adapter = memoryStorage();
    const app = createStorage({ adapter, namespace: 'app' });
    const other = createStorage({ adapter, namespace: 'other' });
    const auth = app.namespace('auth');
    app.set('theme', 'dark');
    other.set('theme', 'light');
    auth.set('token', 'abc');
    expect(adapter.keys().sort()).toEqual(['app:auth:token', 'app:theme', 'other:theme']);
    expect(auth.keys()).toEqual(['token']);
    auth.clear();
    expect(adapter.keys().sort()).toEqual(['app:theme', 'other:theme']);
    expect(other.get('theme')).toBe('light');
  });

  it('expires on read, after a reload too', () => {
    let time = 1_000;
    const adapter = memoryStorage();
    const storage = createStorage({ adapter, now: () => time });
    storage.set('token', 't', { ttl: 500 });
    expect(storage.get('token')).toBe('t');
    // A new storage over the same data: the expiry travels with the value, not with a timer.
    time = 1_600;
    const reloaded = createStorage({ adapter, now: () => time });
    const events: string[] = [];
    reloaded.subscribe((e) => events.push(e.type));
    expect(reloaded.get('token')).toBeNull();
    expect(adapter.has('token')).toBe(false);
    expect(events).toEqual(['expire']);
  });

  it('gives the metadata on request only', () => {
    const storage = createStorage({ now: () => 5_000 });
    storage.set('note', 'hi', { ttl: 1_000, version: 3 });
    expect(storage.get('note')).toBe('hi');
    expect(storage.getEntry('note')).toEqual({ value: 'hi', createdAt: 5_000, expiresAt: 6_000, version: 3 });
  });

  it('migrates an older value on read and writes the result back', () => {
    const adapter = memoryStorage();
    adapter.set('user', JSON.stringify({ v: 1, value: { name: 'Ada Lovelace' }, createdAt: 1, version: 1 }));
    const storage = createStorage<{ user: { first: string; last: string } }>({
      adapter,
      migrations: {
        user: {
          2: (old) => {
            const [first, last] = (old as { name: string }).name.split(' ');
            return { first, last };
          },
        },
      },
    });
    expect(storage.get('user')).toEqual({ first: 'Ada', last: 'Lovelace' });
    expect(JSON.parse(adapter.get('user')!).version).toBe(2);
    storage.set('user', { first: 'Grace', last: 'Hopper' });
    expect(storage.getEntry('user')?.version).toBe(2);
  });

  it('reads a value written without an envelope as it is', () => {
    const adapter = memoryStorage();
    adapter.set('legacy', JSON.stringify({ a: 1 }));
    expect(createStorage({ adapter }).get('legacy')).toEqual({ a: 1 });
  });

  it('refuses what JSON would silently change, naming where', () => {
    const storage = createStorage();
    expect(() => storage.set('f', () => 1)).toThrow(StorageSerializationError);
    expect(() => storage.set('d', new Date())).toThrow(/Date/);
    expect(() => storage.set('n', { a: Number.NaN })).toThrow(/value\.value\.a/);
    expect(() => storage.set('u', { a: undefined })).toThrow(/undefined/);
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(() => storage.set('loop', loop)).toThrow(/refers back/);
    try {
      storage.set('f', () => 1);
    } catch (error) {
      expect(error).toBeInstanceOf(StorageError);
      expect((error as StorageError).key).toBe('f');
    }
  });

  it('throws on stored text it cannot read, instead of returning null', () => {
    const adapter = memoryStorage();
    adapter.set('broken', '{not json');
    expect(() => createStorage({ adapter }).get('broken')).toThrow(StorageDeserializationError);
  });

  it('takes a custom serializer', () => {
    const base64 = createSerializer(
      (value) => btoa(jsonSerializer.serialize(value)),
      (text) => jsonSerializer.deserialize(atob(text)),
    );
    const adapter = memoryStorage();
    const storage = createStorage({ adapter, serializer: base64 });
    storage.set('k', { ok: true });
    expect(adapter.get('k')!.startsWith('ey')).toBe(true);
    expect(storage.get('k')).toEqual({ ok: true });
  });

  it('notifies by key and for everything', () => {
    const storage = createStorage<AppStorage>();
    const all: StorageEvent<AppStorage>[] = [];
    const theme: unknown[] = [];
    storage.subscribe((e) => all.push(e));
    const stop = storage.subscribe('theme', (e) => theme.push(e.value));
    storage.set('theme', 'dark');
    storage.set('count', 1);
    stop();
    storage.set('theme', 'light');
    storage.remove('count');
    expect(theme).toEqual(['dark']);
    expect(all.map((e) => `${e.type}:${e.key}`)).toEqual(['set:theme', 'set:count', 'set:theme', 'remove:count']);
  });

  it('says what it can do: expiry always, the rest from the adapter', () => {
    const storage = createStorage();
    expect(storage.scope).toBe('memory');
    expect(storage.capabilities).toMatchObject({ synchronous: true, persistent: false, expiration: true });
  });

  it('imports and runs with no browser globals', () => {
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined');
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined');
    createStorage().set('ok', true);
  });
});

describe('types', () => {
  it('infers values from the schema and checks writes', () => {
    const storage = createStorage<AppStorage>();
    expectTypeOf(storage.get('theme')).toEqualTypeOf<'light' | 'dark' | null>();
    expectTypeOf(storage.get('user')).toEqualTypeOf<{ id: string; name: string } | null>();
    storage.set('theme', 'dark');
    // @ts-expect-error not a theme
    storage.set('theme', 'invalid');
    // @ts-expect-error not a key of the schema
    storage.get('missing');
  });

  it('lets untyped storage name the value it expects', () => {
    const storage = createStorage();
    expectTypeOf(storage.get('anything')).toEqualTypeOf<unknown>();
    expectTypeOf(storage.get<{ id: string }>('user')).toEqualTypeOf<{ id: string } | null>();
  });
});
