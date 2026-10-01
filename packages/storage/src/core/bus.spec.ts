import { describe, it, expect } from 'vitest';
import { createStorage, memoryStorage, type AdapterChange, type StorageAdapter, type StorageEvent } from '../index.js';

describe('storages over one adapter', () => {
  it('hear each other, each in its own namespace', () => {
    const adapter = memoryStorage();
    const writer = createStorage({ adapter, namespace: 'ui' });
    const reader = createStorage({ adapter, namespace: 'ui' });
    const root = createStorage({ adapter });
    const other = createStorage({ adapter, namespace: 'auth' });
    const seen: StorageEvent[] = [];
    const rootSeen: StorageEvent[] = [];
    reader.subscribe('theme', (e) => seen.push(e));
    root.subscribe((e) => rootSeen.push(e));
    other.subscribe(() => seen.push({ type: 'set', key: 'wrong', external: false }));
    writer.set('theme', 'dark');
    writer.remove('theme');
    expect(seen).toEqual([
      { type: 'set', key: 'theme', value: 'dark', external: false },
      { type: 'remove', key: 'theme', external: false },
    ]);
    expect(rootSeen[0]).toMatchObject({ type: 'set', key: 'ui:theme' });
  });

  it('passes a clear down to nested namespaces only', () => {
    const adapter = memoryStorage();
    const events: string[] = [];
    createStorage({ adapter, namespace: 'ui:panel' }).subscribe((e) => events.push(`panel:${e.type}`));
    createStorage({ adapter, namespace: 'auth' }).subscribe((e) => events.push(`auth:${e.type}`));
    createStorage({ adapter, namespace: 'ui' }).clear();
    expect(events).toEqual(['panel:clear']);
  });

  it('holds one adapter subscription while anything listens', () => {
    let active = 0;
    let push: ((c: AdapterChange) => void) | undefined;
    const adapter: StorageAdapter = {
      ...memoryStorage(),
      subscribe(listener) {
        active++;
        push = listener;
        return () => void active--;
      },
    };
    const a = createStorage({ adapter });
    const b = createStorage({ adapter });
    const got: unknown[] = [];
    const offA = a.subscribe((e) => got.push(['a', e.value]));
    const offB = b.subscribe((e) => got.push(['b', e.value]));
    expect(active).toBe(1);
    push!({ key: 'k', value: JSON.stringify({ v: 1, value: 7, createdAt: 1 }) });
    expect(got).toEqual([['a', 7], ['b', 7]]);
    offA();
    expect(active).toBe(1);
    offB();
    expect(active).toBe(0);
  });
});
