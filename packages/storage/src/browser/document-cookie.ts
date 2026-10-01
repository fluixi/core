import { parseCookies, serializeCookie, type CookieOptions } from '@fluixi/utils/cookie';
import { StorageQuotaError, StorageUnavailableError } from '../core/errors.js';
import type { StorageAdapter } from '../core/types.js';
import { cookiePairSize, decodeCookieName, encodeCookieName, withEntryExpiry } from '../utils/cookie-names.js';

export interface DocumentCookieOptions extends Omit<CookieOptions, 'httpOnly'> {
  /** Largest `name=value` in bytes. Browsers keep about 4096. */
  maxSize?: number;
}

/**
 * The page's cookies through `document.cookie`: the browser half of a value the server also
 * reads from the request, so both render the same thing. Script cannot set or see HttpOnly
 * cookies, so these never are. `secure` defaults to true, which a browser honours on https and
 * on localhost only.
 */
export function documentCookieAdapter(options: DocumentCookieOptions = {}): StorageAdapter {
  const { maxSize = 4096, ...cookie } = options;
  const doc = (key?: string): Document => {
    if (typeof document === 'undefined') throw new StorageUnavailableError('document.cookie is not available here; on a server use cookieStorage.', { key });
    return document;
  };
  const all = () => {
    const out = new Map<string, string>();
    for (const [name, value] of Object.entries(parseCookies(doc().cookie))) out.set(decodeCookieName(name), value);
    return out;
  };
  const write = (key: string, header: string) => {
    doc(key).cookie = header;
  };
  return {
    name: 'documentCookie',
    scope: 'cookie',
    capabilities: {
      synchronous: true,
      persistent: true,
      reactive: false,
      crossContext: true,
      expiration: false,
      transactions: false,
    },
    get: (key) => all().get(key) ?? null,
    set(key, value, writeOptions) {
      const header = serializeCookie(encodeCookieName(key), value, { ...withEntryExpiry(cookie, writeOptions?.expiresAt), httpOnly: false });
      const size = cookiePairSize(header);
      if (size > maxSize) throw new StorageQuotaError(`Cookie ${key} is ${size} bytes, over the ${maxSize} limit.`, { key });
      write(key, header);
    },
    remove: (key) => write(key, serializeCookie(encodeCookieName(key), '', { ...cookie, httpOnly: false, maxAge: 0, expires: new Date(0) })),
    has: (key) => all().has(key),
    keys: () => [...all().keys()],
    clear() {
      for (const key of all().keys()) this.remove(key);
    },
  };
}
