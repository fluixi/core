/**
 * Session Management on the app server: the `session_state` a provider answer carries is
 * kept, signed in or not, and handed to the page with the provider's check page.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { oauthRoutes, type OAuthRoutesConfig } from './server.js';

const config = (over: Partial<OAuthRoutesConfig> = {}): OAuthRoutesConfig => ({
  clientId: 'portal',
  redirectUri: 'https://app.test/auth/callback',
  cookieSecret: 'a'.repeat(32),
  signIn: 'silent',
  endpoints: {
    authorization: 'https://idp.test/auth',
    token: 'https://idp.test/token',
    checkSession: 'https://idp.test/check-session',
  },
  ...over,
});

const pass = async () => new Response('next');

async function startSilentLogin(cfg: OAuthRoutesConfig) {
  const login = await oauthRoutes(cfg)(new Request('https://app.test/auth/login?prompt=none&returnTo=/'), pass);
  const target = new URL(login.headers.get('location')!);
  return { cookie: login.headers.get('set-cookie')!.split(';')[0]!, state: target.searchParams.get('state')! };
}

const firstCookie = (response: Response, name: string) =>
  response.headers
    .getSetCookie()
    .map((c) => c.split(';')[0]!)
    .find((c) => c.startsWith(`${name}=`));

async function check(cfg: OAuthRoutesConfig, cookie: string) {
  const answer = await oauthRoutes(cfg)(new Request('https://app.test/auth/session-check', { headers: { cookie } }), pass);
  return answer.json();
}

afterEach(() => vi.unstubAllGlobals());

describe('the session_state a provider answer carries', () => {
  it('is kept when nobody is signed in, for the page to watch', async () => {
    const cfg = config();
    const { cookie, state } = await startSilentLogin(cfg);
    const back = await oauthRoutes(cfg)(
      new Request(`https://app.test/auth/callback?error=login_required&state=${state}&session_state=abc123.f00d`, {
        headers: { cookie },
      }),
      pass,
    );
    const checked = firstCookie(back, 'fx_session_checked')!;
    expect(checked).toBe('fx_session_checked=abc123.f00d');
    expect(await check(cfg, checked)).toEqual({
      frame: 'https://idp.test/check-session',
      clientId: 'portal',
      state: 'abc123.f00d',
    });
  });

  it('is kept in the session when someone is', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ access_token: 'at', token_type: 'Bearer', expires_in: 300 })),
    );
    const cfg = config();
    const { cookie, state } = await startSilentLogin(cfg);
    const back = await oauthRoutes(cfg)(
      new Request(`https://app.test/auth/callback?code=c&state=${state}&session_state=beef.01`, { headers: { cookie } }),
      pass,
    );
    expect(back.status).toBe(302);
    const session = firstCookie(back, 'fx_session')!;
    expect((await check(cfg, session)).state).toBe('beef.01');
  });

  it('is dropped when it is not one, and nothing is watched without it', async () => {
    const cfg = config();
    const { cookie, state } = await startSilentLogin(cfg);
    const back = await oauthRoutes(cfg)(
      new Request(`https://app.test/auth/callback?error=login_required&state=${state}&session_state=x%3B%20Path%3D%2F`, {
        headers: { cookie },
      }),
      pass,
    );
    const checked = firstCookie(back, 'fx_session_checked')!;
    expect(checked).toBe('fx_session_checked=1');
    expect((await check(cfg, checked)).state).toBeNull();
    expect((await check(config({ endpoints: { authorization: 'a', token: 't' } }), checked)).frame).toBeNull();
  });
});
