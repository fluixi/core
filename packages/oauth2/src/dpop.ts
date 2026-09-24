/**
 * DPoP, RFC 9449: a token bound to a key the client holds.
 *
 * A bearer token is a password. Whoever has it can use it, so a copy taken from storage,
 * a log or a proxy is as good as the original. DPoP changes that: the token carries the
 * thumbprint of a public key, the client signs a fresh proof for every request with the
 * private half, and a service checks that the proof matches the token. A stolen token is
 * then worth nothing without the key, which never leaves the client.
 *
 * Two halves, and one without the other is worse than neither. A client that sends proofs
 * to a service that does not check them has gained nothing while looking protected.
 * `createDpopKey` and `proofFor` are the client half; `thumbprintOf` and the verifier's
 * DPoP mode are the service half.
 *
 * The key is per client and never sent. Only its public half travels, inside each proof.
 */
import { OAuthError } from './types.js';

/** A key a client holds, with the parts a proof and a binding check need. */
export interface DpopKey {
  /** The private half, used to sign. Never leaves this process. */
  privateKey: CryptoKey;
  /** The public half, embedded in every proof so a service can verify it. */
  publicJwk: Record<string, unknown>;
  /**
   * The JWK thumbprint, RFC 7638.
   *
   * What a provider puts in a token's `cnf.jkt`, and therefore what a service compares a
   * proof's key against.
   */
  thumbprint: string;
  /** The signing algorithm, which a provider must list in `dpop_signing_alg_values_supported`. */
  alg: string;
}

/** `jose`, loaded only when a client actually uses DPoP. */
async function loadJose(): Promise<typeof import('jose')> {
  try {
    return await import('jose');
  } catch {
    throw new OAuthError(
      'DPoP needs `jose`. Install it: npm i jose. It is an optional peer, so a client not using DPoP does not carry it.',
      'jose_missing',
    );
  }
}

/**
 * A key for this client.
 *
 * `ES256` by default: the keys are small, signing is fast, and every provider advertising
 * DPoP support lists it. A proof is signed on every request, so the cost is paid often.
 *
 * `extractable: false` where the platform allows it, so the private half cannot be read
 * out of the process even by code running in it. That is most of the value on a page: an
 * attacker who can run script can use the key while they are there, and cannot take it
 * away to use later.
 */
export async function createDpopKey(alg = 'ES256'): Promise<DpopKey> {
  const jose = await loadJose();
  const { privateKey, publicKey } = await jose.generateKeyPair(alg, { extractable: false });

  const publicJwk = { ...(await jose.exportJWK(publicKey)) } as Record<string, unknown>;
  return {
    privateKey: privateKey as CryptoKey,
    publicJwk,
    thumbprint: await jose.calculateJwkThumbprint(publicJwk as never, 'sha256'),
    alg,
  };
}

/** The thumbprint of a public JWK, for comparing against a token's `cnf.jkt`. */
export async function thumbprintOf(jwk: Record<string, unknown>): Promise<string> {
  const jose = await loadJose();
  return jose.calculateJwkThumbprint(jwk as never, 'sha256');
}

export interface ProofOptions {
  /** The HTTP method, uppercased into `htm`. */
  method: string;
  /**
   * The URL, without query or fragment, into `htu`.
   *
   * Stripped because the spec says so and because a query string would make a proof
   * unusable for the same endpoint called with different parameters.
   */
  url: string;
  /**
   * The access token this proof accompanies, hashed into `ath`.
   *
   * Present when calling a resource with a token, absent on the token request itself,
   * where no token exists yet. It binds the proof to one token, so a proof captured
   * alongside one cannot be reused with another.
   */
  accessToken?: string;
  /** A nonce the provider demanded, into `nonce`. */
  nonce?: string;
}

/**
 * A proof for one request.
 *
 * Single use by construction: `jti` is fresh and `iat` is now, so a captured proof is
 * worth nothing beyond the few seconds a service allows for clock skew. `htm` and `htu`
 * bind it to one method and one endpoint, so it cannot be replayed elsewhere.
 */
export async function proofFor(key: DpopKey, options: ProofOptions): Promise<string> {
  const jose = await loadJose();

  // Query and fragment removed, per the spec.
  const htu = (() => {
    try {
      const url = new URL(options.url);
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch {
      return options.url;
    }
  })();

  const claims: Record<string, unknown> = {
    htm: options.method.toUpperCase(),
    htu,
    jti: crypto.randomUUID(),
  };

  if (options.accessToken) {
    // `ath`: the base64url SHA-256 of the token, not the token itself.
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(options.accessToken),
    );
    let binary = '';
    for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
    claims.ath = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  if (options.nonce) claims.nonce = options.nonce;

  return new jose.SignJWT(claims)
    .setProtectedHeader({ typ: 'dpop+jwt', alg: key.alg, jwk: key.publicJwk as never })
    .setIssuedAt()
    .sign(key.privateKey as never);
}

/** The nonce a provider asked for, from a response that refused the last proof. */
export function nonceFrom(response: Response): string | null {
  return response.headers.get('dpop-nonce');
}

/** Whether a refusal is a provider asking for a nonce rather than rejecting the proof. */
export function wantsNonce(error: unknown, response?: Response): boolean {
  const code = typeof error === 'string' ? error : (error as { error?: string })?.error;
  return code === 'use_dpop_nonce' || (!!response && !!nonceFrom(response));
}

/**
 * The key a token is bound to, from its `cnf.jkt` claim.
 *
 * Read without verifying the signature, because a service verifies the token separately
 * and this only says which key to expect. A token with no `cnf` is not bound to one, and a
 * service told to require binding should refuse it rather than accept it as unbound.
 */
export function boundKeyOf(claims: Record<string, unknown>): string | null {
  const cnf = claims.cnf as { jkt?: unknown } | undefined;
  return typeof cnf?.jkt === 'string' ? cnf.jkt : null;
}
