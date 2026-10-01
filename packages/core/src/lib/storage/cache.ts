import type { ResourceCache } from '@fluixi/reactive/cached-resource';
import type { TypedStorage } from '@fluixi/storage';

/**
 * A `cachedResource` cache kept in a storage, so fetched data outlives the page: session
 * storage for the tab, local storage across visits. Values pass through the storage's
 * serializer, so they must be plain data. In-flight fetches stay in memory.
 *
 * Give it its own namespace, since `clearCachedResources()` clears that storage, and a `ttl`
 * so entries do not pile up after the resource that wrote them is gone.
 *
 * @example
 * const cache = storageCache(useStorage({ scope: 'session', namespace: 'cache' }), { ttl: 10 * 60_000 });
 * const orgs = cachedResource(() => api.get('/orgs'), { name: 'orgs', ttl: 60_000, cache });
 */
export function storageCache(storage: TypedStorage<any>, options: { ttl?: number } = {}): ResourceCache {
  const inflight = new Map<string, Promise<unknown>>();
  return {
    get(key) {
      try {
        const entry = storage.getEntry(key);
        return entry ? { value: entry.value, timestamp: entry.createdAt } : undefined;
      } catch {
        // Unreadable or blocked: a miss, and the resource fetches.
        return undefined;
      }
    },
    set(key, entry) {
      try {
        storage.set(key, entry.value, options.ttl !== undefined ? { ttl: options.ttl } : undefined);
      } catch {
        /* quota, or a value the serializer refuses: kept for this page only by the fetch itself */
      }
    },
    delete: (key) => storage.remove(key),
    keys: () => storage.keys(),
    clear() {
      storage.clear();
      inflight.clear();
    },
    inflight,
  };
}
