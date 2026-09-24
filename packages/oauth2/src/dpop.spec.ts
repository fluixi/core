/**
 * DPoP, both halves, with real keys and real signatures.
 *
 * What the tests have to establish is that a proof is worth something: that it is bound to
 * the token, the method, the URL and a moment, and that a proof signed with any other key
 * is refused. A verifier that accepts a self-signed proof has added a step and no
 * protection.
 */
import { describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT, calculateJwkThumbprint, importJWK } from 'jose';
import { boundKeyOf, createDpopKey, proofFor, thumbprintOf } from './dpop.js';
import { createTokenVerifier } from './verify.js';

const ISSUER = 'https://idp.test';
const RESOURCE = 'https://api.test/orders';

/** A signing key pair for the provider, plus the JWKS a verifier reads. */
async function provider() {
  const pair = await generateKeyPair('RS256', { extractable: true });
  const jwk = { ...(await exportJWK(pair.publicKey)), alg: 'RS256', use: 'sig', kid: 'k1' };
  return { pair, jwks: { keys: [jwk] } };
}

/** An access token bound to `thumbprint`, or unbound when none is given. */
async function accessToken(
  key: CryptoKey | Uint8Array,
  thumbprint?: string,
): Promise<string> {
  // A `jti` so two tokens minted in the same second differ. Without it they are byte
  // identical and a proof for one legitimately matches the other.
  const claims: Record<string, unknown> = { scope: 'orders:read', jti: crypto.randomUUID() };
  if (thumbprint) claims.cnf = { jkt: thumbprint };
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(ISSUER)
    .setSubject('u1')
    .setAudience('orders-api')
    .setExpirationTime('5m')
    .sign(key as never);
}

const requestWith = (token: string, proof: string, url = RESOURCE, method = 'GET') =>
  new Request(url, {
    method,
    headers: { authorization: `DPoP ${token}`, dpop: proof },
  });

describe('a key a client holds', () => {
  it('carries the thumbprint a provider would bind a token to', async () => {
    const key = await createDpopKey();
    expect(key.thumbprint).toBe(await thumbprintOf(key.publicJwk));
    expect(key.alg).toBe('ES256');
  });

  it('exports only its public half', async () => {
    const key = await createDpopKey();
    // No `d`: the private component never appears in what a proof carries.
    expect(key.publicJwk.d).toBeUndefined();
    expect(key.publicJwk.crv).toBe('P-256');
  });
});

describe('a proof', () => {
  it('names the method and the URL it was made for', async () => {
    const key = await createDpopKey();
    const proof = await proofFor(key, { method: 'post', url: `${RESOURCE}?page=2#top` });
    const claims = JSON.parse(Buffer.from(proof.split('.')[1], 'base64url').toString());

    expect(claims.htm).toBe('POST');
    // Query and fragment stripped, so the same proof is not tied to one set of parameters.
    expect(claims.htu).toBe(RESOURCE);
  });

  it('is fresh each time, so one cannot be reused', async () => {
    const key = await createDpopKey();
    const read = async () =>
      JSON.parse(
        Buffer.from((await proofFor(key, { method: 'GET', url: RESOURCE })).split('.')[1], 'base64url').toString(),
      ).jti;
    expect(await read()).not.toBe(await read());
  });

  it('hashes the token it accompanies rather than carrying it', async () => {
    const key = await createDpopKey();
    const proof = await proofFor(key, { method: 'GET', url: RESOURCE, accessToken: 'the-token' });
    const claims = JSON.parse(Buffer.from(proof.split('.')[1], 'base64url').toString());

    expect(claims.ath).toBeTruthy();
    expect(proof).not.toContain('the-token');
  });

  it('carries its own public key, which is what a verifier checks against the token', async () => {
    const key = await createDpopKey();
    const proof = await proofFor(key, { method: 'GET', url: RESOURCE });
    const header = JSON.parse(Buffer.from(proof.split('.')[0], 'base64url').toString());

    expect(header.typ).toBe('dpop+jwt');
    expect(await calculateJwkThumbprint(header.jwk, 'sha256')).toBe(key.thumbprint);
  });
});

describe('what a verifier requiring binding accepts', () => {
  it('a bound token with a matching proof', async () => {
    const { pair, jwks } = await provider();
    const key = await createDpopKey();
    const token = await accessToken(pair.privateKey, key.thumbprint);
    const proof = await proofFor(key, { method: 'GET', url: RESOURCE, accessToken: token });

    const verify = createTokenVerifier({
      issuer: ISSUER,
      audience: 'orders-api',
      jwks,
      dpop: true,
    });
    expect((await verify.fromRequest(requestWith(token, proof))).sub).toBe('u1');
  });

  it('a Bearer scheme is still read, so a misconfigured client gets a real reason', async () => {
    const { pair, jwks } = await provider();
    const key = await createDpopKey();
    const token = await accessToken(pair.privateKey, key.thumbprint);
    const proof = await proofFor(key, { method: 'GET', url: RESOURCE, accessToken: token });

    const verify = createTokenVerifier({ issuer: ISSUER, audience: 'orders-api', jwks, dpop: true });
    const request = new Request(RESOURCE, {
      headers: { authorization: `Bearer ${token}`, dpop: proof },
    });
    // The token is found rather than the request being read as unauthenticated.
    await expect(verify.fromRequest(request)).resolves.toBeTruthy();
  });
});

