/**
 * The guard on an app's own API.
 *
 * Two things matter and they are easy to conflate. A token that does not hold is 401, and the
 * reason has to reach the client through `WWW-Authenticate` or a refresh never happens. A
 * token that holds but is not enough is 403, and answering 401 there makes a client refresh a
 * perfectly good token in a loop.
 */
import { describe, expect, it, vi } from 'vitest';
import { createApiGuard, rolesFrom } from './api-guard.js';
import { TokenError, type TokenClaims, type TokenVerifier } from './verify.js';

/** A verifier that accepts or refuses, without any cryptography. */
function verifier(claims: TokenClaims | Error): TokenVerifier {
  const fn = vi.fn(async () => {
    if (claims instanceof Error) throw claims;
    return claims;
  });
  const v = fn as unknown as TokenVerifier;
  (v as { fromRequest: unknown }).fromRequest = fn;
  (v as { bearerOf: unknown }).bearerOf = () => 'token';
  return v;
}

const request = () => new Request('https://app.test/api/reports');
const ok = async (_r: Request, c: TokenClaims) => Response.json({ sub: c.sub });

describe('a token that does not hold', () => {
  it('is 401 and names the reason in WWW-Authenticate', async () => {
    const guard = createApiGuard({ verify: verifier(new TokenError('expired', 'invalid_token')) });
    const response = await guard(ok)(request());

    expect(response.status).toBe(401);
    // The client reads `error="..."` out of this to tell an expired token from a dead
    // endpoint. Without it a refresh never happens.
    expect(response.headers.get('www-authenticate')).toBe('Bearer error="invalid_token"');
  });

  it('keeps the provider reason out of the body', async () => {
    const guard = createApiGuard({
      verify: verifier(new TokenError('signature did not match key kid=abc', 'invalid_token')),
    });
    const body = await (await guard(ok)(request())).json();

    // A refusal that explains why tells an attacker which guesses are close.
    expect(body).toEqual({ error: 'invalid_token' });
  });

  it('reports a non-TokenError as invalid_token rather than leaking it', async () => {
    const guard = createApiGuard({ verify: verifier(new Error('ECONNREFUSED to jwks')) });
    const response = await guard(ok)(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'invalid_token' });
  });
});

describe('a token that holds', () => {
  it('reaches the handler with its claims', async () => {
    const guard = createApiGuard({ verify: verifier({ sub: 'u1' }) });
    expect(await (await guard(ok)(request())).json()).toEqual({ sub: 'u1' });
  });

  it('passes a role the token has', async () => {
    const guard = createApiGuard({
      verify: verifier({ sub: 'u1', realm_access: { roles: ['admin'] } }),
      roles: rolesFrom.keycloakRealm,
    });
    expect((await guard(ok, { role: 'admin' })(request())).status).toBe(200);
  });

  it('is 403, not 401, when a role is missing', async () => {
    const guard = createApiGuard({
      verify: verifier({ sub: 'u1', realm_access: { roles: ['support'] } }),
      roles: rolesFrom.keycloakRealm,
    });
    const response = await guard(ok, { role: 'admin' })(request());

    // 401 here would have the client refresh a token that is perfectly good.
    expect(response.status).toBe(403);
    expect(response.headers.get('www-authenticate')).toBeNull();
    expect(await response.json()).toEqual({ error: 'insufficient_role', detail: 'needs admin' });
  });

  it('accepts any one of several roles', async () => {
    const guard = createApiGuard({
      verify: verifier({ realm_access: { roles: ['support'] } }),
      roles: rolesFrom.keycloakRealm,
    });
    expect((await guard(ok, { role: ['admin', 'support'] })(request())).status).toBe(200);
  });

  it('requires every role in allRoles, and says which are missing', async () => {
    const guard = createApiGuard({
      verify: verifier({ realm_access: { roles: ['admin'] } }),
      roles: rolesFrom.keycloakRealm,
    });
    const response = await guard(ok, { allRoles: ['admin', 'billing'] })(request());

    expect(response.status).toBe(403);
    expect((await response.json()).detail).toBe('needs billing');
  });

  it('checks a scope against the scope claim', async () => {
    const guard = createApiGuard({ verify: verifier({ scope: 'orders:read profile' }) });

    expect((await guard(ok, { scope: 'orders:read' })(request())).status).toBe(200);
    const refused = await guard(ok, { scope: 'orders:write' })(request());
    expect(refused.status).toBe(403);
    expect((await refused.json()).error).toBe('insufficient_scope');
  });

  it('runs an arbitrary requirement and reports what it said', async () => {
    const guard = createApiGuard({ verify: verifier({ sub: 'u1', tenant: 'other' }) });
    const response = await guard(ok, {
      require: (c) => c.tenant === 'acme' || 'wrong tenant',
    })(request());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'forbidden', detail: 'wrong tenant' });
  });
});

