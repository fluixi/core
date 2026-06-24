import { describe, it, expect } from 'vitest';
import { parseCookies, serializeCookie, deleteCookie } from './cookies.js';

describe('@fluixi/auth cookies', () => {
  it('parses a Cookie header', () => {
    expect(parseCookies('a=1; b=hello%20world; c=')).toEqual({ a: '1', b: 'hello world', c: '' });
    expect(parseCookies(null)).toEqual({});
  });

  it('serializes with secure-by-default attributes', () => {
    const s = serializeCookie('sid', 'abc', { maxAge: 3600 });
    expect(s).toContain('sid=abc');
    expect(s).toContain('Max-Age=3600');
    expect(s).toContain('Path=/');
    expect(s).toContain('HttpOnly');
    expect(s).toContain('Secure');
    expect(s).toContain('SameSite=Lax');
  });

  it('honors overrides + url-encodes the value', () => {
    const s = serializeCookie('x', 'a b', { httpOnly: false, secure: false, sameSite: 'strict', path: '/app' });
    expect(s).toContain('x=a%20b');
    expect(s).not.toContain('HttpOnly');
    expect(s).not.toContain('Secure');
    expect(s).toContain('SameSite=Strict');
    expect(s).toContain('Path=/app');
  });

  it('deleteCookie expires the cookie', () => {
    expect(deleteCookie('sid')).toContain('Max-Age=0');
  });
});
