/**
 * The client credentials grant.
 *
 * The behaviour worth pinning is the caching, because getting it wrong is invisible: too
 * eager and a request fails with a token that expired in flight, too loose and a burst of
 * callers each mint their own while the provider rate-limits the endpoint.
 */
import { describe, expect, it, afterEach, vi } from 'vitest';
import { createServiceClient } from './service-client.js';
import { clearDiscoveryCache } from './discovery.js';

const ISSUER = 'https://idp.test/realms/app';
const TOKEN_URL = 'https://idp.test/realms/app/token';

/** A token endpoint that counts calls and hands out a new token each time. */
function idp(over: Record<string, unknown> = {}, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  let n = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    if (url.includes('openid-configuration')) {
      return new Response(JSON.stringify({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/auth`,
        token_endpoint: TOKEN_URL,
      }));
    }
    return new Response(
      JSON.stringify({ access_token: `at-${++n}`, expires_in: 300, scope: 'orders:read', ...over }),
      { status },
    );
  }));
  return { calls, tokenCalls: () => calls.filter((c) => c.url === TOKEN_URL) };
}

const client = (over = {}) =>
  createServiceClient({
    tokenEndpoint: TOKEN_URL,
    clientId: 'reports-job',
    clientSecret: 'shh',
    scopes: ['orders:read'],
    ...over,
  });

afterEach(() => {
  vi.unstubAllGlobals();
  clearDiscoveryCache();
});

describe('asking for a token', () => {
  it('sends the client credentials grant', async () => {
    const { tokenCalls } = idp();
    expect(await client().token()).toBe('at-1');

    const body = new URLSearchParams(String(tokenCalls()[0].init.body));
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('scope')).toBe('orders:read');
  });

  it('authenticates with Basic by default, keeping the secret out of the body', async () => {
    const { tokenCalls } = idp();
    await client().token();

    const headers = tokenCalls()[0].init.headers as Record<string, string>;
    expect(atob(headers.authorization.slice(6))).toBe('reports-job:shh');
    expect(String(tokenCalls()[0].init.body)).not.toContain('shh');
  });

  it('can send them in the body instead', async () => {
    const { tokenCalls } = idp();
    await client({ clientAuthMethod: 'body' }).token();

    const body = new URLSearchParams(String(tokenCalls()[0].init.body));
    expect(body.get('client_secret')).toBe('shh');
  });

  it('names an audience when the provider wants one there', async () => {
    const { tokenCalls } = idp();
    // Auth0 issues an opaque token rather than a JWT without this.
    await client({ audience: 'https://api.example.com' }).token();
    expect(new URLSearchParams(String(tokenCalls()[0].init.body)).get('audience')).toBe(
      'https://api.example.com',
    );
  });

  it('finds the token endpoint through discovery', async () => {
    idp();
    const c = createServiceClient({ issuer: ISSUER, clientId: 'a', clientSecret: 'b' });
    expect(await c.token()).toBe('at-1');
  });

  it('reports a refusal with the provider reason', async () => {
    idp({ error: 'invalid_client' }, 401);
    await expect(client().token()).rejects.toThrow(/invalid_client/);
  });

  it('says so when the response carries no token', async () => {
    idp({ access_token: undefined }, 200);
    await expect(client().token()).rejects.toThrow(/no access_token/);
  });
});

describe('caching', () => {
  it('reuses a token that is still good', async () => {
    const { tokenCalls } = idp();
    const c = client();
    await c.token();
    await c.token();
    expect(tokenCalls()).toHaveLength(1);
  });

  it('fetches again once the token is close to expiring', async () => {
    const { tokenCalls } = idp({ expires_in: 20 });
    // 20s of life against a 30s skew: it is never fresh enough to reuse.
    const c = client({ refreshSkewMs: 30_000 });
    await c.token();
    await c.token();
    expect(tokenCalls()).toHaveLength(2);
  });

  it('makes one request when several callers arrive at once', async () => {
    const { tokenCalls } = idp();
    const c = client();
    const [a, b, d] = await Promise.all([c.token(), c.token(), c.token()]);

    // Without this a burst on a cold cache is a burst at the token endpoint.
    expect(tokenCalls()).toHaveLength(1);
    expect([a, b, d]).toEqual(['at-1', 'at-1', 'at-1']);
  });

  it('fetches again after a reset', async () => {
    const { tokenCalls } = idp();
    const c = client();
    await c.token();
    c.reset();
    expect(await c.token()).toBe('at-2');
    expect(tokenCalls()).toHaveLength(2);
  });

  it('does not wedge after a failure', async () => {
    let fail = true;
    vi.stubGlobal('fetch', vi.fn(async () =>
      fail
        ? new Response(JSON.stringify({ error: 'temporarily_unavailable' }), { status: 503 })
        : new Response(JSON.stringify({ access_token: 'at-ok', expires_in: 300 })),
    ));
    const c = client();

    await expect(c.token()).rejects.toThrow();
    fail = false;
    // A failed request that stayed cached as pending would never retry.
    expect(await c.token()).toBe('at-ok');
  });
});

describe('what it refuses to be built with', () => {
  it('no credentials', () => {
    expect(() =>
      createServiceClient({ issuer: ISSUER, clientId: '', clientSecret: '' }),
    ).toThrow(/client credentials/);
  });

  it('no issuer and no token endpoint', () => {
    expect(() => createServiceClient({ clientId: 'a', clientSecret: 'b' })).toThrow(
      /issuer or a tokenEndpoint/,
    );
  });
});
