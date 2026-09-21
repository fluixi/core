/**
 * The contract the rest of the package is built on.
 *
 * `AuthClient` is the protocol: it knows how to start a login, turn a callback into
 * tokens, refresh them and end the session. It holds no application state and no
 * signals, which is what lets the same interface cover a browser client holding tokens
 * itself and a server-held session where the browser only ever has a cookie.
 *
 * `AuthService` is the application-facing half, built on `@fluixi/session`. It owns the
 * user, the status and the refresh schedule. It depends on an `AuthClient` and never on
 * a particular flow.
 */

/** Tokens as the authorization server returns them, normalised. */
export interface Tokens {
  accessToken: string;
  /** Absent in a flow where the server keeps it, and in the implicit-style responses. */
  refreshToken?: string;
  /** Epoch milliseconds. Derived from `expires_in` at the moment of the exchange. */
  expiresAt?: number;
  /** Present when `openid` was requested. */
  idToken?: string;
  tokenType?: string;
  scope?: string;
}

/** What a callback URL carries back from the authorization server. */
export interface CallbackParams {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

/**
 * Where a login should return to after the authorization server is done.
 *
 * Carried through the flow rather than kept in a module variable, because a redirect
 * unloads the page and takes any module state with it.
 */
export interface LoginOptions {
  /** Path to land on after a successful login. Defaults to the current location. */
  returnTo?: string;
  /** Extra authorization-request parameters, for `prompt`, `login_hint` and the rest. */
  params?: Record<string, string>;
}

/**
 * The protocol half.
 *
 * Every method is async because the server-held implementation talks to its own backend
 * for all of them, and the browser one needs crypto for PKCE.
 */
export interface AuthClient {
  /**
   * Send the visitor to the authorization server.
   *
   * Does not resolve in the browser implementation: the page navigates away. A caller
   * must treat it as the end of the current execution.
   */
  login(options?: LoginOptions): Promise<void>;

  /**
   * Turn the parameters on the callback URL into tokens.
   *
   * Throws when the server reported an error, or when `state` does not match what this
   * client sent, which is the CSRF check and is not optional.
   */
  handleCallback(params: CallbackParams): Promise<Tokens>;

  /** A fresh access token. Throws when the session cannot be extended. */
  refresh(): Promise<Tokens>;

  /** The user, from the userinfo endpoint or the server's own route. */
  fetchUser<U = unknown>(accessToken?: string): Promise<U>;

  /** End the session, locally and at the authorization server where that applies. */
  logout(options?: { returnTo?: string }): Promise<void>;

  /**
   * Tokens this client already holds, if any.
   *
   * Used on a cold load to restore a session without a network round trip. The
   * server-held implementation returns nothing, because the browser never has them.
   */
  restore?(): Promise<Tokens | null>;

  /** Where a login should return to, recorded when the flow started. */
  consumeReturnTo?(): string | null;
}

/** Endpoints, either given directly or discovered. */
export interface Endpoints {
  authorization: string;
  token: string;
  userinfo?: string;
  endSession?: string;
  jwks?: string;
  issuer?: string;
}

/** Shared by both client implementations. */
export interface BaseConfig {
  /** Where the callback lands. Must match what the authorization server was told. */
  redirectUri: string;
  /** Default `['openid', 'profile', 'email']`. */
  scopes?: string[];
  /** Where to send the browser after a logout completes. */
  postLogoutRedirectUri?: string;
  /** Extra parameters on every authorization request. */
  extraParams?: Record<string, string>;
}

/**
 * A public client that holds its own tokens.
 *
 * No client secret, because anything shipped to a browser is public. PKCE is what makes
 * that safe, and it is not optional here.
 */
export interface BrowserConfig extends BaseConfig {
  mode: 'browser';
  clientId: string;
  /** The OIDC issuer, for discovery. Give `endpoints` instead to skip the request. */
  issuer?: string;
  endpoints?: Endpoints;
  /**
   * Where the refresh token and the flow's temporary state are kept.
   *
   * `localStorage` survives a tab close, `sessionStorage` does not. Neither is safe from
   * a script running on the page, which is the tradeoff this mode accepts. Default:
   * `sessionStorage`, the narrower one.
   */
  storage?: 'local' | 'session';
  /**
   * Namespaces this client's stored values. Defaults to `clientId`.
   *
   * Set it when an app runs two clients against the same provider, so their in-flight
   * logins do not overwrite each other.
   */
  storageKey?: string;
  /**
   * How the token endpoint is told which client is calling.
   *
   * `body` puts the credentials in the form, which most providers accept. `basic` sends
   * an `Authorization: Basic` header, which some require. Default `body`.
   */
  tokenAuthMethod?: 'body' | 'basic';
}

/**
 * A client whose tokens live on the application's own server.
 *
 * The browser holds a cookie and nothing else, so a script on the page has no token to
 * steal. Every method here is a call to a route this package's server half provides.
 */
export interface ServerConfig extends BaseConfig {
  mode: 'server';
  /** Where the server routes are mounted. Default `/auth`. */
  basePath?: string;
}

export type AuthConfig = BrowserConfig | ServerConfig;

/** Thrown for anything the authorization server refused. */
export class OAuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly description?: string,
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}
