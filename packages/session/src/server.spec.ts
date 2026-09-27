/**
 * The server-held session cookie.
 *
 * Two paths depend on this: an app with its own database sealing a user id, and
 * `@fluixi/oauth2` sealing tokens. What is worth asserting is that a cookie cannot be
 * read or altered without the secret, and that the flags a session cookie needs are
 * actually on it.
 */
import { describe, expect, it } from 'vitest';
import { createSessionCookie, readCookie } from './server.js';

const SECRET = 'a'.repeat(32);
const other = 'b'.repeat(32);

/** A request carrying the cookie from a `Set-Cookie` header. */
function requestWith(setCookie: string): Request {
  const value = setCookie.split(';')[0];
  return new Request('https://app.test/', { headers: { cookie: value } });
}

describe('a round trip', () => {
  it('reads back what was written', async () => {
    const session = createSessionCookie<{ userId: string; roles: string[] }>({ secret: SECRET });
    const header = await session.write({ userId: 'u1', roles: ['admin'] });

    expect(await session.read(requestWith(header))).toEqual({ userId: 'u1', roles: ['admin'] });
  });

  it('is null when there is no cookie', async () => {
    const session = createSessionCookie({ secret: SECRET });
    expect(await session.read(new Request('https://app.test/'))).toBeNull();
  });
});

describe('what the cookie does not give away', () => {
  it('does not carry the value in the clear', async () => {
    const session = createSessionCookie<{ email: string }>({ secret: SECRET });
    const header = await session.write({ email: 'someone@example.com' });
    expect(header).not.toContain('someone@example.com');
  });

  it('cannot be read with a different secret', async () => {
    const written = await createSessionCookie({ secret: SECRET }).write({ userId: 'u1' });
    const reader = createSessionCookie({ secret: other });
    expect(await reader.read(requestWith(written))).toBeNull();
  });

  it('refuses a cookie whose contents were altered', async () => {
    const session = createSessionCookie({ secret: SECRET });
    const header = await session.write({ userId: 'u1' });

    const [name, value] = header.split(';')[0].split('=');
    const [iv, data] = decodeURIComponent(value).split('.');
    // The first character: its six bits all belong to the first byte. The last one can be
    // partly padding, or already be the replacement, and then nothing changes.
    const altered = (data[0] === 'A' ? 'B' : 'A') + data.slice(1);
    const tampered = `${name}=${encodeURIComponent(`${iv}.${altered}`)}`;

    const request = new Request('https://app.test/', { headers: { cookie: tampered } });
    // AES-GCM authenticates as well as encrypts, so a changed byte fails rather than
    // decrypting to something else.
    expect(await session.read(request)).toBeNull();
  });

  it('uses a fresh nonce, so the same value seals differently each time', async () => {
    const session = createSessionCookie({ secret: SECRET });
    const first = await session.write({ userId: 'u1' });
    const second = await session.write({ userId: 'u1' });
    expect(first).not.toBe(second);
  });
});

describe('the flags a session cookie needs', () => {
  it('is httpOnly, so a script cannot read it', async () => {
    const header = await createSessionCookie({ secret: SECRET }).write({ a: 1 });
    expect(header).toContain('HttpOnly');
  });

  it('is SameSite=Lax by default, which survives a return from an external login', async () => {
    const header = await createSessionCookie({ secret: SECRET }).write({ a: 1 });
    expect(header).toContain('SameSite=Lax');
  });

  it('adds Secure when asked', async () => {
    const header = await createSessionCookie({ secret: SECRET, secure: true }).write({ a: 1 });
    expect(header).toContain('Secure');
  });

  it('forces Secure for SameSite=None, which is ignored without it', async () => {
    const header = await createSessionCookie({
      secret: SECRET,
      secure: false,
      sameSite: 'none',
    }).write({ a: 1 });
    expect(header).toContain('SameSite=None');
    expect(header).toContain('Secure');
  });

  it('takes a per-write lifetime, for a short-lived one', async () => {
    const header = await createSessionCookie({ secret: SECRET }).write({ a: 1 }, { maxAge: 600 });
    expect(header).toContain('Max-Age=600');
  });

  it('clears with Max-Age=0, which is what removes it', () => {
    expect(createSessionCookie({ secret: SECRET }).clear()).toContain('Max-Age=0');
  });
});

describe('the secret', () => {
  it('is refused when it is too short to be a key', () => {
    expect(() => createSessionCookie({ secret: 'short' })).toThrow(/at least 32/);
  });
});

describe('readCookie', () => {
  it('finds one among several', () => {
    const request = new Request('https://app.test/', {
      headers: { cookie: 'a=1; fx_session=wanted; b=2' },
    });
    expect(readCookie(request, 'fx_session')).toBe('wanted');
  });

  it('is null when the name is absent', () => {
    const request = new Request('https://app.test/', { headers: { cookie: 'a=1' } });
    expect(readCookie(request, 'fx_session')).toBeNull();
  });
});
