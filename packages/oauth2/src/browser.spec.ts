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
    const verifier = sessionStorage.getItem('fx.oauth2.admin-spa.verifier')!;

    expect(verifier).toBeTruthy();
    // The whole point of PKCE: the challenge travels, the verifier stays.
    expect(assigned[0]).not.toContain(verifier);
  });

  it('records where to return', async () => {
    const { fetcher } = server({});
    await createBrowserClient(config(), fetcher).login({ returnTo: '/reports' });
    expect(sessionStorage.getItem('fx.oauth2.admin-spa.return')).toBe('/reports');
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
    const state = sessionStorage.getItem('fx.oauth2.admin-spa.state')!;

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
    const state = sessionStorage.getItem('fx.oauth2.admin-spa.state')!;

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
    const state = sessionStorage.getItem('fx.oauth2.admin-spa.state')!;
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
    await client.handleCallback({ code: 'c', state: sessionStorage.getItem('fx.oauth2.admin-spa.state')! });
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
    sessionStorage.setItem('fx.oauth2.admin-spa.refresh', 'stale');

    await expect(client.refresh()).rejects.toThrow(OAuthError);
    // Keeping it would make every later attempt fail the same way.
    expect(sessionStorage.getItem('fx.oauth2.admin-spa.refresh')).toBeNull();
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
    sessionStorage.setItem('fx.oauth2.admin-spa.refresh', 'rt');
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
    await client.handleCallback({ code: 'c', state: sessionStorage.getItem('fx.oauth2.admin-spa.state')! });

    expect(await client.fetchUser()).toEqual({ sub: 'u1', email: 'a@b.c' });
  });
});

describe('the userinfo endpoint', () => {
  /** A JWT with the given subject. Unsigned: only the payload is ever read. */
  const idTokenFor = (sub: string) =>
    `x.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.y`;

  async function signedInAs(sub: string, userinfo: unknown, init: ResponseInit = {}) {
    const fetcher = (async (input: RequestInfo | URL) => {
      if (String(input).includes('oauth-token')) {
        return new Response(
          JSON.stringify({ access_token: 'at', id_token: idTokenFor(sub) }),
        );
      }
      return new Response(JSON.stringify(userinfo), init);
    }) as unknown as typeof fetch;

    const client = createBrowserClient(config(), fetcher);
    await client.login();
    await client.handleCallback({
      code: 'c',
      state: sessionStorage.getItem('fx.oauth2.admin-spa.state')!,
    });
    return client;
  }

  it('returns the claims when the subject matches the id token', async () => {
    const client = await signedInAs('u1', { sub: 'u1', email: 'a@b.c' });
    expect(await client.fetchUser()).toEqual({ sub: 'u1', email: 'a@b.c' });
  });

  it('discards a response whose subject is not the one signed in', async () => {
    const client = await signedInAs('u1', { sub: 'someone-else', email: 'x@y.z' });
    // OIDC requires this: without it, a response obtained for one subject could be read
    // as another.
    await expect(client.fetchUser()).rejects.toThrow(/does not match the id token/);
  });

  it('accepts a provider that returns no id token to compare against', async () => {
    const fetcher = (async (input: RequestInfo | URL) =>
      String(input).includes('oauth-token')
        ? new Response(JSON.stringify({ access_token: 'at' }))
        : new Response(JSON.stringify({ sub: 'u1' }))) as unknown as typeof fetch;

    const client = createBrowserClient(config(), fetcher);
    await client.login();
    await client.handleCallback({
      code: 'c',
      state: sessionStorage.getItem('fx.oauth2.admin-spa.state')!,
    });
    // A plain OAuth2 provider has no id token, so there is nothing to check against.
    expect(await client.fetchUser()).toEqual({ sub: 'u1' });
  });

  it('says so for a signed response rather than failing in a JSON parse', async () => {
    const client = await signedInAs('u1', 'a.signed.jwt', {
      headers: { 'content-type': 'application/jwt' },
    });
    await expect(client.fetchUser()).rejects.toThrow(/signed userinfo response/);
  });

  it('reports the reason the provider gave for refusing the token', async () => {
    const client = await signedInAs('u1', { error: 'nope' }, {
      status: 401,
      headers: { 'www-authenticate': 'Bearer error="invalid_token"' },
    });
    await expect(client.fetchUser()).rejects.toThrow(/invalid_token/);
  });
});

