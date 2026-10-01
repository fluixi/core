/**
 * localStorage and sessionStorage. The browser global is read when the adapter is first used,
 * never when it is created or imported, so a module that builds one is safe to load on a server;
 * using it there throws `StorageUnavailableError`.
 */
import { StorageAdapterError, StorageError, StorageQuotaError, StorageSecurityError, StorageUnavailableError } from '../core/errors.js';
import type { AdapterChange, StorageAdapter, StorageCapabilities } from '../core/types.js';
import { hasWindow } from '../utils/environment.js';

type Area = 'localStorage' | 'sessionStorage';

/** The browser's own exception, as one of ours. */
function mapError(error: unknown, area: Area, key?: string): StorageError {
  if (error instanceof StorageError) return error;
  const name = (error as { name?: string })?.name;
  const code = (error as { code?: number })?.code;
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014) {
    return new StorageQuotaError(`${area} is full${key ? ` writing ${key}` : ''}.`, { key, cause: error });
  }
  if (name === 'SecurityError') {
    return new StorageSecurityError(`${area} is blocked by the browser (privacy settings or a sandboxed frame).`, { key, cause: error });
  }
  return new StorageAdapterError(`${area} failed${key ? ` on ${key}` : ''}.`, { key, cause: error });
}

function webStorage(area: Area, capabilities: StorageCapabilities): StorageAdapter {
  const resolve = (key?: string): Storage => {
    let storage: Storage | undefined;
    try {
      storage = (globalThis as unknown as Record<Area, Storage | undefined>)[area];
    } catch (error) {
      // Some browsers throw on the property access itself when storage is disabled.
      throw mapError(error, area, key);
    }
    if (!storage) throw new StorageUnavailableError(`${area} is not available here (a server, a worker, or a browser without it).`, { key });
    return storage;
  };
  const run = <T>(key: string | undefined, fn: (storage: Storage) => T): T => {
    const storage = resolve(key);
    try {
      return fn(storage);
    } catch (error) {
      throw mapError(error, area, key);
    }
  };

  return {
    name: area,
    scope: area === 'localStorage' ? 'local' : 'session',
    capabilities,
    get: (key) => run(key, (s) => s.getItem(key)),
    set: (key, value) => run(key, (s) => s.setItem(key, value)),
    remove: (key) => run(key, (s) => s.removeItem(key)),
    has: (key) => run(key, (s) => s.getItem(key) !== null),
    keys: () =>
      run(undefined, (s) => {
        const keys: string[] = [];
        for (let i = 0; i < s.length; i++) {
          const key = s.key(i);
          if (key !== null) keys.push(key);
        }
        return keys;
      }),
    clear: () => run(undefined, (s) => s.clear()),
    subscribe(listener: (change: AdapterChange) => void) {
      // The browser reports a write from another tab of the same origin; never this tab's own.
      if (!hasWindow()) return () => {};
      const onStorage = (event: StorageEvent) => {
        let storage: Storage | undefined;
        try {
          storage = resolve();
        } catch {
          return;
        }
        if (event.storageArea !== storage) return;
        listener({ key: event.key, value: event.newValue });
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },
  };
}

/** Survives a browser restart; shared by every tab of the origin, which see each other's writes. */
export function localStorageAdapter(): StorageAdapter {
  return webStorage('localStorage', {
    synchronous: true,
    persistent: true,
    reactive: true,
    crossContext: true,
    expiration: false,
    transactions: false,
  });
}

/** One tab's storage: survives a reload of that tab, not its closing. Not shared between tabs. */
export function sessionStorageAdapter(): StorageAdapter {
  return webStorage('sessionStorage', {
    synchronous: true,
    persistent: false,
    reactive: false,
    crossContext: false,
    expiration: false,
    transactions: false,
  });
}
