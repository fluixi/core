/**
 * @fluixi/auth/client: the reactive client hooks.
 *
 * The session is an isomorphic store: resolved on the server from `locals.auth`
 * (serialized into the page) and seeded synchronously on the client → no auth flash, no
 * post-hydration refetch. Two ways to drive it:
 *   • `{ client }`: a Better Auth client.
 *   • `{ session }`: an existing reactive session (e.g. @fluixi/session's createSession or
 *     any `{ user(), login?, logout? }`). The framework OWNS the reactive sync, so apps stop
 *     hand-writing a `createEffect` to mirror their store into the auth hooks.
 *
 * Client-only deps: fluixi + @fluixi/dom's pure `getLocals`, never @fluixi/server.
 */
import { createIsomorphicStore, createEffect, createRoot, env } from '@fluixi/core';
import { getLocals } from '@fluixi/dom';
import {
  AUTH_LOCALS_KEY,
  type AuthUser,
  type BetterAuthClient,
  type SessionData,
} from './types.js';
// import { isUseNavigate } from '@fluixi/core/router';

export interface ProtectedRouteOptions<Q = (p: any) => boolean> {
  guestOnly?: boolean;
  /** Require this exact role. */
  role?: string;
  /** Require ANY of these roles. */
  roles?: string[];
  /** Require a permission: your access matcher's query (default: a predicate). */
  permission?: Q;

  navigator?: Partial<Navigator>;
}

/**
 * Any reactive session with a `user` accessor (e.g. @fluixi/session's createSession).
 * The RBAC accessors (`roles` / `permissions` / `can`) are optional, provide them (as
 * createSession's `access` config does) to unlock `<Can>`, `usePermissions`, and
 * permission-gated routes. They are a UI affordance only; the server enforces authz.
 */
export interface SessionLike<U = AuthUser, P = unknown, Q = (p: P) => boolean> {
  user: () => U | null;
  login?: (...args: any[]) => Promise<unknown>;
  logout?: () => Promise<unknown>;
  roles?: () => string[];
  permissions?: () => P | undefined;
  can?: (query: Q) => boolean;
}

export interface NavigateOptions {
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
  /** Opaque history state to attach. */
  state?: unknown;
  transition?: unknown;
}
export interface Navigator {
  handler: () => (to: string, opts?: any) => void;
  options?: NavigateOptions;
}

export interface AuthHooksOptions<U = AuthUser, P = unknown, Q = (p: P) => boolean> {
  /** A Better Auth client (`createAuthClient(...)`). Mutually exclusive with `session`. */
  client?: BetterAuthClient;
  /** An existing reactive session: the framework syncs it into the hooks for you. */
  session?: SessionLike<U, P, Q>;
  /** Navigate for `protectedRoute` redirects (default: `window.location.assign`). */
  navigate?: ((to: string, opts?: NavigateOptions) => void) | Navigator;
  loginPath?: string;
  homePath?: string;
  forbiddenPath?: string;
}

