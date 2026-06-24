/**
 * @fluixi/auth/server — the server-side bindings.
 *
 * `defineAuth(betterAuth(...))` registers the engine; `authMiddleware()` resolves the
 * session once per request and writes it to `locals.auth` (via the @fluixi/start locals
 * bridge), so the server helpers — `requireUser`, `requireRole`, `requirePermission` —
 * are pure reads of request-scoped state. No manual token parsing; works inside loaders
 * AND server functions (same request context).
 */
import type { Middleware } from '@fluixi/start';
import { getLocals, getRequestLocals } from '@fluixi/server';
import {
  AUTH_LOCALS_KEY,
  type AuthUser,
  type BetterAuthServer,
  type SessionData,
} from './types.js';

export interface FluixiAuth<U = AuthUser> {
  /** The underlying Better Auth instance. */
  raw: BetterAuthServer;
  /** Mount at `/api/auth/*`. */
  handler: (request: Request) => Promise<Response>;
  /** Resolve the session for a request (used by the middleware). */
  getSession: (request: Request) => Promise<SessionData<U>>;
}

// Registered instance — so the helpers/middleware find "the" auth without the app
// threading it through every call. defineAuth sets it; getAuth reads it.
let _auth: FluixiAuth<any> | null = null;

export function defineAuth<U = AuthUser>(instance: BetterAuthServer): FluixiAuth<U> {
  const auth: FluixiAuth<U> = {
    raw: instance,
    handler: (request) => instance.handler(request),
    getSession: async (request) => {
      const res = await instance.api.getSession({ headers: request.headers });
      return { user: (res?.user as U) ?? null, session: (res?.session as SessionData<U>['session']) ?? null };
    },
  };
  _auth = auth;
  return auth;
}

export function getAuth<U = AuthUser>(): FluixiAuth<U> {
  if (!_auth) {
    throw new Error('[@fluixi/auth] defineAuth() was not called — no auth instance registered.');
  }
  return _auth as FluixiAuth<U>;
}

/** Catch-all route handler for `/api/auth/*` (sugar over `auth.handler`). */
export function mountAuthRoutes(): (request: Request) => Promise<Response> {
  return (request) => getAuth().handler(request);
}

/**
 * Resolve the session ONCE per request and stash it on `locals.auth`. Runs before the
 * render (and before server functions), so every helper below is a pure locals read.
 * Place it in `src/middleware.ts`: `export default defineMiddleware([ authMiddleware() ])`.
 */
export function authMiddleware(): Middleware {
  return async (request, next) => {
    const session = await getAuth().getSession(request);
    getRequestLocals(request)[AUTH_LOCALS_KEY] = session;
    return next();
  };
}

/** Thrown by the require* helpers; carries the HTTP status + optional redirect target. */
export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    public redirectTo?: string,
    message?: string,
  ) {
    super(message ?? (status === 401 ? 'Unauthorized' : 'Forbidden'));
    this.name = 'AuthError';
  }
}

function current<U>(): SessionData<U> {
  return (getLocals()[AUTH_LOCALS_KEY] as SessionData<U> | undefined) ?? { user: null, session: null };
}

/** The current user or null — never throws. */
export async function optionalUser<U = AuthUser>(): Promise<U | null> {
  return current<U>().user;
}

/** The current user, or throw `AuthError(401, redirectTo)`. */
export async function requireUser<U = AuthUser>(opts?: { redirectTo?: string }): Promise<U> {
  const user = current<U>().user;
  if (!user) throw new AuthError(401, opts?.redirectTo ?? '/login');
  return user;
}

/** Require a specific role, or throw `AuthError(403)`. */
export async function requireRole<U extends { role?: string } = AuthUser>(
  role: string,
  opts?: { redirectTo?: string },
): Promise<U> {
  const user = await requireUser<U>(opts);
  if (user.role !== role) throw new AuthError(403, opts?.redirectTo);
  return user;
}

/**
 * Require a permission. Pass a boolean or a predicate (e.g. your RBAC/ABAC `can(user, …)`):
 * `await requirePermission(() => can(user, 'edit', post))`. Throws `AuthError(403)` if false.
 */
export async function requirePermission(
  check: boolean | (() => boolean),
  opts?: { redirectTo?: string },
): Promise<void> {
  await requireUser(opts);
  const ok = typeof check === 'function' ? check() : check;
  if (!ok) throw new AuthError(403, opts?.redirectTo);
}

// Cookie API — proper, secure-by-default cookie management (parse/serialize/request reads).
export {
  parseCookies,
  serializeCookie,
  deleteCookie,
  getCookie,
  getCookies,
  type CookieOptions,
} from './cookies.js';

export type { SessionData, AuthUser, BetterAuthServer } from './types.js';
