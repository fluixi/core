import type { StorageAdapter } from '../core/types.js';

/**
 * Values for the length of one request: what a loader computes and a later step reads, without a
 * process-wide Map that would leak between requests. Call it once per request and drop it after.
 */
export function requestStorage(): StorageAdapter {
  const values = new Map<string, string>();
  return {
    name: 'request',
    scope: 'request',
    capabilities: {
      synchronous: true,
      persistent: false,
      reactive: false,
      crossContext: false,
      expiration: false,
      transactions: false,
    },
    get: (key) => values.get(key) ?? null,
    set: (key, value) => void values.set(key, value),
    remove: (key) => void values.delete(key),
    has: (key) => values.has(key),
    keys: () => [...values.keys()],
    clear: () => values.clear(),
  };
}
