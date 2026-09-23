/**
 * `client_credentials`: a token for the service itself, with no user involved.
 *
 * The other flows in this package answer "who is using this app". This answers "which
 * service is calling", which is the other half of most systems: a background job reading
 * an API, one service talking to another, a webhook handler that needs to write back.
 *
 * Server side only, and not negotiably so. The grant is the client secret, so anything
 * holding it can mint tokens as this service. A browser cannot keep one.
 *
 * ```ts
 * const orders = createServiceClient({
 *   issuer: process.env.OIDC_ISSUER!,
 *   clientId: 'reports-job',
 *   clientSecret: process.env.REPORTS_SECRET!,
 *   scopes: ['orders:read'],
 * });
 *
 * const response = await fetch('https://api.example.com/orders', {
 *   headers: { authorization: `Bearer ${await orders.token()}` },
 * });
 * ```
 */
import { discover } from './discovery.js';
import { expiryFrom } from './pkce.js';
import { OAuthError, type Endpoints } from './types.js';

export interface ServiceClientOptions {
  /** The issuer, for discovery. Give `tokenEndpoint` instead to skip the request. */
  issuer?: string;
  tokenEndpoint?: string;
  clientId: string;
  /** Not needed with `private_key_jwt`. */
  clientSecret?: string;
  /** What the service is asking to do. Provider-specific. */
  scopes?: string[];
  /**
   * Some providers want the API being called named here rather than in a scope. Auth0
   * issues an opaque token instead of a JWT without it.
   */
  audience?: string;
  /**
   * How this service proves who it is.
   *
   * `basic` puts the secret in an Authorization header, `body` in the form. `private_key_jwt`
   * sends a short-lived assertion signed with a key the provider knows the public half of,
   * and no secret travels at all.
   *
   * Not merely a preference everywhere. Okta's org authorization server refuses client
   * credentials with anything but `private_key_jwt`, and FAPI requires it.
   */
  clientAuthMethod?: 'basic' | 'body' | 'private_key_jwt';
  /**
   * The signing key for `private_key_jwt`, as a JWK.
   *
   * The provider holds the public half. Nothing derived from it leaves this process
   * except a signature, which is the point: there is no shared secret to leak.
   */
  privateKey?: Record<string, unknown>;
  /**
   * The `kid` to name in the assertion header.
   *
   * Needed when the provider holds more than one key for this client, so it knows which
   * to verify against. Taken from the key itself when the key carries one.
   */
  keyId?: string;
  /** Signing algorithm for the assertion. Default `RS256`. */
  assertionAlgorithm?: string;
  /** Extra parameters on the token request, for anything a provider adds. */
  extraParams?: Record<string, string>;
  /**
   * Fetch a new token this many milliseconds before the current one expires.
   *
   * Default 30 seconds. A token that expires in flight fails a request that was fine
   * when it started, which is the failure this exists to avoid.
   */
  refreshSkewMs?: number;
}

export interface ServiceClient {
  /** A valid access token, from cache when one is still good. */
  token(): Promise<string>;
  /** Everything the token endpoint returned, for a caller that needs the scope or expiry. */
  current(): Promise<{ accessToken: string; expiresAt?: number; scope?: string }>;
  /** Drop the cached token, so the next call fetches a new one. */
  reset(): void;
}

