/**
 * The verifier, against real signed tokens.
 *
 * Tokens are minted here with a real key pair and the JWKS is served from memory, so what
 * these assert is the actual cryptographic outcome rather than a mock agreeing with
 * itself. The cases that matter are the ones that must be refused: a token from another
 * issuer, one minted for another client, an expired one, and the algorithm substitutions
 * that turn a verifier into a way in.
 */
import { describe, expect, it, beforeAll, afterEach, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT, type KeyLike } from 'jose';
import { createTokenVerifier, createTokenIntrospector } from './verify.js';
import { clearDiscoveryCache } from './discovery.js';

const ISSUER = 'https://idp.test/realms/app';
const JWKS_URI = 'https://idp.test/realms/app/certs';

let priv: KeyLike;
let jwks: { keys: unknown[] };
/** A second pair, to sign a token this service must not accept. */
let attackerPriv: KeyLike;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256', { extractable: true });
  priv = pair.privateKey;
  jwks = { keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'RS256', use: 'sig', kid: 'k1' }] };

  const other = await generateKeyPair('RS256', { extractable: true });
  attackerPriv = other.privateKey;
});

/** A token signed with the provider's key unless told otherwise. */
async function mint(claims: Record<string, unknown> = {}, key?: KeyLike, alg = 'RS256') {
  return new SignJWT({ scope: 'admin', ...claims })
    .setProtectedHeader({ alg, kid: 'k1' })
    .setIssuer(ISSUER)
    .setAudience('adafri-admin')
    .setSubject('u1')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key ?? priv);
}

