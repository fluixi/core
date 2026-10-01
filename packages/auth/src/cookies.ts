/**
 * Request-scoped cookie reads. The codec lives in `@fluixi/utils/cookie` and is re-exported
 * here; middleware appends `serializeCookie` output to its Response's `set-cookie` header.
 */
import { getRequestEvent } from '@fluixi/server';
import { parseCookies } from '@fluixi/utils/cookie';

export { parseCookies, serializeCookie, deleteCookie, isValidCookieName } from '@fluixi/utils/cookie';
export type { CookieOptions } from '@fluixi/utils/cookie';

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
