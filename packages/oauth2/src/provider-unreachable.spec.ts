/**
 * A provider that does not answer: the visitor is told it is down, not asked to sign in again,
 * and the login route sends them back to the app with a reason rather than an error page.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createSessionCookie } from '@fluixi/session/server';
import { oauthRoutes, sessionLocals, type OAuthRoutesConfig } from './server.js';
import { clearDiscoveryCache, discover } from './discovery.js';

const SECRET = 'a'.repeat(32);

const config = (over: Partial<OAuthRoutesConfig> = {}): OAuthRoutesConfig => ({
  clientId: 'admin',
  redirectUri: 'http://localhost:3000/auth/callback',
  cookieSecret: SECRET,
  issuer: 'https://idp.test',
  defaultReturnTo: '/',
  ...over,
});

/** Every request to the provider fails as a refused connection does. */
const down = () => vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));

beforeEach(() => clearDiscoveryCache());
afterEach(() => vi.unstubAllGlobals());

describe('a provider that does not answer', () => {
  it('tells server code the session could not be checked', async () => {
    down();
    const cookie = createSessionCookie({ secret: SECRET });
    const request = new Request('https://app.test/users', { headers: { cookie: (await cookie.write({ accessToken: 'at' })).split(';')[0] } });
    const { getRequestLocals } = await import('@fluixi/server');
    await sessionLocals(config())(request, async () => new Response('ok'));
    expect((getRequestLocals(request) as Record<string, any>).auth).toEqual({ user: null, session: null, unreachable: true });
  });

  it('sends a sign-in back to the app with a reason instead of failing', async () => {
    down();
    const routes = oauthRoutes({ ...config(), basePath: '/auth' } as OAuthRoutesConfig);
    const response = await routes(new Request('https://app.test/auth/login?returnTo=%2Fusers'), async () => new Response('next'));
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/users?auth_error=provider_unreachable');
  });

  it('says on a server that the provider is not answering, not a browser cross-origin read', async () => {
    down();
    await expect(discover('https://idp.test')).rejects.toThrow(/Could not reach the provider at .*is it running/);
  });
});

describe('a token request that fails at the callback', () => {
  const withEndpoints = config({
    basePath: '/auth',
    endpoints: { authorization: 'https://idp.test/auth', token: 'https://idp.test/token' },
  } as Partial<OAuthRoutesConfig>);
  const pass = async () => new Response('next');

  async function callbackAfter(fail: () => Promise<Response>) {
    const login = await oauthRoutes(withEndpoints)(new Request('https://app.test/auth/login?returnTo=%2Fusers'), pass);
    const state = new URL(login.headers.get('location')!).searchParams.get('state')!;
    const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    vi.stubGlobal('fetch', vi.fn(fail));
    return oauthRoutes(withEndpoints)(
      new Request(`https://app.test/auth/callback?code=c&state=${encodeURIComponent(state)}`, { headers: { cookie } }),
      pass,
    );
  }

  it('sends the person back to the app with a reason when the answer is lost', async () => {
    const back = await callbackAfter(async () => {
      throw new DOMException('timed out', 'TimeoutError');
    });
    expect(back.status).toBe(302);
    expect(back.headers.get('location')).toBe('/users?auth_error=provider_unreachable');
  });

  it('names the refusal when the provider refuses the code', async () => {
    const back = await callbackAfter(async () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }));
    expect(back.status).toBe(302);
    expect(back.headers.get('location')).toBe('/users?auth_error=invalid_grant');
  });
});
