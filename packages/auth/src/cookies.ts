/**
 * Cookie API: proper, secure-by-default cookie management for auth (and anything else).
 * Parsing + request-scoped reads work standalone; `serializeCookie` builds a spec-compliant
 * `Set-Cookie` string with safe defaults (HttpOnly, Secure, SameSite=Lax, Path=/) that
 * middleware appends to its Response (`response.headers.append('set-cookie', …)`).
 */
import { getRequestEvent } from '@fluixi/server';

export interface CookieOptions {
  maxAge?: number; // seconds
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/** Parse a `Cookie:` header into a record. */
export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (k) out[k] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

/** Serialize a cookie into a `Set-Cookie` value. Secure by default. */
export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const o: Required<Pick<CookieOptions, 'path' | 'httpOnly' | 'secure' | 'sameSite'>> & CookieOptions = {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    ...opts,
  };
  let s = `${name}=${encodeURIComponent(value)}`;
  if (o.maxAge != null) s += `; Max-Age=${Math.floor(o.maxAge)}`;
  if (o.expires) s += `; Expires=${o.expires.toUTCString()}`;
  if (o.domain) s += `; Domain=${o.domain}`;
  s += `; Path=${o.path}`;
  if (o.httpOnly) s += '; HttpOnly';
  if (o.secure) s += '; Secure';
  s += `; SameSite=${o.sameSite[0].toUpperCase()}${o.sameSite.slice(1)}`;
  return s;
}

/** A `Set-Cookie` string that deletes a cookie (Max-Age=0). */
export function deleteCookie(name: string, opts: Pick<CookieOptions, 'path' | 'domain'> = {}): string {
  return serializeCookie(name, '', { ...opts, maxAge: 0 });
}

function requestHeaders(): Headers | null {
  const req = getRequestEvent()?.request as { headers?: Headers } | undefined;
  return req?.headers ?? null;
}

/** Read one cookie from the CURRENT request (request-scoped). */
export function getCookie(name: string): string | null {
  return parseCookies(requestHeaders()?.get('cookie'))[name] ?? null;
}

/** All cookies on the current request. */
export function getCookies(): Record<string, string> {
  return parseCookies(requestHeaders()?.get('cookie'));
}
