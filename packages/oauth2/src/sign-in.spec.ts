/**
 * How a server-held session starts: the `prompt` a login carries, what `signIn` does with a
 * signed-out page load, and where a refused authorization lands.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { oauthRoutes, sessionLocals, type OAuthRoutesConfig } from './server.js';
import { clearDiscoveryCache } from './discovery.js';

const config = (over: Partial<OAuthRoutesConfig> = {}): OAuthRoutesConfig => ({
  clientId: 'portal',
  redirectUri: 'https://app.test/auth/callback',
  cookieSecret: 'a'.repeat(32),
  endpoints: { authorization: 'https://idp.test/auth', token: 'https://idp.test/token' },
  ...over,
});

const page = (path: string, cookie = '') =>
  new Request(`https://app.test${path}`, { headers: { 'sec-fetch-dest': 'document', accept: 'text/html', cookie } });

const pass = async () => new Response('rendered');

/** Start a login and come back with its cookie and state, as the provider would send them. */
async function startLogin(cfg: OAuthRoutesConfig, query: string) {
  const login = await oauthRoutes(cfg)(new Request(`https://app.test/auth/login?${query}`), pass);
  const target = new URL(login.headers.get('location')!);
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
  return { target, cookie, state: target.searchParams.get('state')! };
}

beforeEach(() => clearDiscoveryCache());
afterEach(() => vi.unstubAllGlobals());

describe('the prompt a login asks the provider for', () => {
  it('forwards the ones OpenID Connect defines and drops anything else', async () => {
    expect((await startLogin(config(), 'prompt=none')).target.searchParams.get('prompt')).toBe('none');
    expect((await startLogin(config(), 'prompt=login')).target.searchParams.get('prompt')).toBe('login');
    expect((await startLogin(config(), 'prompt=evil')).target.searchParams.has('prompt')).toBe(false);
  });

  it('forwards create, which opens the provider\'s sign-up', async () => {
    expect((await startLogin(config(), 'prompt=create')).target.searchParams.get('prompt')).toBe('create');
  });
});

describe('parameters an app adds to the authorization request', () => {
  it('forwards the ones it names from the login query, and no others', async () => {
    const cfg = config({ authorizeParams: ['organization'] });
    const { target } = await startLogin(cfg, 'organization=o1&login_hint=x&tenant=t');
    expect(target.searchParams.get('organization')).toBe('o1');
    expect(target.searchParams.has('login_hint')).toBe(false);
    expect(target.searchParams.has('tenant')).toBe(false);
    expect((await startLogin(cfg, '')).target.searchParams.has('organization')).toBe(false);
  });

  it('refuses to forward a parameter the client sets itself', () => {
    for (const name of ['client_id', 'redirect_uri', 'state', 'scope', 'response_type', 'code_challenge', 'prompt']) {
      expect(() => oauthRoutes(config({ authorizeParams: [name] }))).toThrow(name);
    }
  });
});

describe('a signed-out page load', () => {
  it('renders as is by default', async () => {
    const answer = await sessionLocals(config())(page('/'), pass);
    expect(await answer.text()).toBe('rendered');
  });

  it('is sent to sign in when the app requires it, keeping where it was going', async () => {
    const answer = await sessionLocals(config({ signIn: 'required' }))(page('/reviews?q=x'), pass);
    expect(answer.status).toBe(302);
    expect(answer.headers.get('location')).toBe('/auth/login?returnTo=%2Freviews%3Fq%3Dx');
  });

  it('asks the provider silently once, then renders signed out', async () => {
    const mw = sessionLocals(config({ signIn: 'silent' }));
    const first = await mw(page('/'), pass);
    expect(first.headers.get('location')).toBe('/auth/login?returnTo=%2F&prompt=none');
    const after = await mw(page('/', 'fx_session_checked=1'), pass);
    expect(await after.text()).toBe('rendered');
  });

  it('always sends a signed-out visitor to sign in under a protected path', async () => {
    const mw = sessionLocals(config({ signIn: 'silent', protectedPaths: ['/o'] }));
    const workspace = await mw(page('/o/acme', 'fx_session_checked=1'), pass);
    expect(workspace.headers.get('location')).toBe('/auth/login?returnTo=%2Fo%2Facme');
    expect(await (await mw(page('/organizations', 'fx_session_checked=1'), pass)).text()).toBe('rendered');
    expect(await (await sessionLocals(config({ protectedPaths: ['/o'] }))(page('/'), pass)).text()).toBe('rendered');
  });

  it('shows the page a refused sign-in came back to instead of asking again', async () => {
    const answer = await sessionLocals(config({ signIn: 'required' }))(page('/?auth_error=access_denied'), pass);
    expect(await answer.text()).toBe('rendered');
  });

  it('leaves API calls, assets, auth routes and public paths alone', async () => {
    const mw = sessionLocals(config({ signIn: 'required', publicPaths: ['/legal'] }));
    const api = new Request('https://app.test/api/x', { headers: { 'sec-fetch-dest': 'empty', accept: 'application/json' } });
    for (const request of [api, page('/auth/callback'), page('/legal/terms'), new Request('https://app.test/', { method: 'POST' })]) {
      expect(await (await mw(request, pass)).text()).toBe('rendered');
    }
  });
});

