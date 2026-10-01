/** Every error the storage throws: one base, a stable `code`, the key when there is one. */
export class StorageError extends Error {
  readonly code: string;
  readonly key?: string;
  /** What went wrong underneath: the browser's DOMException, a JSON SyntaxError. */
  readonly cause?: unknown;

  constructor(code: string, message: string, options: { key?: string; cause?: unknown } = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.key = options.key;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** A value the serializer refuses: a function, a class instance, a cycle. */
export class StorageSerializationError extends StorageError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('serialization', message, options);
  }
}

/** Stored text that does not deserialize. */
export class StorageDeserializationError extends StorageError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('deserialization', message, options);
  }
}

/** The backend does not exist here: localStorage on a server, IndexedDB in a worker without it. */
export class StorageUnavailableError extends StorageError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('unavailable', message, options);
  }
}

/** The backend is full. */
export class StorageQuotaError extends StorageError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('quota', message, options);
  }
}

/** The backend refused access: storage blocked by the browser's privacy settings. */
export class StorageSecurityError extends StorageError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('security', message, options);
  }
}

/** Anything else an adapter failed with. */
export class StorageAdapterError extends StorageError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('adapter', message, options);
  }
}

/** Base of every encryption failure, so one `instanceof` catches them all. */
export class StorageEncryptionError extends StorageError {}

/** No key provider is configured, or it gave no usable AES-256-GCM key. */
export class StorageEncryptionKeyError extends StorageEncryptionError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('encryption-key', message, options);
  }
}

/** The encryption fields of a stored entry are missing or of the wrong type. */
export class StorageEncryptionMetadataError extends StorageEncryptionError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('encryption-metadata', message, options);
  }
}

/** The entry was encrypted with a format version this release does not know. */
export class StorageEncryptionVersionError extends StorageEncryptionError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('encryption-version', message, options);
  }
}

/** The entry names an algorithm the configured provider does not implement. */
export class StorageEncryptionAlgorithmError extends StorageEncryptionError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('encryption-algorithm', message, options);
  }
}

/** Authentication failed: wrong key, or the ciphertext or its metadata was changed. */
export class StorageDecryptionError extends StorageEncryptionError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('decryption', message, options);
  }
}

/** The IV, ciphertext or tag is not valid base64 or has the wrong length. */
export class StorageEncryptedPayloadError extends StorageEncryptionError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('encryption-payload', message, options);
  }
}

/**
 * Encryption cannot run here: no Web Crypto in this runtime, or an encrypted value read through
 * a synchronous storage, which has no way to decrypt it.
 */
export class StorageEncryptionUnavailableError extends StorageEncryptionError {
  constructor(message: string, options: { key?: string; cause?: unknown } = {}) {
    super('encryption-unavailable', message, options);
  }
}
