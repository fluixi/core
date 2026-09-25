/**
 * Refusing a request at this app's own API.
 *
 * `createTokenVerifier` says whether a token holds. What every app then wrote by hand is the
 * part around it: catch the refusal, answer 401 with a `WWW-Authenticate` header, answer 403
 * when the token is genuine but not enough, and hand the claims to the route. Thirty-odd
 * lines, identical everywhere, and the header is not decoration: `browser.ts` reads
 * `error="..."` out of it to tell an expired token from an endpoint that is down, which is
 * what makes a refresh happen instead of a sign out.
 *
 * So the two halves of that contract now come from the same package. An app that writes the
 * header itself has to match a format nothing told it about.
 *
 * Authentication and authorization stay separate here. The verifier decides whether the token
 * is genuine; `requirements` decide whether it is enough for one route. Conflating them is how
 * a 403 ends up reported as a 401 and the client refreshes a perfectly good token in a loop.
 */
import { TokenError, type TokenClaims, type TokenVerifier } from './verify.js';

/** Why a request was refused. */
export interface Refusal {
  /** 401 when the token is not acceptable, 403 when it is genuine but insufficient. */
  status: 401 | 403;
  /** A machine-readable code, and what goes in `WWW-Authenticate` for a 401. */
  code: string;
  /** What was missing, for a 403. Never sent for a 401: it would describe a token we rejected. */
  detail?: string;
  /** The claims, when there were any. Absent for a 401. */
  claims?: TokenClaims;
}

/** What a route demands beyond a valid token. */
export interface Requirements {
  /** Any one of these roles is enough. */
  role?: string | string[];
  /** Every one of these is required. */
  allRoles?: string[];
  /** Any one of these scopes is enough, read from the `scope` claim. */
  scope?: string | string[];
  /**
   * Anything else: a tenant claim, a plan, an ownership check against the URL.
   *
   * Return `true` to allow, `false` to refuse, or a string to refuse and say what was wrong.
   */
  require?: (claims: TokenClaims, request: Request) => boolean | string;
}

export interface ApiGuardOptions {
  /** The verifier this app configured. */
  verify: TokenVerifier;
  /**
   * How this provider names roles. See `rolesFrom` for the shapes in the wild.
   *
   * Left out, `role` and `allRoles` requirements throw rather than silently refusing
   * everyone: a guard that cannot read roles and quietly answers 403 looks like a
   * permissions problem for as long as it takes to find.
   */
  roles?: (claims: TokenClaims) => string[];
  /**
   * Answer a refusal in this app's own shape.
   *
   * The default is `{ error, detail? }` as JSON. Override for an API with its own error
   * envelope. Returning a 401 without `WWW-Authenticate` breaks the client's ability to tell
   * an expired token from a dead endpoint, so the default header is added to whatever comes
   * back unless it already carries one.
   */
  onRefused?: (refusal: Refusal, request: Request) => Response;
}

/** Wraps a route handler so only an acceptable request reaches it. */
export type ApiGuard = (
  handler: (request: Request, claims: TokenClaims) => Response | Promise<Response>,
  requirements?: Requirements,
) => (request: Request) => Promise<Response>;

const asList = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/** The default refusal body. */
function refuse(refusal: Refusal): Response {
  const body: Record<string, string> = { error: refusal.code };
  if (refusal.detail) body.detail = refusal.detail;
  return new Response(JSON.stringify(body), {
    status: refusal.status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * A guard for this app's API routes.
 *
 * @example
 * ```ts
 * // src/services/auth/verify.ts, the whole file
 * import { createTokenVerifier, createApiGuard, rolesFrom } from '@fluixi/oauth2/verify';
 * import { env } from '../../config/env.js';
 *
 * export const verify = createTokenVerifier({
 *   issuer: env.oidcIssuer,
 *   audience: false,
 *   authorizedParty: env.clientId,
 * });
 *
 * export const guard = createApiGuard({ verify, roles: rolesFrom.keycloakRealm });
 * ```
 *
 * ```ts
 * // src/api/reports.ts
 * export const GET = guard(async (request, claims) => Response.json(await reportsFor(claims.sub)));
 * export const DELETE = guard(handler, { role: 'admin' });
 * ```
 */
export function createApiGuard(options: ApiGuardOptions): ApiGuard {
  const answer = (refusal: Refusal, request: Request): Response => {
    const response = options.onRefused ? options.onRefused(refusal, request) : refuse(refusal);
    // Added rather than overwritten: a custom refusal may already say it better.
    if (refusal.status === 401 && !response.headers.has('www-authenticate')) {
      response.headers.set('www-authenticate', `Bearer error="${refusal.code}"`);
    }
    return response;
  };

  const rolesOf = (claims: TokenClaims, what: string): string[] => {
    if (!options.roles) {
      throw new Error(
        `[fluixi/oauth2] this route requires ${what}, but createApiGuard was given no \`roles\`. ` +
          'Providers disagree on where roles live, so there is no default: pass one of `rolesFrom`, ' +
          'or a function reading the claim your provider uses.',
      );
    }
    return options.roles(claims);
  };

  return (handler, requirements = {}) =>
    async (request: Request): Promise<Response> => {
      let claims: TokenClaims;
      try {
        claims = await options.verify.fromRequest(request);
      } catch (cause) {
        // The code travels; the message does not. A refusal that explains why a token failed
        // tells an attacker which guesses are close.
        const code = cause instanceof TokenError ? cause.code : 'invalid_token';
        return answer({ status: 401, code }, request);
      }

      const wanted = asList(requirements.role);
      if (wanted.length) {
        const held = rolesOf(claims, 'a role');
        if (!wanted.some((role) => held.includes(role))) {
          return answer(
            {
              status: 403,
              code: 'insufficient_role',
              detail: `needs ${wanted.length > 1 ? 'one of ' : ''}${wanted.join(', ')}`,
              claims,
            },
            request,
          );
        }
      }

      if (requirements.allRoles?.length) {
        const held = rolesOf(claims, 'roles');
        const missing = requirements.allRoles.filter((role) => !held.includes(role));
        if (missing.length) {
          return answer(
            { status: 403, code: 'insufficient_role', detail: `needs ${missing.join(', ')}`, claims },
            request,
          );
        }
      }

      const scopes = asList(requirements.scope);
      if (scopes.length) {
        const held = typeof claims.scope === 'string' ? claims.scope.split(' ') : [];
        if (!scopes.some((scope) => held.includes(scope))) {
          return answer(
            {
              status: 403,
              code: 'insufficient_scope',
              detail: `needs ${scopes.length > 1 ? 'one of ' : ''}${scopes.join(', ')}`,
              claims,
            },
            request,
          );
        }
      }

      if (requirements.require) {
        const verdict = requirements.require(claims, request);
        if (verdict !== true) {
          return answer(
            {
              status: 403,
              code: 'forbidden',
              detail: typeof verdict === 'string' ? verdict : undefined,
              claims,
            },
            request,
          );
        }
      }

      return handler(request, claims);
    };
}

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
