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
