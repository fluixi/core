/**
 * Universal environment utilities, the same imports work on the server and the
 * client, so app code never reaches for raw globals (`window`, `document`) that don't
 * exist under SSR and crash at module-eval time. Storage is `@fluixi/core/storage`.
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

/**
 * Lazy, typed accessors for the browser globals. They return the real object on the
 * client and `undefined` on the server, so `env.window?.matchMedia(...)` is safe and
 * typed everywhere. Deliberately not faked on the server: a stub `location`/`innerWidth`
 * would return wrong values and cause hydration mismatches: guard with `?.` instead.
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
