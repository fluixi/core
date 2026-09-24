/**
 * Reading a token in order to display it.
 *
 * The cases that matter are the ones a real provider produced during this work: an opaque
 * token from Auth0 without an audience, a Keycloak token naming its client in `azp`, a Dex
 * token naming it nowhere, and a lightweight token carrying no `sub` at all. A debugger
 * that only handled well-formed JWTs would hide exactly those.
 */
import { describe, expect, it } from 'vitest';
import { abbreviate, inspect, relativeTo } from '../src/lib/inspect.js';

/** A JWT with the given claims. Unsigned: nothing here verifies anything. */
function jwt(claims: Record<string, unknown>, header: Record<string, unknown> = { alg: 'RS256' }) {
  const part = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url').replace(/=+$/, '');
  return `${part(header)}.${part(claims)}.signature`;
}

describe('a JWT', () => {
  it('is read as one, with its claims', () => {
    const seen = inspect(jwt({ sub: 'u1', azp: 'admin-spa' }));
    expect(seen?.kind).toBe('jwt');
    expect(seen?.claims?.sub).toBe('u1');
    expect(seen?.claims?.azp).toBe('admin-spa');
  });

  it('reports its header, which carries alg and kid', () => {
    const seen = inspect(jwt({ sub: 'u1' }, { alg: 'RS256', kid: 'k1' }));
    expect(seen?.header?.alg).toBe('RS256');
    expect(seen?.header?.kid).toBe('k1');
  });

  it('turns exp into a moment and a lifetime', () => {
    const iat = Math.floor(Date.now() / 1000);
    const seen = inspect(jwt({ sub: 'u1', iat, exp: iat + 300 }));
    expect(seen?.expiresAt).toBe((iat + 300) * 1000);
    expect(seen?.lifetimeSec).toBe(300);
  });

  it('has no lifetime when only one of the two claims is there', () => {
    const seen = inspect(jwt({ sub: 'u1', exp: 1_800_000_000 }));
    expect(seen?.expiresAt).toBeDefined();
    expect(seen?.lifetimeSec).toBeUndefined();
  });

  it('is still read when it carries no sub, as a lightweight token does', () => {
    // Keycloak's admin-cli issues one of these: verified and almost uninformative.
    const seen = inspect(jwt({ azp: 'admin-cli', scope: 'email profile' }));
    expect(seen?.kind).toBe('jwt');
    expect(seen?.claims?.sub).toBeUndefined();
    expect(seen?.claims?.azp).toBe('admin-cli');
  });
});

describe('an opaque token', () => {
  it('is reported as opaque rather than guessed at', () => {
    // Auth0 returns one of these unless an API is named as the audience.
    const seen = inspect('v1.MRq8n3xKZ0bQ');
    expect(seen?.kind).toBe('opaque');
    expect(seen?.claims).toBeUndefined();
    expect(seen?.length).toBe('v1.MRq8n3xKZ0bQ'.length);
  });

  it('is opaque when it has three parts that do not decode', () => {
    // Three dots do not make a JWT, and treating it as one would show nonsense.
    expect(inspect('not.a.jwt')?.kind).toBe('opaque');
  });
});

describe('nothing to read', () => {
  it('is null for absent or empty', () => {
    expect(inspect(null)).toBeNull();
    expect(inspect(undefined)).toBeNull();
    expect(inspect('')).toBeNull();
  });
});

describe('how long is left', () => {
  const now = 1_700_000_000_000;

  it('counts forward in seconds and minutes', () => {
    expect(relativeTo(now + 45_000, now)).toBe('in 45s');
    expect(relativeTo(now + 252_000, now)).toBe('in 4m 12s');
  });

  it('says so when a token has already expired', () => {
    expect(relativeTo(now - 30_000, now)).toBe('expired 30s ago');
  });

  it('says so when there is no expiry claim at all', () => {
    expect(relativeTo(undefined, now)).toBe('no expiry claim');
  });
});

describe('showing a long token', () => {
  it('elides the middle', () => {
    const long = 'a'.repeat(200);
    const short = abbreviate(long, 10);
    expect(short.startsWith('a'.repeat(10))).toBe(true);
    expect(short).toContain('…');
    expect(short.length).toBeLessThan(30);
  });

  it('leaves a short one alone', () => {
    expect(abbreviate('short', 10)).toBe('short');
  });
});
