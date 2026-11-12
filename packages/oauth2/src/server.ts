/**
 * `@fluixi/oauth2/server`: the routes behind `tokens: 'server'`.
 *
 * The browser never sees a token here. The authorization code is exchanged on this side,
 * the tokens are sealed into an httpOnly cookie, and the page gets a cookie it cannot
 * read. That is the difference the mode exists for: a script on the page has nothing to
 * steal.
 *
 * Mount it as middleware in a @fluixi/start app:
 *
 * ```ts
 * // src/middleware.ts
 * import { defineMiddleware } from '@fluixi/start';
 * import { oauthRoutes } from '@fluixi/oauth2/server';
 *
 * const auth = oauthRoutes({
 *   issuer: process.env.OIDC_ISSUER!,
 *   clientId: process.env.OIDC_CLIENT_ID!,
 *   clientSecret: process.env.OIDC_CLIENT_SECRET!,
 *   redirectUri: 'http://localhost:3000/auth/callback',
 *   cookieSecret: process.env.SESSION_SECRET!,
 * });
 *
 * export default defineMiddleware([auth, ...]);
 * ```
 *
 * The cookie itself is `@fluixi/session/server`, which knows nothing about OAuth: it
 * seals a value and reads it back. What this file adds is the flow that decides what
 * goes in it.
 */
import { createSessionCookie } from '@fluixi/session/server';
import { safeReturnTo } from './return-to.js';
import {
  applyClientAuth,
  type ClientAuth,
  type ClientAuthMethodInput,
} from './client-auth.js';
import { discover } from './discovery.js';
import { idTokenClaims, logoutTokenVerifier, memoryLogouts, type LogoutStore } from './backchannel.js';
import { createPkcePair, createStateValue, expiryFrom, timingSafeEqual } from './pkce.js';
import { OAuthError, type Endpoints } from './types.js';
import { createDpopKey, exportDpopKey, importDpopKey, nonceFrom, proofFor, type DpopKey, type StoredDpopKey } from './dpop.js';
import { defineModule, type AppModule } from '@fluixi/start/app';

export interface OAuthRoutesConfig {
  issuer?: string;
  endpoints?: Endpoints;
  clientId: string;
  /** A server-held client can keep one, which is what makes it confidential. */
  clientSecret?: string;
  redirectUri: string;
  scopes?: string[];
  /** Where the routes are mounted. Must agree with the browser client. Default `/auth`. */
  basePath?: string;
  /** At least 32 bytes. The cookie is encrypted with a key derived from it. */
  cookieSecret: string;
  cookieName?: string;
  /** Default: true in production. Set false only for plain-http local work. */
  secureCookie?: boolean;
  /** Where to send the browser after a login with no recorded destination. */
  defaultReturnTo?: string;
  /**
   * Where back-channel logouts are kept, between the route that hears them and the requests
   * that end their sessions. Default: this process's memory, right for one instance; several
   * instances share one (see `LogoutStore`).
   */
  logouts?: LogoutStore;
  /**
   * Origins a login may return to besides this server's own.
   *
   * A destination arrives on the query string, so it is attacker controlled. Anything
   * that is not a path on this origin is refused unless it is named here. Adding an
   * origin here makes it a valid landing place for an authenticated visitor, so add only
   * ones you control.
   */
  allowedReturnOrigins?: string[];
  /**
   * Query parameters of the login route passed on to the authorization request, for what a
   * provider defines beyond OpenID Connect (an organisation, a tenant). Only these are forwarded;
   * the ones the client sets itself cannot be named.
   */
  authorizeParams?: readonly string[];
  /**
   * How this server authenticates to the token endpoint.
   *
   * `private_key_jwt` needs `privateKey` and sends no secret at all, which some providers
   * require: Okta's org authorization server refuses anything else.
   */
  tokenAuthMethod?: ClientAuthMethodInput;
  /** The signing key for `private_key_jwt`, as a JWK. */
  privateKey?: Record<string, unknown>;
  /** Names which key, for a provider holding more than one. */
  keyId?: string;
  /** Default `RS256`. */
  assertionAlgorithm?: string;
  /**
   * How long `sessionLocals` may reuse a userinfo response, in milliseconds.
   *
   * Without this every server render calls the provider, which is a round trip per page
   * and makes the provider being up a condition of rendering at all.
   *
   * The cost is freshness: a session disabled at the provider keeps rendering as signed
   * in until the entry expires. Short by default for that reason, and worth leaving
   * short. `0` disables it and asks every time.
   */
  userCacheMs?: number;
  /**
   * How long a token request may take, in milliseconds, before it is abandoned. Default
   * 10 000. A renewal abandoned this way may have been processed, so its refresh token is not
   * sent again and the session ends; the provider's own session usually signs the person back
   * in without a prompt.
   */
  tokenTimeoutMs?: number;
  /** Map the provider's userinfo onto the app's own shape. */
  mapUser?: (claims: Record<string, unknown>, accessToken: string) => unknown;
  /**
   * Bind tokens to a key with DPoP (RFC 9449), which a provider may require: an Okta org
   * that mandates it refuses a server-mode client without it.
   *
   * The key is made per session at the code exchange and kept in the encrypted session
   * cookie, since a refresh token is bound to the key that obtained it and a refresh with
   * another key is refused. Needs `jose`.
   */
  dpop?: boolean;
  /** Default `ES256`. Must be in the provider's `dpop_signing_alg_values_supported`. */
  dpopAlgorithm?: string;
  /**
   * What a page request from a signed-out visitor does.
   *
   * - `manual` (default): the page renders signed out and offers a way to sign in.
   * - `silent`: the visitor is sent to the provider with `prompt=none`. Someone already
   *   signed in there comes back signed in without a click; anyone else comes straight back
   *   and the page renders signed out, and is not asked again for `silentRecheck` seconds.
   *   Single sign-on without forcing a sign-in on a public page.
   * - `required`: the visitor is sent to sign in. For an app with nothing to show to a
   *   stranger, an admin console say.
   *
   * Only page loads are redirected (a GET for a document), never an API or asset request.
   */
  signIn?: 'manual' | 'silent' | 'required';
  /**
   * How long `silent` takes a "nobody signed in" answer as current, in seconds. Default 60.
   * Someone who signs in at the provider afterwards (in another app, another tab) is picked
   * up on their first page load after it. Longer saves round trips for anonymous visitors.
   */
  silentRecheck?: number;
  /** Paths `silent` and `required` leave alone, besides the auth routes: `/health`, `/legal`. */
  publicPaths?: string[];
  /**
   * Paths that always need someone signed in, whatever `signIn` says for the rest: a public
   * site with a private area (`/o` for a workspace) sends a signed-out page load there to
   * sign in, and shows the other pages as `signIn` decides.
   */
  protectedPaths?: string[];
  /**
   * Authorize parameters a silent sign-in for a missing scope carries over, read from the
   * current access token's claims (a JWT's payload; empty for an opaque token). When `scopes`
   * gains one that sessions made earlier lack, the next page load signs in again with
   * `prompt=none` to get it, and a token bound to something (an organization) has to stay
   * bound: `(claims) => ({ organization: String(claims.org_id ?? '') })`. Empty values are left out.
   */
  rescopeParams?: (claims: Record<string, unknown>) => Record<string, string>;
}

