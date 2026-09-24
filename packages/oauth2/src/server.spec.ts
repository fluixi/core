/**
 * The server half: the session cookie the routes write, and what `sessionLocals` puts on
 * a request.
 *
 * The cache is the part worth pinning. It decides how often the provider is asked, and
 * getting it wrong either hammers the provider or keeps someone signed in after their
 * session was ended.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createSessionCookie } from '@fluixi/session/server';
import { oauthRoutes, sessionLocals, type OAuthRoutesConfig } from './server.js';
import { clearDiscoveryCache } from './discovery.js';

const SECRET = 'a'.repeat(32);

const ENDPOINTS = {
  authorization: 'https://idp.test/auth',
  token: 'https://idp.test/token',
  userinfo: 'https://idp.test/userinfo',
};

const config = (over: Partial<OAuthRoutesConfig> = {}): OAuthRoutesConfig => ({
  clientId: 'admin',
  redirectUri: 'http://localhost:3000/callback',
  cookieSecret: SECRET,
  endpoints: ENDPOINTS,
  ...over,
});

/** A request carrying a session cookie sealed with the same secret. */
async function signedInRequest(payload: Record<string, unknown>): Promise<Request> {
  const cookie = createSessionCookie({ secret: SECRET });
  const header = await cookie.write(payload);
  return new Request('https://app.test/dashboard', {
    headers: { cookie: header.split(';')[0] },
  });
}

/** Counts how many times the provider was asked. */
function provider(user: unknown, ok = true) {
  const calls = { count: 0 };
  const fetcher = vi.fn(async () => {
    calls.count++;
    return new Response(JSON.stringify(user), { status: ok ? 200 : 401 });
  });
  vi.stubGlobal('fetch', fetcher);
  return calls;
}

/** What the middleware left on the request. */
const localsFor = async (mw: ReturnType<typeof sessionLocals>, request: Request) => {
  const { getRequestLocals } = await import('@fluixi/server');
  await mw(request, async () => new Response('ok'));
  return (getRequestLocals(request) as Record<string, any>).auth;
};

beforeEach(() => clearDiscoveryCache());
afterEach(() => vi.unstubAllGlobals());

describe('what a render is told about the visitor', () => {
  it('puts the user on the request', async () => {
    provider({ sub: 'u1', email: 'a@b.c' });
    const request = await signedInRequest({ accessToken: 'at' });

    const auth = await localsFor(sessionLocals(config()), request);
    expect(auth.user).toEqual({ sub: 'u1', email: 'a@b.c' });
  });

  it('says nobody rather than nothing when there is no cookie', async () => {
    provider({ sub: 'u1' });
    const request = new Request('https://app.test/');

    const auth = await localsFor(sessionLocals(config()), request);
    // A route reading locals should find an answer either way, so the absent case and
    // the signed-out case look the same to it.
    expect(auth).toEqual({ user: null, session: null });
  });

  it('renders signed out when the provider refuses the token', async () => {
    provider({ error: 'invalid_token' }, false);
    const request = await signedInRequest({ accessToken: 'stale' });

    const auth = await localsFor(sessionLocals(config()), request);
    expect(auth.user).toBeNull();
  });

  it('renders signed out rather than failing when the provider is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    const request = await signedInRequest({ accessToken: 'at' });

    // A provider that is down should not take the page down with it.
    const auth = await localsFor(sessionLocals(config()), request);
    expect(auth.user).toBeNull();
  });

  it('maps the claims when the app asked it to', async () => {
    provider({ sub: 'u1', preferred_username: 'ada' });
    const request = await signedInRequest({ accessToken: 'at' });

    const mw = sessionLocals(config({ mapUser: (c) => ({ id: c.sub, name: c.preferred_username }) }));
    const auth = await localsFor(mw, request);
    expect(auth.user).toEqual({ id: 'u1', name: 'ada' });
  });
});

