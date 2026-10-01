/**
 * @fluixi/storage: a universal storage abstraction. One typed API across browser, SSR, server
 * and custom environments; where the data actually lives is the adapter's to say.
 */
export { createStorage, createSyncStorage } from './core/storage.js';
export {
  StorageError,
  StorageSerializationError,
  StorageDeserializationError,
  StorageUnavailableError,
  StorageQuotaError,
  StorageSecurityError,
  StorageAdapterError,
  StorageEncryptionError,
  StorageEncryptionKeyError,
  StorageEncryptionMetadataError,
  StorageEncryptionVersionError,
  StorageEncryptionAlgorithmError,
  StorageDecryptionError,
  StorageEncryptedPayloadError,
  StorageEncryptionUnavailableError,
} from './core/errors.js';
export { createAsyncStorage } from './core/async-storage.js';
export { webCryptoProvider } from './encryption/web-crypto.js';
export { generateEncryptionKey, importEncryptionKey, staticKeyProvider } from './encryption/keys.js';
export type {
  CryptoProvider,
  EncryptedData,
  EncryptionContext,
  EncryptionKey,
  EncryptionKeyProvider,
  EncryptionOptions,
} from './encryption/types.js';
export type {
  StorageSchema,
  StorageKey,
  StorageScope,
  StorageCapabilities,
  StorageAdapter,
  AdapterChange,
  StorageEntry,
  SetOptions,
  StorageEvent,
  StorageEventType,
  StorageSerializer,
  StorageMigrations,
  StorageOptions,
  TypedStorage,
  StoredItem,
  StorageQuery,
  StorageUsage,
  StorageSnapshot,
  AsyncStorageAdapter,
  AsyncSetOptions,
  AsyncStorageOptions,
  AsyncTypedStorage,
} from './core/types.js';
export { memoryStorage } from './adapters/memory.js';
export { jsonSerializer } from './serialization/json.js';
export { createSerializer } from './serialization/serializer.js';
export { copyStorage } from './utils/copy.js';
