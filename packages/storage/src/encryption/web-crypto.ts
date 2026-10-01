import { StorageEncryptionUnavailableError } from '../core/errors.js';
import type { CryptoProvider } from './types.js';

const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * AES-256-GCM over Web Crypto. Each call draws a new 96-bit random IV, so an IV is never
 * deliberately reused; keep one key under about 2^32 writes before rotating it.
 *
 * `crypto` defaults to the global, read on first use so the module imports anywhere.
 */
export function webCryptoProvider(crypto?: Crypto): CryptoProvider {
  const resolve = (): Crypto => {
    const c = crypto ?? (globalThis as { crypto?: Crypto }).crypto;
    if (!c?.subtle || !c.getRandomValues) {
      throw new StorageEncryptionUnavailableError('Web Crypto is not available in this runtime; pass a provider in the encryption options.');
    }
    return c;
  };
  return {
    algorithm: 'AES-256-GCM',
    async encrypt(data, key, aad) {
      const c = resolve();
      const iv = c.getRandomValues(new Uint8Array(IV_BYTES));
      const params: AesGcmParams = { name: 'AES-GCM', iv, tagLength: TAG_BYTES * 8 };
      if (aad) params.additionalData = aad as BufferSource;
      const sealed = new Uint8Array(await c.subtle.encrypt(params, key, data as BufferSource));
      return {
        algorithm: 'AES-256-GCM',
        iv,
        ciphertext: sealed.slice(0, sealed.length - TAG_BYTES),
        tag: sealed.slice(sealed.length - TAG_BYTES),
      };
    },
    async decrypt(data, key, aad) {
      const c = resolve();
      const sealed = new Uint8Array(data.ciphertext.length + data.tag.length);
      sealed.set(data.ciphertext);
      sealed.set(data.tag, data.ciphertext.length);
      const params: AesGcmParams = { name: 'AES-GCM', iv: data.iv as BufferSource, tagLength: TAG_BYTES * 8 };
      if (aad) params.additionalData = aad as BufferSource;
      return new Uint8Array(await c.subtle.decrypt(params, key, sealed));
    },
  };
}
