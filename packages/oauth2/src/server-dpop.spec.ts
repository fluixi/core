/**
 * DPoP in server mode, against a provider that enforces it the way Okta does: a nonce first,
 * a proof on every token request, the refresh proved with the key that obtained the token,
 * and `DPoP`-scheme resource calls whose proof carries the token's hash.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateJwkThumbprint, decodeProtectedHeader, jwtVerify, importJWK } from 'jose';
import { oauthRoutes, sessionLocals, type OAuthRoutesConfig } from './server.js';

const ENDPOINTS = {
  authorization: 'https://idp.test/auth',
  token: 'https://idp.test/token',
  userinfo: 'https://idp.test/userinfo',
};

const config = (over: Partial<OAuthRoutesConfig> = {}): OAuthRoutesConfig => ({
  clientId: 'admin',
  clientSecret: 'shh',
  redirectUri: 'https://app.test/auth/callback',
  cookieSecret: 'a'.repeat(32),
  endpoints: ENDPOINTS,
  dpop: true,
  ...over,
});

/** Verify a proof and return its claims and the thumbprint of the key that signed it. */
async function checkProof(proof: string | null, method: string, url: string) {
  if (!proof) throw new Error('no proof');
  const header = decodeProtectedHeader(proof) as { typ?: string; jwk?: Record<string, unknown>; alg: string };
  expect(header.typ).toBe('dpop+jwt');
  const key = await importJWK(header.jwk as never, header.alg);
  const { payload } = await jwtVerify(proof, key);
  expect(payload.htm).toBe(method);
  expect(payload.htu).toBe(url);
  return { payload, jkt: await calculateJwkThumbprint(header.jwk as never) };
}

async function sha256url(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A provider that insists on DPoP, and a log of what it saw. */
function strictProvider() {
  const seen = { tokenCalls: 0, boundTo: '' as string, refreshedWith: '' as string, userinfo: 0 };
  const NONCE = 'n-1';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (input === ENDPOINTS.token) {
        seen.tokenCalls++;
        const { payload, jkt } = await checkProof(headers.get('dpop'), 'POST', ENDPOINTS.token);
        if (payload.nonce !== NONCE) {
          return new Response(JSON.stringify({ error: 'use_dpop_nonce' }), {
            status: 400,
            headers: { 'dpop-nonce': NONCE },
          });
        }
        const form = new URLSearchParams(String(init.body));
        if (form.get('grant_type') === 'authorization_code') seen.boundTo = jkt;
        if (form.get('grant_type') === 'refresh_token') {
          seen.refreshedWith = jkt;
          if (jkt !== seen.boundTo) {
            return new Response(JSON.stringify({ error: 'invalid_dpop_proof' }), { status: 400 });
          }
        }
        return Response.json({
          access_token: `at-${seen.tokenCalls}`,
          refresh_token: 'rt',
          token_type: 'DPoP',
          expires_in: 300,
        });
      }
      if (input === ENDPOINTS.userinfo) {
        seen.userinfo++;
        const [scheme, token] = String(headers.get('authorization')).split(' ');
        expect(scheme).toBe('DPoP');
        const { payload, jkt } = await checkProof(headers.get('dpop'), 'GET', ENDPOINTS.userinfo);
        expect(jkt).toBe(seen.boundTo);
        expect(payload.ath).toBe(await sha256url(token));
        return Response.json({ sub: 'u1' });
      }
      return new Response('unexpected', { status: 500 });
    }),
  );
  return seen;
}

const cookieOf = (response: Response) => String(response.headers.get('set-cookie')).split(';')[0];

/** Run the flow through `/callback`, returning the session cookie. */
async function signIn(routes: ReturnType<typeof oauthRoutes>) {
  const next = async () => new Response('next');
  const login = await routes(new Request('https://app.test/auth/login'), next);
  const state = new URL(String(login.headers.get('location'))).searchParams.get('state');
  const callback = await routes(
    new Request(`https://app.test/auth/callback?code=c&state=${state}`, { headers: { cookie: cookieOf(login) } }),
    next,
  );
  expect(callback.status).toBe(302);
  return cookieOf(callback);
}

afterEach(() => vi.unstubAllGlobals());

describe('a server-held session under DPoP', () => {
  it('proves the code exchange, answering the nonce the provider asked for', async () => {
    const seen = strictProvider();
    await signIn(oauthRoutes(config()));
    // One refusal for the nonce, one exchange that succeeded.
    expect(seen.tokenCalls).toBe(2);
    expect(seen.boundTo).not.toBe('');
  });

  it('refreshes with the key that obtained the token', async () => {
    const seen = strictProvider();
    const routes = oauthRoutes(config());
    const cookie = await signIn(routes);
    const refreshed = await routes(
      new Request('https://app.test/auth/refresh', { headers: { cookie } }),
      async () => new Response('next'),
    );
    expect(refreshed.status).toBe(200);
    expect(seen.refreshedWith).toBe(seen.boundTo);
  });

  it('calls userinfo with the DPoP scheme and a proof bound to the token', async () => {
    const seen = strictProvider();
    const routes = oauthRoutes(config());
    const cookie = await signIn(routes);
    const me = await routes(new Request('https://app.test/auth/me', { headers: { cookie } }), async () => new Response('next'));
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({ sub: 'u1' });
    expect(seen.userinfo).toBe(1);
  });

  it('resolves the user for a server render the same way', async () => {
    strictProvider();
    const cookie = await signIn(oauthRoutes(config()));
    const request = new Request('https://app.test/dashboard', { headers: { cookie } });
    await sessionLocals(config())(request, async () => new Response('ok'));
    const { getRequestLocals } = await import('@fluixi/server');
    expect((getRequestLocals(request) as { auth: { user: unknown } }).auth.user).toEqual({ sub: 'u1' });
  });

  it('keeps each session its own key', async () => {
    const seen = strictProvider();
    const routes = oauthRoutes(config());
    await signIn(routes);
    const first = seen.boundTo;
    await signIn(routes);
    expect(seen.boundTo).not.toBe(first);
  });
});
