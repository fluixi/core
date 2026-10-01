import { describe, it, expect, expectTypeOf } from 'vitest';
import { createStorage, memoryStorage, copyStorage } from '../index.js';

type Drafts = { 'draft:1': { title: string; done: boolean }; 'draft:2': { title: string; done: boolean }; 'note.a': string };

describe('search and entries', () => {
  const make = () => {
    const storage = createStorage<Drafts>();
    storage.set('draft:2', { title: 'Second', done: true });
    storage.set('draft:1', { title: 'First', done: false });
    storage.set('note.a', 'hello');
    return storage;
  };

  it('lists live items in key order, with metadata', () => {
    const items = make().entries();
    expect(items.map((i) => i.key)).toEqual(['draft:1', 'draft:2', 'note.a']);
    expect(items[0].entry.createdAt).toBeTypeOf('number');
  });

  it('filters by prefix, glob, RegExp, predicate and limit', () => {
    const storage = make();
    expect(storage.search({ prefix: 'draft:' }).map((i) => i.key)).toEqual(['draft:1', 'draft:2']);
    expect(storage.search({ match: 'draft:*' }).map((i) => i.key)).toEqual(['draft:1', 'draft:2']);
    expect(storage.search({ match: /^note/ }).map((i) => i.key)).toEqual(['note.a']);
    // A dot in a glob is a dot, not "any character".
    expect(storage.search({ match: 'note.?' }).map((i) => i.key)).toEqual(['note.a']);
    expect(storage.search({ match: 'noteXa' })).toEqual([]);
    const done = storage.search({ where: (i) => typeof i.value === 'object' && (i.value as { done: boolean }).done });
    expect(done.map((i) => i.key)).toEqual(['draft:2']);
    expect(storage.search({ prefix: 'draft:', limit: 1 })).toHaveLength(1);
    expect(storage.size()).toBe(3);
  });

  it('types the items from the schema', () => {
    const [first] = make().search({ prefix: 'draft:' });
    expectTypeOf(first.key).toEqualTypeOf<'draft:1' | 'draft:2' | 'note.a'>();
  });
});

describe('management', () => {
  it('prunes what has expired and reports usage', () => {
    let time = 0;
    const storage = createStorage({ now: () => time });
    storage.set('short', 1, { ttl: 10 });
    storage.set('long', 2, { ttl: 1_000 });
    storage.set('forever', 3);
    time = 100;
    expect(storage.prune()).toBe(1);
    expect(storage.keys().sort()).toEqual(['forever', 'long']);
    const usage = storage.usage();
    expect(usage.keys).toBe(2);
    expect(usage.bytes).toBeGreaterThan(0);
  });

  it('updates in place, keeping the expiry', () => {
    let time = 0;
    const storage = createStorage<{ count: number }>({ now: () => time });
    storage.set('count', 1, { ttl: 100 });
    time = 50;
    expect(storage.update('count', (n) => (n ?? 0) + 1)).toBe(2);
    expect(storage.getEntry('count')?.expiresAt).toBe(100);
    expect(createStorage<{ count: number }>().update('count', (n) => (n ?? 0) + 1)).toBe(1);
  });

  it('getOrSet stores the factory result once', () => {
    const storage = createStorage<{ id: string }>();
    let calls = 0;
    const factory = () => (calls++, 'generated');
    expect(storage.getOrSet('id', factory)).toBe('generated');
    expect(storage.getOrSet('id', factory)).toBe('generated');
    expect(calls).toBe(1);
  });

  it('touch extends an expiry, and says when there is nothing to touch', () => {
    let time = 0;
    const storage = createStorage({ now: () => time });
    storage.set('session', 's', { ttl: 100 });
    time = 90;
    expect(storage.touch('session', 100)).toBe(true);
    time = 150;
    expect(storage.get('session')).toBe('s');
    expect(storage.touch('missing', 100)).toBe(false);
  });

  it('snapshots and restores with metadata, skipping existing keys unless told', () => {
    const source = createStorage({ now: () => 1_000 });
    source.set('a', 1, { version: 2 });
    source.set('b', 2);
    const snapshot = source.snapshot();
    expect(snapshot.a).toEqual({ value: 1, createdAt: 1_000, version: 2 });

    const target = createStorage();
    target.set('b', 99);
    expect(target.restore(snapshot)).toBe(1);
    expect(target.get('b')).toBe(99);
    expect(target.restore(snapshot, { overwrite: true })).toBe(2);
    expect(target.getEntry('a')).toEqual({ value: 1, createdAt: 1_000, version: 2 });
  });

  it('copies between storages and adapters, optionally by key', () => {
    const from = createStorage({ adapter: memoryStorage(), namespace: 'old' });
    from.set('theme', 'dark');
    from.set('locale', 'fr');
    const to = createStorage({ adapter: memoryStorage(), namespace: 'new' });
    expect(copyStorage(from, to, { keys: ['theme'] })).toBe(1);
    expect(to.get('theme')).toBe('dark');
    expect(to.get('locale')).toBeNull();
  });
});
