import { parseCookies, serializeCookie, type CookieOptions } from '@fluixi/utils/cookie';
import { StorageQuotaError, StorageUnavailableError } from '../core/errors.js';
import type { StorageAdapter } from '../core/types.js';
import { cookiePairSize, decodeCookieName as decodeName, encodeCookieName as encodeName } from '../utils/cookie-names.js';
import { toStorageRequest, toStorageResponse, type RequestLike, type ResponseLike } from './contracts.js';

export interface CookieStorageOptions extends CookieOptions {
  /** Where the cookies are read from. Without it the adapter starts empty. */
  request?: RequestLike;
  /** Where `Set-Cookie` headers go. Without it the adapter is read-only. */
  response?: ResponseLike;
  /** Largest `name=value` in bytes. Browsers keep about 4096. */
  maxSize?: number;
}

/**
 * Cookies of one request. Reads come from the request's `Cookie` header plus this adapter's own
 * writes; each write appends a `Set-Cookie` to the response. Make one per request.
 *
 * Every cookie the request carries is visible, so give the storage a namespace: `clear()` on a
 * storage without one deletes the session cookie too. Expiry set through the storage lives in the
 * value; the cookie itself lasts as long as `maxAge`/`expires` say.
 */
export function cookieStorage(options: CookieStorageOptions = {}): StorageAdapter {
  const { request, response, maxSize = 4096, ...cookie } = options;
  const reader = request ? toStorageRequest(request) : null;
  const writer = response ? toStorageResponse(response) : null;
  let incoming: Map<string, string> | null = null;
  // This request's writes: a value, or null once removed.
  const written = new Map<string, string | null>();

  const read = () => {
    if (!incoming) {
      incoming = new Map();
      for (const [name, value] of Object.entries(parseCookies(reader?.getHeader('cookie')))) incoming.set(decodeName(name), value);
    }
    return incoming;
  };
  const emit = (key: string, header: string) => {
    if (!writer) throw new StorageUnavailableError('This cookie storage has no response to write to.', { key });
    writer.appendHeader('set-cookie', header);
  };
  const get = (key: string) => (written.has(key) ? written.get(key)! : read().get(key) ?? null);
  const keys = () => {
    const all = new Set(read().keys());
    for (const [key, value] of written) value === null ? all.delete(key) : all.add(key);
    return [...all];
  };
  const remove = (key: string) => {
    if (get(key) === null) return;
    emit(key, serializeCookie(encodeName(key), '', { ...cookie, maxAge: 0, expires: new Date(0) }));
    written.set(key, null);
  };

  return {
    name: 'cookie',
    scope: 'cookie',
    capabilities: {
      synchronous: true,
      persistent: true,
      reactive: false,
      crossContext: true,
      expiration: false,
      transactions: false,
    },
    get,
    set(key, value) {
      const header = serializeCookie(encodeName(key), value, cookie);
      const size = cookiePairSize(header);
      if (size > maxSize) throw new StorageQuotaError(`Cookie ${key} is ${size} bytes, over the ${maxSize} limit.`, { key });
      emit(key, header);
      written.set(key, value);
    },
    remove,
    has: (key) => get(key) !== null,
    keys,
    clear: () => keys().forEach(remove),
  };
}