describe('how often the provider is asked', () => {
  it('asks once for repeated requests carrying the same token', async () => {
    const calls = provider({ sub: 'u1' });
    const mw = sessionLocals(config());

    for (let i = 0; i < 3; i++) {
      await localsFor(mw, await signedInRequest({ accessToken: 'at' }));
    }
    // Without this every server render is a round trip, and the provider being up
    // becomes a condition of rendering at all.
    expect(calls.count).toBe(1);
  });

  it('asks again once the entry has expired', async () => {
    const calls = provider({ sub: 'u1' });
    const mw = sessionLocals(config({ userCacheMs: 1 }));

    await localsFor(mw, await signedInRequest({ accessToken: 'at' }));
    await new Promise((r) => setTimeout(r, 5));
    await localsFor(mw, await signedInRequest({ accessToken: 'at' }));

    expect(calls.count).toBe(2);
  });

  it('asks every time when caching is off', async () => {
    const calls = provider({ sub: 'u1' });
    const mw = sessionLocals(config({ userCacheMs: 0 }));

    await localsFor(mw, await signedInRequest({ accessToken: 'at' }));
    await localsFor(mw, await signedInRequest({ accessToken: 'at' }));
    expect(calls.count).toBe(2);
  });

  it('keeps two visitors apart', async () => {
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ sub: `u${++n}` }))));
    const mw = sessionLocals(config());

    const first = await localsFor(mw, await signedInRequest({ accessToken: 'token-a' }));
    const second = await localsFor(mw, await signedInRequest({ accessToken: 'token-b' }));

    // Keyed by token, so one visitor's cached user can never answer for another.
    expect(first.user).toEqual({ sub: 'u1' });
    expect(second.user).toEqual({ sub: 'u2' });
  });

  it('does not cache a refusal', async () => {
    let status = 401;
    const calls = { count: 0 };
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls.count++;
      return new Response(JSON.stringify({ sub: 'u1' }), { status });
    }));
    const mw = sessionLocals(config());

    await localsFor(mw, await signedInRequest({ accessToken: 'at' }));
    status = 200;
    const auth = await localsFor(mw, await signedInRequest({ accessToken: 'at' }));

    // Caching the refusal would keep someone signed out after the provider recovered.
    expect(calls.count).toBe(2);
    expect(auth.user).toEqual({ sub: 'u1' });
  });
});

describe('retiring a token from a server-held session', () => {
  const REVOKE = 'https://idp.test/revoke';

  /** A provider with a revocation endpoint, recording what it was sent. */
  function idp(withRevocation = true) {
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, body: String(init?.body ?? '') });
      return new Response('{}', { status: 200 });
    }));
    return {
      calls,
      config: config({
        endpoints: withRevocation ? { ...ENDPOINTS, revocation: REVOKE } : ENDPOINTS,
        clientSecret: 'shh',
      } as never),
      revocations: () => calls.filter((c) => c.url === REVOKE),
    };
  }

  const post = (path: string, cookie: string) =>
    new Request(`https://app.test${path}`, {
      method: 'POST',
      headers: { cookie: cookie.split(';')[0] },
    });

  it('revokes the refresh token the cookie holds', async () => {
    const { config: cfg, revocations } = idp();
    const cookie = await createSessionCookie({ secret: SECRET }).write({
      accessToken: 'at',
      refreshToken: 'rt',
    });

    const response = await oauthRoutes(cfg)(post('/auth/revoke', cookie), async () =>
      new Response(null, { status: 404 }),
    );

    expect(response.status).toBe(200);
    const body = new URLSearchParams(revocations()[0].body);
    // The refresh token, not the access token: one expires on its own in minutes.
    expect(body.get('token')).toBe('rt');
    expect(body.get('token_type_hint')).toBe('refresh_token');
  });

  it('revokes the access token when asked for that one', async () => {
    const { config: cfg, revocations } = idp();
    const cookie = await createSessionCookie({ secret: SECRET }).write({
      accessToken: 'at',
      refreshToken: 'rt',
    });

    await oauthRoutes(cfg)(post('/auth/revoke?hint=access_token', cookie), async () =>
      new Response(null, { status: 404 }),
    );
    expect(new URLSearchParams(revocations()[0].body).get('token')).toBe('at');
  });

  it('refuses without a session rather than reporting success', async () => {
    const { config: cfg, revocations } = idp();
    const response = await oauthRoutes(cfg)(
      new Request('https://app.test/auth/revoke', { method: 'POST' }),
      async () => new Response(null, { status: 404 }),
    );
    expect(response.status).toBe(401);
    expect(revocations()).toHaveLength(0);
  });

  it('says so when the provider publishes no revocation endpoint', async () => {
    const { config: cfg } = idp(false);
    const cookie = await createSessionCookie({ secret: SECRET }).write({
      accessToken: 'at',
      refreshToken: 'rt',
    });

    const response = await oauthRoutes(cfg)(post('/auth/revoke', cookie), async () =>
      new Response(null, { status: 404 }),
    );
    // A silent success would leave the token live while the caller believed otherwise.
    expect(response.status).toBe(501);
    expect((await response.json()).error).toBe('no_revocation_endpoint');
  });

  it('revokes on the way out of a logout', async () => {
    const { config: cfg, revocations } = idp();
    const cookie = await createSessionCookie({ secret: SECRET }).write({
      accessToken: 'at',
      refreshToken: 'rt',
    });

    const response = await oauthRoutes(cfg)(post('/auth/logout', cookie), async () =>
      new Response(null, { status: 404 }),
    );

    // Dropping the cookie without revoking leaves a copy usable for its whole lifetime.
    expect(revocations()).toHaveLength(1);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
