/**
 * PKCE, and the random values the flow needs.
 *
 * A browser client cannot keep a secret, so the authorization code alone is not enough
 * to prove the request came from the app that started it. PKCE closes that: the client
 * invents a `code_verifier`, sends only its hash on the way out, and presents the
 * original when exchanging the code. An attacker who intercepts the code has neither.
 *
 * `state` is the other half, and a different problem: it proves the callback belongs to
 * a flow this client started, which is what stops a forged callback.
 *
 * Everything here goes through the Web Crypto API, which every browser with custom
 * elements has, and which Node has had since 18.
 */

/** URL-safe base64 with the padding removed, as the spec requires. */
function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Cryptographically random, never `Math.random`. */
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** A `code_verifier`: 43 to 128 characters from the unreserved set. */
export function createVerifier(): string {
  return base64url(randomBytes(32));
}

/** A `state` or `nonce`. Same shape, different job. */
export function createStateValue(): string {
  return base64url(randomBytes(16));
}

/**
 * The `code_challenge` for a verifier, as S256.
 *
 * The `plain` method is in the spec and is worth nothing: it sends the verifier itself.
 * This package does not offer it.
 */
export async function createChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/** A verifier with its challenge, which is how a caller always wants them. */
export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = createVerifier();
  return { verifier, challenge: await createChallenge(verifier) };
}

/**
 * Compare two `state` values without leaking where they differ.
 *
 * The timing of a `===` on strings depends on the first differing character. That is a
 * weak signal here, since state is single-use and short-lived, but comparing it properly
 * costs nothing.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Epoch milliseconds from an `expires_in` in seconds. */
export function expiryFrom(expiresIn: unknown, now = Date.now()): number | undefined {
  const seconds = typeof expiresIn === 'number' ? expiresIn : Number(expiresIn);
  return Number.isFinite(seconds) && seconds > 0 ? now + seconds * 1000 : undefined;
}

/**
 * A JWT's payload, without verifying the signature.
 *
 * Legitimate for a token this client fetched itself: the code exchange is a direct TLS
 * call to the token endpoint, so the response is authentic by transport, which is what
 * OIDC allows a confidential exchange to rely on. Never use this on a token that arrived
 * from somewhere else.
 */
export function claimsOf(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
  } catch {
    return null;
  }
}

/**
 * The `exp` of a JWT, in epoch milliseconds.
 *
 * Reads the payload without verifying the signature, which is correct for this use: the
 * client is deciding when to refresh, not whether to trust the token. The server that
 * receives it verifies it properly.
 */
export function expiryFromJwt(token: string): number | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    // An opaque access token is not a JWT and has no `exp` to read. The caller falls
    // back to `expires_in`.
    return null;
  }
}
