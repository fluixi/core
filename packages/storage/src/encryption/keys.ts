import { StorageEncryptionUnavailableError } from '../core/errors.js';
import { fromBase64 } from './base64.js';
import type { EncryptionKey, EncryptionKeyProvider } from './types.js';

const subtleOf = (crypto?: Crypto): SubtleCrypto => {
  const subtle = (crypto ?? (globalThis as { crypto?: Crypto }).crypto)?.subtle;
  if (!subtle) throw new StorageEncryptionUnavailableError('Web Crypto is not available in this runtime.');
  return subtle;
};

/** A new AES-256-GCM key. Not extractable unless asked, so script cannot read it back. */
export async function generateEncryptionKey(options: { extractable?: boolean; crypto?: Crypto } = {}): Promise<CryptoKey> {
  return subtleOf(options.crypto).generateKey({ name: 'AES-GCM', length: 256 }, options.extractable ?? false, ['encrypt', 'decrypt']);
}

/** An AES-256-GCM key from 32 raw bytes, or their base64. */
export async function importEncryptionKey(raw: Uint8Array | string, options: { extractable?: boolean; crypto?: Crypto } = {}): Promise<CryptoKey> {
  const bytes = typeof raw === 'string' ? fromBase64(raw) : raw;
  if (bytes.length !== 32) throw new TypeError(`An AES-256 key is 32 bytes, got ${bytes.length}.`);
  return subtleOf(options.crypto).importKey('raw', bytes as BufferSource, { name: 'AES-GCM' }, options.extractable ?? false, ['encrypt', 'decrypt']);
}

/** One key for every entry. Give it an id to rotate later: entries keep the id they were written with. */
export function staticKeyProvider(key: CryptoKey | Promise<CryptoKey>, id?: string): EncryptionKeyProvider {
  return {
    async getKey(): Promise<EncryptionKey> {
      const resolved = await key;
      return id === undefined ? resolved : { key: resolved, id };
    },
  };
}
