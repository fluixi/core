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
import { expiryFromJwt } from './pkce.js';
import { createBrowserClient } from './browser.js';
import { createServerClient, COOKIE_SESSION } from './server-client.js';
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
}

/**
 * What an application injects.
 *
 * The session's own surface (`user`, `token`, `status`, `isAuthenticated`, `can`, …) plus
 * the three things a redirect flow adds.
 */
export interface AuthService<U, P = unknown, Q = (p: P) => boolean>
  extends Session<U, AuthCredentials, unknown, P, Q> {
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

/** The parameters on the current URL, which is what a callback route has. */
export function paramsFromUrl(url: string | URL = location.href): CallbackParams {
  const { searchParams } = new URL(String(url));
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
  return options.config.mode === 'server'
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

  return Object.assign(session, {
    client,

    signIn(loginOptions: LoginOptions = {}) {
      return client.login(loginOptions);
    },

    async complete(params?: CallbackParams): Promise<string> {
      await session.login(params ?? paramsFromUrl());
      return client.consumeReturnTo?.() ?? '/';
    },
  }) as AuthService<U, P, Q>;
}
