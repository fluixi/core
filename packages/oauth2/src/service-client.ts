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
  clientSecret: string;
  /** What the service is asking to do. Provider-specific. */
  scopes?: string[];
  /**
   * Some providers want the API being called named here rather than in a scope. Auth0
   * issues an opaque token instead of a JWT without it.
   */
  audience?: string;
  /** `basic` sends the credentials in an Authorization header. Default `basic`. */
  clientAuthMethod?: 'basic' | 'body';
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
  if (!options.clientId || !options.clientSecret) {
    throw new Error(
      '[fluixi/oauth2] createServiceClient needs client credentials. This grant is the secret, so it belongs on a server and never in a browser.',
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

    if ((options.clientAuthMethod ?? 'basic') === 'basic') {
      const pair = `${encodeURIComponent(options.clientId)}:${encodeURIComponent(options.clientSecret)}`;
      headers.authorization = `Basic ${btoa(pair)}`;
    } else {
      form.set('client_id', options.clientId);
      form.set('client_secret', options.clientSecret);
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
