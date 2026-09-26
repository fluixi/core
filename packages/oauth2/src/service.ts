/**
 * The application-facing half.
 *
 * `AuthClient` knows the protocol. This knows the application: who is signed in, whether
 * the session is still good, when to refresh, and where to send someone who is not
 * allowed in. It is built on `@fluixi/session`, which already owns that state machine,
 * rather than a second one written here.
 *
 * The mapping onto a session adapter is the part worth explaining. `createSession`'s
 * `login(creds)` means "turn these credentials into a token". In a redirect flow the
 * credential is the authorization code on the callback URL, so `login` is the code
 * exchange and the redirect itself is a separate call that never returns. Everything
 * else lines up directly: `fetchUser`, `refresh`, `logout` and `getExpiry`.
 */
import { createSession, type AccessControl, type Session } from '@fluixi/session';
import { createAuthHooks } from '@fluixi/auth/client';
import { expiryFromJwt } from './pkce.js';
import { safeReturnTo } from './return-to.js';
import { createBrowserClient } from './browser.js';
import { createServerClient, COOKIE_SESSION } from './server-client.js';
import { OAuthError } from './types.js';
import type { AuthClient, AuthConfig, CallbackParams, LoginOptions, Tokens } from './types.js';

/** The credential a redirect flow produces. */
export type AuthCredentials = CallbackParams;

export interface AuthServiceOptions<U, P = unknown, Q = (p: P) => boolean> {
  /** How the flow runs and where the tokens live. */
  config: AuthConfig;
  /**
   * The client, when it should not be built from `config`.
   *
   * The seam for a test, and for a provider that needs something neither built-in
   * implementation does.
   */
  client?: AuthClient;
  /**
   * The user, when the provider's userinfo shape is not what the app wants.
   *
   * Given one, it replaces the client's own `fetchUser`, which is the usual case: an app
   * has its own `/me` carrying roles the identity provider knows nothing about.
   */
  fetchUser?: (accessToken: string) => Promise<U>;
  /** Client-side RBAC, for deciding what to render. The server still decides what is allowed. */
  access?: AccessControl<U, P, Q>;
  /** Passed through to the session. */
  storageKeys?: { token?: string; user?: string; expiry?: string };
  refreshSkewMs?: number;
  onLogin?: (user: U) => void;
  onLogout?: () => void;
  onExpired?: () => void;
  onError?: (error: unknown, op: string) => void;

  /**
   * How a guard sends someone somewhere else.
   *
   * A factory rather than a function, because `useNavigate` has to run inside the
   * component being rendered. Give it `{ handler: useNavigate }` and a guard performs a
   * client-side navigation; leave it out and it assigns `location`, which reloads the
   * document and discards the reactive tree.
   */
  navigate?: { handler: () => (to: string, options?: unknown) => void };
  /** Where a signed-out visitor is sent. Default `/login`. */
  loginPath?: string;
  /** Where a signed-in visitor is sent from a guest-only page. Default `/`. */
  homePath?: string;
  /** Where someone lacking a role is sent. Default `/403`. */
  forbiddenPath?: string;
}

/**
 * What an application injects.
 *
 * The session's own surface (`user`, `token`, `status`, `isAuthenticated`, `can`, …) plus
 * the three things a redirect flow adds.
 */
export interface AuthService<U, P = unknown, Q = (p: P) => boolean>
  extends Session<U, AuthCredentials, unknown, P, Q>,
    Pick<
      ReturnType<typeof createAuthHooks<U, P, Q>>,
      'protectedRoute' | 'Can' | 'Protect' | 'useAuth' | 'useUser' | 'useCan'
    > {
  /** Send the visitor to the authorization server. Does not return in the browser. */
  signIn(options?: LoginOptions): Promise<void>;
  /**
   * Finish a login from the callback URL.
   *
   * Returns where the app should go next: what `signIn` recorded, or `/`.
   */
  complete(params?: CallbackParams): Promise<string>;
  /** The protocol half, for anything this service does not wrap. */
  readonly client: AuthClient;
}

