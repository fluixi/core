/**
 * Request middleware: a chain that runs BEFORE the SSR render, in both `fluixi dev`
 * and `fluixi start`. Each middleware gets `(request, next)`; calling `next()` runs
 * the rest of the chain (ending in the renderer). A middleware may short-circuit
 * (return a Response without calling `next`: e.g. an auth redirect or a 401), or
 * call `next()` and adjust the result (add headers, rewrite). Runtime-neutral: a
 * middleware sees a Web `Request` and returns a Web `Response`.
 *
 * Convention: `src/middleware.ts`, default-exporting `defineMiddleware([...])`.
 *
 *   // src/middleware.ts
 *   import { defineMiddleware } from '@fluixi/start';
 *   export default defineMiddleware([
 *     (req, next) => {
 *       const url = new URL(req.url);
 *       if (url.pathname.startsWith('/admin') && !isAuthed(req))
 *         return new Response(null, { status: 302, headers: { location: '/login' } });
 *       return next();
 *     },
 *   ]);
 */
import type { FetchHandler } from './handler.js';

export type MiddlewareNext = () => Promise<Response>;
export type Middleware = (
  request: Request,
  next: MiddlewareNext,
) => Response | Promise<Response>;

/** Identity helper for `export default`: accepts one middleware or an array. */
export function defineMiddleware(mw: Middleware | Middleware[]): Middleware[] {
  return Array.isArray(mw) ? mw.slice() : [mw];
}

/**
 * Normalize a loaded `src/middleware.ts` module's default export into a Middleware[].
 * Tolerates a single function, an array, `defineMiddleware(...)` output, or nothing.
 */
export function normalizeMiddleware(mod: unknown): Middleware[] {
  const def = (mod as any)?.default ?? mod;
  if (def == null) return [];
  if (Array.isArray(def)) return def.filter((m): m is Middleware => typeof m === 'function');
  return typeof def === 'function' ? [def as Middleware] : [];
}

/**
 * Compose a middleware chain around a core handler (the renderer). Returns a handler
 * that runs `middlewares[0] → … → core`. `next()` must be called at most once per
 * middleware; a second call rejects.
 */
export function composeMiddleware(
  middlewares: Middleware[],
  core: FetchHandler,
): FetchHandler {
  if (middlewares.length === 0) return core;
  return (request) => {
    let lastCalled = -1;
    const dispatch = (i: number): Promise<Response> => {
      if (i <= lastCalled) {
        return Promise.reject(new Error('middleware called next() more than once'));
      }
      lastCalled = i;
      const mw = middlewares[i];
      if (!mw) return Promise.resolve(core(request));
      return Promise.resolve(mw(request, () => dispatch(i + 1)));
    };
    return dispatch(0);
  };
}