/** Ends the state of a sign-in started again after an answer the browser had no flow for. */
const RETRY_MARK = '.retry';
// OpenID Connect Core's prompts, and `create` from its user registration specification.
const PROMPTS = new Set(['none', 'login', 'consent', 'select_account', 'create']);
const DEFAULT_SCOPES = ['openid', 'profile', 'email'];
/** Set by the login route itself: forwarding one from the query string would let a link change it. */
const CLIENT_PARAMS = new Set(['response_type', 'client_id', 'redirect_uri', 'scope', 'state', 'nonce', 'code_challenge', 'code_challenge_method', 'prompt', 'request', 'request_uri']);

/** What a `prompt=none` request ends with when the provider would have to ask the visitor. */
const SILENT_REFUSALS = new Set([
  'login_required',
  'consent_required',
  'interaction_required',
  'account_selection_required',
]);

/**
 * The cookie saying the provider was just asked silently and knew nobody. It holds the
 * `session_state` that answer carried, which the page watches for a later sign-in. It
 * expires soon on purpose: kept for the browser session, it hid a sign-in made at the
 * provider while no page was open to notice.
 */
function checkedCookie(config: OAuthRoutesConfig, sessionState?: string | null): { name: string; header: string } {
  const name = `${config.cookieName ?? 'fx_session'}_checked`;
  const secure = config.secureCookie ?? process.env.NODE_ENV === 'production';
  const maxAge = Math.max(0, Math.floor(config.silentRecheck ?? 60));
  const value = sessionState ?? '1';
  return { name, header: `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}` };
}

/** A `session_state` as Session Management builds it, `<hash>.<salt>`; anything else is dropped. */
function sessionStateFrom(url: URL): string | undefined {
  const value = url.searchParams.get('session_state');
  return value && /^[\w-]{1,128}\.[\w-]{1,64}$/.test(value) ? value : undefined;
}

/** A document load, as opposed to a fetch, an asset or a form post. */
function isPageRequest(request: Request): boolean {
  if (request.method !== 'GET') return false;
  const dest = request.headers.get('sec-fetch-dest');
  if (dest) return dest === 'document';
  return (request.headers.get('accept') ?? '').includes('text/html');
}