export function createServiceClient(options: ServiceClientOptions): ServiceClient {
  const usesKey = options.clientAuthMethod === 'private_key_jwt';

  if (!options.clientId) {
    throw new Error('[fluixi/oauth2] createServiceClient needs a clientId.');
  }
  if (usesKey && !options.privateKey) {
    throw new Error(
      '[fluixi/oauth2] private_key_jwt needs `privateKey`, the JWK whose public half the provider holds.',
    );
  }
  if (!usesKey && !options.clientSecret) {
    throw new Error(
      '[fluixi/oauth2] createServiceClient needs a clientSecret, or `clientAuthMethod: "private_key_jwt"` with a key. Either way this grant belongs on a server and never in a browser.',
    );
  }
  if (!options.issuer && !options.tokenEndpoint) {
    throw new Error('[fluixi/oauth2] createServiceClient needs an issuer or a tokenEndpoint.');
  }

  const skew = options.refreshSkewMs ?? 30_000;

  /** What the token endpoint gave back, normalised. */
  type Granted = { accessToken: string; expiresAt?: number; scope?: string };

  let cached: Granted | null = null;
  /**
   * The request in flight, if any.
   *
   * Without it, a burst of calls on a cold cache each start their own token request, and
   * a provider that rate-limits the token endpoint sees them all at once.
   */
  let pending: Promise<Granted> | null = null;
  let endpoint: string | null = options.tokenEndpoint ?? null;

  async function resolveEndpoint(): Promise<string> {
    if (endpoint) return endpoint;
    const endpoints: Endpoints = await discover(options.issuer!);
    endpoint = endpoints.token;
    return endpoint;
  }

  /**
   * A client assertion, per RFC 7523.
   *
   * Short lived and single use: `aud` is the token endpoint so it cannot be replayed
   * elsewhere, `jti` so it cannot be replayed there, and a minute of life so a captured
   * one is worth almost nothing.
   */
  async function signAssertion(tokenEndpoint: string): Promise<string> {
    let jose: typeof import('jose');
    try {
      jose = await import('jose');
    } catch {
      throw new OAuthError(
        'private_key_jwt needs `jose`. Install it: npm i jose. It is an optional peer so a service using a client secret does not carry it.',
        'jose_missing',
      );
    }

    const alg = options.assertionAlgorithm ?? 'RS256';
    const key = await jose.importJWK(options.privateKey as never, alg);
    const kid = options.keyId ?? (options.privateKey!.kid as string | undefined);

    return new jose.SignJWT({})
      .setProtectedHeader(kid ? { alg, kid } : { alg })
      .setIssuer(options.clientId)
      .setSubject(options.clientId)
      .setAudience(tokenEndpoint)
      .setJti(crypto.randomUUID())
      .setIssuedAt()
      .setExpirationTime('1m')
      .sign(key);
  }

  const stillGood = (): boolean =>
    cached !== null && (cached.expiresAt === undefined || cached.expiresAt - skew > Date.now());

  async function request(): Promise<Granted> {
    const url = await resolveEndpoint();
    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    };
    const form = new URLSearchParams({ grant_type: 'client_credentials', ...options.extraParams });
    if (options.scopes?.length) form.set('scope', options.scopes.join(' '));
    if (options.audience) form.set('audience', options.audience);

    if (usesKey) {
      form.set('client_id', options.clientId);
      form.set(
        'client_assertion_type',
        'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      );
      form.set('client_assertion', await signAssertion(url));
    } else if ((options.clientAuthMethod ?? 'basic') === 'basic') {
      const pair = `${encodeURIComponent(options.clientId)}:${encodeURIComponent(options.clientSecret!)}`;
      headers.authorization = `Basic ${btoa(pair)}`;
    } else {
      form.set('client_id', options.clientId);
      form.set('client_secret', options.clientSecret!);
    }

    const response = await fetch(url, { method: 'POST', headers, body: form.toString() });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw new OAuthError(
        `The token endpoint refused this service: ${String(payload.error ?? response.status)}`,
        String(payload.error ?? 'client_credentials_failed'),
        typeof payload.error_description === 'string' ? payload.error_description : undefined,
      );
    }

    const accessToken = String(payload.access_token ?? '');
    if (!accessToken) {
      throw new OAuthError('The token response carried no access_token.', 'no_access_token');
    }

    cached = {
      accessToken,
      expiresAt: expiryFrom(payload.expires_in),
      scope: typeof payload.scope === 'string' ? payload.scope : undefined,
    };
    return cached;
  }

  async function current(): Promise<Granted> {
    if (stillGood()) return cached!;
    // One request per cold cache, however many callers arrive at once.
    pending ??= request().finally(() => {
      pending = null;
    });
    return pending;
  }

  return {
    current,
    token: async () => (await current()).accessToken,
    reset: () => {
      cached = null;
    },
  };
}
