/**
 * Reading a token in order to show it, which is not the same as trusting it.
 *
 * Everything here decodes without verifying, so a token this application would refuse is
 * still displayed. Nothing here decides anything: verification belongs at the service
 * receiving the token, through `@fluixi/oauth2/verify`.
 */

export interface Inspected {
  /** `jwt` when it has three parts and a readable payload, `opaque` otherwise. */
  kind: 'jwt' | 'opaque';
  /** The header, for `alg` and `kid`. */
  header?: Record<string, unknown>;
  claims?: Record<string, unknown>;
  /** Epoch milliseconds, from `exp`. */
  expiresAt?: number;
  /** How long the token was minted for, in seconds. */
  lifetimeSec?: number;
  /** Length in characters, which is most of what an opaque token can tell you. */
  length: number;
}

function decodeSegment(segment: string): Record<string, unknown> | undefined {
  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
    const parsed = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function inspect(token: string | null | undefined): Inspected | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return { kind: 'opaque', length: token.length };

  const header = decodeSegment(parts[0]);
  const claims = decodeSegment(parts[1]);
  // Three dot-separated parts that do not decode is not a JWT, whatever it looks like.
  if (!claims) return { kind: 'opaque', length: token.length };

  const exp = typeof claims.exp === 'number' ? claims.exp * 1000 : undefined;
  const iat = typeof claims.iat === 'number' ? claims.iat * 1000 : undefined;

  return {
    kind: 'jwt',
    header,
    claims,
    expiresAt: exp,
    lifetimeSec: exp && iat ? Math.round((exp - iat) / 1000) : undefined,
    length: token.length,
  };
}

/** Claims worth pulling out, because they are the ones that differ between providers. */
export const NOTABLE = [
  'iss',
  'sub',
  'aud',
  'azp',
  'client_id',
  'exp',
  'iat',
  'scope',
  'typ',
  'email',
  'preferred_username',
  'name',
] as const;

/** `in 4m 12s`, or `expired 30s ago`. */
export function relativeTo(at: number | undefined, now = Date.now()): string {
  if (at === undefined) return 'no expiry claim';

  const seconds = Math.round((at - now) / 1000);
  const magnitude = Math.abs(seconds);
  const spelled =
    magnitude >= 60 ? `${Math.floor(magnitude / 60)}m ${magnitude % 60}s` : `${magnitude}s`;
  return seconds >= 0 ? `in ${spelled}` : `expired ${spelled} ago`;
}

/** A middle-elided token, so a long one stays readable while staying copyable in full. */
export function abbreviate(token: string, keep = 14): string {
  return token.length <= keep * 2 + 3
    ? token
    : `${token.slice(0, keep)}…${token.slice(-keep)}`;
}

/**
 * What a provider's discovery document says it can do.
 *
 * Fetched rather than assumed, so a button is offered only where the endpoint behind it
 * exists.
 */
export interface Capabilities {
  issuer?: string;
  authorization?: string;
  token?: string;
  userinfo?: string;
  jwks?: string;
  introspection?: string;
  revocation?: string;
  endSession?: string;
  pkceMethods: string[];
  grants: string[];
  clientAuthMethods: string[];
}

export async function capabilitiesOf(issuer: string): Promise<Capabilities> {
  const response = await fetch(`${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`);
  if (!response.ok) throw new Error(`discovery failed: HTTP ${response.status}`);

  const doc = (await response.json()) as Record<string, unknown>;
  const str = (k: string) => (typeof doc[k] === 'string' ? (doc[k] as string) : undefined);
  const list = (k: string) => (Array.isArray(doc[k]) ? (doc[k] as string[]) : []);

  return {
    issuer: str('issuer'),
    authorization: str('authorization_endpoint'),
    token: str('token_endpoint'),
    userinfo: str('userinfo_endpoint'),
    jwks: str('jwks_uri'),
    introspection: str('introspection_endpoint'),
    revocation: str('revocation_endpoint'),
    endSession: str('end_session_endpoint'),
    pkceMethods: list('code_challenge_methods_supported'),
    grants: list('grant_types_supported'),
    clientAuthMethods: list('token_endpoint_auth_methods_supported'),
  };
}
