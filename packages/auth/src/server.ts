/**
 * @fluixi/auth/server: the server-side bindings.
 *
 * `defineAuth(betterAuth(...))` registers the engine; `authMiddleware()` resolves the
 * session once per request and writes it to `locals.auth` (via the @fluixi/start locals
 * bridge), so the server helpers: `requireUser`, `requireRole`, `requirePermission` , 
 * are pure reads of request-scoped state. No manual token parsing; works inside loaders
 * AND server functions (same request context).
 */
import type { Middleware } from '@fluixi/start';
import { getLocals, getRequestLocals } from '@fluixi/server';
import {
  AUTH_LOCALS_KEY,
  type AuthSession,
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

// Registered instance: so the helpers/middleware find "the" auth without the app
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

/**
 * Thrown by the require* helpers and the guards; carries the HTTP status, an optional redirect
 * target, and a `code` when the refusal is more precise than 401 or 403 alone.
 */
export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    public redirectTo?: string,
    message?: string,
    public code?: string,
  ) {
    super(message ?? (status === 401 ? 'Unauthorized' : 'Forbidden'));
    this.name = 'AuthError';
  }
}

function current<U>(): SessionData<U> {
  return (getLocals()[AUTH_LOCALS_KEY] as SessionData<U> | undefined) ?? { user: null, session: null };
}

/** The current user or null: never throws. */
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

/** Better Auth's session cookie, as an API description names it. */
const SESSION_COOKIE = {
  type: 'apiKey',
  in: 'cookie',
  name: 'better-auth.session_token',
  description: 'Set by sign-in. Named `__Secure-better-auth.session_token` over HTTPS.',
};

export interface GuardOptions {
  /** The security scheme the API description gives, when the cookie is renamed or a token is used. */
  scheme?: Record<string, unknown>;
}

/** A signed-in caller's session, as a guard hands it to the handler. */
export interface SignedIn<U = AuthUser> {
  user: U;
  session: AuthSession;
}

/** The caller's membership of the organisation their session has active. */
export interface ActiveMember {
  id: string;
  organizationId: string;
  userId: string;
  /** One role, or several comma-separated, as Better Auth stores them. */
  role: string;
}

/** The organisation calls a guard needs, present once Better Auth's `organization()` plugin is on. */
interface OrganizationApi {
  getActiveMember(ctx: { headers: Headers }): Promise<ActiveMember | null>;
  hasPermission(ctx: { headers: Headers; body: { permissions: Record<string, string[]> } }): Promise<{ success: boolean }>;
}

/** The session for this request: from `authMiddleware()` when it ran, else resolved here. */
async function sessionFor<U>(request: Request): Promise<SessionData<U>> {
  const resolved = getLocals()[AUTH_LOCALS_KEY] as SessionData<U> | undefined;
  return resolved ?? getAuth<U>().getSession(request);
}

/**
 * An `@fluixi/api` guard: the caller must be signed in. The handler gets `auth.user` and
 * `auth.session`. Refuses with 401.
 *
 * ```ts
 * export const GET = route({ guard: signedIn(), handler: ({ auth }) => auth.user });
 * ```
 */
export function signedIn<U = AuthUser>(options: GuardOptions = {}) {
  return {
    async check(request: Request): Promise<SignedIn<U>> {
      const { user, session } = await sessionFor<U>(request);
      if (!user || !session) throw new AuthError(401);
      return { user, session };
    },
    security: { name: 'session', scheme: options.scheme ?? SESSION_COOKIE },
    refuses: [401] as const,
  };
}

/**
 * An `@fluixi/api` guard: the caller must be a member of the organisation their session has
 * active, with one of `roles` if given, and every one of `permissions` if given (checked by
 * Better Auth's access control). The handler gets `auth.member.organizationId`, which is the
 * tenant every query of that route is scoped to.
 *
 * Refuses with 401 when signed out, else 403: `no_active_organization` when none is active,
 * `not_a_member` when the membership is gone, `forbidden` for a role or permission.
 *
 * ```ts
 * export const DELETE = route({ guard: member({ roles: ['owner', 'admin'] }), handler });
 * ```
 */
export function member<U = AuthUser>(
  options: GuardOptions & { roles?: readonly string[]; permissions?: Record<string, string[]> } = {},
) {
  const signed = signedIn<U>(options);
  return {
    async check(request: Request): Promise<SignedIn<U> & { member: ActiveMember }> {
      const auth = await signed.check(request);
      if (!auth.session.activeOrganizationId) {
        throw new AuthError(403, undefined, 'Choose an organisation first.', 'no_active_organization');
      }
      const api = getAuth<U>().raw.api as unknown as Partial<OrganizationApi>;
      if (!api.getActiveMember || !api.hasPermission) {
        throw new Error("[@fluixi/auth] member() needs Better Auth's organization() plugin.");
      }
      const membership = await api.getActiveMember({ headers: request.headers });
      if (!membership) {
        throw new AuthError(403, undefined, 'You are not a member of this organisation.', 'not_a_member');
      }
      if (options.roles) {
        const held = membership.role.split(',').map((role) => role.trim());
        if (!options.roles.some((role) => held.includes(role))) throw new AuthError(403);
      }
      if (options.permissions) {
        const { success } = await api.hasPermission({ headers: request.headers, body: { permissions: options.permissions } });
        if (!success) throw new AuthError(403);
      }
      const { id, organizationId, userId, role } = membership;
      return { ...auth, member: { id, organizationId, userId, role } };
    },
    security: signed.security,
    refuses: [401, 403] as const,
  };
}

// Cookie API: proper, secure-by-default cookie management (parse/serialize/request reads).
export {
  parseCookies,
  serializeCookie,
  deleteCookie,
  getCookie,
  getCookies,
  type CookieOptions,
} from './cookies.js';

export { remoteAuth, type RemoteAuthOptions } from './remote.js';

export type { SessionData, AuthSession, AuthUser, BetterAuthServer } from './types.js';
