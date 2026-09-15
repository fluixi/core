/**
 * Universal environment utilities — the same imports work on the server and the
 * client, so app code never reaches for raw globals (`localStorage`, `window`,
 * `document`) that don't exist under SSR and crash at module-eval time. This
 * replaces hand-rolled `globalThis.localStorage = …` shims and scattered
 * `typeof window === 'undefined'` guards.
 */

// One answer for the whole framework, from the renderer that decides it. The constant
// this used to be was read once at module eval, so it could not see renderToString turn
// server mode on and reported false for the whole of a server render.
export { isServer } from '@fluixi/dom';
import { isServer as onServer } from '@fluixi/dom';

/** True in a browser (or jsdom) environment. */
export function isClient(): boolean {
  return !onServer();
}

/** A Map-backed in-memory implementation of the Web Storage API (server/tests). */
export function createMemoryStorage(): Storage {
  const mem = new Map<string, string>();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k, v) => void mem.set(k, String(v)),
    removeItem: (k) => void mem.delete(k),
    clear: () => mem.clear(),
    key: (i) => Array.from(mem.keys())[i] ?? null,
    get length() {
      return mem.size;
    },
  };
}

/**
 * Universal key/value storage with the exact `localStorage` API. On the client it
 * IS `localStorage`; on the server (no DOM) it is an ephemeral in-memory store, so
 * a module that reads `storage.getItem(...)` at import time never crashes under SSR.
 * Server reads/writes do not persist across requests (a later pass can back them with
 * the request cookie for true per-user server state).
 */
export const storage: Storage =
  typeof localStorage !== 'undefined' ? localStorage : createMemoryStorage();

/**
 * Lazy, typed accessors for the browser globals. They return the real object on the
 * client and `undefined` on the server, so `env.window?.matchMedia(...)` is safe and
 * typed everywhere. Deliberately NOT faked on the server: a stub `location`/`innerWidth`
 * would return wrong values and cause hydration mismatches — guard with `?.` instead.
 */
export const env = {
  get window(): (Window & typeof globalThis) | undefined {
    return typeof window !== 'undefined' ? window : undefined;
  },
  get document(): Document | undefined {
    return typeof document !== 'undefined' ? document : undefined;
  },
};

/**
 * Run `fn` only on the client; on the server return `fallback` (or `undefined`).
 * For values that genuinely don't exist server-side, e.g.
 * `clientOnly(() => window.innerWidth, 0)`.
 */
export function clientOnly<T>(fn: () => T): T | undefined;
export function clientOnly<T>(fn: () => T, fallback: T): T;
export function clientOnly<T>(fn: () => T, fallback?: T): T | undefined {
  return isClient() ? fn() : fallback;
}
