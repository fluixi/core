/**
 * Persisting a DPoP key, and the platform property that makes it safe.
 *
 * Node has no IndexedDB, so what runs here is the mechanism underneath it and the fallback
 * when it is absent. The round trip through a real store is proved in a browser, against a
 * provider that binds its refresh tokens.
 */
import { describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { keyFor, forgetKey } from './dpop-store.js';
import { proofFor } from './dpop.js';

describe('the property the design rests on', () => {
  /**
   * Storing a key in IndexedDB is a structured clone. If that turned a non-extractable key
   * into an extractable one, or into something unusable, persisting it would be either
   * pointless or a way of writing a private key where script can read it. Neither happens,
   * and this says so in a form that fails if a runtime ever changes its mind.
   */
  it('keeps a non-extractable key non-extractable, and able to sign', async () => {
    const pair = await webcrypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign', 'verify'],
    );

    const clone = structuredClone(pair.privateKey);
    expect(clone.extractable).toBe(false);

    const data = new TextEncoder().encode('proof');
    const signature = await webcrypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      clone,
      data,
    );
    // Signs as the same key: the public half of the original verifies it.
    await expect(
      webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, signature, data),
    ).resolves.toBe(true);

    // And the private half is still not readable, which is the point of storing the key
    // itself rather than an exported copy of it.
    await expect(webcrypto.subtle.exportKey('jwk', clone)).rejects.toThrow();
  });
});

describe('without a place to persist', () => {
  it('still returns a usable key', async () => {
    const key = await keyFor('fx.oauth2.test.dpop');

    expect(key.thumbprint).toMatch(/^[\w-]{20,}$/);
    expect(key.alg).toBe('ES256');
    // Usable means it can actually produce a proof, not merely that it has fields.
    await expect(
      proofFor(key, { method: 'GET', url: 'https://api.test/orders' }),
    ).resolves.toContain('.');
  });

  it('says the key will not outlive the document', async () => {
    const told: string[] = [];
    await keyFor('fx.oauth2.test.dpop', 'ES256', (reason) => told.push(reason));

    // Silence here would leave a refresh failing after the next navigation with nothing
    // pointing at why.
    expect(told.join(' ')).toMatch(/IndexedDB/);
  });

  it('honours the algorithm asked for', async () => {
    const key = await keyFor('fx.oauth2.test.dpop', 'RS256');
    expect(key.alg).toBe('RS256');
  });

  it('forgets without complaining', async () => {
    await expect(forgetKey('fx.oauth2.test.dpop')).resolves.toBeUndefined();
  });
});

describe('a store that refuses', () => {
  it('reports it and carries on with an ephemeral key', async () => {
    // A quota error on `put` is what private browsing looks like.
    vi.stubGlobal('indexedDB', {
      open: () => {
        const request: Record<string, unknown> = { result: undefined, error: new Error('denied') };
        setTimeout(() => (request.onerror as () => void)?.(), 0);
        return request;
      },
    });

    const told: string[] = [];
    const key = await keyFor('fx.oauth2.test.dpop', 'ES256', (reason) => told.push(reason));

    expect(key.thumbprint).toBeTruthy();
    expect(told.join(' ')).toMatch(/denied|could not/i);
    vi.unstubAllGlobals();
  });
});
