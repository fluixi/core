import { describe, it, expect } from 'vitest';
import { parseCookies, serializeCookie, deleteCookie, isValidCookieName } from './codec.js';

describe('parseCookies', () => {
  it('parses pairs, trims and decodes', () => {
    expect(parseCookies('a=1; b=hello%20world;c = x')).toEqual({ a: '1', b: 'hello world', c: 'x' });
  });
  it('handles empty input and skips parts without =', () => {
    expect(parseCookies(null)).toEqual({});
    expect(parseCookies('flag; a=1')).toEqual({ a: '1' });
  });
  it('keeps the first occurrence of a name', () => {
    expect(parseCookies('a=1; a=2')).toEqual({ a: '1' });
  });
  it('unquotes values and keeps malformed escapes raw', () => {
    expect(parseCookies('a="q"; b=%E0%A4%A')).toEqual({ a: 'q', b: '%E0%A4%A' });
  });
  it('keeps = inside a value', () => {
    expect(parseCookies('t=a=b=c')).toEqual({ t: 'a=b=c' });
  });
});

describe('serializeCookie', () => {
  it('is secure by default', () => {
    expect(serializeCookie('s', 'v')).toBe('s=v; Path=/; HttpOnly; Secure; SameSite=Lax');
  });
  it('writes every attribute', () => {
    const expires = new Date(Date.UTC(2030, 0, 1));
    expect(
      serializeCookie('s', 'a b', { maxAge: 60.7, expires, domain: 'x.com', path: '/p', httpOnly: false, secure: false, sameSite: 'strict' }),
    ).toBe('s=a%20b; Max-Age=60; Expires=Tue, 01 Jan 2030 00:00:00 GMT; Domain=x.com; Path=/p; SameSite=Strict');
  });
  it('forces Secure with SameSite=None', () => {
    expect(serializeCookie('s', 'v', { secure: false, sameSite: 'none' })).toContain('; Secure; SameSite=None');
  });
  it('rejects invalid names and attribute injection', () => {
    expect(isValidCookieName('a b')).toBe(false);
    expect(() => serializeCookie('a;b', 'v')).toThrow(TypeError);
    expect(() => serializeCookie('a', 'v', { path: '/; Domain=evil.com' })).toThrow(TypeError);
    expect(() => serializeCookie('a', 'v', { domain: 'x.com; HttpOnly' })).toThrow(TypeError);
  });
  it('encodes values so they cannot inject attributes', () => {
    expect(serializeCookie('a', 'x; Domain=evil.com')).toMatch(/^a=x%3B%20Domain%3Devil\.com;/);
  });
});

describe('deleteCookie', () => {
  it('expires the cookie on the given path', () => {
    const s = deleteCookie('s', { path: '/app' });
    expect(s).toContain('s=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    expect(s).toContain('Path=/app');
  });
});
