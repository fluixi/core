/**
 * The five providers, as configuration.
 *
 * Every value here is public. Client ids are not secrets, and a secret a provider needs
 * is read from the environment by the server half.
 */
import type { AuthConfig } from '@fluixi/oauth2';

export type ProviderId = 'keycloak' | 'dex' | 'auth0' | 'okta' | 'google';

export interface ProviderNote {
  /** What this provider does differently, shown beside its result. */
  text: string;
  /** Whether it is a limitation to expect or something to look into. */
  kind: 'expected' | 'caution';
}

export interface Provider {
  id: ProviderId;
  label: string;
  issuer: string;
  clientId: string;
  /**
   * Which modes this provider can be driven in.
   *
   * Google refuses a public client at its token endpoint, answering `client_secret is
   * missing.` before it looks at PKCE, so it lists `server` only.
   */
  modes: Array<'browser' | 'server'>;
  scopes: string[];
  /** Some providers hand back an opaque token unless an API is named. */
  audience?: string;
  /** Extra authorization parameters this provider wants. */
  extraParams?: Record<string, string>;
  /**
   * Endpoints given directly, for a provider whose discovery document a page cannot read.
   *
   * Not every provider sends CORS headers on `.well-known`: Keycloak does once an origin
   * is configured, Dex and Google do not. Browser mode has to know the endpoints some
   * other way, and naming them here is that way.
   */
  endpoints?: {
    authorization: string;
    token: string;
    userinfo?: string;
    endSession?: string;
    revocation?: string;
  };
  /** Refuses a token whose audience excludes the asking client, or names none at all. */
  authorizedParty?: string;
  /** Bind tokens to a key this client holds, per RFC 9449. Required by some providers. */
  dpop?: boolean;
  /** The confidential client a server-held session uses, when it differs. */
  serverClientId?: string;
  /** What the run is expected to show, so a surprise stands out from a known limit. */
  notes: ProviderNote[];
}

/**
 * Local providers carry working values; hosted ones carry placeholders.
 *
 * A placeholder is shown in the interface rather than followed, so the app says what is
 * missing instead of handing the browser to a provider that will refuse it.
 */
export const _PROVIDERS: Record<ProviderId, Provider> = {
  keycloak: {
    id: 'keycloak',
    label: 'Keycloak',
    issuer: 'http://localhost:8080/realms/adafri',
    clientId: 'adafri-admin',
    // A server-held session authenticates with a secret, which a public client has none
    // of, so that mode uses the confidential client registered alongside it.
    serverClientId: 'adafri-admin-server',
    modes: ['browser', 'server'],
    scopes: ['openid', 'profile', 'email'],
    authorizedParty: 'adafri-admin',
    notes: [
      { kind: 'expected', text: 'No `aud` on an access token until an audience mapper is configured, so `azp` is the handle.' },
      { kind: 'expected', text: 'Refuses to introspect a token whose audience excludes the asking client, and says only `active: false`.' },
      { kind: 'caution', text: 'Revokes the whole session when an authorization code is replayed, which RFC 6749 recommends.' },
    ],
  },

  dex: {
    id: 'dex',
    label: 'Dex',
    issuer: 'http://localhost:5556/dex',
    clientId: 'adafri-admin',
    // Server only. Dex sends no CORS headers on its token endpoint either, so a page
    // cannot complete the exchange whatever it knows about the endpoints.
    modes: ['server'],
    serverClientId: 'orders-api',
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    // Given directly because Dex publishes no CORS on its discovery document either.
    endpoints: {
      authorization: 'http://localhost:5556/dex/auth',
      token: 'http://localhost:5556/dex/token',
      userinfo: 'http://localhost:5556/dex/userinfo',
    },
    notes: [
      { kind: 'caution', text: 'Sends no CORS headers on its discovery document or its token endpoint, so a browser-held session is impossible: server mode only.' },
      { kind: 'expected', text: 'Names no client on an access token: neither `azp` nor `client_id`, so `aud` is the only handle.' },
      { kind: 'expected', text: 'No revocation endpoint and no end session endpoint, so logout can only clear what is held here.' },
      { kind: 'expected', text: 'No client credentials grant at all.' },
    ],
  },

  auth0: {
    id: 'auth0',
    label: 'Auth0',
    issuer: 'https://YOUR_TENANT.us.auth0.com/',
    clientId: 'YOUR_AUTH0_SPA_CLIENT_ID',
    modes: ['browser', 'server'],
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    // Set VITE_AUTH0_AUDIENCE to an API this client is authorized for. Without it Auth0
    // returns an opaque access token; with one it is not authorized for, it refuses the
    // request before showing a login page.
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    notes: [
      { kind: 'caution', text: 'The issuer keeps its trailing slash, and `iss` includes it. Dropping it looks like a signature failure.' },
      { kind: 'expected', text: 'Returns an opaque access token unless VITE_AUTH0_AUDIENCE names an API this client is authorized for.' },
      { kind: 'expected', text: 'Publishes no introspection endpoint, so that button does nothing here.' },
      { kind: 'caution', text: 'Every grant is a separate authorization: issuing a refresh token and accepting one back are different settings.' },
      { kind: 'caution', text: 'A refresh token needs three things together: `offline_access` in the scopes, VITE_AUTH0_AUDIENCE naming an API with Allow Offline Access on, and Refresh Token Rotation enabled on the application. Any one missing and the scope is ignored silently.' },
    ],
  },

  okta: {
    id: 'okta',
    label: 'Okta',
    issuer: 'https://YOUR_DOMAIN.okta.com/oauth2/default',
    clientId: 'YOUR_OKTA_SPA_CLIENT_ID',
    modes: ['browser', 'server'],
    dpop: true,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
    notes: [
      { kind: 'caution', text: 'Two authorization servers: `/oauth2/default` for an application, the bare domain for Okta’s own API. They are not interchangeable.' },
      { kind: 'expected', text: 'Names no client on an access token, so `aud` is the handle.' },
      { kind: 'expected', text: 'Binds the refresh token to the DPoP key as well as the access token, so a refresh has to be proved with the same key that obtained it. The key is kept in IndexedDB for that reason: held in memory it would not survive this callback, and every refresh came back `Invalid DPoP Public Key binding in refresh token`.' },
      { kind: 'caution', text: 'Turns DPoP on by default for new applications, and an integrator org will not let you untick it. Tokens are bound to a key this client holds, which is why `dpop` is on below.' },
      { kind: 'caution', text: 'Introspection is authenticated, and this SPA has no secret to authenticate with: a public client set to "Public key / Private key" has no secret field at all. An API Services client asks instead, set OKTA_INTROSPECT_CLIENT_ID to it and OKTA_PRIVATE_KEY to the private half of the key registered on it. A key sent as a client id that does not own it comes back as `The client does not have a JWKSet configured`.' },
    ],
  },

  google: {
    id: 'google',
    label: 'Google',
    // Published as this, while an id token may carry the bare host. A verifier pinned to
    // one form rejects the other.
    issuer: 'https://accounts.google.com',
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    modes: ['server'],
    scopes: ['openid', 'profile', 'email'],
    notes: [
      { kind: 'caution', text: 'Refuses a public client: a token request without a secret is answered `client_secret is missing.`, checked before PKCE. Browser mode cannot complete.' },
      { kind: 'expected', text: 'No introspection endpoint and no end session endpoint.' },
      { kind: 'expected', text: 'Names itself two ways, `accounts.google.com` and the https form, so a verifier needs both.' },
    ],
  },
};

