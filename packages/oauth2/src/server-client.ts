/**
 * The browser half of a server-held session.
 *
 * Every method is a call to a route the application's own server exposes, which is what
 * `@fluixi/oauth2/server` provides. No token reaches this file: the server sets an
 * httpOnly cookie, so a script on the page has nothing to read and an XSS cannot lift a
 * session.
 *
 * The shape is the same `AuthClient` the browser implementation satisfies, so the
 * service above does not know which one it has.
 */
import { safeReturnTo } from './return-to.js';
import { OAuthError } from './types.js';
import type { AuthClient, CallbackParams, LoginOptions, ServerConfig, Tokens } from './types.js';

/**
 * Stands in for the access token the caller never sees.
 *
 * `@fluixi/session` is built around a token string, and here the credential is a cookie
 * the browser attaches on its own. A constant keeps the session's state machine working
 * without inventing a token, and nothing ever sends it anywhere: requests carry the
 * cookie.
 */
export const COOKIE_SESSION = 'cookie';

export function createServerClient(
  config: ServerConfig,
  fetcher: typeof fetch = fetch,
): AuthClient {
  const base = (config.basePath ?? '/auth').replace(/\/$/, '');
  const url = (path: string) => `${base}${path}`;

  /** Same credentials rule for every call: the cookie, and never a bearer token. */
  const call = (path: string, init: RequestInit = {}) =>
    fetcher(url(path), { credentials: 'same-origin', ...init });

  return {
    async login(options: LoginOptions = {}): Promise<void> {
      // The server builds the authorization URL, because it holds the PKCE verifier and
      // the client secret. The browser only navigates.
      const target = new URL(url('/login'), location.origin);
      if (options.returnTo) target.searchParams.set('returnTo', options.returnTo);
      for (const [key, value] of Object.entries(options.params ?? {})) {
        target.searchParams.set(key, value);
      }
      location.assign(target.toString());
    },

    async handleCallback(params: CallbackParams): Promise<Tokens> {
      // The server owns the exchange; the browser is telling it the callback arrived.
      // In the usual deployment the redirect URI points at the server route directly and
      // this is never called, which is why it is tolerant about what it gets back.
      const response = await call('/callback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        throw new OAuthError(
          String(body.error ?? `Callback failed: ${response.status}`),
          String(body.error ?? 'callback_failed'),
        );
      }
      return { accessToken: COOKIE_SESSION };
    },

    async refresh(): Promise<Tokens> {
      const response = await call('/refresh', { method: 'POST' });
      if (!response.ok) {
        throw new OAuthError('The server could not extend the session.', 'refresh_failed');
      }
      return { accessToken: COOKIE_SESSION };
    },

    async fetchUser<U = unknown>(): Promise<U> {
      const custom = config.userInfo;
      // A URL here points at the app's own API rather than the session route. The cookie
      // still authenticates it, which is why `credentials` stays on either way.
      const response = custom?.url
        ? await fetcher(custom.url, {
            method: custom.method ?? 'GET',
            credentials: custom.credentials ?? 'same-origin',
            headers: { accept: 'application/json', ...custom.headers },
          })
        : await call('/me');

      if (!response.ok) {
        throw new OAuthError(`The server refused the user request: ${response.status}`, 'me_failed');
      }

      const raw = (await response.json()) as Record<string, unknown>;
      return custom?.map ? ((await custom.map(raw, COOKIE_SESSION)) as U) : (raw as U);
    },

    async logout(options: { returnTo?: string } = {}): Promise<void> {
      await call('/logout', { method: 'POST' }).catch(() => undefined);
      const target = options.returnTo
        ? safeReturnTo(options.returnTo, {
            fallback: config.postLogoutRedirectUri ?? '/',
            allowedOrigins: config.allowedReturnOrigins,
          })
        : (config.postLogoutRedirectUri ?? '/');
      if (typeof location !== 'undefined') location.assign(target);
    },

    async restore(): Promise<Tokens | null> {
      // The cookie is either valid or it is not, and only the server knows. A successful
      // `/me` is the answer.
      const response = await call('/me');
      return response.ok ? { accessToken: COOKIE_SESSION } : null;
    },
  };
}
