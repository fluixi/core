/**
 * Reading roles off a token's claims.
 *
 * Its own module because it is pure data access and a browser bundle wants it too: presets
 * name one per provider, and an app's shared config picks one. Kept here, clear of
 * `verify.ts`, so importing it never drags the verifier and its `node:` imports into a
 * client build.
 */
import type { TokenClaims } from './verify.js';

/**
 * Where each provider puts roles.
 *
 * There is no default because they genuinely disagree, and guessing wrong means a guard that
 * reads an empty list and refuses everyone. Each of these was read off a real token.
 */
export const rolesFrom = {
  /** Keycloak, realm roles. Where it puts them unless a client mapper is configured. */
  keycloakRealm: (claims: TokenClaims): string[] => {
    const realm = claims.realm_access as { roles?: string[] } | undefined;
    return realm?.roles ?? [];
  },

  /** Keycloak, roles scoped to one client rather than the realm. */
  keycloakClient:
    (clientId: string) =>
    (claims: TokenClaims): string[] => {
      const all = claims.resource_access as Record<string, { roles?: string[] }> | undefined;
      return all?.[clientId]?.roles ?? [];
    },

  /** Okta, and anything else using a groups claim. Needs a groups claim on the token. */
  groups: (claims: TokenClaims): string[] =>
    Array.isArray(claims.groups) ? (claims.groups as string[]) : [],

  /** Cognito, which namespaces the claim. */
  cognito: (claims: TokenClaims): string[] => {
    const groups = claims['cognito:groups'];
    return Array.isArray(groups) ? (groups as string[]) : [];
  },

  /**
   * Auth0, which requires a namespaced custom claim added by an action.
   *
   * `rolesFrom.namespaced('https://adafri.com/roles')`. Auth0 silently drops a custom claim
   * that is not a URI, so an empty list here usually means the namespace, not the action.
   */
  namespaced:
    (claim: string) =>
    (claims: TokenClaims): string[] => {
      const value = claims[claim];
      return Array.isArray(value) ? (value as string[]) : [];
    },

  /** The `scope` claim read as a role list, for a provider issuing no roles at all. */
  scope: (claims: TokenClaims): string[] =>
    typeof claims.scope === 'string' ? claims.scope.split(' ') : [],
};
