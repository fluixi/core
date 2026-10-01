/**
 * Encrypts serialized values into the stored payload and back. The payload is versioned on its
 * own, apart from the envelope, so the scheme can change without touching plaintext entries.
 */
import {
  StorageDecryptionError,
  StorageEncryptedPayloadError,
  StorageEncryptionAlgorithmError,
  StorageEncryptionError,
  StorageEncryptionKeyError,
  StorageEncryptionMetadataError,
  StorageEncryptionVersionError,
} from '../core/errors.js';
import { fromBase64, toBase64 } from './base64.js';
import type { CryptoProvider, EncryptionContext, EncryptionKeyProvider } from './types.js';

export const PAYLOAD_VERSION = 1;

/** What an encrypted entry stores in place of its value. */
export interface EncryptedPayload {
  v: number;
  alg: string;
  iv: string;
  data: string;
  tag: string;
  kid?: string;
}

/** Metadata stored in clear beside the payload. Authenticated, so editing it fails decryption. */
export interface SealMeta {
  createdAt: number;
  expiresAt?: number;
  version?: number;
}

export interface Sealer {
  keyProvider?: EncryptionKeyProvider;
  provider: CryptoProvider;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

// The full stored key is bound, so a payload copied under another key does not decrypt.
const aad = (storedKey: string, alg: string, kid: string | undefined, meta: SealMeta) =>
  encoder.encode(JSON.stringify(['fx-storage', PAYLOAD_VERSION, alg, storedKey, meta.createdAt, meta.expiresAt ?? null, meta.version ?? null, kid ?? null]));

async function keyFor(sealer: Sealer, context: EncryptionContext): Promise<{ key: CryptoKey; id?: string }> {
  if (!sealer.keyProvider) {
    throw new StorageEncryptionKeyError(`${context.key} is encrypted, and this storage has no encryption key provider.`, { key: context.key });
  }
  let result;
  try {
    result = await sealer.keyProvider.getKey(context);
  } catch (error) {
    if (error instanceof StorageEncryptionError) throw error;
    throw new StorageEncryptionKeyError(`The key provider failed for ${context.key}.`, { key: context.key, cause: error });
  }
  const pair = result && 'key' in result && 'id' in result ? result : { key: result as CryptoKey };
  const algorithm = pair.key?.algorithm as AesKeyAlgorithm | undefined;
  if (!algorithm || algorithm.name !== 'AES-GCM' || algorithm.length !== 256) {
    throw new StorageEncryptionKeyError(`The key provider must return an AES-GCM 256-bit key for ${context.key}.`, { key: context.key });
  }
  if (!pair.key.usages.includes(context.operation)) {
    throw new StorageEncryptionKeyError(`The key for ${context.key} does not allow ${context.operation}.`, { key: context.key });
  }
  return pair;
}

export async function seal(
  sealer: Sealer,
  context: Omit<EncryptionContext, 'operation' | 'keyId'>,
  storedKey: string,
  plaintext: string,
  meta: SealMeta,
): Promise<EncryptedPayload> {
  const { key, id } = await keyFor(sealer, { ...context, operation: 'encrypt' });
  const alg = sealer.provider.algorithm;
  const out = await sealer.provider.encrypt(encoder.encode(plaintext), key, aad(storedKey, alg, id, meta));
  const payload: EncryptedPayload = { v: PAYLOAD_VERSION, alg, iv: toBase64(out.iv), data: toBase64(out.ciphertext), tag: toBase64(out.tag) };
  if (id !== undefined) payload.kid = id;
  return payload;
}

export async function open(
  sealer: Sealer,
  context: Omit<EncryptionContext, 'operation' | 'keyId'>,
  storedKey: string,
  payload: unknown,
  meta: SealMeta,
): Promise<string> {
  const k = context.key;
  const p = payload as Partial<EncryptedPayload> | null;
  if (!p || typeof p !== 'object' || typeof p.v !== 'number') {
    throw new StorageEncryptionMetadataError(`The encryption metadata of ${k} is missing its version.`, { key: k });
  }
  if (p.v !== PAYLOAD_VERSION) throw new StorageEncryptionVersionError(`${k} uses encryption format ${p.v}, which this release cannot read.`, { key: k });
  if (typeof p.alg !== 'string' || typeof p.iv !== 'string' || typeof p.data !== 'string' || typeof p.tag !== 'string' || (p.kid !== undefined && typeof p.kid !== 'string')) {
    throw new StorageEncryptionMetadataError(`The encryption metadata of ${k} is malformed.`, { key: k });
  }
  if (p.alg !== sealer.provider.algorithm) {
    throw new StorageEncryptionAlgorithmError(`${k} is encrypted with ${p.alg}; the provider implements ${sealer.provider.algorithm}.`, { key: k });
  }
  let iv: Uint8Array, ciphertext: Uint8Array, tag: Uint8Array;
  try {
    iv = fromBase64(p.iv);
    ciphertext = fromBase64(p.data);
    tag = fromBase64(p.tag);
  } catch (error) {
    throw new StorageEncryptedPayloadError(`The encrypted payload of ${k} is not valid base64.`, { key: k, cause: error });
  }
  if (iv.length !== 12 || tag.length !== 16) throw new StorageEncryptedPayloadError(`The encrypted payload of ${k} has a wrong IV or tag length.`, { key: k });
  const { key } = await keyFor(sealer, { ...context, operation: 'decrypt', keyId: p.kid });
  let bytes: Uint8Array;
  try {
    bytes = await sealer.provider.decrypt({ algorithm: p.alg, iv, ciphertext, tag }, key, aad(storedKey, p.alg, p.kid, meta));
  } catch (error) {
    throw new StorageDecryptionError(`${k} failed authentication: wrong key, or the stored entry was changed.`, { key: k, cause: error });
  }
  try {
    return decoder.decode(bytes);
  } catch (error) {
    throw new StorageEncryptedPayloadError(`The decrypted value of ${k} is not UTF-8.`, { key: k, cause: error });
  }
}
