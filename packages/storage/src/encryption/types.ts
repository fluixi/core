/** Ciphertext and what decrypting it needs, apart from the key. */
export interface EncryptedData {
  algorithm: string;
  iv: Uint8Array;
  ciphertext: Uint8Array;
  /** The authentication tag. */
  tag: Uint8Array;
}

/**
 * The cryptographic backend. The storage only talks to this, so Web Crypto, Node's crypto or a
 * WASM build can sit underneath without the storage knowing.
 */
export interface CryptoProvider {
  /** The algorithm it implements, as stored with each entry: `AES-256-GCM`. */
  readonly algorithm: string;
  /** Encrypts under a fresh random IV. `aad` is authenticated, not encrypted. */
  encrypt(data: Uint8Array, key: CryptoKey, aad?: Uint8Array): Promise<EncryptedData>;
  /** Rejects when authentication fails. */
  decrypt(data: EncryptedData, key: CryptoKey, aad?: Uint8Array): Promise<Uint8Array>;
}

export interface EncryptionContext {
  /** The entry's key, without the namespace. */
  key: string;
  namespace?: string;
  operation: 'encrypt' | 'decrypt';
  /** On decrypt, the id the key provider gave when the entry was written. */
  keyId?: string;
}

/** A key, or a key with an id that is stored with the entry so rotation can find it again. */
export type EncryptionKey = CryptoKey | { key: CryptoKey; id: string };

export interface EncryptionKeyProvider {
  getKey(context: EncryptionContext): Promise<EncryptionKey>;
}

/**
 * Per-item encryption for a storage. It keeps a value confidential and detects tampering from
 * anyone without the key; it does not replace authentication, authorization, HTTPS or secure
 * cookies, and a key that lives next to the data protects nothing.
 */
export interface EncryptionOptions {
  keyProvider: EncryptionKeyProvider;
  /**
   * Defaults to Web Crypto (`globalThis.crypto.subtle`): the browser's, or Node's native one,
   * global since Node 19. A WASM provider can go here for runtimes without either.
   */
  provider?: CryptoProvider;
}