/** Serves the JWKS, and counts how often it was fetched. */
function serveJwks() {
  const calls = { count: 0 };
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/certs')) {
      calls.count++;
      return new Response(JSON.stringify(jwks), {
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.includes('openid-configuration')) {
      return new Response(JSON.stringify({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/auth`,
        token_endpoint: `${ISSUER}/token`,
        jwks_uri: JWKS_URI,
      }));
    }
    return new Response('{}', { status: 404 });
  }));
  return calls;
}

const verifier = (over = {}) =>
  createTokenVerifier({ issuer: ISSUER, audience: 'adafri-admin', jwks, ...over });

afterEach(() => {
  vi.unstubAllGlobals();
  clearDiscoveryCache();
});

describe('a token this service should accept', () => {
  it('returns its claims', async () => {
    serveJwks();
    const claims = await verifier()(await mint());
    expect(claims.sub).toBe('u1');
    expect(claims.iss).toBe(ISSUER);
    expect(claims.scope).toBe('admin');
  });

  it('is read off a request', async () => {
    serveJwks();
    const request = new Request('https://api.test/orders', {
      headers: { authorization: `Bearer ${await mint()}` },
    });
    expect((await verifier().fromRequest(request)).sub).toBe('u1');
  });

  it('accepts the scheme in any case, as HTTP allows', async () => {
    serveJwks();
    const request = new Request('https://api.test/', {
      headers: { authorization: `bearer ${await mint()}` },
    });
    expect((await verifier().fromRequest(request)).sub).toBe('u1');
  });
});

describe('tokens that must be refused', () => {
  it('one signed with a key that is not the provider\'s', async () => {
    serveJwks();
    // The whole point: a well-formed token from the wrong signer.
    await expect(verifier()(await mint({}, attackerPriv))).rejects.toThrow(/not accepted/);
  });

  it('one minted for a different audience', async () => {
    serveJwks();
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(ISSUER)
      .setAudience('some-other-client')
      .setExpirationTime('5m')
      .sign(priv);
    // Without the audience check, any client of the same provider could replay here.
    await expect(verifier()(token)).rejects.toThrow(/not accepted/);
  });

  it('one from a different issuer', async () => {
    serveJwks();
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer('https://evil.test/realms/app')
      .setAudience('adafri-admin')
      .setExpirationTime('5m')
      .sign(priv);
    await expect(verifier()(token)).rejects.toThrow(/not accepted/);
  });

  it('an expired one', async () => {
    serveJwks();
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(ISSUER)
      .setAudience('adafri-admin')
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(priv);
    await expect(verifier()(token)).rejects.toThrow(/not accepted/);
  });

  it('an unsigned one claiming alg none', async () => {
    serveJwks();
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=+$/, '');
    const body = btoa(JSON.stringify({ iss: ISSUER, aud: 'adafri-admin', sub: 'attacker' }))
      .replace(/=+$/, '');
    await expect(verifier()(`${header}.${body}.`)).rejects.toThrow(/not accepted/);
  });

  it('one that switched to a symmetric algorithm', async () => {
    serveJwks();
    const { SignJWT: Sign } = await import('jose');
    // Algorithm confusion: sign with HMAC and hope the verifier takes `alg` from the
    // header. It does not, because the accepted list is pinned.
    const token = await new Sign({ sub: 'attacker' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setAudience('adafri-admin')
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode('a'.repeat(32)));
    await expect(verifier()(token)).rejects.toThrow(/not accepted/);
  });

  it('a request with no bearer token at all', async () => {
    serveJwks();
    await expect(verifier().fromRequest(new Request('https://api.test/'))).rejects.toThrow(
      /no bearer token/,
    );
  });
});

describe('what the verifier refuses to be built with', () => {
  it('no issuer', () => {
    expect(() => createTokenVerifier({ issuer: '', audience: 'x' })).toThrow(/issuer/);
  });

  it('no audience, without saying so explicitly', () => {
    // Forgetting the audience is easy and silently accepts tokens for other clients, so
    // it has to be stated either way.
    expect(() =>
      createTokenVerifier({ issuer: ISSUER } as never),
    ).toThrow(/audience/);
  });

  it('`none` among the accepted algorithms', () => {
    expect(() =>
      createTokenVerifier({ issuer: ISSUER, audience: 'x', algorithms: ['none'] }),
    ).toThrow(/not a signing algorithm/);
  });

  it('accepts `audience: false` when a service really means it', async () => {
    serveJwks();
    const claims = await verifier({ audience: false })(await mint());
    expect(claims.sub).toBe('u1');
  });
});

describe('a provider that puts no aud on its tokens', () => {
  /** What Keycloak issues until an audience mapper is configured. */
  const withAzp = (azp: string) =>
    new SignJWT({ azp })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(ISSUER)
      .setSubject('u1')
      .setExpirationTime('5m')
      .sign(priv);

  it('accepts one issued to this client', async () => {
    const verify = verifier({ audience: false, authorizedParty: 'adafri-admin' });
    expect((await verify(await withAzp('adafri-admin'))).sub).toBe('u1');
  });

  it('refuses one issued to a different client of the same issuer', async () => {
    const verify = verifier({ audience: false, authorizedParty: 'adafri-admin' });
    await expect(verify(await withAzp('some-other-app'))).rejects.toThrow(
      /issued to a different client/,
    );
  });

  it('refuses one with no azp at all', async () => {
    const verify = verifier({ audience: false, authorizedParty: 'adafri-admin' });
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(ISSUER)
      .setExpirationTime('5m')
      .sign(priv);
    await expect(verify(token)).rejects.toThrow(/issued to a different client/);
  });

  it('warns when neither aud nor azp is checked', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Arriving here by forgetting the audience is far more likely than meaning it.
    createTokenVerifier({ issuer: ISSUER, audience: false, jwks });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/neither `aud` nor `azp`/));
    warn.mockRestore();
  });
});

describe('the app\'s own extra checks', () => {
  it('rejects a token that passes crypto but not the service rule', async () => {
    serveJwks();
    const verify = verifier({
      require: (c) => String(c.scope ?? '').includes('billing') || 'This endpoint needs the billing scope.',
    });
    await expect(verify(await mint())).rejects.toThrow(/billing scope/);
  });

  it('lets one through when the rule holds', async () => {
    serveJwks();
    const verify = verifier({ require: (c) => c.sub === 'u1' });
    expect((await verify(await mint())).sub).toBe('u1');
  });
});

describe('where the keys come from', () => {
  it('says so when the provider published no jwks_uri and none was given', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/auth`,
      token_endpoint: `${ISSUER}/token`,
    }))));
    const verify = createTokenVerifier({ issuer: ISSUER, audience: 'adafri-admin' });
    await expect(verify(await mint())).rejects.toThrow(/no jwks_uri/);
  });

  it('takes a supplied key set without reaching the network', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect((await verifier()(await mint())).sub).toBe('u1');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('introspection, for a token this service cannot read', () => {
  const ENDPOINT = 'https://idp.test/realms/app/introspect';

  /** A provider answering RFC 7662, recording what it was asked. */
  function idp(answer: Record<string, unknown>, status = 200) {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init: init ?? {} });
      if (url.includes('openid-configuration')) {
        return new Response(JSON.stringify({
          issuer: ISSUER,
          authorization_endpoint: `${ISSUER}/auth`,
          token_endpoint: `${ISSUER}/token`,
          introspection_endpoint: ENDPOINT,
        }));
      }
      return new Response(JSON.stringify(answer), { status });
    }));
    return calls;
  }

  const introspector = (over = {}) =>
    createTokenIntrospector({
      issuer: ISSUER,
      clientId: 'orders-api',
      clientSecret: 'shh',
      audience: 'orders-api',
      introspectionEndpoint: ENDPOINT,
      ...over,
    });

  it('accepts a token the provider reports as active', async () => {
    idp({ active: true, sub: 'u1', scope: 'orders:read', aud: 'orders-api' });
    const claims = await introspector()('opaque-reference-token');
    expect(claims.sub).toBe('u1');
    expect(claims.scope).toBe('orders:read');
  });

  it('refuses a token the provider reports as inactive', async () => {
    // The one normative answer in RFC 7662, and the reason to introspect at all: this is
    // how a revoked token stops working at once.
    idp({ active: false });
    await expect(introspector()('revoked')).rejects.toThrow(/not active/);
  });

  it('refuses a response with no `active` field at all', async () => {
    idp({ sub: 'u1' });
    await expect(introspector()('odd')).rejects.toThrow(/not active/);
  });

  it('authenticates itself with Basic by default', async () => {
    const calls = idp({ active: true, sub: 'u1' });
    await introspector()('t');

    const headers = calls.at(-1)!.init.headers as Record<string, string>;
    // An unauthenticated introspection endpoint would let anyone test a stolen token.
    expect(atob(headers.authorization.slice(6))).toBe('orders-api:shh');
    expect(String(calls.at(-1)!.init.body)).not.toContain('client_secret');
  });

  it('can send its credentials in the body instead', async () => {
    const calls = idp({ active: true, sub: 'u1' });
    await introspector({ clientAuthMethod: 'body' })('t');

    const body = new URLSearchParams(String(calls.at(-1)!.init.body));
    expect(body.get('client_secret')).toBe('shh');
    expect(body.get('token_type_hint')).toBe('access_token');
  });

  it('checks the audience when the response carries one', async () => {
    idp({ active: true, sub: 'u1', aud: 'some-other-api' });
    await expect(introspector()('t')).rejects.toThrow(/different audience/);
  });

  it('checks the issuer when the response carries one', async () => {
    idp({ active: true, sub: 'u1', iss: 'https://evil.test' });
    await expect(introspector()('t')).rejects.toThrow(/different issuer/);
  });

  it('checks which client the token was issued to', async () => {
    idp({ active: true, sub: 'u1', client_id: 'another-app' });
    await expect(
      introspector({ audience: false, authorizedParty: 'orders-api' })('t'),
    ).rejects.toThrow(/different client/);
  });

  it('asks the provider every time by default', async () => {
    const calls = idp({ active: true, sub: 'u1' });
    const verify = introspector();
    await verify('t');
    await verify('t');
    // Caching would trade away the reason to introspect, so it is off unless asked for.
    expect(calls.filter((c) => c.url === ENDPOINT)).toHaveLength(2);
  });

  it('reuses an active answer when cacheMs says so', async () => {
    const calls = idp({ active: true, sub: 'u1' });
    const verify = introspector({ cacheMs: 10_000 });
    await verify('t');
    await verify('t');
    expect(calls.filter((c) => c.url === ENDPOINT)).toHaveLength(1);
  });

  it('never caches a refusal', async () => {
    const calls = idp({ active: false });
    const verify = introspector({ cacheMs: 10_000 });
    await verify('t').catch(() => {});
    await verify('t').catch(() => {});
    // Caching one would keep a reinstated token out for the life of the entry.
    expect(calls.filter((c) => c.url === ENDPOINT)).toHaveLength(2);
  });

  it('finds the endpoint through discovery', async () => {
    idp({ active: true, sub: 'u1' });
    const verify = createTokenIntrospector({
      issuer: ISSUER, clientId: 'orders-api', clientSecret: 'shh', audience: false,
    });
    expect((await verify('t')).sub).toBe('u1');
  });

  it('says so when the service credentials are refused', async () => {
    idp({ error: 'invalid_client' }, 401);
    await expect(introspector()('t')).rejects.toThrow(/refused this service/);
  });

  it('reads the token off a request', async () => {
    idp({ active: true, sub: 'u1' });
    const request = new Request('https://api.test/orders', {
      headers: { authorization: 'Bearer opaque' },
    });
    expect((await introspector().fromRequest(request)).sub).toBe('u1');
  });

  it('refuses to be built without client credentials', () => {
    expect(() =>
      createTokenIntrospector({ issuer: ISSUER, clientId: '', clientSecret: '', audience: false }),
    ).toThrow(/client credentials/);
  });

  it('refuses to be built without an audience decision', () => {
    expect(() =>
      createTokenIntrospector({ issuer: ISSUER, clientId: 'a', clientSecret: 'b' } as never),
    ).toThrow(/audience/);
  });
});

describe('providers that name the client in client_id', () => {
  it('accepts a token carrying client_id instead of azp', async () => {
    // Cognito access tokens carry neither `aud` nor `azp`, only `client_id`. Reading
    // only `azp` rejected every one of them.
    const token = await new SignJWT({ client_id: 'orders-api' })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(ISSUER)
      .setSubject('u1')
      .setExpirationTime('5m')
      .sign(priv);

    const verify = verifier({ audience: false, authorizedParty: 'orders-api' });
    expect((await verify(token)).sub).toBe('u1');
  });

  it('still refuses one issued to another client', async () => {
    const token = await new SignJWT({ client_id: 'another-app' })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(ISSUER)
      .setExpirationTime('5m')
      .sign(priv);

    const verify = verifier({ audience: false, authorizedParty: 'orders-api' });
    await expect(verify(token)).rejects.toThrow(/different client/);
  });
})
