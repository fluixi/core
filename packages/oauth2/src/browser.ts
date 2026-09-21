/**
 * A public client that holds its own tokens.
 *
 * The browser drives the whole flow: it builds the authorization URL, navigates, comes
 * back to the redirect URI with a code, and exchanges it. There is no client secret,
 * because a secret in a browser is not one, and PKCE is what replaces it.
 *
 * What this mode accepts: a refresh token in storage is reachable by any script on the
 * page. That is the cost of not running a server, and it is why `mode: 'server'` exists.
 * The access token is kept in memory alone, so the window where it is readable is the
 * life of the page rather than the life of the session.
 */
import {
  createPkcePair,
  createStateValue,
  expiryFrom,
  expiryFromJwt,
  timingSafeEqual,
} from './pkce.js';
import { discover } from './discovery.js';
import { OAuthError } from './types.js';
import type {
  AuthClient,
  BrowserConfig,
  CallbackParams,
  Endpoints,
  LoginOptions,
  Tokens,
} from './types.js';

/** What survives the redirect, and nothing that does not have to. */
const VERIFIER_KEY = 'fx.oauth2.verifier';
const STATE_KEY = 'fx.oauth2.state';
const RETURN_KEY = 'fx.oauth2.return';
const REFRESH_KEY = 'fx.oauth2.refresh';

const DEFAULT_SCOPES = ['openid', 'profile', 'email'];

/** Absent during a server render, where there is no storage and no flow to run. */
function store(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    // Storage throws rather than returning null when the browser has disabled it.
    return null;
  }
}

