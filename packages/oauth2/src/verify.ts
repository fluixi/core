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
import {
  applyClientAuth,
  assertUsable,
  resolveMethod,
  type ClientAuth,
  type ClientAuthMethodInput,
} from './client-auth.js';
import { discover } from './discovery.js';
import { OAuthError } from './types.js';

/** The claims a verified token carried. Shapes vary by provider, so this stays open. */
export type TokenClaims = Record<string, unknown> & {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  /** The client a token was issued to. `azp` in OIDC, `client_id` on some providers. */
  azp?: string;
  client_id?: string;
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
   *
   * A list is for a provider that names itself more than one way. Google publishes both
   * `accounts.google.com` and `https://accounts.google.com`, and a service pinned to one
   * rejects tokens carrying the other. Discovery uses the first.
   */
  issuer: string | string[];
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
   * Some providers put no `aud` on an access token at all and name the client elsewhere:
   * `azp` for Keycloak until an audience mapper is configured, `client_id` for Cognito.
   * Both are read, so a service in front of either wants `audience: false` with this set,
   * rather than no check of who the token was for.
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

/** The bearer token on a request, or null. Case-insensitive, as the HTTP scheme is. */
function bearerOf(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
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
  const issuers = (Array.isArray(options.issuer) ? options.issuer : [options.issuer]).filter(Boolean);
  if (!issuers.length) {
    throw new Error('[fluixi/oauth2] createTokenVerifier needs an issuer to accept tokens from.');
  }
  // Discovery needs one URL. The rest are alternate spellings the same provider uses.
  const discoveryIssuer = issuers[0];
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
      const endpoints = await discover(discoveryIssuer);
      uri = endpoints.jwks;
    }
    if (!uri) {
      throw new OAuthError(
        `${discoveryIssuer} published no jwks_uri. Give the verifier one directly.`,
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
        // jose takes a list and accepts any of them, which is what a provider naming
        // itself two ways needs.
        issuer: issuers,
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
      // `azp` is the OIDC claim; `client_id` is what some providers put on an access
      // token instead, Cognito among them, and reading only `azp` rejected all of them.
      const issuedTo = (payload.azp ?? payload.client_id) as string | undefined;
      if (typeof issuedTo !== 'string' || !allowed.includes(issuedTo)) {
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
  verifier.bearerOf = bearerOf;

  verifier.fromRequest = async (request: Request): Promise<TokenClaims> => {
    const token = verifier.bearerOf(request);
    if (!token) {
      throw new TokenError('The request carried no bearer token.', 'no_token');
    }
    return verify(token);
  };

  return verifier;
}

// ─── Introspection (RFC 7662) ─────────────────────────────────────────────────

/**
 * For a token this service cannot read on its own.
 *
 * A provider may issue an opaque reference token rather than a JWT, and some are
 * configured that way on purpose: the token carries nothing, so it leaks nothing, and the
 * provider stays the only thing that knows what it means. Verifying one locally is not
 * possible, so the service asks instead.
 *
 * The exchange is worth understanding before choosing it. Introspection is a network call
 * on the path of every request, and it reaches the provider rather than a cached key. What
 * you get for that is the property a signature cannot give: a revoked token stops working
 * at once, because `active` is answered live.
 */
export interface IntrospectorOptions {
  /**
   * The issuer, used to find the endpoint and checked against the response.
   *
   * A list covers a provider that names itself more than one way. Discovery uses the
   * first.
   */
  issuer: string | string[];
  /**
   * This service's own credentials at the provider.
   *
   * The introspection endpoint is authenticated, and that is not incidental: an open one
   * would let anyone test whether a stolen token is live. A service without credentials
   * cannot use it.
   */
  clientId: string;
  /** Not needed with `private_key_jwt`. */
  clientSecret?: string;
  /** The endpoint, when discovery should not be used to find it. */
  introspectionEndpoint?: string;
  /** Checked against `aud` when the response carries one. `false` to skip. */
  audience?: string | string[] | false;
  /** Checked against `client_id` on the response, for a token issued to one client. */
  authorizedParty?: string | string[];
  /**
   * How long an `active` answer may be reused, in milliseconds. Default 0, meaning never.
   *
   * Caching trades away the reason to introspect. A revoked token keeps working until the
   * entry expires, so a value here should be small and deliberate. The default asks every
   * time.
   */
  cacheMs?: number;
  /**
   * How this service proves who it is to the introspection endpoint.
   *
   * `private_key_jwt` signs a short-lived assertion instead of sending a secret, which
   * some providers require. It needs `privateKey`.
   */
  clientAuthMethod?: ClientAuthMethodInput;
  /** The signing key for `private_key_jwt`, as a JWK. */
  privateKey?: Record<string, unknown>;
  /** The `kid` to name in the assertion, when the provider holds several keys. */
  keyId?: string;
  /** Signing algorithm for the assertion. Default `RS256`. */
  assertionAlgorithm?: string;
  /** Extra checks once the token is active. */
  require?: (claims: TokenClaims) => boolean | string;
}

/** What RFC 7662 defines, plus whatever else the provider chose to include. */
interface IntrospectionResponse extends TokenClaims {
  active?: boolean;
  client_id?: string;
  token_type?: string;
  username?: string;
}

export function createTokenIntrospector(options: IntrospectorOptions): TokenVerifier {
  const issuers = (Array.isArray(options.issuer) ? options.issuer : [options.issuer]).filter(Boolean);
  if (!issuers.length) {
    throw new Error('[fluixi/oauth2] createTokenIntrospector needs an issuer.');
  }
  const discoveryIssuer = issuers[0];
  const auth: ClientAuth = {
    clientId: options.clientId,
    method: options.clientAuthMethod,
    clientSecret: options.clientSecret,
    privateKey: options.privateKey,
    keyId: options.keyId,
    assertionAlgorithm: options.assertionAlgorithm,
  };
  // The introspection endpoint is authenticated, and an open one would let anyone test a
  // stolen token, so a client with nothing to prove is refused rather than tried.
  if (resolveMethod(auth) === 'none') {
    throw new Error(
      '[fluixi/oauth2] createTokenIntrospector needs credentials: a secret, or private_key_jwt with a key.',
    );
  }
  assertUsable(auth, 'createTokenIntrospector');
  if (options.audience === undefined) {
    throw new Error(
      '[fluixi/oauth2] createTokenIntrospector needs an audience, or `audience: false` to say this service accepts a token minted for any client of the issuer.',
    );
  }

  const ttl = options.cacheMs ?? 0;
  /** Only positive answers, and only while `cacheMs` says so. */
  const cache = new Map<string, { claims: TokenClaims; until: number }>();

  let endpoint: string | null = options.introspectionEndpoint ?? null;
  async function resolveEndpoint(): Promise<string> {
    if (endpoint) return endpoint;
    const endpoints = await discover(discoveryIssuer);
    if (!endpoints.introspection) {
      throw new OAuthError(
        `${discoveryIssuer} published no introspection_endpoint. Give the introspector one directly, or verify JWTs with createTokenVerifier.`,
        'no_introspection',
      );
    }
    endpoint = endpoints.introspection;
    return endpoint;
  }

  const introspect = async (token: string): Promise<TokenClaims> => {
    if (!token) throw new TokenError('No token to verify.', 'no_token');

    const cached = cache.get(token);
    if (cached && cached.until > Date.now()) return cached.claims;

    const url = await resolveEndpoint();
    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    };
    // `token_type_hint` lets the provider look in the right table first. It is a hint and
    // a provider is free to ignore it.
    const form = new URLSearchParams({ token, token_type_hint: 'access_token' });

    await applyClientAuth(auth, url, headers, form);

    const response = await fetch(url, { method: 'POST', headers, body: form.toString() });
    if (!response.ok) {
      // A provider that refuses the service's own credentials is a configuration problem
      // here, not a bad token, and saying so saves a long hunt.
      throw new OAuthError(
        `The introspection endpoint refused this service: ${response.status}. Check clientId and clientSecret.`,
        'introspection_failed',
      );
    }

    const body = (await response.json()) as IntrospectionResponse;

    // The one normative answer: anything but `active: true` means no.
    //
    // A provider says only that much, so a genuine refusal and a misconfiguration look
    // identical here. The hint names the usual cause: several providers, Keycloak among
    // them, refuse to introspect a token whose audience does not include the asking
    // client, and answer `active: false` rather than explaining.
    if (body.active !== true) {
      throw new TokenError(
        'The provider reports this token is not active. If it was just issued, check that this client is in the token audience: some providers refuse to introspect a token minted for someone else and say only this.',
        'inactive_token',
      );
    }

    // The response carries these only sometimes, so they are checked when present rather
    // than required. A provider that omits `iss` has already told us the token is live at
    // the issuer we asked.
    if (typeof body.iss === 'string' && !issuers.includes(body.iss)) {
      throw new TokenError('The token was issued by a different issuer.', 'invalid_issuer');
    }

    if (options.audience !== false && body.aud !== undefined) {
      const wanted = Array.isArray(options.audience) ? options.audience : [options.audience];
      const got = Array.isArray(body.aud) ? body.aud : [body.aud];
      if (!got.some((a) => wanted.includes(a as string))) {
        throw new TokenError('The token was minted for a different audience.', 'invalid_audience');
      }
    }

    if (options.authorizedParty !== undefined) {
      const allowed = Array.isArray(options.authorizedParty)
        ? options.authorizedParty
        : [options.authorizedParty];
      // `client_id` is what RFC 7662 names; `azp` is what an OIDC provider may add.
      const issuedTo = (body.client_id ?? body.azp) as string | undefined;
      if (!issuedTo || !allowed.includes(issuedTo)) {
        throw new TokenError('The token was issued to a different client.', 'invalid_azp');
      }
    }

    if (options.require) {
      const verdict = options.require(body);
      if (verdict !== true) {
        throw new TokenError(
          typeof verdict === 'string' ? verdict : "The token did not meet this service's requirements.",
          'insufficient_claims',
        );
      }
    }

    if (ttl > 0) {
      // Bounded, and never a refusal: caching one would keep a reinstated token out.
      if (cache.size > 500) {
        const now = Date.now();
        for (const [key, entry] of cache) if (entry.until <= now) cache.delete(key);
        if (cache.size > 500) cache.delete(cache.keys().next().value as string);
      }
      cache.set(token, { claims: body, until: Date.now() + ttl });
    }

    return body;
  };

  const verifier = introspect as TokenVerifier;
  verifier.bearerOf = bearerOf;
  verifier.fromRequest = async (request: Request): Promise<TokenClaims> => {
    const token = bearerOf(request);
    if (!token) throw new TokenError('The request carried no bearer token.', 'no_token');
    return introspect(token);
  };
  return verifier;
}
