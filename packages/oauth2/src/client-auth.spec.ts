/**
 * Client authentication, which every authenticated call now shares.
 *
 * Worth its own tests because it used to be four implementations, and the one in
 * `mode: 'server'` silently lacked `private_key_jwt` while two others had it. A single
 * module is only an improvement if it is the one that is exercised.
 */
import { describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, importJWK, jwtVerify } from 'jose';
import { applyClientAuth, assertUsable, resolveMethod } from './client-auth.js';

const ENDPOINT = 'https://idp.test/token';

/** What a call site hands in and gets back. */
async function apply(auth: Parameters<typeof applyClientAuth>[0], body = { grant_type: 'x' }) {
  const headers: Record<string, string> = {};
  const form = new URLSearchParams(body);
  await applyClientAuth(auth, ENDPOINT, headers, form);
  return { headers, form };
}

describe('the method a configuration implies', () => {
  it('is basic when a secret is present', () => {
    expect(resolveMethod({ clientId: 'a', clientSecret: 's' })).toBe('client_secret_basic');
  });

  it('is private_key_jwt when a key is present', () => {
    expect(resolveMethod({ clientId: 'a', privateKey: { kty: 'RSA' } })).toBe('private_key_jwt');
  });

  it('is none when there is neither', () => {
    // A public client, which is what the browser flow is, and PKCE is what protects it.
    expect(resolveMethod({ clientId: 'a' })).toBe('none');
  });

  it('accepts the short spellings an app naturally writes', () => {
    expect(resolveMethod({ clientId: 'a', method: 'basic', clientSecret: 's' })).toBe(
      'client_secret_basic',
    );
    expect(resolveMethod({ clientId: 'a', method: 'body', clientSecret: 's' })).toBe(
      'client_secret_post',
    );
  });
});

describe('client_secret_basic', () => {
  it('puts the credentials in the header and not the body', async () => {
    const { headers, form } = await apply({ clientId: 'app', clientSecret: 'shh' });
    expect(atob(headers.authorization.slice(6))).toBe('app:shh');
    // Sending it twice is how a provider that reads the body first ignores the header.
    expect(form.get('client_secret')).toBeNull();
  });

  it('form-encodes before base64, so a secret with a colon survives', async () => {
    const { headers } = await apply({ clientId: 'app', clientSecret: 'a:b c' });
    expect(atob(headers.authorization.slice(6))).toBe('app:a%3Ab%20c');
  });
});

describe('client_secret_post', () => {
  it('puts the credentials in the form and not the header', async () => {
    const { headers, form } = await apply({ clientId: 'app', clientSecret: 'shh', method: 'body' });
    expect(form.get('client_id')).toBe('app');
    expect(form.get('client_secret')).toBe('shh');
    expect(headers.authorization).toBeUndefined();
  });
});

describe('private_key_jwt', () => {
  it('signs an assertion the provider can verify', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
    const { headers, form } = await apply({
      clientId: 'app',
      method: 'private_key_jwt',
      privateKey: { ...(await exportJWK(privateKey)), kid: 'k1' },
    });

    expect(headers.authorization).toBeUndefined();
    expect(form.get('client_secret')).toBeNull();
    expect(form.get('client_assertion_type')).toBe(
      'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    );

    const { payload, protectedHeader } = await jwtVerify(
      form.get('client_assertion')!,
      await importJWK(await exportJWK(publicKey), 'RS256'),
      { issuer: 'app', audience: ENDPOINT },
    );
    expect(payload.sub).toBe('app');
    // The endpoint, so it cannot be presented at a different one.
    expect(payload.aud).toBe(ENDPOINT);
    expect(payload.exp! - payload.iat!).toBeLessThanOrEqual(60);
    expect(protectedHeader.kid).toBe('k1');
  });

  it('uses a fresh jti each time, so one cannot be presented twice', async () => {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true });
    const auth = {
      clientId: 'app',
      method: 'private_key_jwt' as const,
      privateKey: await exportJWK(privateKey),
    };
    const read = (f: URLSearchParams) =>
      JSON.parse(
        Buffer.from(f.get('client_assertion')!.split('.')[1], 'base64url').toString(),
      ).jti;

    const a = read((await apply(auth)).form);
    const b = read((await apply(auth)).form);
    expect(a).not.toBe(b);
  });

  it('names a kid given explicitly over one on the key', async () => {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true });
    const { form } = await apply({
      clientId: 'app',
      method: 'private_key_jwt',
      privateKey: { ...(await exportJWK(privateKey)), kid: 'on-the-key' },
      keyId: 'explicit',
    });
    const header = JSON.parse(
      Buffer.from(form.get('client_assertion')!.split('.')[0], 'base64url').toString(),
    );
    expect(header.kid).toBe('explicit');
  });
});

describe('none', () => {
  it('names the client and proves nothing', async () => {
    const { headers, form } = await apply({ clientId: 'spa' });
    expect(form.get('client_id')).toBe('spa');
    expect(headers.authorization).toBeUndefined();
    expect(form.get('client_assertion')).toBeNull();
  });
});

describe('refusing a configuration before it is used', () => {
  it('needs a clientId', () => {
    expect(() => assertUsable({ clientId: '' }, 'x')).toThrow(/needs a clientId/);
  });

  it('needs a key for private_key_jwt', () => {
    expect(() => assertUsable({ clientId: 'a', method: 'private_key_jwt' }, 'x')).toThrow(
      /needs `privateKey`/,
    );
  });

  it('needs a secret for the secret methods', () => {
    expect(() => assertUsable({ clientId: 'a', method: 'basic' }, 'x')).toThrow(
      /needs a `clientSecret`/,
    );
  });

  it('accepts a public client', () => {
    expect(() => assertUsable({ clientId: 'a', method: 'none' }, 'x')).not.toThrow();
  });
});
