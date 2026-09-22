/**
 * `@fluixi/oauth2/verify`: check an access token at the API that receives it.
 *
 * This is the half that actually decides anything. A client holds a token and sends it;
 * the service on the other end is the one that must not take it on trust. Signature,
 * issuer, audience and expiry, on every request.
 *
 * Nothing here is Fluixi-specific. It takes a `Request` or a bare string and returns
 * claims, so an Express service, a worker, a Hono route or a plain Node handler can use
 * it without adopting anything else.
 *
 * ```ts
 * const verify = createTokenVerifier({
 *   issuer: process.env.OIDC_ISSUER!,
 *   audience: 'adafri-admin',
 * });
 *
 * const claims = await verify.fromRequest(request);   // throws when it does not hold
 * ```
 *
 * ## What this does not do
 *
 * The cryptography is `jose`'s, deliberately. A hand-written verifier is how `alg: none`
 * and RS256-to-HS256 confusion get shipped, and both turn a check into a way in. What
 * this adds is the configuration around it: algorithms pinned rather than read from the
 * token, an issuer and audience that must be stated, and the JWKS URL found by discovery
 * so a service does not hardcode it.
 *
 * `jose` is an optional peer. An app that never verifies never installs it.
 *
 * ## Providers that omit `aud`
 *
 * Keycloak issues access tokens with no `aud` until an audience mapper is configured,
 * naming the client in `azp` instead. A service in front of one wants:
 *
 * ```ts
 * createTokenVerifier({ issuer, audience: false, authorizedParty: 'adafri-admin' });
 * ```
 *
 * Not `audience: false` on its own: that accepts a token minted for any client of the
 * issuer, which is the check being skipped rather than moved.
 */
import { discover } from './discovery.js';
import { OAuthError } from './types.js';

/** The claims a verified token carried. Shapes vary by provider, so this stays open. */
export type TokenClaims = Record<string, unknown> & {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  scope?: string;
};

export interface VerifierOptions {
  /**
   * The issuer this service accepts, and the only one.
   *
   * Required, and never taken from the token: a token that names its own issuer proves
   * nothing, and accepting it is how a service ends up trusting an attacker's provider.
   */
  issuer: string;
  /**
   * Who the token was minted for, checked against `aud`.
   *
   * Required unless `audience: false` says the service really does accept any. Skipping
   * it lets a token issued for another client of the same provider be replayed here,
   * which is a real and easy mistake.
   */
  audience: string | string[] | false;
  /**
   * The client the token was issued to, checked against `azp`.
   *
   * Some providers put no `aud` on an access token at all and name the client in `azp`
   * instead. Keycloak does that until an audience mapper is configured, so a service in
   * front of it wants `audience: false` with this set, rather than no check of who the
   * token was for.
   *
   * Configuring an audience mapper at the provider and using `audience` is the better
   * end state. This is for the common case where you do not control that.
   */
  authorizedParty?: string | string[];
  /**
   * Signing algorithms this service accepts. Default `['RS256']`.
   *
   * Pinned, and never read from the token header. That is what stops a token switching
   * to `HS256` and being signed with the public key, and what makes `alg: none`
   * unrepresentable.
   */
  algorithms?: string[];
  /** The JWKS URL, when discovery should not be used to find it. */
  jwksUri?: string;
  /**
   * The keys themselves, for a service that has them already.
   *
   * Pinned keys, an air-gapped deployment, or a test. Nothing is fetched when this is
   * given, which also means nothing rotates: a provider that rolls its signing key stops
   * being accepted until this is updated. Prefer `jwksUri` or discovery unless that
   * tradeoff is the one you want.
   */
  jwks?: { keys: unknown[] };
  /** Allowance for clock skew between this service and the provider. Default 5s. */
  clockToleranceSec?: number;
  /** Extra checks once the token holds: scope, a tenant claim, whatever the app needs. */
  require?: (claims: TokenClaims) => boolean | string;
}

export interface TokenVerifier {
  /** Verify a bare token. Throws unless everything holds. */
  (token: string): Promise<TokenClaims>;
  /** Verify the bearer token on a request. Throws when there is none. */
  fromRequest(request: Request): Promise<TokenClaims>;
  /** The bearer token on a request, or null. No verification. */
  bearerOf(request: Request): string | null;
}

/** Thrown for a token this service will not accept. */
export class TokenError extends OAuthError {
  constructor(message: string, code = 'invalid_token') {
    super(message, code);
    this.name = 'TokenError';
  }
}

