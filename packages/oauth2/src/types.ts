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
  /** RFC 7662. Present when the provider lets a service ask about an opaque token. */
  introspection?: string;
  issuer?: string;
}

/**
 * Where the user comes from, when it is not the provider's OIDC userinfo.
 *
 * The default needs none of this: discovery finds `userinfo_endpoint` and the claims are
 * returned as they arrive. This is for the common real case, an app whose own API knows
 * things the identity provider does not, like the roles this user has here.
 *
 * Between the default and writing `fetchUser` yourself, which is still there for anything
 * this does not cover.
 */
export interface UserInfoOptions<U = unknown> {
  /**
   * The endpoint, when it is not the discovered one. Absolute, or relative to the page.
   *
   * Given this, the OIDC subject check is skipped: it compares against the id token and
   * only means something for the provider's own userinfo. An app's `/me` answers in its
   * own shape and is trusted because it is the app's own server.
   */
  url?: string;
  /**
   * Turn the response into the shape the app wants.
   *
   * The place to unwrap an envelope: `(raw) => raw.data`, or a full mapping onto the
   * app's user type. Receives the parsed body and the access token that fetched it.
   */
  map?: (raw: any, accessToken: string) => U | Promise<U>;
  /** Added to the request, for an API that wants an api key or a tenant header. */
  headers?: Record<string, string>;
  /**
   * Sent with the request. `include` for an API that answers from a cookie rather than
   * the bearer token.
   */
  credentials?: RequestCredentials;
  /** `GET` unless the API insists otherwise. */
  method?: string;
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
  /** Where the user comes from, when it is not the provider's OIDC userinfo. */
  userInfo?: UserInfoOptions;
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
