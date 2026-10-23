/**
 * Security middleware for API responses: headers, CORS and an origin check on cookie-carrying
 * writes. Written against the published rules (OWASP Secure Headers Project, the Fetch standard)
 * rather than taken from `helmet` or `cors`, which are built for Express's response object.
 *
 * Each works alone in `src/middleware.ts`; `apiSecurity()` puts them together with safe
 * defaults, limited to the API's paths so pages keep their own policy.
 */
import { ApiError, errorResponse } from './errors.js';
import { appendVary, withHeaders, type Middleware } from './middleware.js';
import { rateLimit, type RateLimitOptions } from './rate-limit.js';

/** Allowed origins: exact `scheme://host[:port]` strings, or a test. */
export type Origins = readonly string[] | ((origin: string) => boolean);

const allows = (origins: Origins, origin: string) =>
  typeof origins === 'function' ? origins(origin) : origins.includes(origin);

// Headers

/** OWASP's recommendations for a JSON API: nothing in it is meant to render, frame or be cached. */
export const DEFAULT_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-permitted-cross-domain-policies': 'none',
  'cache-control': 'no-store',
};

/**
 * Header name to value, or `false` to leave that header out. Merged over the defaults. A header
 * the response already has is kept: a route that sets its own `cache-control` wins.
 */
export type SecurityHeadersOptions = Record<string, string | false>;

export function securityHeaders(options: SecurityHeadersOptions = {}): Middleware {
  const merged = { ...DEFAULT_SECURITY_HEADERS, ...options };
  const entries = Object.entries(merged).filter((e): e is [string, string] => e[1] !== false);
  return async (request, next) =>
    withHeaders(await next(), (headers) => {
      for (const [name, value] of entries) if (!headers.has(name)) headers.set(name, value);
    });
}

// CORS

export interface CorsOptions {
  /** Who may call from another origin. Nobody when empty. */
  origins: Origins;
  /** Send cookies along. On: the session is a cookie. */
  credentials?: boolean;
  /** Allowed in a preflight. Every method a route can export by default. */
  methods?: readonly string[];
  /** Allowed request headers. What the preflight asks for when not given. */
  allowHeaders?: readonly string[];
  /** Response headers a script may read beyond the safelisted ones. */
  exposeHeaders?: readonly string[];
  /** How long a browser keeps a preflight answer, in seconds. */
  maxAge?: number;
}

const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * CORS for listed origins. A same-origin request, or one with no `Origin`, passes untouched.
 * An unlisted origin's preflight is refused with a 403; its other requests go through without
 * CORS headers, so the browser keeps the response from the page.
 */
export function cors(options: CorsOptions): Middleware {
  const { origins, credentials = true, methods = METHODS, allowHeaders, exposeHeaders, maxAge = 600 } = options;
  return async (request, next) => {
    const origin = request.headers.get('origin');
    if (!origin || origin === new URL(request.url).origin) return next();

    const allowed = allows(origins, origin);
    const preflight = request.method === 'OPTIONS' && request.headers.has('access-control-request-method');
    if (preflight) {
      if (!allowed) return refusal(403, 'origin_not_allowed', 'This origin may not call the API.');
      const headers = new Headers({
        'access-control-allow-origin': origin,
        'access-control-allow-methods': methods.join(', '),
        'access-control-max-age': String(maxAge),
        vary: 'Origin, Access-Control-Request-Headers',
      });
      const asked = request.headers.get('access-control-request-headers');
      const allowedHeaders = allowHeaders ? allowHeaders.join(', ') : asked;
      if (allowedHeaders) headers.set('access-control-allow-headers', allowedHeaders);
      if (credentials) headers.set('access-control-allow-credentials', 'true');
      return new Response(null, { status: 204, headers });
    }

    const response = await next();
    return withHeaders(response, (headers) => {
      appendVary(headers, 'Origin');
      if (!allowed) return;
      headers.set('access-control-allow-origin', origin);
      if (credentials) headers.set('access-control-allow-credentials', 'true');
      if (exposeHeaders?.length) headers.set('access-control-expose-headers', exposeHeaders.join(', '));
    });
  };
}

// Origin check

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Refuses a write that carries cookies from a page on another site, unless that origin is
 * listed: cross-site request forgery against cookie sessions. Uses `Sec-Fetch-Site` where the
 * browser sends it and `Origin` otherwise. A request with neither is not from a browser page
 * (curl, another server), so there is no forgery to stop.
 */
export function originCheck(options: { origins: Origins }): Middleware {
  return (request, next) => {
    if (SAFE.has(request.method) || !request.headers.has('cookie')) return next();
    const origin = request.headers.get('origin');
    const site = request.headers.get('sec-fetch-site');
    const self = new URL(request.url).origin;

    if (site === 'same-origin' || site === 'none') return next();
    if (origin && (origin === self || allows(options.origins, origin))) return next();
    if (!site && !origin) return next();
    return refusal(403, 'cross_origin_refused', 'Requests from this origin are refused.');
  };
}

// Together

export interface ApiSecurityOptions {
  /** Origins of the apps that call the API from a browser: CORS and the origin check. */
  origins?: Origins;
  /** Only requests under this path are touched. `/api`, start's API prefix. */
  prefix?: string;
  /** Overrides for the headers, or `false` for none. */
  headers?: SecurityHeadersOptions | false;
  /** CORS options beyond the origins, or `false` to answer no cross-origin call. */
  cors?: Omit<CorsOptions, 'origins'> | false;
  /** `false` turns the origin check off. */
  originCheck?: false;
  /** Limits, checked in order: sign-in and sign-up at least. */
  rateLimits?: readonly RateLimitOptions[];
}

/**
 * The API's protections in one middleware: headers, CORS, the origin check, rate limits. Put it
 * first in `src/middleware.ts` so refusals from what follows carry the headers too.
 *
 * With no options every cross-origin call is refused and nothing is rate limited: list the web
 * app's origins, and limit the routes that guess passwords.
 */
export function apiSecurity(options: ApiSecurityOptions = {}): Middleware {
  const origins = options.origins ?? [];
  const prefix = (options.prefix ?? '/api').replace(/\/$/, '');
  const chain: Middleware[] = [];
  if (options.headers !== false) chain.push(securityHeaders(options.headers));
  if (options.cors !== false) chain.push(cors({ ...options.cors, origins }));
  if (options.originCheck !== false) chain.push(originCheck({ origins }));
  for (const limit of options.rateLimits ?? []) chain.push(rateLimit(limit));

  return (request, next) => {
    const { pathname } = new URL(request.url);
    if (pathname !== prefix && !pathname.startsWith(prefix + '/')) return next();
    const run = (i: number): Promise<Response> => {
      const middleware = chain[i];
      return middleware ? Promise.resolve(middleware(request, () => run(i + 1))) : next();
    };
    return run(0);
  };
}

function refusal(status: number, code: string, message: string): Response {
  return errorResponse(new ApiError(status, code, message));
}
