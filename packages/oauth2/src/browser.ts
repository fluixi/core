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
  claimsOf,
  createPkcePair,
  createStateValue,
  expiryFrom,
  expiryFromJwt,
  timingSafeEqual,
} from './pkce.js';
import { applyClientAuth } from './client-auth.js';
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

/**
 * What survives the redirect, and nothing that does not have to.
 *
 * Namespaced per client, because an app can offer more than one provider. Shared keys
 * meant a second client overwrote the first's verifier and state, so whichever login the
 * visitor did not finish broke the one they did.
 */
const keysFor = (id: string) => ({
  verifier: `fx.oauth2.${id}.verifier`,
  state: `fx.oauth2.${id}.state`,
  returnTo: `fx.oauth2.${id}.return`,
  refresh: `fx.oauth2.${id}.refresh`,
});

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
  // The client id by default, which is already distinct per provider. `storageKey`
  // overrides it for an app running two clients against the same provider.
  const KEY = keysFor(config.storageKey ?? config.clientId);
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
    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
    };

    const form = new URLSearchParams(body);
    form.delete('client_id');
    // A public client: `none` names itself and proves nothing, which is what PKCE covers.
    // `basic` sends an empty password, which some providers insist on even so.
    await applyClientAuth(
      { clientId: config.clientId, method: config.tokenAuthMethod ?? 'none', clientSecret: '' },
      token,
      headers,
      form,
    );

    const response = await fetcher(token, { method: 'POST', headers, body: form.toString() });

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
    if (tokens.refreshToken) durable()?.setItem(KEY.refresh, tokens.refreshToken);
    return tokens;
  }

  return {
    async login(options: LoginOptions = {}): Promise<void> {
      const { authorization } = await resolveEndpoints();
      const { verifier, challenge } = await createPkcePair();
      const state = createStateValue();

      const storage = flow();
      storage?.setItem(KEY.verifier, verifier);
      storage?.setItem(KEY.state, state);
      // Where to land afterwards. Recorded here because the redirect discards everything
      // this module is holding.
      storage?.setItem(
        KEY.returnTo,
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
      const expected = storage?.getItem(KEY.state) ?? null;
      const verifier = storage?.getItem(KEY.verifier) ?? null;

      // Single-use. Cleared before the exchange so a replayed callback finds nothing,
      // whether or not the exchange succeeds.
      storage?.removeItem(KEY.state);
      storage?.removeItem(KEY.verifier);

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
      const token = access?.refreshToken ?? durable()?.getItem(KEY.refresh);
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
        durable()?.removeItem(KEY.refresh);
        access = null;
        throw error;
      }
    },

    async fetchUser<U = unknown>(accessToken?: string): Promise<U> {
      const custom = config.userInfo;
      const bearer = accessToken ?? access?.accessToken;
      if (!bearer) throw new OAuthError('No access token to call userinfo with.', 'no_access_token');

      // A configured URL wins over discovery. That is the app saying its own API is the
      // authority on who this is, which it usually is: the provider does not know what
      // someone is allowed to do here.
      let endpoint = custom?.url;
      if (!endpoint) {
        const { userinfo } = await resolveEndpoints();
        if (!userinfo) {
          throw new OAuthError(
            'The provider published no userinfo endpoint. Give `userInfo.url`, or the service its own `fetchUser`.',
            'no_userinfo',
          );
        }
        endpoint = userinfo;
      }

      const response = await fetcher(endpoint, {
        method: custom?.method ?? 'GET',
        headers: {
          authorization: `Bearer ${bearer}`,
          accept: 'application/json',
          ...custom?.headers,
        },
        ...(custom?.credentials ? { credentials: custom.credentials } : {}),
      });

      if (!response.ok) {
        // The reason is in WWW-Authenticate, not the body: `invalid_token` when the
        // access token expired, which is worth telling apart from the endpoint being down.
        const reason = response.headers
          .get('www-authenticate')
          ?.match(/error="([^"]+)"/)?.[1];
        throw new OAuthError(
          `The user endpoint refused the token: ${reason ?? response.status}`,
          reason ?? 'userinfo_failed',
        );
      }

      // A provider configured with `userinfo_signed_response_alg` answers with a signed
      // JWT instead. Verifying it needs the provider's JWKS, which this client does not
      // fetch, so say that rather than failing inside a JSON parse.
      const type = response.headers.get('content-type') ?? '';
      if (type.includes('application/jwt')) {
        throw new OAuthError(
          'This provider returns a signed userinfo response, which needs its own verification. Give the service its own `fetchUser`.',
          'userinfo_signed',
        );
      }

      const raw = (await response.json()) as Record<string, unknown>;

      // Only for the provider's own userinfo. OIDC requires that a `sub` which does not
      // match the id token be discarded, because a response obtained for one subject
      // must not be read as another. An app's own endpoint answers in its own shape and
      // has no such claim to check.
      if (!custom?.url) {
        const expected = access?.idToken ? claimsOf(access.idToken)?.sub : undefined;
        if (expected !== undefined && raw.sub !== expected) {
          throw new OAuthError(
            'The userinfo subject does not match the id token. The response was discarded.',
            'sub_mismatch',
          );
        }
      }

      return custom?.map ? ((await custom.map(raw, bearer)) as U) : (raw as U);
    },

    /**
     * Retire a token at the provider, per RFC 7009.
     *
     * Defaults to the refresh token, which is the one worth retiring: an access token
     * expires on its own in minutes, a refresh token does not. A provider with no
     * revocation endpoint resolves without doing anything, because there is nothing this
     * can do about that and failing a logout over it helps nobody.
     */
    async revoke(token?: string, hint: 'access_token' | 'refresh_token' = 'refresh_token'): Promise<void> {
      const target =
        token ??
        (hint === 'refresh_token'
          ? (access?.refreshToken ?? durable()?.getItem(KEY.refresh) ?? undefined)
          : access?.accessToken);
      if (!target) return;

      const { revocation } = await resolveEndpoints().catch(() => ({ revocation: undefined }));
      if (!revocation) return;

      await fetcher(revocation, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: target,
          token_type_hint: hint,
          client_id: config.clientId,
        }).toString(),
        // RFC 7009 says a provider answers 200 whether or not it knew the token, so
        // there is nothing to branch on and a failure here is not worth propagating.
      }).catch(() => undefined);
    },

    async logout(options: { returnTo?: string } = {}): Promise<void> {
      const idToken = access?.idToken;
      // Retire the refresh token before dropping it, or a copy stays usable for its
      // whole lifetime while this browser believes it signed out.
      await this.revoke?.();
      access = null;
      durable()?.removeItem(KEY.refresh);

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
      if (!durable()?.getItem(KEY.refresh)) return null;
      try {
        return await this.refresh();
      } catch {
        return null;
      }
    },

    consumeReturnTo(): string | null {
      const storage = flow();
      const value = storage?.getItem(KEY.returnTo) ?? null;
      storage?.removeItem(KEY.returnTo);
      return value;
    },
  };
}
