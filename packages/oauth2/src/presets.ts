/**
 * Providers, as configuration rather than prose.
 *
 * Nothing here is required. A provider is `issuer` plus discovery, and that is the whole
 * contract: `presets.oidc({ issuer })` is the agnostic path and covers anything publishing a
 * discovery document, `presets.oauth2({ endpoints })` covers a plain OAuth2 server that
 * publishes none. The named presets exist because each of the five cost a round trip to find
 * out, and a fact learned from a live tenant belongs in code rather than in a handoff nobody
 * reads at the right moment.
 *
 * What a preset does not do is decide anything an app owns. No client id, no redirect URI, no
 * secret. It contributes the parts that follow from *which provider this is*: how the issuer
 * is spelled, where roles live, whether an access token carries an `aud`, and what the
 * provider will refuse outright.
 *
 * Every preset is a plain object. Read one, disagree with it, spread it and override the
 * field. That is the intended use as much as taking it whole.
 */
import type { TokenClaims } from './verify.js';
import { rolesFrom } from './roles.js';
import type { Endpoints } from './types.js';

/** Verifier options that follow from the provider, given the client this app is. */
export interface VerifierShape {
  issuer: string | string[];
  /** `false` for a provider that puts no `aud` on an access token. */
  audience: string | string[] | false;
  /** Set when `audience` is false, so the check moves rather than disappearing. */
  authorizedParty?: string | string[];
}

/** What a provider contributes to a client config, and what it cannot do. */
export interface ProviderPreset {
  /** A name for messages and logs. */
  label: string;
  /** Spread into `createBrowserClient` or `oauthRoutes`. */
  client: {
    issuer?: string;
    endpoints?: Endpoints;
    scopes?: string[];
    dpop?: boolean;
    extraParams?: Record<string, string>;
    tokenAuthMethod?: 'client_secret_basic' | 'client_secret_post' | 'private_key_jwt' | 'none';
  };
  /** Where this provider puts roles, for `createApiGuard`. */
  roles: (claims: TokenClaims) => string[];
  /** Verifier options, given the client id this app authenticates as. */
  verifier: (clientId: string) => VerifierShape;
  /**
   * What this provider will refuse, learned live rather than from documentation.
   *
   * Worth reading before debugging: each line here was a failure that looked like a bug in
   * this package.
   */
  constraints: string[];
}

/** Trailing slashes matter to an issuer comparison, so they are normalised once. */
const trim = (url: string) => url.replace(/\/+$/, '');