describe('a user endpoint that is not the provider', () => {
  const idTokenFor = (sub: string) =>
    `x.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.y`;

  /** Records the user request so a test can assert what was sent. */
  function appApi(body: unknown) {
    const seen: { url: string; init?: RequestInit }[] = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      seen.push({ url, init });
      if (url.includes('oauth-token')) {
        return new Response(JSON.stringify({ access_token: 'at', id_token: idTokenFor('u1') }));
      }
      return new Response(JSON.stringify(body));
    }) as unknown as typeof fetch;
    return { fetcher, seen };
  }

  async function signedIn(over: Partial<BrowserConfig>, body: unknown) {
    const { fetcher, seen } = appApi(body);
    const client = createBrowserClient(config(over), fetcher);
    await client.login();
    await client.handleCallback({
      code: 'c',
      state: sessionStorage.getItem('fx.oauth2.admin-spa.state')!,
    });
    return { client, seen };
  }

  it('calls the configured url instead of the discovered one', async () => {
    const { client, seen } = await signedIn(
      { userInfo: { url: 'https://api.test/me' } },
      { id: 'u1' },
    );
    await client.fetchUser();
    expect(seen.at(-1)!.url).toBe('https://api.test/me');
  });

  it('unwraps an envelope through `map`', async () => {
    const { client } = await signedIn(
      {
        userInfo: {
          url: 'https://api.test/me',
          map: (raw: { data: { uid: string; role: string } }) => ({
            id: raw.data.uid,
            role: raw.data.role,
          }),
        },
      },
      { data: { uid: 'u9', role: 'support' } },
    );
    expect(await client.fetchUser()).toEqual({ id: 'u9', role: 'support' });
  });

  it('maps the provider response too, without a url', async () => {
    const { client } = await signedIn(
      { userInfo: { map: (raw: { sub: string }) => ({ id: raw.sub }) } },
      { sub: 'u1' },
    );
    expect(await client.fetchUser()).toEqual({ id: 'u1' });
  });

  it('sends the extra headers an api asks for', async () => {
    const { client, seen } = await signedIn(
      { userInfo: { url: 'https://api.test/me', headers: { 'x-tenant': 'adafri' } } },
      { id: 'u1' },
    );
    await client.fetchUser();
    const headers = seen.at(-1)!.init!.headers as Record<string, string>;
    expect(headers['x-tenant']).toBe('adafri');
    // The bearer token still goes: a custom endpoint is still authenticated by it.
    expect(headers.authorization).toBe('Bearer at');
  });

  it('skips the subject check for an endpoint that is not the provider', async () => {
    // The app's own `/me` answers in its own shape and has no OIDC `sub` to compare.
    // Applying the check here would reject every custom endpoint.
    const { client } = await signedIn(
      { userInfo: { url: 'https://api.test/me' } },
      { id: 'u9', email: 'a@b.c' },
    );
    expect(await client.fetchUser()).toEqual({ id: 'u9', email: 'a@b.c' });
  });

  it('still checks the subject when the provider answers', async () => {
    const { client } = await signedIn(
      { userInfo: { headers: { 'x-a': '1' } } },
      { sub: 'someone-else' },
    );
    await expect(client.fetchUser()).rejects.toThrow(/does not match the id token/);
  });
});

describe('logging out', () => {
  it('clears the stored token and visits the end-session endpoint', async () => {
    const { fetcher } = server({ 'oauth-token': { access_token: 'at', refresh_token: 'rt' } });
    const client = createBrowserClient(config({ postLogoutRedirectUri: 'http://localhost:3000/' }), fetcher);
    await client.login();
    await client.handleCallback({ code: 'c', state: sessionStorage.getItem('fx.oauth2.admin-spa.state')! });

    await client.logout();

    expect(sessionStorage.getItem('fx.oauth2.admin-spa.refresh')).toBeNull();
    expect(assigned.at(-1)).toContain(ENDPOINTS.endSession);
    expect(assigned.at(-1)).toContain('post_logout_redirect_uri');
  });
});

describe('more than one provider on a page', () => {
  it('keeps each client flow separate', async () => {
    const a = createBrowserClient(config({ clientId: 'app-a' }), server({}).fetcher);
    const b = createBrowserClient(config({ clientId: 'app-b' }), server({}).fetcher);

    await a.login();
    const aState = sessionStorage.getItem('fx.oauth2.app-a.state');
    await b.login();

    // Starting the second login used to overwrite the first's state and verifier, which
    // broke whichever one the visitor came back to.
    expect(sessionStorage.getItem('fx.oauth2.app-a.state')).toBe(aState);
    expect(sessionStorage.getItem('fx.oauth2.app-b.state')).not.toBe(aState);
  });

  it('gives each client its own refresh token', async () => {
    const one = server({ 'oauth-token': { access_token: 'a', refresh_token: 'ra' } });
    const two = server({ 'oauth-token': { access_token: 'b', refresh_token: 'rb' } });
    const a = createBrowserClient(config({ clientId: 'app-a' }), one.fetcher);
    const b = createBrowserClient(config({ clientId: 'app-b' }), two.fetcher);

    await a.login();
    await a.handleCallback({ code: 'c', state: sessionStorage.getItem('fx.oauth2.app-a.state')! });
    await b.login();
    await b.handleCallback({ code: 'c', state: sessionStorage.getItem('fx.oauth2.app-b.state')! });

    expect(sessionStorage.getItem('fx.oauth2.app-a.refresh')).toBe('ra');
    expect(sessionStorage.getItem('fx.oauth2.app-b.refresh')).toBe('rb');
  });
});

