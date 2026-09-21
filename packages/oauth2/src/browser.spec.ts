// @vitest-environment jsdom
/**
 * The browser client, against a stand-in authorization server.
 *
 * The parts worth testing are the ones an attacker probes: that `state` is checked, that
 * the verifier is single-use, and that a refused refresh clears the dead token rather
 * than retrying it forever. The happy path is here to keep those honest.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowserClient } from './browser.js';
import { clearDiscoveryCache } from './discovery.js';
import { OAuthError, type BrowserConfig } from './types.js';

const ENDPOINTS = {
  authorization: 'https://idp.test/oauth/v2/oauth-authorize',
  token: 'https://idp.test/oauth/v2/oauth-token',
  userinfo: 'https://idp.test/oauth/v2/oauth-userinfo',
  endSession: 'https://idp.test/oauth/v2/oauth-session',
};

const config = (over: Partial<BrowserConfig> = {}): BrowserConfig => ({
  mode: 'browser',
  clientId: 'admin-spa',
  redirectUri: 'http://localhost:3000/callback',
  endpoints: ENDPOINTS,
  ...over,
});

/** Records requests and answers with whatever the test queued. */
function server(responses: Record<string, unknown>) {
  const calls: { url: string; body?: string }[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body as string });
    const key = Object.keys(responses).find((k) => url.includes(k));
    const payload = key ? responses[key] : { error: 'not_stubbed' };
    const status = (payload as { __status?: number }).__status ?? (key ? 200 : 400);
    return new Response(JSON.stringify(payload), { status });
  });
  return { fetcher: fetcher as unknown as typeof fetch, calls };
}

let assigned: string[] = [];

beforeEach(() => {
  clearDiscoveryCache();
  sessionStorage.clear();
  localStorage.clear();
  assigned = [];
  // jsdom refuses a real navigation, so the call is recorded instead.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      origin: 'http://localhost:3000',
      pathname: '/admin',
      search: '',
      href: 'http://localhost:3000/admin',
      assign: (url: string) => assigned.push(url),
    },
  });
});

afterEach(() => vi.restoreAllMocks());

describe('starting a login', () => {
  it('sends the parameters the flow needs', async () => {
    const { fetcher } = server({});
    await createBrowserClient(config(), fetcher).login();

    const url = new URL(assigned[0]);
    expect(url.origin + url.pathname).toBe(ENDPOINTS.authorization);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('admin-spa');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/callback');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/);
    expect(url.searchParams.get('state')).toBeTruthy();
  });

  it('never puts the verifier on the wire', async () => {
    const { fetcher } = server({});
    await createBrowserClient(config(), fetcher).login();
    const verifier = sessionStorage.getItem('fx.oauth2.verifier')!;

    expect(verifier).toBeTruthy();
    // The whole point of PKCE: the challenge travels, the verifier stays.
    expect(assigned[0]).not.toContain(verifier);
  });

  it('records where to return', async () => {
    const { fetcher } = server({});
    await createBrowserClient(config(), fetcher).login({ returnTo: '/reports' });
    expect(sessionStorage.getItem('fx.oauth2.return')).toBe('/reports');
  });

  it('passes extra parameters through', async () => {
    const { fetcher } = server({});
    await createBrowserClient(config(), fetcher).login({ params: { prompt: 'login' } });
    expect(new URL(assigned[0]).searchParams.get('prompt')).toBe('login');
  });
});

describe('finishing a login', () => {
  it('exchanges the code and keeps the tokens', async () => {
    const { fetcher, calls } = server({
      'oauth-token': { access_token: 'at', refresh_token: 'rt', expires_in: 3600 },
    });
    const client = createBrowserClient(config(), fetcher);
    await client.login();
    const state = sessionStorage.getItem('fx.oauth2.state')!;

    const tokens = await client.handleCallback({ code: 'the-code', state });

    expect(tokens.accessToken).toBe('at');
    expect(tokens.refreshToken).toBe('rt');
    expect(tokens.expiresAt).toBeGreaterThan(Date.now());

    const body = new URLSearchParams(calls.at(-1)!.body);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('the-code');
    expect(body.get('code_verifier')).toBeTruthy();
  });

  it('refuses a callback whose state does not match', async () => {
    const { fetcher } = server({ 'oauth-token': { access_token: 'at' } });
    const client = createBrowserClient(config(), fetcher);
    await client.login();

    await expect(client.handleCallback({ code: 'c', state: 'forged' })).rejects.toThrow(
      /state did not match/,
    );
  });

  it('refuses a callback with no state at all', async () => {
    const { fetcher } = server({ 'oauth-token': { access_token: 'at' } });
    const client = createBrowserClient(config(), fetcher);
    await client.login();
    await expect(client.handleCallback({ code: 'c' })).rejects.toThrow(/state did not match/);
  });

  it('spends the verifier once, so a replayed callback fails', async () => {
    const { fetcher } = server({ 'oauth-token': { access_token: 'at' } });
    const client = createBrowserClient(config(), fetcher);
    await client.login();
    const state = sessionStorage.getItem('fx.oauth2.state')!;

    await client.handleCallback({ code: 'c', state });
    await expect(client.handleCallback({ code: 'c', state })).rejects.toThrow();
  });

  it('reports what the server refused', async () => {
    const { fetcher } = server({});
    const client = createBrowserClient(config(), fetcher);
    await expect(
      client.handleCallback({ error: 'access_denied', errorDescription: 'User said no' }),
    ).rejects.toThrow(/User said no/);
  });

  it('says so when the token response carries no token', async () => {
    const { fetcher } = server({ 'oauth-token': { token_type: 'Bearer' } });
    const client = createBrowserClient(config(), fetcher);
    await client.login();
    const state = sessionStorage.getItem('fx.oauth2.state')!;
    await expect(client.handleCallback({ code: 'c', state })).rejects.toThrow(/no access_token/);
  });
});