export function createAuthHooks<U = AuthUser, P = unknown, Q = (p: P) => boolean>(
  options: AuthHooksOptions<U, P, Q>,
) {
  const sess = options.session;

  const store = createIsomorphicStore<SessionData<U>>('auth', {
    // Server: read what authMiddleware put on locals → serialized for the client to seed.
    server: () => (getLocals()[AUTH_LOCALS_KEY] as SessionData<U>) ?? { user: null, session: null },
    // SPA cold load: from the provided session, else the Better Auth client.
    client: async () =>
      sess
        ? { user: sess.user(), session: null }
        : normalize<U>(await options.client!.getSession()),
    fallback: { user: null, session: null },
  });

  // `{ session }` path: the framework owns the reactive bridge (no app-level effect).
  if (sess) {
    const apply = (): void => store.set({ user: sess.user(), session: null });
    apply(); // immediate, so a first protectedRoute read isn't stale
    createRoot(() => createEffect(apply));
  }

  const refresh = async (): Promise<void> => {
    store.set(sess ? { user: sess.user(), session: null } : normalize<U>(await options.client!.getSession()));
  };

  const signIn = sess
    ? ((...args: any[]) => sess.login?.(...args) ?? Promise.resolve())
    : async (creds: { email: string; password: string; rememberMe?: boolean }) => {
        await options.client!.signIn.email(creds);
        await refresh();
      };

  const signOut = sess
    ? () => sess.logout?.() ?? Promise.resolve()
    : async () => {
        await options.client!.signOut();
        store.set({ user: null, session: null });
      };

  /**
   * Send the visitor somewhere else.
   *
   * The route's own `navigator` wins, then the one given to `createAuthHooks`, then a
   * document load. A handler is a factory rather than a function: `useNavigate` has to
   * run inside the component being rendered, so it is called here, at the redirect,
   * instead of when the hooks were built.
   *
   * Without a handler this assigns `location`, which loads a document and rebuilds the
   * whole app. That is right for an app with no client router and wrong for one that
   * has it, which is what the option exists to fix.
   */
  const go = (to: string, opts?: Partial<Navigator>): void => {
    const fromRoute = typeof opts?.handler === 'function' ? opts.handler() : undefined;
    const fromHooks =
      typeof options.navigate === 'function'
        ? options.navigate
        : typeof options.navigate?.handler === 'function'
          ? // Called, not passed along. Handing back the factory made `fn(to)` build a
            // navigate function and return it, so the redirect silently did nothing.
            options.navigate.handler()
          : undefined;

    const fn = fromRoute ?? fromHooks;
    if (fn) {
      const navigateOptions =
        opts?.options ??
        (typeof options.navigate === 'object' ? options.navigate?.options : undefined);
      // Only when there are some. Deciding on the handler's arity instead dropped them
      // for anything declaring the parameter optional, which `useNavigate` does; passing
      // `undefined` regardless would change the call every handler sees.
      if (navigateOptions) fn(to, navigateOptions);
      else fn(to);
      return;
    }

    env.window?.location.assign(to);
  };

  // ── RBAC surface (driven by the bound session's access config) ────────────────
  const permissions = (): P | undefined => sess?.permissions?.();
  const can = (query: Q): boolean => sess?.can?.(query) ?? false;
  const roleList = (): string[] => {
    if (sess?.roles) return sess.roles();
    const r = (store.fields.user() as { role?: string } | null)?.role;
    return r ? [r] : [];
  };
  const passesRole = (opts?: ProtectedRouteOptions<Q>): boolean => {
    if (opts?.role && !roleList().includes(opts.role)) return false;
    if (opts?.roles && !opts.roles.some((r) => roleList().includes(r))) return false;
    if (opts?.permission !== undefined && !can(opts.permission)) return false;
    return true;
  };

  /** Render `children` only when `perform` clears the access matcher (reactive). */
  function Can(props: { perform: Q; fallback?: unknown; children: unknown }) {
    return () => (can(props.perform) ? props.children : props.fallback ?? null);
  }

  /** Declarative section guard: render `children` when the user clears role/permission. */
  function Protect(props: {
    role?: string;
    roles?: string[];
    permission?: Q;
    fallback?: unknown;
    children: unknown;
  }) {
    return () => {
      if (!store.fields.user()) return props.fallback ?? null;
      return passesRole(props) ? props.children : props.fallback ?? null;
    };
  }

  function protectedRoute<Props>(Comp: (props: Props) => unknown, opts?: ProtectedRouteOptions<Q>) {
    return (props: Props) => {
      const user = store.fields.user();
      if (opts?.guestOnly) {
        if (user) return go(options.homePath ?? '/', opts?.navigator), null;
      } else {
        if (!user) return go(options.loginPath ?? '/login', opts?.navigator), null;
        if (!passesRole(opts)) return go(options.forbiddenPath ?? '/403'), null;
      }
      return Comp(props);
    };
  }

  return {
    useUser: () => store.fields.user,
    useSession: () => store.fields.session,
    useAuth: () => ({
      user: store.fields.user,
      session: store.fields.session,
      isAuthenticated: () => store.fields.user() !== null,
      roles: roleList,
      can,
      signIn,
      signOut,
    }),
    useSignIn: () => signIn,
    useSignOut: () => signOut,
    /** Reactive accessor for the active permission set (UI affordance only). */
    usePermissions: () => permissions,
    /** Returns `can(check)`: `false` unless the session provides RBAC. */
    useCan: () => can,
    Can,
    Protect,
    refresh,
    protectedRoute,
    store,
  };
}

function normalize<U>(r: { data: { user: unknown; session: unknown } | null }): SessionData<U> {
  return { user: (r.data?.user as U) ?? null, session: (r.data?.session as SessionData<U>['session']) ?? null };
}

export type { SessionData, AuthUser, BetterAuthClient } from './types.js';