function cookieValue(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

function hasCookie(request: Request, name: string): boolean {
  return cookieValue(request, name) !== undefined;
}

/** Whether `pathname` is `path` or below it. */
function under(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(path.endsWith('/') ? path : `${path}/`);
}

/** Where `signIn` sends a signed-out visitor's page request, or null to render it as is. */
function signInRedirect(request: Request, config: OAuthRoutesConfig): Response | null {
  if (!isPageRequest(request)) return null;
  const url = new URL(request.url);
  const base = (config.basePath ?? '/auth').replace(/\/$/, '');
  const guarded = (config.protectedPaths ?? []).some((path) => under(url.pathname, path));
  const mode = guarded ? 'required' : (config.signIn ?? 'manual');
  if (mode === 'manual') return null;
  if ([base, ...(config.publicPaths ?? [])].some((path) => under(url.pathname, path))) return null;
  // Back from a refused sign-in: show the page and its error, or a required sign-in would
  // send the visitor straight back to the provider, which refuses again, in a loop.
  if (url.searchParams.has('auth_error')) return null;
  if (mode === 'silent' && hasCookie(request, checkedCookie(config).name)) return null;
  const login = new URLSearchParams({ returnTo: url.pathname + url.search });
  if (mode === 'silent') login.set('prompt', 'none');
  return new Response(null, { status: 302, headers: { location: `${base}/login?${login}` } });
}

/** A JWT's payload, or nothing: the token is the session's own, so it is read, not verified. */
function jwtClaims(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  if (!part) return {};
  try {
    const claims: unknown = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    return claims && typeof claims === 'object' ? (claims as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * The scopes the app asks for that this session was not granted. `offline_access` is left out:
 * a provider grants it to the refresh token, not the access token. A session that recorded no
 * scope is taken to have what was asked (RFC 6749 §5.1: the answer omits it when equal).
 */
function missingScopes(config: OAuthRoutesConfig, session: SessionPayload): string[] {
  if (session.scope === undefined) return [];
  const granted = new Set(session.scope.split(' ').filter(Boolean));
  return (config.scopes ?? DEFAULT_SCOPES).filter((scope) => scope !== 'offline_access' && !granted.has(scope));
}

/**
 * The cookie saying a silent sign-in was tried for these missing scopes. Its value is them, so
 * a provider that still withholds one is not asked again on every page load, while a scope
 * added later is.
 */
function rescopeCookie(config: OAuthRoutesConfig, missing?: string[]): { name: string; header: string } {
  const name = `${config.cookieName ?? 'fx_session'}_rescope`;
  const secure = config.secureCookie ?? process.env.NODE_ENV === 'production';
  const value = encodeURIComponent((missing ?? []).join(' '));
  return { name, header: `${name}=${value}; Path=/; Max-Age=${60 * 60 * 24}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}` };
}

/**
 * Where a signed-in page request goes when its session lacks a scope the app now asks for: a
 * silent sign-in, once per set of missing scopes, which keeps the session if the provider has
 * to ask the person something. Null to render the page as is.
 */
function rescopeRedirect(request: Request, config: OAuthRoutesConfig, session: SessionPayload): Response | null {
  if (!isPageRequest(request)) return null;
  const missing = missingScopes(config, session);
  if (!missing.length) return null;
  const url = new URL(request.url);
  const base = (config.basePath ?? '/auth').replace(/\/$/, '');
  if ([base, ...(config.publicPaths ?? [])].some((path) => under(url.pathname, path))) return null;
  const marker = rescopeCookie(config, missing);
  if (cookieValue(request, marker.name) === encodeURIComponent(missing.join(' '))) return null;
  const login = new URLSearchParams({ returnTo: url.pathname + url.search, prompt: 'none' });
  for (const [name, value] of Object.entries(config.rescopeParams?.(jwtClaims(session.accessToken)) ?? {})) {
    if (value) login.set(name, value);
  }
  return new Response(null, { status: 302, headers: { location: `${base}/login?${login}`, 'set-cookie': marker.header } });
}

/**
 * Nonces providers asked for, per origin, shared by the routes and `sessionLocals`. A nonce
 * is the server's to set (RFC 9449 §8, §9), so the latest one it sent is the one to use.
 */
const dpopNonces = new Map<string, string>();

/** Put a proof for this request on `headers`, with the nonce this origin last asked for. */
async function prove(
  headers: Record<string, string>,
  key: DpopKey,
  method: string,
  url: string,
  accessToken?: string,
): Promise<void> {
  headers.dpop = await proofFor(key, { method, url, accessToken, nonce: dpopNonces.get(new URL(url).origin) });
}

/** Record a nonce the server sent. True when it refused the request with one not seen before. */
function learnNonce(url: string, response: Response): boolean {
  const offered = nonceFrom(response);
  if (!offered) return false;
  const origin = new URL(url).origin;
  const fresh = offered !== dpopNonces.get(origin);
  dpopNonces.set(origin, offered);
  return fresh && !response.ok;
}

/**
 * A request carrying the session's access token: the `DPoP` scheme and a proof bound to the
 * token when the provider bound it, `Bearer` otherwise.
 */
/** `fetch`, as the signed-in user. What `locals.auth.fetch` is. */
export type AuthorizedFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

/**
 * Sends a request with the session's access token: as a bearer token, or with a DPoP proof
 * for this method and URL when the token is bound to the session's key. A nonce the server
 * asks for is learned and the request sent once more, so the body must be one that can be
 * sent twice (a string, not a stream).
 */
async function sendAs(session: SessionPayload, input: string | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);
  const method = (init.method ?? 'GET').toUpperCase();
  const key =
    session.dpop && session.tokenType?.toLowerCase() === 'dpop' ? await importDpopKey(session.dpop) : null;
  const send = async () => {
    const credentials: Record<string, string> = {
      authorization: `${key ? 'DPoP' : 'Bearer'} ${session.accessToken}`,
    };
    if (key) await prove(credentials, key, method, url, session.accessToken);
    const headers = new Headers(init.headers);
    for (const [name, value] of Object.entries(credentials)) headers.set(name, value);
    return fetch(url, { ...init, method, headers });
  };
  let response = await send();
  if (key && learnNonce(url, response)) response = await send();
  return response;
}

const withToken = (url: string, session: SessionPayload): Promise<Response> => sendAs(session, url);

/** What the cookie carries. Never leaves this side. */
interface SessionPayload {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: number;
  /** `DPoP` when the provider bound the token to `dpop`, else `Bearer`. */
  tokenType?: string;
  /** This session's DPoP key. Never sent: only proofs signed with it are. */
  dpop?: StoredDpopKey;
  /** What the provider's answer said about its browser session, for the page to watch. */
  sessionState?: string;
  /** The scopes the provider granted, as its token answer listed them; absent when it did not. */
  scope?: string;
  /** The flow's temporary values, kept only between the redirect and the callback. */
  pending?: { verifier: string; state: string; returnTo?: string; silent?: boolean };
}

/**
 * The provider did not process the token request: it answered 429 or 5xx, or the connection
 * never opened. The same request may be sent again after `retryAfterMs`.
 */
class ProviderUnavailable extends OAuthError {
  constructor(readonly retryAfterMs: number) {
    super('The authorization server is unavailable.', 'temporarily_unavailable');
  }
}

/**
 * The request may have been processed, but its answer is unusable: it timed out, the
 * connection broke after it was sent, or a success came back without an access token. A
 * refresh token sent this way may already have been rotated.
 */
class AnswerLost extends OAuthError {
  constructor(what: string) {
    super(`The token request's answer was lost (${what}).`, 'answer_lost');
  }
}

/** Connection failures that happen before the request is sent. */
const NOT_SENT = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH', 'UND_ERR_CONNECT_TIMEOUT']);
const RETRY_DEFAULT_MS = 5_000;
const RETRY_MAX_MS = 300_000;

/** The pause a 429 or 5xx asks for (`Retry-After`, seconds or a date), within sane bounds. */
function retryAfter(response: Response): number {
  const header = response.headers.get('retry-after');
  if (!header) return RETRY_DEFAULT_MS;
  const seconds = Number(header);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
  return Number.isFinite(ms) ? Math.min(Math.max(ms, 1_000), RETRY_MAX_MS) : RETRY_DEFAULT_MS;
}

/** What a failed `fetch` means for the request: never sent, or possibly processed. */
function unanswered(error: unknown): OAuthError {
  const code = (error as { cause?: { code?: string } } | null)?.cause?.code;
  if (code && NOT_SENT.has(code)) return new ProviderUnavailable(RETRY_DEFAULT_MS);
  return new AnswerLost(code ?? (error instanceof Error ? error.name : 'no answer'));
}

/** Endpoints, client authentication and the token request, for the routes and `sessionLocals`. */
function tokenClient(config: OAuthRoutesConfig) {
  const timeoutMs = config.tokenTimeoutMs ?? 10_000;
  let endpoints: Endpoints | null = config.endpoints ?? null;
  const resolve = async (): Promise<Endpoints> => {
    if (endpoints) return endpoints;
    if (!config.issuer) {
      throw new OAuthError('Give oauthRoutes an issuer or endpoints.', 'missing_issuer');
    }
    endpoints = await discover(config.issuer);
    return endpoints;
  };

  const clientAuth: ClientAuth = {
    clientId: config.clientId,
    // `client_secret_post` by default here, which is what this half has always sent, so
    // an existing deployment keeps working.
    method: config.tokenAuthMethod ?? (config.clientSecret ? 'body' : 'none'),
    clientSecret: config.clientSecret,
    privateKey: config.privateKey,
    keyId: config.keyId,
    assertionAlgorithm: config.assertionAlgorithm,
  };

  async function tokenRequest(body: Record<string, string>, key: DpopKey | null = null) {
    const { token } = await resolve();
    // Built afresh for a retry: a `private_key_jwt` assertion carries a `jti`, and sending
    // the same one twice can be refused as a replay.
    const attempt = async () => {
      const headers: Record<string, string> = {
        'content-type': 'application/x-www-form-urlencoded',
      };
      const form = new URLSearchParams(body);
      await applyClientAuth(clientAuth, token, headers, form);
      if (key) await prove(headers, key, 'POST', token);
      return fetch(token, { method: 'POST', headers, body: form.toString(), signal: AbortSignal.timeout(timeoutMs) });
    };

    let response: Response;
    let payload: Record<string, unknown> | null = null;
    try {
      response = await attempt();
      if (key && learnNonce(token, response)) response = await attempt();
      if (response.status === 429 || response.status >= 500) throw new ProviderUnavailable(retryAfter(response));
      payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    } catch (error) {
      throw error instanceof OAuthError ? error : unanswered(error);
    }
    if (!response.ok) {
      throw new OAuthError(
        String(payload?.error ?? 'token_request_failed'),
        String(payload?.error ?? 'token_request_failed'),
      );
    }
    // A token endpoint's success always carries one (RFC 6749 5.1). Anything else (a proxy's
    // page, a truncated body) is not a session, and the provider may have rotated the token.
    if (typeof payload?.access_token !== 'string' || !payload.access_token) {
      throw new AnswerLost('a success without an access token');
    }
    return payload;
  }

  return { resolve, tokenRequest, clientAuth };
}

/**
 * Renewals in flight or just finished, by the refresh token they spent. The provider rotates
 * refresh tokens and treats a second use of one as theft, revoking the whole family: requests
 * that arrive together with the same expired cookie (a page and its server functions) must
 * share one renewal, and one that arrives a moment later with the old cookie still gets its
 * result. One process only; replicas need the provider to allow a short reuse window.
 */
const renewals = new Map<string, { until: number; result: Promise<SessionPayload | null> }>();
const RENEWAL_REUSE_MS = 30_000;
/** How long a refused or possibly rotated refresh token stays recorded, so it is not sent again. */
const SPENT_MS = 5 * 60_000;

/** The session with fresh tokens, or null when the provider refuses to renew it. */
function renew(
  current: SessionPayload,
  tokenRequest: ReturnType<typeof tokenClient>['tokenRequest'],
): Promise<SessionPayload | null> {
  const refreshToken = current.refreshToken!;
  const now = Date.now();
  for (const [key, entry] of renewals) if (entry.until <= now) renewals.delete(key);
  const known = renewals.get(refreshToken);
  if (known) return known.result;
  const result = (async () => {
    // The key that obtained the refresh token, or the provider refuses the refresh.
    const key = current.dpop ? await importDpopKey(current.dpop) : null;
    const payload = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken }, key);
    return {
      accessToken: String(payload.access_token ?? ''),
      // A provider that rotates refresh tokens sends a new one; one that does not
      // expects the old one to keep working.
      refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : refreshToken,
      idToken: typeof payload.id_token === 'string' ? payload.id_token : current.idToken,
      expiresAt: expiryFrom(payload.expires_in),
      tokenType: typeof payload.token_type === 'string' ? payload.token_type : current.tokenType,
      dpop: current.dpop,
      sessionState: current.sessionState,
      scope: typeof payload.scope === 'string' ? payload.scope : current.scope,
    } satisfies SessionPayload;
  })().catch((error: unknown) => {
    // Not processed (the provider down or busy): nothing was spent. Ask again after the pause.
    if (error instanceof ProviderUnavailable) {
      renewals.set(refreshToken, { until: Date.now() + error.retryAfterMs, result });
      throw error;
    }
    // Refused, or answered in a way that was lost after the provider may have rotated the
    // token: the session is over either way. Sending the token again would be a replay, which
    // the provider answers by ending every session of this sign-in.
    if (error instanceof OAuthError) {
      renewals.set(refreshToken, { until: Date.now() + SPENT_MS, result });
      return null;
    }
    renewals.delete(refreshToken);
    throw error;
  });
  renewals.set(refreshToken, { until: now + RENEWAL_REUSE_MS, result });
  return result;
}

/** Renewed a little before it runs out, so a request does not reach an API with a dying token. */
const EXPIRY_SKEW_MS = 30_000;
const expired = (session: SessionPayload) =>
  session.expiresAt !== undefined && session.expiresAt - EXPIRY_SKEW_MS <= Date.now();

/**
 * The middleware.
 *
 * Handles `<basePath>/login`, `/callback`, `/refresh`, `/me`, `/session-check` and
 * `/logout`, and passes anything else along untouched.
 */
// One default store per configuration, so the routes and sessionLocals built from it share it.
const defaultLogouts = new WeakMap<OAuthRoutesConfig, LogoutStore>();
function logoutsOf(config: OAuthRoutesConfig): LogoutStore {
  if (config.logouts) return config.logouts;
  let store = defaultLogouts.get(config);
  if (!store) defaultLogouts.set(config, (store = memoryLogouts()));
  return store;
}

/** Whether the provider has ended this session over the back channel. */
async function endedAtProvider(config: OAuthRoutesConfig, session: SessionPayload): Promise<boolean> {
  const id = idTokenClaims(session.idToken);
  if (!id.sid && !id.sub) return false;
  return logoutsOf(config).ended({ sid: id.sid, sub: id.sub, since: (id.iat ?? 0) * 1000 });
}

export function oauthRoutes(config: OAuthRoutesConfig) {
  for (const name of config.authorizeParams ?? []) {
    if (CLIENT_PARAMS.has(name)) throw new Error(`authorizeParams cannot include "${name}": the login route sets it.`);
  }
  const { resolve, tokenRequest, clientAuth } = tokenClient(config);
  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });
  const base = (config.basePath ?? '/auth').replace(/\/$/, '');
  const scopes = config.scopes ?? DEFAULT_SCOPES;
  const cookie = createSessionCookie<SessionPayload>({
    secret: config.cookieSecret,
    name: config.cookieName,
    secure: config.secureCookie,
  });

  return async function middleware(
    request: Request,
    next: () => Promise<Response>,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${base}/`)) return next();

    const route = url.pathname.slice(base.length);
    const session = async (): Promise<SessionPayload | null> => {
      const current = await cookie.read(request);
      return current && (await endedAtProvider(config, current)) ? null : current;
    };

    if (route === '/backchannel-logout') {
      // The provider, server to server: a session this app took part in has ended there.
      const headers = { 'cache-control': 'no-store' };
      if (request.method !== 'POST') return json({ error: 'invalid_request' }, 405, headers);
      try {
        const form = await request.formData();
        const token = form.get('logout_token');
        if (typeof token !== 'string' || !token) throw new Error('no logout_token');
        const endpoints = await resolve();
        const issuer = endpoints.issuer ?? config.issuer;
        if (!issuer) throw new Error('no issuer');
        if (!endpoints.jwks) throw new Error('no jwks_uri');
        // Read fresh for each logout (they are rare), so a rotated key is always known.
        const jwks = (await (await fetch(endpoints.jwks)).json()) as { keys: unknown[] };
        const entry = await logoutTokenVerifier({ issuer, clientId: config.clientId, jwks })(token);
        await logoutsOf(config).add(entry);
        return new Response(null, { status: 200, headers });
      } catch {
        return json({ error: 'invalid_request' }, 400, headers);
      }
    }

    if (route === '/login') {
      let authorization: string;
      try {
        ({ authorization } = await resolve());
      } catch (error) {
        if (!(error instanceof OAuthError) || error.code !== 'discovery_unreachable') throw error;
        // The provider is down: back to the app, which can say so, rather than an error page.
        const back = safeReturnTo(url.searchParams.get('returnTo'), {
          fallback: config.defaultReturnTo ?? '/',
          origin: url.origin,
          allowedOrigins: config.allowedReturnOrigins,
        });
        const target = new URL(back, url.origin);
        target.searchParams.set('auth_error', 'provider_unreachable');
        const location = target.origin === url.origin ? target.pathname + target.search : target.toString();
        return new Response(null, { status: 302, headers: { location } });
      }
      const { verifier, challenge } = await createPkcePair();
      // A retry carries its mark in the state itself: the one place that survives the trip
      // when the cookie does not, so a second failed attempt is told apart from the first.
      const retry = url.searchParams.get('retry') === '1';
      const state = createStateValue() + (retry ? RETRY_MARK : '');

      const target = new URL(authorization);
      target.searchParams.set('response_type', 'code');
      target.searchParams.set('client_id', config.clientId);
      target.searchParams.set('redirect_uri', config.redirectUri);
      target.searchParams.set('scope', scopes.join(' '));
      target.searchParams.set('state', state);
      target.searchParams.set('code_challenge', challenge);
      target.searchParams.set('code_challenge_method', 'S256');
      // Only the values OpenID Connect defines; anything else from the query string is dropped.
      const prompt = url.searchParams.get('prompt');
      if (prompt && PROMPTS.has(prompt)) target.searchParams.set('prompt', prompt);
      for (const name of config.authorizeParams ?? []) {
        const value = url.searchParams.get(name);
        if (value) target.searchParams.set(name, value);
      }

      // The verifier goes in the cookie, which is the only thing that survives the trip
      // and is not readable by the page. A silent sign-in from a signed-in page (a scope the
      // session lacks) keeps the session beside it, so a provider that has to ask leaves it.
      const kept = prompt === 'none' ? await session() : null;
      const pendingCookie = await cookie.write(
        {
          ...(kept?.accessToken ? { ...kept, pending: undefined } : { accessToken: '' }),
          pending: {
            verifier,
            state,
            // Checked here rather than only at the callback, so a refused destination
            // never reaches the cookie and cannot be read back out of it later.
            returnTo: safeReturnTo(url.searchParams.get('returnTo'), {
              fallback: '',
              origin: url.origin,
              allowedOrigins: config.allowedReturnOrigins,
            }) || undefined,
            silent: prompt === 'none' || undefined,
          },
        },
        // Ten minutes: long enough to sign in, short enough that an abandoned attempt
        // does not sit in the browser. A kept session keeps its own lifetime.
        kept?.accessToken ? undefined : { maxAge: 600 },
      );

      return new Response(null, {
        status: 302,
        headers: {
          location: target.toString(),
          'set-cookie': pendingCookie,
        },
      });
    }

    if (route === '/callback') {
      const current = await session();
      const pending = current?.pending;
      const error = url.searchParams.get('error');
      if (error) {
        // Back to the page the flow started from, never a JSON answer the visitor reads.
        const ours = !!pending && timingSafeEqual(pending.state, url.searchParams.get('state') ?? '');
        let location = safeReturnTo(ours ? pending.returnTo ?? config.defaultReturnTo : config.defaultReturnTo, {
          fallback: '/',
          origin: url.origin,
          allowedOrigins: config.allowedReturnOrigins,
        });
        const headers = new Headers();
        if (ours && pending.silent && SILENT_REFUSALS.has(error) && current?.accessToken) {
          // Signed in already and only after a scope: the session stays as it was.
          headers.set('set-cookie', await cookie.write({ ...current, pending: undefined }));
          headers.set('location', location);
          return new Response(null, { status: 302, headers });
        }
        headers.append('set-cookie', cookie.clear());
        if (ours && pending.silent && SILENT_REFUSALS.has(error)) {
          // Nobody signed in at the provider: remember it was asked, and show the page as is.
          headers.append('set-cookie', checkedCookie(config, sessionStateFrom(url)).header);
        } else {
          const target = new URL(location, url.origin);
          target.searchParams.set('auth_error', error);
          location = target.origin === url.origin ? target.pathname + target.search : target.toString();
        }
        headers.set('location', location);
        return new Response(null, { status: 302, headers });
      }

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code) return json({ error: 'no_code' }, 400);
      if (!pending || !state || !timingSafeEqual(pending.state, state)) {
        // An answer this browser has no flow for: its cookie expired (a sign-in that took longer
        // than ten minutes, a provider page refreshed long after), or another tab started a
        // newer one. Already signed in, the answer is a leftover. Otherwise start again once,
        // and only then give up, on a page rather than with JSON.
        const home = safeReturnTo(config.defaultReturnTo, { fallback: '/', origin: url.origin, allowedOrigins: config.allowedReturnOrigins });
        if (current?.accessToken) return new Response(null, { status: 302, headers: { location: home } });
        if (!state?.endsWith(RETRY_MARK)) {
          return new Response(null, { status: 302, headers: { location: `${base}/login?retry=1` } });
        }
        const target = new URL(home, url.origin);
        target.searchParams.set('auth_error', 'state_mismatch');
        return new Response(null, {
          status: 302,
          headers: {
            location: target.origin === url.origin ? target.pathname + target.search : target.toString(),
            'set-cookie': cookie.clear(),
          },
        });
      }

      // The token is bound here, at the exchange, so this is where the session's key is made.
      const key = config.dpop
        ? await createDpopKey(config.dpopAlgorithm, { extractable: true })
        : null;
      let payload: Record<string, unknown>;
      try {
        payload = await tokenRequest(
          {
            grant_type: 'authorization_code',
            code,
            redirect_uri: config.redirectUri,
            code_verifier: pending.verifier,
          },
          key,
        );
      } catch (error) {
        if (!(error instanceof OAuthError)) throw error;
        // Back to the app with the reason, as for a refusal at the provider, rather than an
        // error page: a provider that did not answer in time, or the code it refused.
        const unreachable = error.code === 'temporarily_unavailable' || error.code === 'answer_lost';
        const back = safeReturnTo(pending.returnTo ?? config.defaultReturnTo, {
          fallback: '/',
          origin: url.origin,
          allowedOrigins: config.allowedReturnOrigins,
        });
        const target = new URL(back, url.origin);
        target.searchParams.set('auth_error', unreachable ? 'provider_unreachable' : error.code);
        return new Response(null, {
          status: 302,
          headers: {
            location: target.origin === url.origin ? target.pathname + target.search : target.toString(),
            'set-cookie': cookie.clear(),
          },
        });
      }

      const signedIn = await cookie.write({
        accessToken: String(payload.access_token ?? ''),
        refreshToken:
          typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined,
        idToken: typeof payload.id_token === 'string' ? payload.id_token : undefined,
        expiresAt: expiryFrom(payload.expires_in),
        tokenType: typeof payload.token_type === 'string' ? payload.token_type : undefined,
        dpop: key ? await exportDpopKey(key) : undefined,
        sessionState: sessionStateFrom(url),
        scope: typeof payload.scope === 'string' ? payload.scope : undefined,
      });

      return new Response(null, {
        status: 302,
        headers: {
          // Checked again on the way out. The cookie cannot be forged, but a value that
          // was acceptable when the flow started should still be one when it finishes,
          // and this is the line that actually performs the redirect.
          location: safeReturnTo(pending.returnTo ?? config.defaultReturnTo, {
            fallback: '/',
            origin: url.origin,
            allowedOrigins: config.allowedReturnOrigins,
          }),
          'set-cookie': signedIn,
        },
      });
    }

    if (route === '/refresh') {
      const current = await session();
      if (!current?.refreshToken) return json({ error: 'no_session' }, 401);
      const renewed = await renew(current, tokenRequest);
      if (!renewed) return json({ error: 'refresh_refused' }, 401, { 'set-cookie': cookie.clear() });
      return json({ ok: true }, 200, { 'set-cookie': await cookie.write(renewed) });
    }

    if (route === '/me') {
      const current = await session();
      if (!current?.accessToken) return json({ error: 'no_session' }, 401);

      const { userinfo } = await resolve();
      if (!userinfo) return json({ error: 'no_userinfo' }, 501);

      const response = await withToken(userinfo, current);
      if (!response.ok) return json({ error: 'userinfo_failed' }, response.status);

      const claims = (await response.json()) as Record<string, unknown>;
      return json(config.mapUser ? config.mapUser(claims, current.accessToken) : claims);
    }

    if (route === '/session-check') {
      // What the page needs to watch the provider's session: its check page, this client,
      // and the last answer's session_state, signed in or not. Nothing secret: the state is
      // a salted hash bound to this origin.
      const { checkSession } = await resolve().catch(() => ({ checkSession: undefined }));
      const current = await session();
      const checked = cookieValue(request, checkedCookie(config).name);
      const state = current?.accessToken ? current.sessionState : checked !== '1' ? checked : undefined;
      return json({ frame: checkSession ?? null, clientId: config.clientId, state: state ?? null });
    }

    if (route === '/revoke') {
      const current = await session();
      const hint = url.searchParams.get('hint') === 'access_token' ? 'access_token' : 'refresh_token';
      const target = hint === 'access_token' ? current?.accessToken : current?.refreshToken;
      if (!target) return json({ error: 'no_session' }, 401);

      const { revocation } = await resolve().catch(() => ({ revocation: undefined }));
      // A provider with no revocation endpoint cannot do this, and saying so beats a
      // silent success that leaves the token live.
      if (!revocation) return json({ error: 'no_revocation_endpoint' }, 501);

      const headers: Record<string, string> = {
        'content-type': 'application/x-www-form-urlencoded',
      };
      const form = new URLSearchParams({ token: target, token_type_hint: hint });
      await applyClientAuth(clientAuth, revocation, headers, form);

      // RFC 7009 answers 200 whether or not the provider knew the token, so there is
      // nothing to branch on.
      await fetch(revocation, { method: 'POST', headers, body: form.toString() }).catch(
        () => undefined,
      );
      return json({ ok: true, revoked: hint });
    }

    if (route === '/logout') {
      const current = await session();
      const { endSession } = await resolve().catch(() => ({ endSession: undefined }));
      // Retire the refresh token before dropping the cookie, or a copy stays usable for
      // its whole lifetime while the browser believes it signed out.
      const { revocation } = await resolve().catch(() => ({ revocation: undefined }));
      if (revocation && current?.refreshToken) {
        const headers: Record<string, string> = {
          'content-type': 'application/x-www-form-urlencoded',
        };
        const form = new URLSearchParams({
          token: current.refreshToken,
          token_type_hint: 'refresh_token',
        });
        await applyClientAuth(clientAuth, revocation, headers, form);
        await fetch(revocation, { method: 'POST', headers, body: form.toString() }).catch(
          () => undefined,
        );
      }

      // Max-Age=0 is what removes it. Clearing the value alone leaves a cookie behind.
      const cleared = cookie.clear();

      // Signed out on purpose: `silent` must not sign them straight back in.
      const headers = new Headers();
      headers.append('set-cookie', cleared);
      headers.append('set-cookie', checkedCookie(config).header);
      if (endSession && current?.idToken) {
        const target = new URL(endSession);
        target.searchParams.set('id_token_hint', current.idToken);
        if (config.defaultReturnTo) {
          target.searchParams.set('post_logout_redirect_uri', config.defaultReturnTo);
        }
        headers.set('location', target.toString());
        return new Response(null, { status: 302, headers });
      }
      headers.set('content-type', 'application/json');
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    return next();
  };
}

/**
 * Put the signed-in user on the request, so a server render knows who is looking.
 *
 * This is the piece that makes `tokens: 'server'` able to render authenticated pages. The
 * cookie is the credential and the server can read it, so the user is resolved before
 * the render and written where `@fluixi/auth`'s hooks already look: request locals,
 * under the key they read. `useUser()` then answers during SSR instead of returning null
 * and filling in after hydration.
 *
 * Dependency injection does not solve this and is not meant to. DI decides which
 * instance a component gets; locals carry what the middleware learned about this
 * request. They are different questions, and the user is the second one.
 *
 * There is no browser-mode equivalent, and that is not an omission. In that mode the
 * token lives in the browser and is never sent on a document request, so the server has
 * no credential to resolve and cannot know who is signed in. An app built that way
 * renders the signed-out shell and fills it in on the client.
 *
 * ```ts
 * export default defineMiddleware([auth, sessionLocals(config), ...]);
 * ```
 *
 * Mount it after `oauthRoutes`, so a request to `/auth/login` is answered rather than
 * having its session resolved first.
 */
export function sessionLocals(config: OAuthRoutesConfig) {
  const cookie = createSessionCookie<SessionPayload>({
    secret: config.cookieSecret,
    name: config.cookieName,
    secure: config.secureCookie,
  });

  const { tokenRequest } = tokenClient(config);
  const ttl = config.userCacheMs ?? 30_000;
  /**
   * Keyed by the access token, which this process already holds in the cookie it just
   * opened, so nothing new is exposed by keeping it here.
   *
   * Deliberately not a verifier. The provider still decides who this is; the cache only
   * says how recently it was asked.
   */
  const cache = new Map<string, { user: unknown; until: number }>();

  /** Bounded, so a long-running server does not hold every token it has ever seen. */
  const remember = (token: string, user: unknown): void => {
    if (ttl <= 0) return;
    if (cache.size > 500) {
      const now = Date.now();
      for (const [key, entry] of cache) if (entry.until <= now) cache.delete(key);
      // Still full of live entries: drop the oldest rather than grow without limit.
      if (cache.size > 500) cache.delete(cache.keys().next().value as string);
    }
    cache.set(token, { user, until: Date.now() + ttl });
  };

  return async function middleware(
    request: Request,
    next: () => Promise<Response>,
  ): Promise<Response> {
    const { getRequestLocals } = await import('@fluixi/server');
    const locals = getRequestLocals(request) as Record<string, unknown>;

    let session = await cookie.read(request);
    // What the browser's cookie must become: renewed tokens, or nothing.
    let setCookie: string | undefined;
    const respond = async (response: Response): Promise<Response> => {
      if (!setCookie) return response;
      const copy = new Response(response.body, response);
      copy.headers.append('set-cookie', setCookie);
      return copy;
    };
    const renewOrDrop = async (current: SessionPayload): Promise<SessionPayload | null> => {
      const renewed = current.refreshToken ? await renew(current, tokenRequest) : null;
      setCookie = renewed ? await cookie.write(renewed) : cookie.clear();
      return renewed;
    };

    // An access token lives minutes, the session days: renew it here, on the request that
    // finds it expired, rather than rendering a signed-in visitor as nobody.
    // Set when the provider could not renew now: the session stays, it is retried later.
    let paused = false;
    const keep = (current: SessionPayload | null) => (error: unknown) => {
      if (error instanceof ProviderUnavailable) paused = true;
      return current;
    };
    if (session?.accessToken && expired(session)) {
      session = await renewOrDrop(session).catch(keep(session));
    }

    // Written either way. A route that reads locals should find "nobody" rather than
    // nothing, so the absent case and the signed-out case look the same to it.
    const signedOut = async (): Promise<Response> => {
      const redirect = signInRedirect(request, config);
      if (redirect) return respond(redirect);
      locals.auth = { user: null, session: null };
      return respond(await next());
    };
    if (!session?.accessToken) return signedOut();

    // Ended at the provider (back-channel logout): this session is over too.
    if (await endedAtProvider(config, session)) {
      setCookie = cookie.clear();
      session = null;
      return signedOut();
    }

    // Granted fewer scopes than the app asks for now: a silent sign-in brings them, once.
    const rescope = rescopeRedirect(request, config, session);
    if (rescope) return respond(rescope);

    // Server code calls the app's APIs as this user with it; the token itself stays here.
    const live: SessionPayload = session;
    const fetchAs: AuthorizedFetch = (input, init) => sendAs(live, input, init);

    const cached = cache.get(live.accessToken);
    if (cached && cached.until > Date.now()) {
      locals.auth = { user: cached.user, session: { expiresAt: live.expiresAt }, fetch: fetchAs };
      return respond(await next());
    }

    let user: unknown = null;
    let unreachable = false;
    try {
      const endpoints = config.endpoints ?? (config.issuer ? await discover(config.issuer) : null);
      if (endpoints?.userinfo) {
        let response = await withToken(endpoints.userinfo, session);
        // Refused before its time (revoked, a clock apart): renew once, and when that is
        // refused too the session is over, so the visitor goes the signed-out way.
        if (response.status === 401 && !setCookie && !paused) {
          session = await renewOrDrop(session).catch(keep(session));
          if (!session) return signedOut();
          response = await withToken(endpoints.userinfo, session);
        }
        if (response.status === 401) {
          // Not renewable just now: signed out for this request, renewed on a later one.
          if (!paused) setCookie = cookie.clear();
          return signedOut();
        }
        if (response.ok) {
          const claims = (await response.json()) as Record<string, unknown>;
          user = config.mapUser ? config.mapUser(claims, session.accessToken) : claims;
          // Only a successful answer. Caching a refusal would keep someone signed out
          // after the provider came back.
          remember(session.accessToken, user);
        }
      }
    } catch {
      // A provider that is unreachable should not take the page down with it. The render
      // proceeds as signed out, and the client retries on its own; `unreachable` tells
      // server code it is not the visitor who is signed out.
      unreachable = true;
    }

    if (!session) return signedOut();
    const current = session;
    const fetchCurrent: AuthorizedFetch = (input, init) => sendAs(current, input, init);
    locals.auth = user
      ? { user, session: { expiresAt: current.expiresAt }, fetch: fetchCurrent }
      : { user: null, session: null, ...(unreachable ? { unreachable: true } : {}) };
    return respond(await next());
  };
}

/** What `sessionLocals` leaves on a request: the user, and a `fetch` that calls as them. */
export interface ServerAuth<U = unknown> {
  user: U | null;
  session: { expiresAt?: number } | null;
  /** Absent when nobody is signed in. */
  fetch?: AuthorizedFetch;
  /**
   * The visitor has a session but the provider could not be reached to confirm it: tell them
   * it is down, rather than asking them to sign in again.
   */
  unreachable?: boolean;
}

/**
 * The request's auth, for server code: a route's data loader, a server function, an API route.
 * Reads the current request's locals, or `request`'s when one is given.
 *
 * ```ts
 * const { fetch } = await requestAuth();
 * const projects = await fetch?.(`${apiUrl}/projects`).then((r) => r.json());
 * ```
 */
export async function requestAuth<U = unknown>(request?: Request): Promise<ServerAuth<U>> {
  const { getLocals, getRequestLocals } = await import('@fluixi/server');
  const locals = (request ? getRequestLocals(request) : getLocals()) as Record<string, unknown>;
  return (locals.auth as ServerAuth<U> | undefined) ?? { user: null, session: null };
}

/**
 * The server half of `authModule`, listed in `src/app.config.server.ts`: the routes and the
 * session middleware that `tokens: 'server'` needs, in the order they have to run.
 *
 * `oauthRoutes` first, so a request to the login route is answered rather than having its
 * session resolved on the way past.
 */
export function authServerModule(config: OAuthRoutesConfig): AppModule {
  return defineModule({ name: 'oauth2-server', middleware: [oauthRoutes(config), sessionLocals(config)] });
}

export { memoryLogouts, type LogoutEntry, type LogoutStore } from './backchannel.js';
