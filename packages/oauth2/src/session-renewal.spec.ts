/**
 * A server-held session outlives its access token: `sessionLocals` renews it with the refresh
 * token, once for requests that arrive together, and drops a session the provider refuses.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { createSessionCookie } from '@fluixi/session/server';
import { sessionLocals, type OAuthRoutesConfig } from './server.js';

const config = (over: Partial<OAuthRoutesConfig> = {}): OAuthRoutesConfig => ({
  clientId: 'portal',
  redirectUri: 'https://app.test/auth/callback',
  cookieSecret: 'b'.repeat(32),
  userCacheMs: 0,
  endpoints: {
    authorization: 'https://idp.test/auth',
    token: 'https://idp.test/token',
    userinfo: 'https://idp.test/userinfo',
  },
  ...over,
});

const sealed = createSessionCookie<Record<string, unknown>>({ secret: 'b'.repeat(32) });

async function cookieFor(session: Record<string, unknown>): Promise<string> {
  return (await sealed.write(session)).split(';')[0]!;
}

const page = (cookie: string) =>
  new Request('https://app.test/', { headers: { 'sec-fetch-dest': 'document', accept: 'text/html', cookie } });

/** A provider whose token endpoint answers `refresh` and whose userinfo knows `valid` tokens. */
function provider(refresh: () => Response, valid = new Set(['fresh'])) {
  const calls = { token: 0, userinfo: 0 };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === 'https://idp.test/token') {
        calls.token++;
        expect(String(init?.body)).toContain('grant_type=refresh_token');
        return refresh();
      }
      calls.userinfo++;
      const token = new Headers(init?.headers).get('authorization')?.split(' ')[1] ?? '';
      return valid.has(token) ? Response.json({ sub: 'u1', name: 'Awa' }) : new Response(null, { status: 401 });
    }),
  );
  return calls;
}

const renewed = () => Response.json({ access_token: 'fresh', refresh_token: 'rt2', expires_in: 600 });

/** The locals the render saw, and the response it got. */
async function render(cfg: OAuthRoutesConfig, cookie: string) {
  let seen: unknown;
  const request = page(cookie);
  const response = await sessionLocals(cfg)(request, async () => {
    const { getRequestLocals } = await import('@fluixi/server');
    seen = (getRequestLocals(request) as { auth?: { user: unknown } }).auth?.user ?? null;
    return new Response('rendered');
  });
  return { response, user: seen };
}

afterEach(() => vi.unstubAllGlobals());

describe('an expired access token', () => {
  it('is renewed, and the browser gets the new cookie', async () => {
    const calls = provider(renewed);
    const cookie = await cookieFor({ accessToken: 'old', refreshToken: 'rt1', expiresAt: Date.now() - 1000 });
    const { response, user } = await render(config(), cookie);
    expect(calls.token).toBe(1);
    expect(user).toEqual({ sub: 'u1', name: 'Awa' });
    const next = response.headers.getSetCookie().find((c) => c.startsWith('fx_session='))!;
    expect((await sealed.read(new Request('https://app.test/', { headers: { cookie: next.split(';')[0]! } })))?.accessToken).toBe(
      'fresh',
    );
  });

  it('is renewed once for requests that arrive together, so the rotated token is not reused', async () => {
    const calls = provider(renewed);
    const cookie = await cookieFor({ accessToken: 'old', refreshToken: 'rt-shared', expiresAt: Date.now() - 1000 });
    const results = await Promise.all([render(config(), cookie), render(config(), cookie), render(config(), cookie)]);
    expect(calls.token).toBe(1);
    expect(results.every((r) => (r.user as { sub?: string } | null)?.sub === 'u1')).toBe(true);
  });

  it('ends the session when the provider refuses to renew it, and signs in again silently', async () => {
    provider(() => Response.json({ error: 'invalid_grant' }, { status: 400 }));
    const cookie = await cookieFor({ accessToken: 'old', refreshToken: 'rt-gone', expiresAt: Date.now() - 1000 });
    const { response } = await render(config({ signIn: 'silent' }), cookie);
    expect(response.headers.get('location')).toBe('/auth/login?returnTo=%2F&prompt=none');
    expect(response.headers.getSetCookie().some((c) => c.startsWith('fx_session=;') && /Max-Age=0/i.test(c))).toBe(true);
  });
});

describe('an access token refused before its time', () => {
  it('is renewed once and the page renders signed in', async () => {
    const calls = provider(renewed);
    const cookie = await cookieFor({ accessToken: 'revoked', refreshToken: 'rt-early', expiresAt: Date.now() + 600_000 });
    const { user } = await render(config(), cookie);
    expect(calls.token).toBe(1);
    expect(user).toEqual({ sub: 'u1', name: 'Awa' });
  });

  it('without a refresh token ends the session instead of rendering nobody for good', async () => {
    provider(renewed);
    const cookie = await cookieFor({ accessToken: 'revoked', expiresAt: Date.now() + 600_000 });
    const { response, user } = await render(config(), cookie);
    expect(user).toBeNull();
    expect(response.headers.getSetCookie().some((c) => c.startsWith('fx_session=;'))).toBe(true);
  });
});