describe('a refused authorization', () => {
  it('comes back to the page after a silent check and remembers it was asked', async () => {
    const cfg = config({ signIn: 'silent' });
    const { cookie, state } = await startLogin(cfg, 'prompt=none&returnTo=%2Fdocs');
    const back = await oauthRoutes(cfg)(
      new Request(`https://app.test/auth/callback?error=login_required&state=${state}`, { headers: { cookie } }),
      pass,
    );
    expect(back.status).toBe(302);
    expect(back.headers.get('location')).toBe('/docs');
    const cookies = back.headers.getSetCookie().join('\n');
    // Only for a while: a sign-in at the provider afterwards must be picked up.
    expect(cookies).toMatch(/fx_session_checked=1; Path=\/; Max-Age=60;/);
    expect(cookies).toMatch(/fx_session=;.*Max-Age=0/);
  });

  it('says why on the page otherwise, instead of answering JSON', async () => {
    const { cookie, state } = await startLogin(config(), 'returnTo=%2Fapps');
    const back = await oauthRoutes(config())(
      new Request(`https://app.test/auth/callback?error=access_denied&state=${state}`, { headers: { cookie } }),
      pass,
    );
    expect(back.status).toBe(302);
    expect(back.headers.get('location')).toBe('/apps?auth_error=access_denied');
    expect(back.headers.getSetCookie().join('\n')).not.toContain('_checked=');
  });

  it('does not trust a refusal for a flow it did not start', async () => {
    const back = await oauthRoutes(config({ defaultReturnTo: '/' }))(
      new Request('https://app.test/auth/callback?error=login_required&state=forged'),
      pass,
    );
    expect(back.headers.get('location')).toBe('/?auth_error=login_required');
  });
});

describe('an answer the browser has no flow for', () => {
  const callback = (state: string, cookie = '') =>
    new Request(`https://app.test/auth/callback?code=c&state=${state}`, { headers: { cookie } });

  it('starts the sign-in again once, marking the new attempt', async () => {
    // The pending cookie expired: a provider page refreshed long after the login began.
    const back = await oauthRoutes(config())(callback('Zbu2_eZSsLQMm_Lea-UAIg'), pass);
    expect(back.status).toBe(302);
    expect(back.headers.get('location')).toBe('/auth/login?retry=1');
    const { state } = await startLogin(config(), 'retry=1');
    expect(state.endsWith('.retry')).toBe(true);
  });

  it('gives up on a page after the retry, never with JSON', async () => {
    const back = await oauthRoutes(config({ defaultReturnTo: '/' }))(callback('abc.retry'), pass);
    expect(back.status).toBe(302);
    expect(back.headers.get('location')).toBe('/?auth_error=state_mismatch');
  });

  it('starts again when another tab began a newer sign-in', async () => {
    const { cookie } = await startLogin(config(), '');
    const back = await oauthRoutes(config())(callback('older', cookie), pass);
    expect(back.headers.get('location')).toBe('/auth/login?retry=1');
  });
});

describe('how long a silent answer holds', () => {
  it('is configurable', async () => {
    const cfg = config({ signIn: 'silent', silentRecheck: 300 });
    const { cookie, state } = await startLogin(cfg, 'prompt=none');
    const back = await oauthRoutes(cfg)(
      new Request(`https://app.test/auth/callback?error=login_required&state=${state}`, { headers: { cookie } }),
      pass,
    );
    expect(back.headers.getSetCookie().join('\n')).toContain('fx_session_checked=1; Path=/; Max-Age=300;');
  });
});

describe('signing out', () => {
  it('stops a silent check from signing the visitor straight back in', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')));
    const out = await oauthRoutes(config({ signIn: 'silent' }))(new Request('https://app.test/auth/logout'), pass);
    expect(out.headers.getSetCookie().join('\n')).toContain('fx_session_checked=1');
  });
});
