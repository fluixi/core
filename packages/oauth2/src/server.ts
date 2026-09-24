/**
 * `@fluixi/oauth2/server`: the routes behind `mode: 'server'`.
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
}

/** What the cookie carries. Never leaves this side. */
interface SessionPayload {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: number;
  /** The flow's temporary values, kept only between the redirect and the callback. */
  pending?: { verifier: string; state: string; returnTo?: string };
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

  async function tokenRequest(body: Record<string, string>) {
    const { token } = await resolve();
    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
    };
    const form = new URLSearchParams(body);
    await applyClientAuth(clientAuth, token, headers, form);

    const response = await fetch(token, { method: 'POST', headers, body: form.toString() });
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
      if (error) return json({ error }, 400);

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code) return json({ error: 'no_code' }, 400);
      if (!pending || !state || !timingSafeEqual(pending.state, state)) {
        return json({ error: 'state_mismatch' }, 400);
      }

      const payload = await tokenRequest({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        code_verifier: pending.verifier,
      });

      const signedIn = await cookie.write({
        accessToken: String(payload.access_token ?? ''),
        refreshToken:
          typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined,
        idToken: typeof payload.id_token === 'string' ? payload.id_token : undefined,
        expiresAt: expiryFrom(payload.expires_in),
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

      const payload = await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: current.refreshToken,
      });
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
      });
      return json({ ok: true }, 200, { 'set-cookie': refreshed });
    }

    if (route === '/me') {
      const current = await session();
      if (!current?.accessToken) return json({ error: 'no_session' }, 401);

      const { userinfo } = await resolve();
      if (!userinfo) return json({ error: 'no_userinfo' }, 501);

      const response = await fetch(userinfo, {
        headers: { authorization: `Bearer ${current.accessToken}` },
      });
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

      if (endSession && current?.idToken) {
        const target = new URL(endSession);
        target.searchParams.set('id_token_hint', current.idToken);
        if (config.defaultReturnTo) {
          target.searchParams.set('post_logout_redirect_uri', config.defaultReturnTo);
        }
        return new Response(null, {
          status: 302,
          headers: { location: target.toString(), 'set-cookie': cleared },
        });
      }
      return json({ ok: true }, 200, { 'set-cookie': cleared });
    }

    return next();
  };
}

/**
 * Put the signed-in user on the request, so a server render knows who is looking.
 *
 * This is the piece that makes `mode: 'server'` able to render authenticated pages. The
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
      locals.auth = { user: null, session: null };
      return next();
    }

    const cached = cache.get(session.accessToken);
    if (cached && cached.until > Date.now()) {
      locals.auth = { user: cached.user, session: { expiresAt: session.expiresAt } };
      return next();
    }

    let user: unknown = null;
    try {
      const endpoints = config.endpoints ?? (config.issuer ? await discover(config.issuer) : null);
      if (endpoints?.userinfo) {
        const response = await fetch(endpoints.userinfo, {
          headers: { authorization: `Bearer ${session.accessToken}` },
        });
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

    locals.auth = { user, session: user ? { expiresAt: session.expiresAt } : null };
    return next();
  };
}
