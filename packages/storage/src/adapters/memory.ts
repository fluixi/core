import type { StorageAdapter } from '../core/types.js';

/**
 * Values in a Map, for as long as this adapter lives. Works anywhere: browser, server, tests,
 * workers. Each call makes its own Map: on a server, keep one per request, never one per
 * process for request data.
 */
export function memoryStorage(): StorageAdapter {
  const values = new Map<string, string>();
  return {
    name: 'memory',
    scope: 'memory',
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