/**
 * The parameters on the current URL, which is what a callback route has.
 *
 * Empty during a server render, where there is no location to read. A callback route is
 * rendered on both sides, and throwing here would fail the render before the browser ever
 * got the chance to finish the exchange, which is the only place it can happen: the PKCE
 * verifier is in the browser's storage.
 */
export function paramsFromUrl(url?: string | URL): CallbackParams {
  const href = url ?? (typeof location === 'undefined' ? null : location.href);
  if (!href) return {};

  const { searchParams } = new URL(String(href));
  return {
    code: searchParams.get('code') ?? undefined,
    state: searchParams.get('state') ?? undefined,
    error: searchParams.get('error') ?? undefined,
    errorDescription: searchParams.get('error_description') ?? undefined,
  };
}

/** Only `client` and `config` matter here, so the user type is irrelevant. */
function clientFor(options: Pick<AuthServiceOptions<unknown>, 'client' | 'config'>): AuthClient {
  if (options.client) return options.client;
  return options.config.tokens === 'server'
    ? createServerClient(options.config)
    : createBrowserClient(options.config);
}

export function createAuthService<U, P = unknown, Q = (p: P) => boolean>(
  options: AuthServiceOptions<U, P, Q>,
): AuthService<U, P, Q> {
  const client = clientFor(options);
  // Held so `getExpiry` can answer for a token the session hands back, and so a
  // server-mode session has something to report when the token is a cookie.
  let latest: Tokens | null = null;

  const session = createSession<U, AuthCredentials, unknown, P, Q>({
    /** The credential is the callback, so this is the code exchange. */
    async login(params: AuthCredentials) {
      latest = await client.handleCallback(params);
      return { token: latest.accessToken, expiresAt: latest.expiresAt };
    },

    async fetchUser(token: string) {
      if (options.fetchUser) return options.fetchUser(token);
      return client.fetchUser<U>(token === COOKIE_SESSION ? undefined : token);
    },

    async refresh() {
      latest = await client.refresh();
      return { token: latest.accessToken, expiresAt: latest.expiresAt };
    },

    async logout() {
      latest = null;
      await client.logout();
    },

    getExpiry(token: string) {
      // A cookie session has no expiry the browser can read; the server refuses when it
      // is over, and the unauthorized guard handles that.
      if (token === COOKIE_SESSION) return null;
      return latest?.expiresAt ?? expiryFromJwt(token);
    },

    access: options.access,
    storageKeys: options.storageKeys,
    refreshSkewMs: options.refreshSkewMs,
    onLogin: options.onLogin,
    onLogout: options.onLogout,
    onExpired: options.onExpired,
    onError: options.onError,
  });

  // The hooks read the session they are given, so they are part of the same object
  // rather than a second file an app has to wire up and keep in step.
  const hooks = createAuthHooks<U, P, Q>({
    session: session as never,
    navigate: options.navigate as never,
    loginPath: options.loginPath ?? '/login',
    homePath: options.homePath ?? '/',
    forbiddenPath: options.forbiddenPath ?? '/403',
  });

  return Object.assign(session, {
    client,
    protectedRoute: hooks.protectedRoute,
    Can: hooks.Can,
    Protect: hooks.Protect,
    useAuth: hooks.useAuth,
    useUser: hooks.useUser,
    useCan: hooks.useCan,

    signIn(loginOptions: LoginOptions = {}) {
      return client.login(loginOptions);
    },

    /**
     * Finish a login and say where to go.
     *
     * The destination is checked before it is handed back, so an app that navigates to it
     * without looking cannot be turned into an open redirect by a poisoned login link.
     */
    async complete(params?: CallbackParams): Promise<string> {
      const callback = params ?? paramsFromUrl();
      if (!callback.code && !callback.error) {
        throw new OAuthError(
          'complete() found no callback parameters. It runs in the browser, on the redirect URI, where the code and the PKCE verifier both are.',
          'no_callback_params',
        );
      }
      await session.login(callback);
      return safeReturnTo(client.consumeReturnTo?.(), {
        fallback: '/',
        allowedOrigins: 'allowedReturnOrigins' in options.config
          ? options.config.allowedReturnOrigins
          : undefined,
      });
    },
  }) as AuthService<U, P, Q>;
}
