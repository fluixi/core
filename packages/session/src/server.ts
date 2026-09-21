/**
 * `@fluixi/session/server`: a session the server holds and the browser cannot read.
 *
 * The client half of this package owns a token in the browser. This is the other
 * arrangement: whatever identifies the visitor is sealed into an httpOnly cookie, so a
 * script on the page has nothing to steal and an XSS cannot lift a session.
 *
 * Deliberately not an auth system. It does not know what a user is, where they are
 * stored, or how they proved who they are. It seals a value into a cookie and reads it
 * back, which is the part every server-held session needs and nobody should write twice.
 * What goes in the cookie is the caller's business: a user id for an app with its own
 * database, OAuth tokens for `@fluixi/oauth2`, a row key for anything else.
 *
 * ```ts
 * const session = createSessionCookie<{ userId: string }>({ secret: process.env.SECRET! });
 *
 * // logging someone in, after your own code checked the password
 * return new Response(null, {
 *   status: 302,
 *   headers: { location: '/', 'set-cookie': await session.write({ userId: user.id }) },
 * });
 *
 * // on any later request
 * const current = await session.read(request);
 * ```
 *
 * AES-GCM through Web Crypto, so it runs on Node, Bun, Deno and a worker with no native
 * dependency.
 */

export interface SessionCookieOptions {
  /**
   * At least 32 characters. The encryption key is derived from it, so rotating it signs
   * everyone out, and sharing it between two deployments lets them read each other's
   * sessions.
   */
  secret: string;
  /** Default `fx_session`. */
  name?: string;
  /** Default: true when NODE_ENV is production. Set false only for plain-http local work. */
  secure?: boolean;
  /** Seconds. Default 30 days. */
  maxAge?: number;
  /**
   * Default `lax`, which is what a session cookie wants.
   *
   * `strict` withholds the cookie on a top-level navigation from another site, which
   * breaks a return from an external login. `none` requires `secure` and allows any
   * cross-site request to carry it, so it is only for a cookie meant to be sent that way.
   */
  sameSite?: 'lax' | 'strict' | 'none';
  /** Default `/`. */
  path?: string;
}

export interface SessionCookie<T> {
  /** The value in this request's cookie, or null when there is none or it is not ours. */
  read(request: Request): Promise<T | null>;
  /** A `Set-Cookie` header carrying `value`. */
  write(value: T, options?: { maxAge?: number }): Promise<string>;
  /** A `Set-Cookie` header that removes it. */
  clear(): string;
  /** The cookie name, for a caller that has to look for it directly. */
  readonly name: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function keyFrom(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  // Its own buffer, so the type is the one Web Crypto accepts: a `Uint8Array` over a
  // shared buffer is refused.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** The cookie value for `name`, or null. */
export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function createSessionCookie<T>(options: SessionCookieOptions): SessionCookie<T> {
  if (options.secret.length < 32) {
    throw new Error(
      '[fluixi/session] secret must be at least 32 characters: the cookie is encrypted with a key derived from it.',
    );
  }

  const name = options.name ?? 'fx_session';
  const secure = options.secure ?? process.env.NODE_ENV === 'production';
  const sameSite = options.sameSite ?? 'lax';
  const path = options.path ?? '/';
  const defaultMaxAge = options.maxAge ?? 60 * 60 * 24 * 30;

  const header = (value: string, maxAge: number): string => {
    const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, 'HttpOnly'];
    parts.push(`SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}`);
    // `SameSite=None` is ignored without it, so the cookie would be dropped silently.
    if (secure || sameSite === 'none') parts.push('Secure');
    parts.push(`Max-Age=${maxAge}`);
    return parts.join('; ');
  };

  return {
    name,

    async read(request: Request): Promise<T | null> {
      const raw = readCookie(request, name);
      if (!raw) return null;

      const [ivPart, dataPart] = raw.split('.');
      if (!ivPart || !dataPart) return null;
      try {
        const plain = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: fromBase64Url(ivPart) },
          await keyFrom(options.secret),
          fromBase64Url(dataPart),
        );
        return JSON.parse(decoder.decode(plain)) as T;
      } catch {
        // Tampered with, or sealed under a different secret. Either way there is no
        // session, and saying which would tell an attacker something.
        return null;
      }
    },

    async write(value: T, write: { maxAge?: number } = {}): Promise<string> {
      // A fresh nonce per write. Reusing one under the same key is what breaks AES-GCM.
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const sealed = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        await keyFrom(options.secret),
        encoder.encode(JSON.stringify(value)),
      );
      return header(
        `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(sealed))}`,
        write.maxAge ?? defaultMaxAge,
      );
    },

    clear(): string {
      // Max-Age=0 is what removes it. Blanking the value leaves the cookie in place.
      return header('', 0);
    },
  };
}
