// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createRoot, createEffect } from '@fluixi/reactive/signal';
import { cachedResource, clearCachedResources } from '@fluixi/reactive/cached-resource';
import { createStorage, memoryStorage } from '@fluixi/storage';
import { storageCache } from './index.js';

const settled = () => new Promise((r) => setTimeout(r, 0));

describe('storageCache', () => {
  it('keeps fetched values in the storage and serves them to a new page', async () => {
    const adapter = memoryStorage();
    const storage = () => createStorage({ adapter, namespace: 'cache' });
    let calls = 0;
    const load = () => {
      let handle!: ReturnType<typeof cachedResource<string[]>>;
      const dispose = createRoot((d) => {
        handle = cachedResource(async () => (calls++, ['acme']), { name: 'orgs', cache: storageCache(storage(), { ttl: 60_000 }) });
        createEffect(() => void handle.latest);
        return d;
      });
      return { handle, dispose };
    };
    const first = load();
    await settled();
    expect(first.handle.latest).toEqual(['acme']);
    expect(adapter.keys()).toEqual(['cache:orgs:true']);
    first.dispose();

    const second = load(); // a reload: new cache object, same storage
    expect(second.handle.latest).toEqual(['acme']);
    await settled();
    expect(calls).toBe(1);
    clearCachedResources(undefined, storageCache(storage()));
    expect(adapter.keys()).toEqual([]);
    second.dispose();
  });
});
