/**
 * A session made before the app asked for a scope lacks it, renewal after renewal. The next
 * page load signs in again silently to get it, keeps what the token is bound to, and keeps the
 * session when the provider would have to ask the person something.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { createSessionCookie } from '@fluixi/session/server';
import { oauthRoutes, sessionLocals, type OAuthRoutesConfig } from './server.js';

const config = (over: Partial<OAuthRoutesConfig> = {}): OAuthRoutesConfig => ({
  clientId: 'portal',
  redirectUri: 'https://app.test/auth/callback',
  cookieSecret: 'b'.repeat(32),
  userCacheMs: 0,
  scopes: ['openid', 'profile', 'offline_access', 'appearance'],
  authorizeParams: ['organization'],
  endpoints: {
    authorization: 'https://idp.test/auth',
    token: 'https://idp.test/token',
    userinfo: 'https://idp.test/userinfo',
  },
  ...over,
});

const sealed = createSessionCookie<Record<string, unknown>>({ secret: 'b'.repeat(32) });
const cookieFor = async (session: Record<string, unknown>) => (await sealed.write(session)).split(';')[0]!;
const sessionIn = (header: string) => sealed.read(new Request('https://app.test/', { headers: { cookie: header.split(';')[0]! } }));

/** An unsigned JWT is enough: the middleware reads the claims of its own token, never verifies them. */
const jwt = (claims: Record<string, unknown>) => `e30.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;

const page = (path: string, cookie: string, document = true) =>
  new Request(`https://app.test${path}`, {
    headers: document ? { 'sec-fetch-dest': 'document', accept: 'text/html', cookie } : { 'sec-fetch-dest': 'empty', cookie },
  });

function provider(token?: () => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      if (String(input) === 'https://idp.test/token' && token) return token();
      return Response.json({ sub: 'u1' });
    }),
  );
}

const render = (cfg: OAuthRoutesConfig, request: Request) => sessionLocals(cfg)(request, async () => new Response('rendered'));

afterEach(() => vi.unstubAllGlobals());

describe('a session granted fewer scopes than the app asks for', () => {
  it('signs in again silently, keeping what the token is bound to', async () => {
    provider();
    const cfg = config({ rescopeParams: (claims) => ({ organization: String(claims.org ?? '') }) });
    const cookie = await cookieFor({ accessToken: jwt({ org: 'o1' }), scope: 'openid profile' });
    const answer = await render(cfg, page('/app/work?view=list', cookie));
    expect(answer.status).toBe(302);
    const target = new URL(answer.headers.get('location')!, 'https://app.test');
    expect(target.pathname).toBe('/auth/login');
    expect(target.searchParams.get('prompt')).toBe('none');
    expect(target.searchParams.get('returnTo')).toBe('/app/work?view=list');
    expect(target.searchParams.get('organization')).toBe('o1');
    expect(answer.headers.getSetCookie().some((c) => c.startsWith('fx_session_rescope=appearance;'))).toBe(true);
  });

  it('asks once per set of missing scopes', async () => {
    provider();
    const cookie = await cookieFor({ accessToken: 'opaque', scope: 'openid profile' });
    const answer = await render(config(), page('/', `${cookie}; fx_session_rescope=appearance`));
    expect(answer.status).toBe(200);
  });

  it('asks again when another scope goes missing', async () => {
    provider();
    const cookie = await cookieFor({ accessToken: 'opaque', scope: 'openid' });
    const answer = await render(config(), page('/', `${cookie}; fx_session_rescope=appearance`));
    expect(answer.status).toBe(302);
  });

  it('leaves alone a session that recorded no scope, offline_access, and anything but a page load', async () => {
    provider();
    const unrecorded = await cookieFor({ accessToken: 'opaque' });
    expect((await render(config(), page('/', unrecorded))).status).toBe(200);
    const withoutOffline = await cookieFor({ accessToken: 'opaque', scope: 'openid profile appearance' });
    expect((await render(config(), page('/', withoutOffline))).status).toBe(200);
    const short = await cookieFor({ accessToken: 'opaque', scope: 'openid' });
    expect((await render(config(), page('/api/x', short, false))).status).toBe(200);
    expect((await render(config(), page('/auth/me', short))).status).toBe(200);
  });

  it('records what a renewal granted', async () => {
    provider(() => Response.json({ access_token: 'fresh', refresh_token: 'rt2', expires_in: 600, scope: 'openid profile appearance' }));
    const cookie = await cookieFor({ accessToken: 'old', refreshToken: 'rt1', expiresAt: Date.now() - 1000, scope: 'openid profile' });
    const answer = await render(config(), page('/', cookie));
    expect(answer.status).toBe(200);
    const renewed = answer.headers.getSetCookie().find((c) => c.startsWith('fx_session='))!;
    expect((await sessionIn(renewed))?.scope).toBe('openid profile appearance');
  });
});

describe('the silent sign-in for a scope', () => {
  it('keeps the session while it is at the provider, and when the provider would have to ask', async () => {
    provider();
    const cfg = config();
    const signedIn = { accessToken: 'at', refreshToken: 'rt', scope: 'openid profile' };
    const login = await oauthRoutes(cfg)(new Request('https://app.test/auth/login?prompt=none&returnTo=/app', { headers: { cookie: await cookieFor(signedIn) } }), async () => new Response());
    const during = await sessionIn(login.headers.get('set-cookie')!);
    expect(during).toMatchObject({ accessToken: 'at', refreshToken: 'rt' });
    expect(login.headers.get('set-cookie')).not.toContain('Max-Age=600');

    const state = new URL(login.headers.get('location')!).searchParams.get('state')!;
    const back = await oauthRoutes(cfg)(
      new Request(`https://app.test/auth/callback?error=consent_required&state=${state}`, { headers: { cookie: login.headers.get('set-cookie')!.split(';')[0]! } }),
      async () => new Response(),
    );
    expect(back.status).toBe(302);
    expect(back.headers.get('location')).toBe('/app');
    const after = await sessionIn(back.headers.get('set-cookie')!);
    expect(after).toMatchObject({ accessToken: 'at', refreshToken: 'rt' });
    expect(after?.pending).toBeUndefined();
  });

  it('still signs a signed-out visitor out of nothing when the provider refuses', async () => {
    provider();
    const cfg = config();
    const login = await oauthRoutes(cfg)(new Request('https://app.test/auth/login?prompt=none'), async () => new Response());
    expect(login.headers.get('set-cookie')).toContain('Max-Age=600');
    const state = new URL(login.headers.get('location')!).searchParams.get('state')!;
    const back = await oauthRoutes(cfg)(
      new Request(`https://app.test/auth/callback?error=login_required&state=${state}`, { headers: { cookie: login.headers.get('set-cookie')!.split(';')[0]! } }),
      async () => new Response(),
    );
    expect(back.headers.getSetCookie().some((c) => c.startsWith('fx_session=;') || c.includes('Max-Age=0'))).toBe(true);
  });
});
