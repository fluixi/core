/**
 * Endpoints, from the issuer's own document.
 *
 * An OIDC provider publishes `/.well-known/openid-configuration`, so an app configures
 * one issuer URL rather than five endpoints that have to stay in step with it. Curity,
 * Keycloak, Auth0 and Okta all serve it.
 *
 * The result is cached per issuer for the life of the page. The document changes when
 * the provider is reconfigured, which is not something to re-check on every login.
 */
import type { Endpoints } from './types.js';
import { OAuthError } from './types.js';

const cache = new Map<string, Promise<Endpoints>>();

/** The document as the spec names its fields. */
interface OpenIdConfiguration {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  jwks_uri?: string;
  introspection_endpoint?: string;
  revocation_endpoint?: string;
}

/** `https://host/` and `https://host` both give `https://host/.well-known/...`. */
function documentUrl(issuer: string): string {
  return `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
}

export async function discover(issuer: string, fetcher: typeof fetch = fetch): Promise<Endpoints> {
  const cached = cache.get(issuer);
  if (cached) return cached;

  const pending = (async (): Promise<Endpoints> => {
    let response: Response;
    try {
      response = await fetcher(documentUrl(issuer));
    } catch (cause) {
      // In a browser a blocked cross-origin read throws before any status exists, and
      // `fetch` reports only "Failed to fetch". Not every provider allows a page to read
      // its discovery document: Keycloak does once an origin is configured, Dex and
      // Google do not. Naming the cause saves a long hunt for a network fault.
      throw new OAuthError(
        `Could not read the discovery document at ${documentUrl(issuer)}. In a browser this is usually the provider refusing a cross-origin read: give \`endpoints\` directly, or resolve them on a server. (${cause instanceof Error ? cause.message : String(cause)})`,
        'discovery_unreachable',
      );
    }

    if (!response.ok) {
      throw new OAuthError(
        `Discovery failed for ${issuer}: ${response.status}`,
        'discovery_failed',
      );
    }
    const doc = (await response.json()) as OpenIdConfiguration;
    if (!doc.authorization_endpoint || !doc.token_endpoint) {
      throw new OAuthError(
        `${issuer} published a discovery document with no authorization or token endpoint.`,
        'discovery_incomplete',
      );
    }
    return {
      authorization: doc.authorization_endpoint,
      token: doc.token_endpoint,
      userinfo: doc.userinfo_endpoint,
      endSession: doc.end_session_endpoint,
      jwks: doc.jwks_uri,
      introspection: doc.introspection_endpoint,
      revocation: doc.revocation_endpoint,
      issuer: doc.issuer ?? issuer,
    };
  })();

  // Cached before it resolves, so two logins starting at once make one request. Dropped
  // on failure, so a provider that was briefly down is retried rather than remembered
  // as broken.
  cache.set(issuer, pending);
  pending.catch(() => cache.delete(issuer));
  return pending;
}

/** For a test that needs a clean slate. */
export function clearDiscoveryCache(): void {
  cache.clear();
}
