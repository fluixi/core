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
 * export default defineMiddleware([auth, …]);
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
   * Origins a login may return to besides this server's own.
   *
   * A destination arrives on the query string, so it is attacker controlled. Anything
   * that is not a path on this origin is refused unless it is named here. Adding an
   * origin here makes it a valid landing place for an authenticated visitor, so add only
   * ones you control.
   */
  allowedReturnOrigins?: string[];
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
   * - `silent`: once per browser session the visitor is sent to the provider with
   *   `prompt=none`. Someone already signed in there comes back signed in without a click;
   *   anyone else comes straight back and the page renders signed out. Single sign-on
   *   without forcing a sign-in on a public page.
   * - `required`: the visitor is sent to sign in. For an app with nothing to show to a
   *   stranger, an admin console say.
   *
   * Only page loads are redirected (a GET for a document), never an API or asset request.
   */
  signIn?: 'manual' | 'silent' | 'required';
  /** Paths `silent` and `required` leave alone, besides the auth routes: `/health`, `/legal`. */
  publicPaths?: string[];
}

const PROMPTS = new Set(['none', 'login', 'consent', 'select_account']);

/** What a `prompt=none` request ends with when the provider would have to ask the visitor. */
const SILENT_REFUSALS = new Set([
  'login_required',
  'consent_required',
  'interaction_required',
  'account_selection_required',
]);

/** The cookie saying the provider was already asked silently in this browser session. */
function checkedCookie(config: OAuthRoutesConfig): { name: string; header: string } {
  const name = `${config.cookieName ?? 'fx_session'}_checked`;
  const secure = config.secureCookie ?? process.env.NODE_ENV === 'production';
  // No Max-Age: it lasts as long as the browser session, so a new visit asks again.
  return { name, header: `${name}=1; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}` };
}

/** A document load, as opposed to a fetch, an asset or a form post. */
function isPageRequest(request: Request): boolean {
  if (request.method !== 'GET') return false;
  const dest = request.headers.get('sec-fetch-dest');
  if (dest) return dest === 'document';
  return (request.headers.get('accept') ?? '').includes('text/html');
}

function hasCookie(request: Request, name: string): boolean {
  return (request.headers.get('cookie') ?? '').split(';').some((part) => part.trim().startsWith(`${name}=`));
}

/** Where `signIn` sends a signed-out visitor's page request, or null to render it as is. */
function signInRedirect(request: Request, config: OAuthRoutesConfig): Response | null {
  const mode = config.signIn ?? 'manual';
  if (mode === 'manual' || !isPageRequest(request)) return null;
  const url = new URL(request.url);
  const base = (config.basePath ?? '/auth').replace(/\/$/, '');
  const open = [base, ...(config.publicPaths ?? [])];
  if (open.some((path) => url.pathname === path || url.pathname.startsWith(path.endsWith('/') ? path : `${path}/`))) {
    return null;
  }
  if (mode === 'silent' && hasCookie(request, checkedCookie(config).name)) return null;
  const login = new URLSearchParams({ returnTo: url.pathname + url.search });
  if (mode === 'silent') login.set('prompt', 'none');
  return new Response(null, { status: 302, headers: { location: `${base}/login?${login}` } });
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
  /** The flow's temporary values, kept only between the redirect and the callback. */
  pending?: { verifier: string; state: string; returnTo?: string; silent?: boolean };
}

/**
 * The middleware.
 *
 * Handles `<basePath>/login`, `/callback`, `/refresh`, `/me` and `/logout`, and passes
 * anything else along untouched.
 */