export const presets = {
  /**
   * Any OIDC provider publishing a discovery document.
   *
   * The agnostic path, and the one to reach for first. A provider not listed below almost
   * certainly works through this.
   */
  oidc(options: {
    issuer: string;
    scopes?: string[];
    /** `false` for a provider that puts no `aud` on an access token. */
    audience?: string | false;
    roles?: (claims: TokenClaims) => string[];
  }): ProviderPreset {
    return {
      label: options.issuer,
      client: { issuer: trim(options.issuer), scopes: options.scopes },
      roles: options.roles ?? rolesFrom.scope,
      verifier: (clientId) => ({
        issuer: trim(options.issuer),
        audience: options.audience ?? clientId,
        ...(options.audience === false ? { authorizedParty: clientId } : {}),
      }),
      constraints: [],
    };
  },

  /**
   * A plain OAuth2 server with no discovery document.
   *
   * Every endpoint is given, because there is nothing to ask. Token verification needs an
   * issuer regardless, since a verifier will not accept a token without one.
   */
  oauth2(options: {
    endpoints: Endpoints;
    issuer: string;
    scopes?: string[];
    audience?: string | false;
    roles?: (claims: TokenClaims) => string[];
  }): ProviderPreset {
    return {
      label: options.issuer,
      client: { endpoints: options.endpoints, scopes: options.scopes },
      roles: options.roles ?? rolesFrom.scope,
      verifier: (clientId) => ({
        issuer: trim(options.issuer),
        audience: options.audience ?? clientId,
        ...(options.audience === false ? { authorizedParty: clientId } : {}),
      }),
      constraints: ['Publishes no discovery document, so every endpoint is configured by hand.'],
    };
  },

  /** Keycloak. A realm is its own issuer. */
  keycloak(options: { baseUrl: string; realm: string; scopes?: string[] }): ProviderPreset {
    const issuer = `${trim(options.baseUrl)}/realms/${options.realm}`;
    return {
      label: 'Keycloak',
      client: {
        issuer,
        scopes: options.scopes ?? ['openid', 'profile', 'email'],
      },
      roles: rolesFrom.keycloakRealm,
      // No `aud` on an access token until an audience mapper is configured, and the client is
      // named in `azp` instead. So the check moves to `authorizedParty` rather than being
      // dropped: `audience: false` alone would accept a token minted for any client of the
      // realm, which is the check being skipped.
      verifier: (clientId) => ({ issuer, audience: false, authorizedParty: clientId }),
      constraints: [
        'Puts no `aud` on an access token until a dedicated audience mapper is configured. Configure one and switch the verifier to `audience: clientId`.',
        'Revokes the whole session when an authorization code is replayed, so a replay test has to run last.',
      ],
    };
  },

  /**
   * Auth0.
   *
   * `audience` is the field that decides what kind of token comes back. Without it Auth0
   * issues an opaque token for its own userinfo endpoint and the JWT checks have nothing to
   * work with.
   */
  auth0(options: {
    domain: string;
    /** An API identifier. Required for a JWT access token, and for refresh tokens. */
    audience?: string;
    scopes?: string[];
    /** The namespaced claim an action adds. Auth0 has no built-in roles claim. */
    rolesClaim?: string;
  }): ProviderPreset {
    const issuer = `https://${options.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/`;
    return {
      label: 'Auth0',
      client: {
        issuer,
        scopes: options.scopes ?? ['openid', 'profile', 'email', 'offline_access'],
        ...(options.audience ? { extraParams: { audience: options.audience } } : {}),
      },
      roles: options.rolesClaim ? rolesFrom.namespaced(options.rolesClaim) : rolesFrom.scope,
      verifier: (clientId) => ({
        issuer,
        // The API identifier is the audience of an access token. Without one the token is
        // opaque and there is nothing for a verifier to check.
        audience: options.audience ?? false,
        ...(options.audience ? {} : { authorizedParty: clientId }),
      }),
      constraints: [
        'Issues an opaque access token unless `audience` names an API, so token verification needs it.',
        'A refresh token needs three things together: `offline_access` in the scopes, an audience whose API has Allow Offline Access on, and Refresh Token Rotation enabled on the application. Any one missing and the scope is ignored silently.',
        'Has no roles claim of its own. An action must add a namespaced one, and Auth0 drops a custom claim that is not a URI.',
        'The issuer carries a trailing slash. A verifier pinned without it rejects every token.',
      ],
    };
  },

  /**
   * Okta.
   *
   * Two authorization servers that are not interchangeable: a custom one per application,
   * and the org itself for Okta's own management API.
   */
  okta(options: {
    domain: string;
    /** The custom server, default `default`. Pass `null` for the org server. */
    authorizationServer?: string | null;
    scopes?: string[];
    /** Okta turns DPoP on for new applications. Default true, because that is the default there. */
    dpop?: boolean;
  }): ProviderPreset {
    const host = `https://${options.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
    const server = options.authorizationServer === undefined ? 'default' : options.authorizationServer;
    const issuer = server === null ? host : `${host}/oauth2/${server}`;
    return {
      label: 'Okta',
      client: {
        issuer,
        scopes: options.scopes ?? ['openid', 'profile', 'email', 'offline_access'],
        dpop: options.dpop ?? true,
      },
      roles: rolesFrom.groups,
      verifier: (clientId) => ({
        issuer,
        // An access token from a custom server is minted for that server's audience, named in
        // the console and `api://default` by default. It does not carry the client id.
        audience: false,
        authorizedParty: clientId,
      }),
      constraints: [
        'Two authorization servers: /oauth2/<name> for an application, the bare domain for the management API. They are not interchangeable.',
        'Turns DPoP on by default for a new application, and an integrator org will not let you untick it.',
        'Binds the refresh token to the DPoP key as well as the access token, so a refresh must be proved with the key that obtained it.',
        'A public SPA cannot introspect at all. An API Services client with `private_key_jwt` has to ask instead.',
        'Client credentials against the org server must use `private_key_jwt`, whatever the application is set to.',
      ],
    };
  },

  /**
   * Google.
   *
   * Refuses a public client outright, so server mode is the only option: the token endpoint
   * checks for a client secret before it looks at PKCE.
   */
  google(options: { scopes?: string[]; hostedDomain?: string } = {}): ProviderPreset {
    return {
      label: 'Google',
      client: {
        issuer: 'https://accounts.google.com',
        scopes: options.scopes ?? ['openid', 'profile', 'email'],
        ...(options.hostedDomain ? { extraParams: { hd: options.hostedDomain } } : {}),
      },
      roles: rolesFrom.scope,
      verifier: (clientId) => ({
        // Names itself two ways, and a service pinned to one rejects tokens carrying the
        // other. Discovery uses the first.
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: clientId,
      }),
      constraints: [
        'Refuses a public client: the token endpoint reports `client_secret is missing` before checking PKCE, so browser mode cannot work.',
        'Publishes its issuer both with and without a scheme, so a verifier needs both spellings.',
        'Issues a refresh token only on the first consent unless `prompt=consent` and `access_type=offline` are sent.',
      ],
    };
  },

  /**
   * Dex.
   *
   * Sends no CORS headers, on discovery or the token endpoint, so a browser cannot talk to it
   * at all. Server mode only, and giving endpoints explicitly does not help: the token request
   * is blocked too.
   */
  dex(options: { baseUrl: string; scopes?: string[] }): ProviderPreset {
    const issuer = trim(options.baseUrl);
    return {
      label: 'Dex',
      client: {
        issuer,
        scopes: options.scopes ?? ['openid', 'profile', 'email', 'offline_access'],
      },
      roles: rolesFrom.groups,
      verifier: (clientId) => ({ issuer, audience: clientId }),
      constraints: [
        'Sends no CORS headers on discovery or the token endpoint, so browser mode cannot work. Naming the endpoints explicitly only moves the failure to the token request.',
        'Has no admin interface. Users are static entries in its config file, and a password is a bcrypt hash.',
        'Publishes no revocation endpoint.',
      ],
    };
  },
};

/** The preset names, for an app offering a choice. */
export type PresetName = keyof typeof presets;