/** `jose`, loaded only when something actually verifies. */
async function loadJose(): Promise<typeof import('jose')> {
  try {
    return await import('jose');
  } catch {
    throw new OAuthError(
      "Token verification needs `jose`. Install it: npm i jose. It is an optional peer so an app that does not verify does not carry it.",
      'jose_missing',
    );
  }
}

export function createTokenVerifier(options: VerifierOptions): TokenVerifier {
  if (!options.issuer) {
    throw new Error('[fluixi/oauth2] createTokenVerifier needs an issuer to accept tokens from.');
  }
  if (options.audience === undefined) {
    throw new Error(
      '[fluixi/oauth2] createTokenVerifier needs an audience, or `audience: false` to say this service really does accept a token minted for any client of the issuer.',
    );
  }
  if (options.audience === false && options.authorizedParty === undefined) {
    // Not fatal, because a service may genuinely accept any client of its issuer. Worth
    // saying out loud, because arriving here by forgetting is far more likely.
    console.warn(
      '[fluixi/oauth2] This verifier checks neither `aud` nor `azp`, so a token minted for any client of the issuer is accepted. Set `authorizedParty` if that is not what you meant.',
    );
  }

  const algorithms = options.algorithms ?? ['RS256'];
  if (algorithms.some((alg) => !alg || alg.toLowerCase() === 'none')) {
    throw new Error('[fluixi/oauth2] `none` is not a signing algorithm and cannot be accepted.');
  }

  /**
   * Built once and reused: `createRemoteJWKSet` caches the keys, refetches when a `kid`
   * is unknown, and rate-limits that refetch. Building it per call would drop the cache
   * and turn unknown key ids into a way to hammer the provider.
   */
  let keys:
    | ReturnType<typeof import('jose').createRemoteJWKSet>
    | ReturnType<typeof import('jose').createLocalJWKSet>
    | null = null;

  async function keySet() {
    if (keys) return keys;
    const jose = await loadJose();

    if (options.jwks) {
      keys = jose.createLocalJWKSet(options.jwks as Parameters<typeof jose.createLocalJWKSet>[0]);
      return keys;
    }

    let uri = options.jwksUri;
    if (!uri) {
      const endpoints = await discover(options.issuer);
      uri = endpoints.jwks;
    }
    if (!uri) {
      throw new OAuthError(
        `${options.issuer} published no jwks_uri. Give the verifier one directly.`,
        'no_jwks',
      );
    }

    keys = jose.createRemoteJWKSet(new URL(uri));
    return keys;
  }

  const verify = async (token: string): Promise<TokenClaims> => {
    if (!token) throw new TokenError('No token to verify.', 'no_token');

    const jose = await loadJose();
    let payload: TokenClaims;
    try {
      ({ payload } = await jose.jwtVerify(token, await keySet(), {
        issuer: options.issuer,
        ...(options.audience === false ? {} : { audience: options.audience }),
        algorithms,
        clockTolerance: options.clockToleranceSec ?? 5,
      }));
    } catch (cause) {
      // One message whatever failed. Saying which check a token missed tells whoever
      // sent it how to get closer.
      throw new TokenError(
        `The token was not accepted: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }

    // `azp` names the client a token was issued to. Checked here rather than left to
    // jose, which knows only the registered `aud`.
    if (options.authorizedParty !== undefined) {
      const allowed = Array.isArray(options.authorizedParty)
        ? options.authorizedParty
        : [options.authorizedParty];
      if (typeof payload.azp !== 'string' || !allowed.includes(payload.azp)) {
        throw new TokenError('The token was issued to a different client.', 'invalid_azp');
      }
    }

    if (options.require) {
      const verdict = options.require(payload);
      if (verdict !== true) {
        throw new TokenError(
          typeof verdict === 'string' ? verdict : 'The token did not meet this service\'s requirements.',
          'insufficient_claims',
        );
      }
    }

    return payload;
  };

  const verifier = verify as TokenVerifier;

  verifier.bearerOf = (request: Request): string | null => {
    const header = request.headers.get('authorization');
    if (!header) return null;
    // Case-insensitive: the scheme is, per the HTTP spec, and providers differ.
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
  };

  verifier.fromRequest = async (request: Request): Promise<TokenClaims> => {
    const token = verifier.bearerOf(request);
    if (!token) {
      throw new TokenError('The request carried no bearer token.', 'no_token');
    }
    return verify(token);
  };

  return verifier;
}