export function createBrowserClient(
  config: BrowserConfig,
  fetcher: typeof fetch = fetch,
): AuthClient {
  const scopes = config.scopes ?? DEFAULT_SCOPES;
  // The flow's temporary values follow the configured storage, so a `session` choice
  // really does end when the tab does.
  const flow = () => store(config.storage ?? 'session');
  // The refresh token outlives a page load by definition, so it goes where the app said.
  const durable = () => store(config.storage ?? 'session');

  /** In memory only. A reload restores from the refresh token instead. */
  let access: Tokens | null = null;
  let endpoints: Endpoints | null = config.endpoints ?? null;

  async function resolveEndpoints(): Promise<Endpoints> {
    if (endpoints) return endpoints;
    if (!config.issuer) {
      throw new OAuthError(
        'Give the client an `issuer` to discover from, or `endpoints` directly.',
        'missing_issuer',
      );
    }
    endpoints = await discover(config.issuer, fetcher);
    return endpoints;
  }

  /** The token endpoint speaks form encoding, not JSON. */
  async function exchange(body: Record<string, string>): Promise<Tokens> {
    const { token } = await resolveEndpoints();
    const response = await fetcher(token, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new OAuthError(
        `Token request failed: ${String(payload.error ?? response.status)}`,
        String(payload.error ?? 'token_request_failed'),
        typeof payload.error_description === 'string' ? payload.error_description : undefined,
      );
    }

    const accessToken = String(payload.access_token ?? '');
    if (!accessToken) {
      throw new OAuthError('The token response carried no access_token.', 'no_access_token');
    }

    const tokens: Tokens = {
      accessToken,
      refreshToken:
        typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined,
      idToken: typeof payload.id_token === 'string' ? payload.id_token : undefined,
      tokenType: typeof payload.token_type === 'string' ? payload.token_type : undefined,
      scope: typeof payload.scope === 'string' ? payload.scope : undefined,
      // `expires_in` is what the server said; the JWT's own `exp` is the fallback for a
      // server that omits it.
      expiresAt: expiryFrom(payload.expires_in) ?? expiryFromJwt(accessToken) ?? undefined,
    };

    access = tokens;
    if (tokens.refreshToken) durable()?.setItem(REFRESH_KEY, tokens.refreshToken);
    return tokens;
  }

  return {
    async login(options: LoginOptions = {}): Promise<void> {
      const { authorization } = await resolveEndpoints();
      const { verifier, challenge } = await createPkcePair();
      const state = createStateValue();

      const storage = flow();
      storage?.setItem(VERIFIER_KEY, verifier);
      storage?.setItem(STATE_KEY, state);
      // Where to land afterwards. Recorded here because the redirect discards everything
      // this module is holding.
      storage?.setItem(
        RETURN_KEY,
        options.returnTo ?? `${location.pathname}${location.search}`,
      );

      const url = new URL(authorization);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', config.clientId);
      url.searchParams.set('redirect_uri', config.redirectUri);
      url.searchParams.set('scope', scopes.join(' '));
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');
      for (const [key, value] of Object.entries({
        ...config.extraParams,
        ...options.params,
      })) {
        url.searchParams.set(key, value);
      }

      location.assign(url.toString());
    },

    async handleCallback(params: CallbackParams): Promise<Tokens> {
      if (params.error) {
        throw new OAuthError(
          params.errorDescription ?? params.error,
          params.error,
          params.errorDescription,
        );
      }
      if (!params.code) {
        throw new OAuthError('The callback carried no authorization code.', 'no_code');
      }

      const storage = flow();
      const expected = storage?.getItem(STATE_KEY) ?? null;
      const verifier = storage?.getItem(VERIFIER_KEY) ?? null;

      // Single-use. Cleared before the exchange so a replayed callback finds nothing,
      // whether or not the exchange succeeds.
      storage?.removeItem(STATE_KEY);
      storage?.removeItem(VERIFIER_KEY);

      if (!expected || !params.state || !timingSafeEqual(expected, params.state)) {
        throw new OAuthError(
          'The callback state did not match the one this client sent.',
          'state_mismatch',
        );
      }
      if (!verifier) {
        throw new OAuthError(
          'No PKCE verifier for this callback. The login was started elsewhere, or storage was cleared.',
          'missing_verifier',
        );
      }

      return exchange({
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        code_verifier: verifier,
      });
    },

    async refresh(): Promise<Tokens> {
      const token = access?.refreshToken ?? durable()?.getItem(REFRESH_KEY);
      if (!token) {
        throw new OAuthError('No refresh token, so the session cannot be extended.', 'no_refresh_token');
      }
      try {
        return await exchange({
          grant_type: 'refresh_token',
          refresh_token: token,
          client_id: config.clientId,
        });
      } catch (error) {
        // A refused refresh means the session is over. Holding the dead token would make
        // every later attempt fail the same way.
        durable()?.removeItem(REFRESH_KEY);
        access = null;
        throw error;
      }
    },

    async fetchUser<U = unknown>(accessToken?: string): Promise<U> {
      const { userinfo } = await resolveEndpoints();
      if (!userinfo) {
        throw new OAuthError(
          'The provider published no userinfo endpoint. Give the service its own `fetchUser`.',
          'no_userinfo',
        );
      }
      const bearer = accessToken ?? access?.accessToken;
      if (!bearer) throw new OAuthError('No access token to call userinfo with.', 'no_access_token');

      const response = await fetcher(userinfo, {
        headers: { authorization: `Bearer ${bearer}` },
      });
      if (!response.ok) {
        throw new OAuthError(`userinfo failed: ${response.status}`, 'userinfo_failed');
      }
      return (await response.json()) as U;
    },

    async logout(options: { returnTo?: string } = {}): Promise<void> {
      const idToken = access?.idToken;
      access = null;
      durable()?.removeItem(REFRESH_KEY);

      const { endSession } = await resolveEndpoints().catch(() => ({ endSession: undefined }));
      const target = options.returnTo ?? config.postLogoutRedirectUri;

      // Without an end-session endpoint the provider's own cookie survives, and the next
      // login is silent rather than a prompt. Clearing locally is all this can do.
      if (!endSession) {
        if (target && typeof location !== 'undefined') location.assign(target);
        return;
      }

      const url = new URL(endSession);
      if (target) url.searchParams.set('post_logout_redirect_uri', target);
      if (idToken) url.searchParams.set('id_token_hint', idToken);
      url.searchParams.set('client_id', config.clientId);
      location.assign(url.toString());
    },

    async restore(): Promise<Tokens | null> {
      if (access) return access;
      // A refresh token is the only thing that survives a reload, so restoring means
      // spending it for a fresh access token.
      if (!durable()?.getItem(REFRESH_KEY)) return null;
      try {
        return await this.refresh();
      } catch {
        return null;
      }
    },

    consumeReturnTo(): string | null {
      const storage = flow();
      const value = storage?.getItem(RETURN_KEY) ?? null;
      storage?.removeItem(RETURN_KEY);
      return value;
    },
  };
}