export function oauthRoutes(config: OAuthRoutesConfig) {
  const base = (config.basePath ?? '/auth').replace(/\/$/, '');
  const scopes = config.scopes ?? ['openid', 'profile', 'email'];
  const cookie = createSessionCookie<SessionPayload>({
    secret: config.cookieSecret,
    name: config.cookieName,
    secure: config.secureCookie,
  });

  let endpoints: Endpoints | null = config.endpoints ?? null;
  const resolve = async (): Promise<Endpoints> => {
    if (endpoints) return endpoints;
    if (!config.issuer) {
      throw new OAuthError('Give oauthRoutes an issuer or endpoints.', 'missing_issuer');
    }
    endpoints = await discover(config.issuer);
    return endpoints;
  };

  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });

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
      return fetch(token, { method: 'POST', headers, body: form.toString() });
    };

    let response = await attempt();
    if (key && learnNonce(token, response)) response = await attempt();
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new OAuthError(
        String(payload.error ?? 'token_request_failed'),
        String(payload.error ?? 'token_request_failed'),
      );
    }
    return payload;
  }

  return async function middleware(
    request: Request,
    next: () => Promise<Response>,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${base}/`)) return next();

    const route = url.pathname.slice(base.length);
    const session = async (): Promise<SessionPayload | null> => {
      return cookie.read(request);
    };

    if (route === '/login') {
      const { authorization } = await resolve();
      const { verifier, challenge } = await createPkcePair();
      const state = createStateValue();

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

      // The verifier goes in the cookie, which is the only thing that survives the trip
      // and is not readable by the page.
      const pendingCookie = await cookie.write(
        {
          accessToken: '',
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
        // does not sit in the browser.
        { maxAge: 600 },
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
        headers.append('set-cookie', cookie.clear());
        if (ours && pending.silent && SILENT_REFUSALS.has(error)) {
          // Nobody signed in at the provider: remember it was asked, and show the page as is.
          headers.append('set-cookie', checkedCookie(config).header);
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
        return json({ error: 'state_mismatch' }, 400);
      }

      // The token is bound here, at the exchange, so this is where the session's key is made.
      const key = config.dpop
        ? await createDpopKey(config.dpopAlgorithm, { extractable: true })
        : null;
      const payload = await tokenRequest(
        {
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          code_verifier: pending.verifier,
        },
        key,
      );

      const signedIn = await cookie.write({
        accessToken: String(payload.access_token ?? ''),
        refreshToken:
          typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined,
        idToken: typeof payload.id_token === 'string' ? payload.id_token : undefined,
        expiresAt: expiryFrom(payload.expires_in),
        tokenType: typeof payload.token_type === 'string' ? payload.token_type : undefined,
        dpop: key ? await exportDpopKey(key) : undefined,
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

      // The key that obtained the refresh token, or the provider refuses the refresh.
      const key = current.dpop ? await importDpopKey(current.dpop) : null;
      const payload = await tokenRequest(
        { grant_type: 'refresh_token', refresh_token: current.refreshToken },
        key,
      );
      const refreshed = await cookie.write({
        accessToken: String(payload.access_token ?? ''),
        // A provider that rotates refresh tokens sends a new one; one that does not
        // expects the old one to keep working.
        refreshToken:
          typeof payload.refresh_token === 'string'
            ? payload.refresh_token
            : current.refreshToken,
        idToken: current.idToken,
        expiresAt: expiryFrom(payload.expires_in),
        tokenType: typeof payload.token_type === 'string' ? payload.token_type : current.tokenType,
        dpop: current.dpop,
      });
      return json({ ok: true }, 200, { 'set-cookie': refreshed });
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

    const session = await cookie.read(request);

    // Written either way. A route that reads locals should find "nobody" rather than
    // nothing, so the absent case and the signed-out case look the same to it.
    if (!session?.accessToken) {
      const redirect = signInRedirect(request, config);
      if (redirect) return redirect;
      locals.auth = { user: null, session: null };
      return next();
    }

    // Server code calls the app's APIs as this user with it; the token itself stays here.
    const fetchAs: AuthorizedFetch = (input, init) => sendAs(session, input, init);

    const cached = cache.get(session.accessToken);
    if (cached && cached.until > Date.now()) {
      locals.auth = { user: cached.user, session: { expiresAt: session.expiresAt }, fetch: fetchAs };
      return next();
    }

    let user: unknown = null;
    try {
      const endpoints = config.endpoints ?? (config.issuer ? await discover(config.issuer) : null);
      if (endpoints?.userinfo) {
        const response = await withToken(endpoints.userinfo, session);
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
      // proceeds as signed out, and the client retries on its own.
    }

    locals.auth = user
      ? { user, session: { expiresAt: session.expiresAt }, fetch: fetchAs }
      : { user: null, session: null };
    return next();
  };
}

/** What `sessionLocals` leaves on a request: the user, and a `fetch` that calls as them. */
export interface ServerAuth<U = unknown> {
  user: U | null;
  session: { expiresAt?: number } | null;
  /** Absent when nobody is signed in. */
  fetch?: AuthorizedFetch;
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
