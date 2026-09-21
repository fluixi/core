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
 * The cookie is signed and encrypted with AES-GCM through Web Crypto, so it works on
 * Node, Bun, Deno and a worker without a native dependency.
 */
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

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** AES-GCM key from the configured secret. */
async function keyFrom(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  // Built on its own buffer, so the type is the one Web Crypto accepts. A
  // `Uint8Array<ArrayBufferLike>` may be backed by a SharedArrayBuffer, which it refuses.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function seal(payload: SessionPayload, secret: string): Promise<string> {
  const key = await keyFrom(secret);
  // A fresh nonce per write. Reusing one with the same key is what breaks AES-GCM.
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(sealed))}`;
}

async function open(value: string, secret: string): Promise<SessionPayload | null> {
  const [ivPart, dataPart] = value.split('.');
  if (!ivPart || !dataPart) return null;
  try {
    const key = await keyFrom(secret);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64Url(ivPart) },
      key,
      fromBase64Url(dataPart),
    );
    return JSON.parse(decoder.decode(plain)) as SessionPayload;
  } catch {
    // Tampered, or sealed with a different secret. Either way there is no session.
    return null;
  }
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function cookieHeader(
  name: string,
  value: string,
  options: { secure: boolean; maxAge?: number },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    // Lax rather than Strict: the callback is a top-level navigation back from the
    // authorization server, and Strict would withhold the cookie on exactly that request.
    'SameSite=Lax',
  ];
  if (options.secure) parts.push('Secure');
  parts.push(`Max-Age=${options.maxAge ?? 60 * 60 * 24 * 30}`);
  return parts.join('; ');
}

/**
 * The middleware.
 *
 * Handles `<basePath>/login`, `/callback`, `/refresh`, `/me` and `/logout`, and passes
 * anything else along untouched.
 */
export function oauthRoutes(config: OAuthRoutesConfig) {
  const base = (config.basePath ?? '/auth').replace(/\/$/, '');
  const cookieName = config.cookieName ?? 'fx_session';
  const secure = config.secureCookie ?? process.env.NODE_ENV === 'production';
  const scopes = config.scopes ?? ['openid', 'profile', 'email'];

  if (config.cookieSecret.length < 32) {
    throw new Error(
      '[fluixi/oauth2] cookieSecret must be at least 32 characters: it is the key the session cookie is encrypted with.',
    );
  }

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

  async function tokenRequest(body: Record<string, string>) {
    const { token } = await resolve();
    const form = new URLSearchParams({ ...body, client_id: config.clientId });
    if (config.clientSecret) form.set('client_secret', config.clientSecret);

    const response = await fetch(token, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
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
      const raw = readCookie(request, cookieName);
      return raw ? open(raw, config.cookieSecret) : null;
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
      const cookie = await seal(
        {
          accessToken: '',
          pending: { verifier, state, returnTo: url.searchParams.get('returnTo') ?? undefined },
        },
        config.cookieSecret,
      );

      return new Response(null, {
        status: 302,
        headers: {
          location: target.toString(),
          'set-cookie': cookieHeader(cookieName, cookie, { secure, maxAge: 600 }),
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

      const cookie = await seal(
        {
          accessToken: String(payload.access_token ?? ''),
          refreshToken:
            typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined,
          idToken: typeof payload.id_token === 'string' ? payload.id_token : undefined,
          expiresAt: expiryFrom(payload.expires_in),
        },
        config.cookieSecret,
      );

      return new Response(null, {
        status: 302,
        headers: {
          location: pending.returnTo ?? config.defaultReturnTo ?? '/',
          'set-cookie': cookieHeader(cookieName, cookie, { secure }),
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
      const cookie = await seal(
        {
          accessToken: String(payload.access_token ?? ''),
          // A provider that rotates refresh tokens sends a new one; one that does not
          // expects the old one to keep working.
          refreshToken:
            typeof payload.refresh_token === 'string'
              ? payload.refresh_token
              : current.refreshToken,
          idToken: current.idToken,
          expiresAt: expiryFrom(payload.expires_in),
        },
        config.cookieSecret,
      );
      return json({ ok: true }, 200, {
        'set-cookie': cookieHeader(cookieName, cookie, { secure }),
      });
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

    if (route === '/logout') {
      const current = await session();
      const { endSession } = await resolve().catch(() => ({ endSession: undefined }));
      // Max-Age=0 is what removes it. Clearing the value alone leaves a cookie behind.
      const cleared = cookieHeader(cookieName, '', { secure, maxAge: 0 });

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