describe('what it refuses', () => {
  it('a proof signed with a key the token is not bound to', async () => {
    const { pair, jwks } = await provider();
    const bound = await createDpopKey();
    const attacker = await createDpopKey();
    const token = await accessToken(pair.privateKey, bound.thumbprint);
    // Well formed, verifies against its own embedded key, and is the wrong key.
    const proof = await proofFor(attacker, { method: 'GET', url: RESOURCE, accessToken: token });

    const verify = createTokenVerifier({ issuer: ISSUER, audience: 'orders-api', jwks, dpop: true });
    await expect(verify.fromRequest(requestWith(token, proof))).rejects.toThrow(
      /different key from the one this token is bound to/,
    );
  });

  it('an unbound token, when binding is required', async () => {
    const { pair, jwks } = await provider();
    const key = await createDpopKey();
    const token = await accessToken(pair.privateKey);
    const proof = await proofFor(key, { method: 'GET', url: RESOURCE, accessToken: token });

    const verify = createTokenVerifier({ issuer: ISSUER, audience: 'orders-api', jwks, dpop: true });
    await expect(verify.fromRequest(requestWith(token, proof))).rejects.toThrow(/not bound to a key/);
  });

  it('a request with no proof at all', async () => {
    const { pair, jwks } = await provider();
    const key = await createDpopKey();
    const token = await accessToken(pair.privateKey, key.thumbprint);

    const verify = createTokenVerifier({ issuer: ISSUER, audience: 'orders-api', jwks, dpop: true });
    const request = new Request(RESOURCE, { headers: { authorization: `DPoP ${token}` } });
    await expect(verify.fromRequest(request)).rejects.toThrow(/no DPoP proof/);
  });

  it('a proof made for a different URL', async () => {
    const { pair, jwks } = await provider();
    const key = await createDpopKey();
    const token = await accessToken(pair.privateKey, key.thumbprint);
    const proof = await proofFor(key, {
      method: 'GET',
      url: 'https://api.test/somewhere-else',
      accessToken: token,
    });

    const verify = createTokenVerifier({ issuer: ISSUER, audience: 'orders-api', jwks, dpop: true });
    await expect(verify.fromRequest(requestWith(token, proof))).rejects.toThrow(/different URL/);
  });

  it('a proof made for a different method', async () => {
    const { pair, jwks } = await provider();
    const key = await createDpopKey();
    const token = await accessToken(pair.privateKey, key.thumbprint);
    const proof = await proofFor(key, { method: 'DELETE', url: RESOURCE, accessToken: token });

    const verify = createTokenVerifier({ issuer: ISSUER, audience: 'orders-api', jwks, dpop: true });
    await expect(verify.fromRequest(requestWith(token, proof))).rejects.toThrow(/different method/);
  });

  it('a proof made for a different token', async () => {
    const { pair, jwks } = await provider();
    const key = await createDpopKey();
    const token = await accessToken(pair.privateKey, key.thumbprint);
    const other = await accessToken(pair.privateKey, key.thumbprint);
    // Same key, same request, bound to the other token.
    const proof = await proofFor(key, { method: 'GET', url: RESOURCE, accessToken: other });

    const verify = createTokenVerifier({ issuer: ISSUER, audience: 'orders-api', jwks, dpop: true });
    await expect(verify.fromRequest(requestWith(token, proof))).rejects.toThrow(/different token/);
  });

  it('a stale proof', async () => {
    const { pair, jwks } = await provider();
    const key = await createDpopKey();
    const token = await accessToken(pair.privateKey, key.thumbprint);

    // Signed by hand with an old `iat`, which is what a captured proof looks like later.
    const proof = await new SignJWT({
      htm: 'GET',
      htu: RESOURCE,
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000) - 3600,
    })
      .setProtectedHeader({ typ: 'dpop+jwt', alg: key.alg, jwk: key.publicJwk as never })
      .sign(key.privateKey as never);

    const verify = createTokenVerifier({ issuer: ISSUER, audience: 'orders-api', jwks, dpop: true });
    await expect(verify.fromRequest(requestWith(token, proof))).rejects.toThrow(/too old/);
  });

  it('a proof whose signature does not match its own embedded key', async () => {
    const { pair, jwks } = await provider();
    const key = await createDpopKey();
    const token = await accessToken(pair.privateKey, key.thumbprint);
    const proof = await proofFor(key, { method: 'GET', url: RESOURCE, accessToken: token });
    const [h, p] = proof.split('.');

    const verify = createTokenVerifier({ issuer: ISSUER, audience: 'orders-api', jwks, dpop: true });
    await expect(verify.fromRequest(requestWith(token, `${h}.${p}.AAAA`))).rejects.toThrow(
      /did not verify/,
    );
  });
});

describe('verifying a bare token with binding required', () => {
  it('says the request is needed rather than skipping the check', async () => {
    const { pair, jwks } = await provider();
    const key = await createDpopKey();
    const token = await accessToken(pair.privateKey, key.thumbprint);

    const verify = createTokenVerifier({ issuer: ISSUER, audience: 'orders-api', jwks, dpop: true });
    // Silently accepting here would leave a service believing it checks binding.
    await expect(verify(token)).rejects.toThrow(/needs the request/);
  });
});

describe('a token that is bound', () => {
  it('names its key in cnf.jkt', async () => {
    const key = await createDpopKey();
    expect(boundKeyOf({ cnf: { jkt: key.thumbprint } })).toBe(key.thumbprint);
    expect(boundKeyOf({})).toBeNull();
    expect(boundKeyOf({ cnf: {} })).toBeNull();
  });
});