describe('providers that want Basic on the token endpoint', () => {
  it('sends the credentials in a header instead of the form', async () => {
    const calls: RequestInit[] = [];
    const fetcher = (async (_u: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init ?? {});
      return new Response(JSON.stringify({ access_token: 'at' }));
    }) as unknown as typeof fetch;

    const client = createBrowserClient(config({ tokenAuthMethod: 'basic' }), fetcher);
    await client.login();
    await client.handleCallback({
      code: 'c',
      state: sessionStorage.getItem('fx.oauth2.admin-spa.state')!,
    });

    const headers = calls.at(-1)!.headers as Record<string, string>;
    expect(headers.authorization).toMatch(/^Basic /);
    expect(atob(headers.authorization.slice(6))).toBe('admin-spa:');
    expect(String(calls.at(-1)!.body)).not.toContain('client_id');
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

describe('retiring a token at the provider', () => {
  const REVOKE = 'https://idp.test/oauth/v2/revoke';

  function withRevocation() {
    const calls: { url: string; body?: string }[] = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, body: init?.body as string });
      if (url.includes('oauth-token')) {
        return new Response(JSON.stringify({ access_token: 'at', refresh_token: 'rt' }));
      }
      return new Response('', { status: 200 });
    }) as unknown as typeof fetch;

    const client = createBrowserClient(
      config({ endpoints: { ...ENDPOINTS, revocation: REVOKE } as never }),
      fetcher,
    );
    return { client, calls, revocations: () => calls.filter((c) => c.url === REVOKE) };
  }

  async function signedIn() {
    const h = withRevocation();
    await h.client.login();
    await h.client.handleCallback({
      code: 'c',
      state: sessionStorage.getItem('fx.oauth2.admin-spa.state')!,
    });
    return h;
  }

  it('revokes the refresh token, which is the one worth retiring', async () => {
    const { client, revocations } = await signedIn();
    await client.revoke!();

    const body = new URLSearchParams(revocations()[0].body);
    // An access token expires on its own in minutes; a refresh token does not.
    expect(body.get('token')).toBe('rt');
    expect(body.get('token_type_hint')).toBe('refresh_token');
  });

  it('revokes before forgetting, when signing out', async () => {
    const { client, revocations } = await signedIn();
    await client.logout();
    // Dropping it without revoking leaves a copy usable for its whole lifetime.
    expect(revocations()).toHaveLength(1);
  });

  it('does nothing when the provider publishes no revocation endpoint', async () => {
    const { fetcher, calls } = server({ 'oauth-token': { access_token: 'at', refresh_token: 'rt' } });
    const client = createBrowserClient(config(), fetcher);
    await client.login();
    await client.handleCallback({
      code: 'c',
      state: sessionStorage.getItem('fx.oauth2.admin-spa.state')!,
    });

    const before = calls.length;
    await expect(client.revoke!()).resolves.toBeUndefined();
    expect(calls.length).toBe(before);
  });

  it('does nothing when there is no token to retire', async () => {
    const { client, revocations } = withRevocation();
    await expect(client.revoke!()).resolves.toBeUndefined();
    expect(revocations()).toHaveLength(0);
  });
});

describe('a provider that demands proof of possession', () => {
  it('explains what DPoP is rather than passing the word through', async () => {
    const { fetcher } = server({
      'oauth-token': { error: 'invalid_dpop_proof', __status: 400 },
    });
    const client = createBrowserClient(config(), fetcher);
    await client.login();
    const state = sessionStorage.getItem('fx.oauth2.admin-spa.state')!;

    // Okta turns this on by default, so the word is met before anything is misconfigured.
    await expect(client.handleCallback({ code: 'c', state })).rejects.toThrow(
      /requires DPoP .RFC 9449./,
    );
  });

  it('says the same for a nonce challenge, which is the other half of it', async () => {
    const { fetcher } = server({ 'oauth-token': { error: 'use_dpop_nonce', __status: 400 } });
    const client = createBrowserClient(config(), fetcher);
    await client.login();
    const state = sessionStorage.getItem('fx.oauth2.admin-spa.state')!;
    await expect(client.handleCallback({ code: 'c', state })).rejects.toThrow(/DPoP/);
  });

  it('leaves an ordinary refusal alone, with the provider description', async () => {
    const { fetcher } = server({
      'oauth-token': {
        error: 'invalid_grant',
        error_description: 'Code not valid',
        __status: 400,
      },
    });
    const client = createBrowserClient(config(), fetcher);
    await client.login();
    const state = sessionStorage.getItem('fx.oauth2.admin-spa.state')!;

    const failure = await client.handleCallback({ code: 'c', state }).catch((e) => e);
    expect(failure.message).toContain('Code not valid');
    expect(failure.message).not.toContain('DPoP');
  });
});
