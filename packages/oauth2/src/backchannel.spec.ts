/**
 * Back-channel logout: a logout token from the provider ends the app's session for it, and a
 * token that is not a proper logout token is refused.
 */
import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT, type KeyLike } from 'jose';
import { createSessionCookie } from '@fluixi/session/server';
import { oauthRoutes, sessionLocals, type OAuthRoutesConfig } from './server.js';
import { clearDiscoveryCache } from './discovery.js';
import { LOGOUT_EVENT, memoryLogouts } from './backchannel.js';

const SECRET = 'a'.repeat(32);
const ISSUER = 'https://idp.test';
let privateKey: KeyLike;
let jwks: { keys: unknown[] };

beforeAll(async () => {
  const pair = await generateKeyPair('RS256', { extractable: true });
  privateKey = pair.privateKey;
  jwks = { keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'RS256', use: 'sig', kid: 'k1' }] };
});

beforeEach(() => {
  clearDiscoveryCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith('/.well-known/openid-configuration')) {
        return Response.json({
          issuer: ISSUER,
          authorization_endpoint: `${ISSUER}/auth`,
          token_endpoint: `${ISSUER}/token`,
          userinfo_endpoint: `${ISSUER}/userinfo`,
          jwks_uri: `${ISSUER}/jwks`,
        });
      }
      if (url.endsWith('/jwks')) return Response.json(jwks);
      return Response.json({ sub: 'u1', email: 'a@b.c' });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const config = (): OAuthRoutesConfig => ({
  clientId: 'console',
  redirectUri: 'https://app.test/auth/callback',
  cookieSecret: SECRET,
  issuer: ISSUER,
  logouts: memoryLogouts(),
});

const logoutToken = (claims: Record<string, unknown> = {}, typ = 'logout+jwt') =>
  new SignJWT({ sid: 's1', sub: 'u1', events: { [LOGOUT_EVENT]: {} }, ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1', typ })
    .setIssuer(ISSUER)
    .setAudience(typeof claims.aud === 'string' ? claims.aud : 'console')
    .setIssuedAt()
    .setExpirationTime('2m')
    .setJti('j1')
    .sign(privateKey);

const idToken = (sid: string) =>
  `x.${btoa(JSON.stringify({ sub: 'u1', sid, iat: Math.floor(Date.now() / 1000) - 60 })).replace(/=+$/, '')}.y`;

const post = (routes: ReturnType<typeof oauthRoutes>, token: string) =>
  routes(
    new Request('https://app.test/auth/backchannel-logout', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ logout_token: token }),
    }),
    async () => new Response('next'),
  );

async function authOf(cfg: OAuthRoutesConfig, sid: string) {
  const cookie = createSessionCookie({ secret: SECRET });
  const header = await cookie.write({ accessToken: 'at', idToken: idToken(sid) });
  const request = new Request('https://app.test/users', { headers: { cookie: header.split(';')[0] } });
  const { getRequestLocals } = await import('@fluixi/server');
  const response = await sessionLocals(cfg)(request, async () => new Response('ok'));
  return { auth: (getRequestLocals(request) as Record<string, any>).auth, response };
}

describe('back-channel logout', () => {
  it('ends the session the provider names, and only that one', async () => {
    const cfg = config();
    expect((await authOf(cfg, 's1')).auth.user).toEqual({ sub: 'u1', email: 'a@b.c' });
    const answer = await post(oauthRoutes(cfg), await logoutToken());
    expect(answer.status).toBe(200);
    expect(answer.headers.get('cache-control')).toBe('no-store');
    const ended = await authOf(cfg, 's1');
    expect(ended.auth).toEqual({ user: null, session: null });
    expect(ended.response.headers.get('set-cookie')).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    expect((await authOf(cfg, 's2')).auth.user).toEqual({ sub: 'u1', email: 'a@b.c' });
  });

  it('an ended session reaches neither /me nor /refresh', async () => {
    const cfg = config();
    const routes = oauthRoutes(cfg);
    await post(routes, await logoutToken());
    const cookie = createSessionCookie({ secret: SECRET });
    const header = (await cookie.write({ accessToken: 'at', refreshToken: 'rt', idToken: idToken('s1') })).split(';')[0];
    for (const path of ['/auth/me', '/auth/refresh']) {
      const request = new Request(`https://app.test${path}`, { method: path === '/auth/me' ? 'GET' : 'POST', headers: { cookie: header } });
      expect((await routes(request, async () => new Response('next'))).status).toBe(401);
    }
  });

  it('refuses what is not a logout token', async () => {
    const cfg = config();
    const routes = oauthRoutes(cfg);
    expect((await post(routes, await logoutToken({ events: {} }))).status).toBe(400);
    expect((await post(routes, await logoutToken({ nonce: 'n' }))).status).toBe(400);
    expect((await post(routes, await logoutToken({}, 'JWT'))).status).toBe(400);
    expect((await post(routes, await logoutToken({ aud: 'someone-else' }))).status).toBe(400);
    expect((await post(routes, 'not.a.token')).status).toBe(400);
    expect((await authOf(cfg, 's1')).auth.user).toEqual({ sub: 'u1', email: 'a@b.c' });
  });

  it('a logout naming only the person ends their sessions begun before it', () => {
    const store = memoryLogouts();
    store.add({ sub: 'u1', at: 1_000 });
    expect(store.ended({ sub: 'u1', since: 500 })).toBe(true);
    expect(store.ended({ sub: 'u1', since: 2_000 })).toBe(false);
    expect(store.ended({ sub: 'u2', since: 500 })).toBe(false);
  });
});
