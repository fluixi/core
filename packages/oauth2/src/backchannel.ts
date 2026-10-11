/**
 * OpenID Connect Back-Channel Logout, the app's half: the provider posts a logout token when a
 * session this app took part in ends, and the app ends its own session for it.
 *
 * Logouts are kept in a `LogoutStore`. The default holds them in this process's memory, which
 * is right for one instance; several instances behind a balancer each need to hear of every
 * logout, so they share a store (Redis, a table) passed as `logouts`.
 */
import { createTokenVerifier, type TokenClaims, type TokenVerifier } from './verify.js';

export const LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

/** A logout the provider announced: a session (`sid`), or every session of `sub` begun before `at`. */
export interface LogoutEntry {
  sid?: string;
  sub?: string;
  /** When the provider said so, in milliseconds. */
  at: number;
}

export interface LogoutStore {
  add(entry: LogoutEntry): void | Promise<void>;
  /** Whether a session (its `sid`, its `sub`, and when it signed in) has been logged out since. */
  ended(session: { sid?: string; sub?: string; since: number }): boolean | Promise<boolean>;
}

/** Logouts in memory, forgotten after `ttlMs` (a session that old has expired anyway). */
export function memoryLogouts(ttlMs = 14 * 24 * 3600_000): LogoutStore {
  const sids = new Map<string, number>();
  const subs = new Map<string, number>();
  const prune = (now: number) => {
    for (const map of [sids, subs]) for (const [key, at] of map) if (now - at > ttlMs) map.delete(key);
  };
  return {
    add(entry) {
      prune(Date.now());
      if (entry.sid) sids.set(entry.sid, entry.at);
      else if (entry.sub) subs.set(entry.sub, Math.max(entry.at, subs.get(entry.sub) ?? 0));
    },
    ended(session) {
      if (session.sid && sids.has(session.sid)) return true;
      const all = session.sub ? subs.get(session.sub) : undefined;
      return all !== undefined && session.since <= all;
    },
  };
}

/** The claims of an ID token, unverified: it came from the token endpoint and sits in a sealed cookie. */
export function idTokenClaims(idToken: string | undefined): { sid?: string; sub?: string; iat?: number } {
  if (!idToken) return {};
  try {
    const part = idToken.split('.')[1] ?? '';
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    const claims = JSON.parse(json) as Record<string, unknown>;
    return {
      sid: typeof claims.sid === 'string' ? claims.sid : undefined,
      sub: typeof claims.sub === 'string' ? claims.sub : undefined,
      iat: typeof claims.iat === 'number' ? claims.iat : undefined,
    };
  } catch {
    return {};
  }
}

function headerOf(token: string): Record<string, unknown> {
  try {
    const part = token.split('.')[0] ?? '';
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='))) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

/**
 * Checks a logout token as the specification asks: signature, issuer, audience and age like
 * any token, then the logout event, a `sid` or a `sub`, and no `nonce` (which only an ID token
 * carries, so a token with one is an ID token being passed off as a logout).
 */
export function logoutTokenVerifier(options: { issuer: string; clientId: string; jwksUri?: string; jwks?: { keys: unknown[] } }) {
  const verify: TokenVerifier = createTokenVerifier({
    issuer: options.issuer,
    audience: options.clientId,
    jwksUri: options.jwksUri,
    jwks: options.jwks,
    require: (claims: TokenClaims) => {
      const events = claims.events as Record<string, unknown> | undefined;
      if (!events || typeof events !== 'object' || !(LOGOUT_EVENT in events)) return 'no logout event';
      if ('nonce' in claims) return 'a logout token has no nonce';
      if (typeof claims.sid !== 'string' && typeof claims.sub !== 'string') return 'names no session and no subject';
      return true;
    },
  });
  return async (token: string): Promise<LogoutEntry> => {
    const typ = headerOf(token).typ;
    if (typ !== undefined && typ !== 'logout+jwt') throw new Error('not a logout token');
    const claims = await verify(token);
    return {
      sid: typeof claims.sid === 'string' ? claims.sid : undefined,
      sub: typeof claims.sub === 'string' ? claims.sub : undefined,
      at: (typeof claims.iat === 'number' ? claims.iat : Math.floor(Date.now() / 1000)) * 1000,
    };
  };
}