describe('refreshing', () => {
  async function signedIn() {
    const { fetcher, calls } = server({
      'oauth-token': { access_token: 'at', refresh_token: 'rt', expires_in: 60 },
    });
    const client = createBrowserClient(config(), fetcher);
    await client.login();
    await client.handleCallback({ code: 'c', state: sessionStorage.getItem('fx.oauth2.state')! });
    return { client, calls };
  }

  it('exchanges the refresh token', async () => {
    const { client, calls } = await signedIn();
    const tokens = await client.refresh();
    expect(tokens.accessToken).toBe('at');
    expect(new URLSearchParams(calls.at(-1)!.body).get('grant_type')).toBe('refresh_token');
  });

  it('drops a refresh token the server refused', async () => {
    const { fetcher } = server({
      'oauth-token': { error: 'invalid_grant', __status: 400 },
    });
    const client = createBrowserClient(config(), fetcher);
    sessionStorage.setItem('fx.oauth2.refresh', 'stale');

    await expect(client.refresh()).rejects.toThrow(OAuthError);
    // Keeping it would make every later attempt fail the same way.
    expect(sessionStorage.getItem('fx.oauth2.refresh')).toBeNull();
  });

  it('says so when there is nothing to refresh with', async () => {
    const { fetcher } = server({});
    await expect(createBrowserClient(config(), fetcher).refresh()).rejects.toThrow(
      /No refresh token/,
    );
  });
});

describe('restoring on a cold load', () => {
  it('returns nothing without a stored refresh token', async () => {
    const { fetcher } = server({});
    expect(await createBrowserClient(config(), fetcher).restore!()).toBeNull();
  });

  it('spends a stored refresh token for a fresh session', async () => {
    const { fetcher } = server({ 'oauth-token': { access_token: 'fresh', expires_in: 60 } });
    sessionStorage.setItem('fx.oauth2.refresh', 'rt');
    const tokens = await createBrowserClient(config(), fetcher).restore!();
    expect(tokens?.accessToken).toBe('fresh');
  });
});

describe('the user', () => {
  it('comes from the userinfo endpoint', async () => {
    const { fetcher } = server({
      'oauth-token': { access_token: 'at' },
      'oauth-userinfo': { sub: 'u1', email: 'a@b.c' },
    });
    const client = createBrowserClient(config(), fetcher);
    await client.login();
    await client.handleCallback({ code: 'c', state: sessionStorage.getItem('fx.oauth2.state')! });

    expect(await client.fetchUser()).toEqual({ sub: 'u1', email: 'a@b.c' });
  });
});

describe('logging out', () => {
  it('clears the stored token and visits the end-session endpoint', async () => {
    const { fetcher } = server({ 'oauth-token': { access_token: 'at', refresh_token: 'rt' } });
    const client = createBrowserClient(config({ postLogoutRedirectUri: 'http://localhost:3000/' }), fetcher);
    await client.login();
    await client.handleCallback({ code: 'c', state: sessionStorage.getItem('fx.oauth2.state')! });

    await client.logout();

    expect(sessionStorage.getItem('fx.oauth2.refresh')).toBeNull();
    expect(assigned.at(-1)).toContain(ENDPOINTS.endSession);
    expect(assigned.at(-1)).toContain('post_logout_redirect_uri');
  });
});

describe('discovery', () => {
  it('reads the endpoints from the issuer', async () => {
    const { fetcher } = server({
      'openid-configuration': {
        issuer: 'https://idp.test',
        authorization_endpoint: ENDPOINTS.authorization,
        token_endpoint: ENDPOINTS.token,
      },
    });
    const client = createBrowserClient(
      { mode: 'browser', clientId: 'x', redirectUri: 'http://localhost:3000/callback', issuer: 'https://idp.test' },
      fetcher,
    );
    await client.login();
    expect(assigned[0]).toContain(ENDPOINTS.authorization);
  });

  it('says so when neither issuer nor endpoints were given', async () => {
    const { fetcher } = server({});
    const client = createBrowserClient(
      { mode: 'browser', clientId: 'x', redirectUri: 'http://localhost:3000/callback' },
      fetcher,
    );
    await expect(client.login()).rejects.toThrow(/issuer/);
  });
});
