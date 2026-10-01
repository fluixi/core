/**
 * Cookie codec shared by auth and storage. Pure string work, no request access.
 * `serializeCookie` is secure by default (HttpOnly, Secure, SameSite=Lax, Path=/).
 */

export interface CookieOptions {
  /** Seconds. */
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

// RFC 6265 cookie-name is an RFC 7230 token.
const NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export function isValidCookieName(name: string): boolean {
  return NAME.test(name);
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // A malformed escape from another writer stays readable as raw text.
    return value;
  }
}

/** Parse a `Cookie:` header into a record. The first occurrence of a name wins. */
export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (!k || k in out) continue;
    let v = part.slice(eq + 1).trim();
    if (v.length > 1 && v[0] === '"' && v[v.length - 1] === '"') v = v.slice(1, -1);
    out[k] = decode(v);
  }
  return out;
}

/** Serialize a cookie into a `Set-Cookie` value. Secure by default. */
export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  if (!isValidCookieName(name)) throw new TypeError(`Invalid cookie name: ${JSON.stringify(name)}`);
  const o = { path: '/', httpOnly: true, secure: true, sameSite: 'lax' as const, ...opts };
  if (o.domain && /[;\s]/.test(o.domain)) throw new TypeError(`Invalid cookie domain: ${o.domain}`);
  if (/[;\s]/.test(o.path)) throw new TypeError(`Invalid cookie path: ${o.path}`);
  // Browsers drop SameSite=None without Secure.
  const secure = o.secure || o.sameSite === 'none';
  let s = `${name}=${encodeURIComponent(value)}`;
  if (o.maxAge != null) s += `; Max-Age=${Math.floor(o.maxAge)}`;
  if (o.expires) s += `; Expires=${o.expires.toUTCString()}`;
  if (o.domain) s += `; Domain=${o.domain}`;
  s += `; Path=${o.path}`;
  if (o.httpOnly) s += '; HttpOnly';
  if (secure) s += '; Secure';
  s += `; SameSite=${o.sameSite[0].toUpperCase()}${o.sameSite.slice(1)}`;
  return s;
}

/** A `Set-Cookie` string that deletes a cookie. Path and domain must match the original. */
export function deleteCookie(name: string, opts: CookieOptions = {}): string {
  return serializeCookie(name, '', { ...opts, maxAge: 0, expires: new Date(0) });
}
