/**
 * A renewal that does not get a clean answer. The provider rotates refresh tokens and ends the
 * whole family when an old one comes back outside its race window, so a refresh token whose
 * answer was lost must never be sent again; one that never reached the provider may be.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { createSessionCookie } from '@fluixi/session/server';
import { sessionLocals, type OAuthRoutesConfig } from './server.js';

const config = (over: Partial<OAuthRoutesConfig> = {}): OAuthRoutesConfig => ({
  clientId: 'portal',
  redirectUri: 'https://app.test/auth/callback',
  cookieSecret: 'b'.repeat(32),
  userCacheMs: 0,
  tokenTimeoutMs: 50,
  endpoints: {
    authorization: 'https://idp.test/auth',
    token: 'https://idp.test/token',
    userinfo: 'https://idp.test/userinfo',
  },
  ...over,
});

const sealed = createSessionCookie<Record<string, unknown>>({ secret: 'b'.repeat(32) });

let next = 0;
/** An expired session with a refresh token no other test uses: renewals are shared by token. */
async function expiredCookie(): Promise<string> {
  const session = { accessToken: 'old', refreshToken: `rt-failure-${next++}`, expiresAt: Date.now() - 1000 };
  return (await sealed.write(session)).split(';')[0]!;
}

const page = (cookie: string) =>
  new Request('https://app.test/', { headers: { 'sec-fetch-dest': 'document', accept: 'text/html', cookie } });

/**
 * A provider whose token endpoint answers with `token`; userinfo knows `fresh`, refuses `old`
 * when `up`, and fails like the token endpoint when the provider is down.
 */
function provider(token: (init?: RequestInit) => Promise<Response>, up = true) {
  const calls = { token: 0 };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      if (String(input) === 'https://idp.test/token') {
        calls.token++;
        return token(init);
      }
      const bearer = new Headers(init?.headers).get('authorization')?.split(' ')[1] ?? '';
      if (bearer === 'fresh') return Response.json({ sub: 'u1' });
      return up ? new Response(null, { status: 401 }) : new Response(null, { status: 503 });
    }),
  );
  return calls;
}

/** Rejects like undici when the connection fails, with the system error as its cause. */
const networkError = (code: string) => Promise.reject(Object.assign(new TypeError('fetch failed'), { cause: { code } }));

/** Never answers, until the request is aborted. */
const hang = (init?: RequestInit) =>
  new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
  });

async function render(cookie: string, cfg = config()) {
  let user: unknown;
  const request = page(cookie);
  const response = await sessionLocals(cfg)(request, async () => {
    const { getRequestLocals } = await import('@fluixi/server');
    user = (getRequestLocals(request) as { auth?: { user: unknown } }).auth?.user ?? null;
    return new Response('rendered');
  });
  const session = response.headers.getSetCookie().find((c) => c.startsWith('fx_session='));
  return { user, cleared: session !== undefined && /max-age=0/i.test(session) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('a renewal whose answer may have been lost', () => {
  it('does not send the refresh token again after a timeout', async () => {
    const calls = provider(hang);
    const cookie = await expiredCookie();
    const first = await render(cookie);
    expect(first.user).toBeNull();
    expect(first.cleared).toBe(true);
    // A second request still carrying the old cookie (another tab, a request already in flight).
    await render(cookie);
    expect(calls.token).toBe(1);
  });

  it('does not send it again after the connection dropped mid-request', async () => {
    const calls = provider(() => networkError('ECONNRESET'));
    const cookie = await expiredCookie();
    expect((await render(cookie)).cleared).toBe(true);
    await render(cookie);
    expect(calls.token).toBe(1);
  });

  it('does not take a malformed success for a session', async () => {
    const calls = provider(async () => new Response('<html>proxy error</html>', { status: 200 }));
    const cookie = await expiredCookie();
    const first = await render(cookie);
    expect(first.user).toBeNull();
    expect(first.cleared).toBe(true);
    await render(cookie);
    expect(calls.token).toBe(1);
  });

  it('does not take a success without an access token for a session', async () => {
    provider(async () => Response.json({ token_type: 'Bearer' }));
    const first = await render(await expiredCookie());
    expect(first.user).toBeNull();
    expect(first.cleared).toBe(true);
  });
});

describe('a renewal the provider never processed', () => {
  it('keeps the session when the provider is down, and waits before asking again', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    let down = true;
    const calls = provider(async () =>
      down
        ? new Response(null, { status: 503, headers: { 'retry-after': '2' } })
        : Response.json({ access_token: 'fresh', refresh_token: 'next', expires_in: 600 }),
    false);
    const cookie = await expiredCookie();
    expect((await render(cookie)).cleared).toBe(false);
    await render(cookie);
    expect(calls.token).toBe(1);
    // Retry-After has passed and the provider is back: the same refresh token renews.
    vi.setSystemTime(Date.now() + 2_500);
    down = false;
    expect((await render(cookie)).user).toEqual({ sub: 'u1' });
    expect(calls.token).toBe(2);
  });

  it('keeps the session when only the token endpoint is down and userinfo refuses the old token', async () => {
    const calls = provider(async () => new Response(null, { status: 503 }));
    const cookie = await expiredCookie();
    expect((await render(cookie)).cleared).toBe(false);
    expect(calls.token).toBe(1);
  });

  it('treats a rate limit the same way', async () => {
    const calls = provider(async () => new Response(null, { status: 429 }), false);
    const cookie = await expiredCookie();
    expect((await render(cookie)).cleared).toBe(false);
    await render(cookie);
    expect(calls.token).toBe(1);
  });

  it('keeps the session when the connection was refused, the token never sent', async () => {
    const calls = provider(() => networkError('ECONNREFUSED'), false);
    const cookie = await expiredCookie();
    expect((await render(cookie)).cleared).toBe(false);
    await render(cookie);
    expect(calls.token).toBe(1);
  });
});
