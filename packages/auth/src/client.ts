/**
 * @fluixi/auth/client — the reactive client hooks.
 *
 * The session is an isomorphic store: resolved on the server from `locals.auth`
 * (serialized into the page) and seeded synchronously on the client → no auth flash, no
 * post-hydration refetch (which Better Auth's bare client does). On a pure-SPA load it
 * falls back to the Better Auth client's `getSession()`.
 *
 * Client-only deps: @fluixi/core (isomorphic store + env) and @fluixi/dom's pure
 * `getLocals` — NO @fluixi/server / @fluixi/start, so this never reaches the server engine
 * or Node into the browser bundle.
 */
import { createIsomorphicStore, env } from '@fluixi/core';
import { getLocals } from '@fluixi/dom';
import {
  AUTH_LOCALS_KEY,
  type AuthUser,
  type BetterAuthClient,
  type SessionData,
} from './types.js';

export interface ProtectedRouteOptions {
  /** Redirect authenticated users away (login/register pages). */
  guestOnly?: boolean;
  /** Require this role; else redirect to `forbiddenPath`. */
  role?: string;
}

export interface AuthHooksOptions {
  /** A Better Auth client (`createAuthClient(...)`). */
  client: BetterAuthClient;
  /** Navigate for `protectedRoute` redirects (default: `window.location.assign`). */
  navigate?: (to: string) => void;
  loginPath?: string; // default '/login'
  homePath?: string; // default '/'
  forbiddenPath?: string; // default '/403'
}

export function createAuthHooks<U = AuthUser>(options: AuthHooksOptions) {
  const store = createIsomorphicStore<SessionData<U>>('auth', {
    // Server: read what authMiddleware put on locals → serialized for the client to seed.
    server: () => (getLocals()[AUTH_LOCALS_KEY] as SessionData<U>) ?? { user: null, session: null },
    // Pure-SPA cold load (no server seed): ask the Better Auth client.
    client: async () => normalize<U>(await options.client.getSession()),
    fallback: { user: null, session: null },
  });

  const refresh = async (): Promise<void> => {
    store.set(normalize<U>(await options.client.getSession()));
  };

  const signIn = async (creds: { email: string; password: string; rememberMe?: boolean }): Promise<void> => {
    await options.client.signIn.email(creds);
    await refresh();
  };

  const signOut = async (): Promise<void> => {
    await options.client.signOut();
    store.set({ user: null, session: null });
  };

  const go = (to: string): void => (options.navigate ?? ((t) => env.window?.location.assign(t)))(to);

  function protectedRoute<P>(Comp: (props: P) => unknown, opts?: ProtectedRouteOptions) {
    return (props: P) => {
      const user = store.fields.user();
      if (opts?.guestOnly) {
        if (user) return go(options.homePath ?? '/'), null;
      } else {
        if (!user) return go(options.loginPath ?? '/login'), null;
        if (opts?.role && (user as { role?: string }).role !== opts.role)
          return go(options.forbiddenPath ?? '/403'), null;
      }
      return Comp(props);
    };
  }

  return {
    /** Reactive accessor for the current user (seeded from SSR). */
    useUser: () => store.fields.user,
    /** Reactive accessor for the current session. */
    useSession: () => store.fields.session,
    /** `{ user, session, isAuthenticated, signIn, signOut }`. */
    useAuth: () => ({
      user: store.fields.user,
      session: store.fields.session,
      isAuthenticated: () => store.fields.user() !== null,
      signIn,
      signOut,
    }),
    useSignIn: () => signIn,
    useSignOut: () => signOut,
    /** Re-pull the session from the Better Auth client. */
    refresh,
    /** Wrap a route component: authed-only (default), `guestOnly`, or `role`-gated. */
    protectedRoute,
    /** The underlying isomorphic store (escape hatch). */
    store,
  };
}

function normalize<U>(r: { data: { user: unknown; session: unknown } | null }): SessionData<U> {
  return { user: (r.data?.user as U) ?? null, session: (r.data?.session as SessionData<U>['session']) ?? null };
}

export type { SessionData, AuthUser, BetterAuthClient } from './types.js';