describe('a guard that cannot read roles', () => {
  it('throws rather than refusing everyone quietly', async () => {
    const guard = createApiGuard({ verify: verifier({ sub: 'u1' }) });

    // A silent 403 here looks like a permissions problem for as long as it takes to find.
    await expect(guard(ok, { role: 'admin' })(request())).rejects.toThrow(/no `roles`/);
  });

  it('is fine without one when no role is required', async () => {
    const guard = createApiGuard({ verify: verifier({ sub: 'u1' }) });
    expect((await guard(ok)(request())).status).toBe(200);
  });
});

describe('an app answering in its own shape', () => {
  it('replaces the body and still gets the header on a 401', async () => {
    const guard = createApiGuard({
      verify: verifier(new TokenError('nope', 'invalid_token')),
      onRefused: (refusal) =>
        new Response(JSON.stringify({ ok: false, reason: refusal.code }), {
          status: refusal.status,
          headers: { 'content-type': 'application/json' },
        }),
    });
    const response = await guard(ok)(request());

    expect(await response.json()).toEqual({ ok: false, reason: 'invalid_token' });
    // Added rather than left out: the client's refresh depends on it.
    expect(response.headers.get('www-authenticate')).toBe('Bearer error="invalid_token"');
  });

  it('keeps its own header when it set one', async () => {
    const guard = createApiGuard({
      verify: verifier(new TokenError('nope', 'invalid_token')),
      onRefused: (refusal) =>
        new Response(null, {
          status: refusal.status,
          headers: { 'www-authenticate': 'Bearer realm="admin", error="invalid_token"' },
        }),
    });
    const response = await guard(ok)(request());
    expect(response.headers.get('www-authenticate')).toContain('realm="admin"');
  });
});

describe('where providers put roles', () => {
  it('reads each documented shape, and an absent one as empty', () => {
    expect(rolesFrom.keycloakRealm({ realm_access: { roles: ['a'] } })).toEqual(['a']);
    expect(rolesFrom.keycloakRealm({})).toEqual([]);

    expect(rolesFrom.keycloakClient('web')({ resource_access: { web: { roles: ['b'] } } })).toEqual(['b']);
    expect(rolesFrom.keycloakClient('web')({ resource_access: { other: { roles: ['b'] } } })).toEqual([]);

    expect(rolesFrom.groups({ groups: ['c'] })).toEqual(['c']);
    expect(rolesFrom.cognito({ 'cognito:groups': ['d'] })).toEqual(['d']);
    expect(rolesFrom.namespaced('https://x/roles')({ 'https://x/roles': ['e'] })).toEqual(['e']);
    expect(rolesFrom.scope({ scope: 'f g' })).toEqual(['f', 'g']);
  });

  it('survives a claim of the wrong type', () => {
    // A provider sending a string where a list is expected should read as no roles, not crash
    // a route.
    expect(rolesFrom.groups({ groups: 'admin' })).toEqual([]);
    expect(rolesFrom.scope({ scope: 42 })).toEqual([]);
  });
});