/** Whether a provider still carries its placeholder rather than real values. */
export function needsSetup(provider: Provider): boolean {
  return provider.issuer.includes('YOUR_') || provider.clientId.includes('YOUR_');
}

export function resolveClientId(provider: Provider): string {
  if(!provider.clientId.includes('YOUR_')) return provider.clientId;
  const clientId = import.meta.env[`VITE_${provider.id.toUpperCase()}_CLIENT_ID`] ?? provider.clientId;
  return clientId;
}
/**
 * Deliberately absent.
 *
 * A client secret cannot be resolved here. `import.meta.env` carries only `VITE_` names
 * and those are inlined into the browser bundle, so reading one would ship the secret to
 * every visitor. The server reads `<PROVIDER>_CLIENT_SECRET` from `process.env` in
 * `src/middleware.ts`, where it stays.
 */

export function resolveClientTenant(provider: Provider): string {
  const tenantName = `VITE_${provider.id.toUpperCase()}_TENANT`;
  const clientTenant = import.meta.env[tenantName]
  if(!clientTenant) return provider.issuer;
  return clientTenant;
}


/**
 * The public half of a provider's configuration, from the environment where it is set.
 *
 * Only values safe to ship: an issuer and a client id. Both are visible in a browser
 * anyway, since the authorization request carries them.
 */
export function resolveBaseConfig(provider: Provider): { issuer: string; clientId: string } {
  return { issuer: resolveClientTenant(provider), clientId: resolveClientId(provider) };
}

export function getProviders(): Record<ProviderId, Provider> {
  const providers: Record<ProviderId, Provider> = { ..._PROVIDERS };
  return Object.values(providers).map((p) => {
    return { ...p, ...resolveBaseConfig(p) };
  }).reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {} as Record<ProviderId, Provider>);
}

export const PROVIDERS = getProviders();

/** The client config for a provider in a mode, as `createAuthService` wants it. */
export function configFor(
  provider: Provider,
  tokens: 'browser' | 'server',
  appUrl: string,
): AuthConfig {
  if (tokens === 'server') {
    return {
      tokens: 'server',
      // The server half owns the flow; the browser only ever calls these routes.
      basePath: `/auth/${provider.id}`,
      redirectUri: `${appUrl}/auth/${provider.id}/callback`,
      postLogoutRedirectUri: `${appUrl}/?provider=${provider.id}`,
    };
  }

  return {
    tokens: 'browser',
    // Endpoints win over the issuer where a provider will not let a page read discovery.
    ...(provider.endpoints ? { endpoints: provider.endpoints } : { issuer: provider.issuer }),
    clientId: resolveClientId(provider),
    redirectUri: `${appUrl}/callback`,
    postLogoutRedirectUri: `${appUrl}/?provider=${provider.id}`,
    scopes: provider.scopes,
    // Each provider gets its own storage, so switching between them mid-flow does not
    // have one overwrite another's verifier.
    storageKey: provider.id,
    ...(provider.dpop ? { dpop: true } : {}),
    ...(provider.audience ? { extraParams: { audience: provider.audience } } : {}),
    ...(provider.extraParams ? { extraParams: provider.extraParams } : {}),
  };
}
