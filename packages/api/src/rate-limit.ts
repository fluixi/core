/**
 * Rate limits: `rate-limiter-flexible` counts, behind a store interface so a shared backend
 * (Postgres, Redis) replaces the in-memory one without touching the middleware.
 */
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { ApiError, errorResponse } from './errors.js';
import { withHeaders, type Middleware } from './middleware.js';

/** Where hits are counted. */
export interface RateLimitStore {
  /** Counts one hit on `key` in a window of `windowSeconds`, allowing `limit` of them. */
  hit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetMs: number }>;
}

/** Counts in this process. Enough for one instance; several need a shared store. */
export function memoryRateLimitStore(): RateLimitStore {
  const limiters = new Map<string, RateLimiterMemory>();
  return {
    async hit(key, limit, windowSeconds) {
      const id = `${limit}/${windowSeconds}`;
      let limiter = limiters.get(id);
      if (!limiter) limiters.set(id, (limiter = new RateLimiterMemory({ points: limit, duration: windowSeconds })));
      try {
        const res = await limiter.consume(key);
        return { allowed: true, remaining: res.remainingPoints, resetMs: res.msBeforeNext };
      } catch (thrown) {
        if (thrown instanceof RateLimiterRes) return { allowed: false, remaining: 0, resetMs: thrown.msBeforeNext };
        throw thrown;
      }
    },
  };
}

export interface RateLimitOptions {
  /** Paths it applies to, exactly or as a prefix ending in `/*`; or a test. Every request when not given. */
  match?: readonly string[] | ((request: Request) => boolean);
  /** Methods it applies to. Every method when not given. */
  methods?: readonly string[];
  /** Hits allowed per window. */
  limit: number;
  /** Window length, in seconds. */
  window: number;
  /**
   * Who a hit belongs to. The client address by default (`clientAddress` from `@fluixi/start`);
   * a request with no key is not counted.
   */
  key?: (request: Request) => string | undefined | Promise<string | undefined>;
  /** Where hits are counted. In memory by default. */
  store?: RateLimitStore;
  /**
   * Keeps this limit's counts apart from the others' in a shared store. Defaults to the order
   * limits are created in, which holds across instances running the same code.
   */
  name?: string;
}

const ADDRESSES = Symbol.for('fluixi.clientAddress');

const sharedMemory = memoryRateLimitStore();
let created = 0;

/** The address `@fluixi/start` recorded for the request, read without importing it. */
export function clientAddressOf(request: Request): string | undefined {
  return ((globalThis as Record<symbol, unknown>)[ADDRESSES] as WeakMap<Request, string> | undefined)?.get(request);
}

/**
 * Refuses a caller who goes over `limit` requests in `window` seconds with a 429 and
 * `Retry-After`. Every counted response carries `RateLimit-Limit`, `-Remaining` and `-Reset`.
 */
export function rateLimit(options: RateLimitOptions): Middleware {
  const { match, methods, limit, window, key = clientAddressOf, store = sharedMemory } = options;
  const applies = matcher(match);
  const methodSet = methods && new Set(methods.map((m) => m.toUpperCase()));
  const bucket = options.name ?? `limit${++created}`;

  return async (request, next) => {
    if (methodSet && !methodSet.has(request.method)) return next();
    if (!applies(request)) return next();
    const who = await key(request);
    if (!who) return next();

    const { allowed, remaining, resetMs } = await store.hit(`${bucket}:${who}`, limit, window);
    const reset = String(Math.ceil(resetMs / 1000));
    const set = (headers: Headers) => {
      headers.set('ratelimit-limit', String(limit));
      headers.set('ratelimit-remaining', String(remaining));
      headers.set('ratelimit-reset', reset);
    };
    if (!allowed) {
      const refused = errorResponse(new ApiError(429, 'rate_limited', 'Too many requests. Try again later.'));
      refused.headers.set('retry-after', reset);
      set(refused.headers);
      return refused;
    }
    return withHeaders(await next(), set);
  };
}

function matcher(match: RateLimitOptions['match']): (request: Request) => boolean {
  if (!match) return () => true;
  if (typeof match === 'function') return match;
  const exact = new Set(match.filter((p) => !p.endsWith('/*')));
  const prefixes = match.filter((p) => p.endsWith('/*')).map((p) => p.slice(0, -1));
  return (request) => {
    const { pathname } = new URL(request.url);
    return exact.has(pathname) || prefixes.some((p) => pathname.startsWith(p));
  };
}
