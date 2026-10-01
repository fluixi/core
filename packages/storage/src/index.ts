/**
 * @fluixi/storage: a universal storage abstraction. One typed API across browser, SSR, server
 * and custom environments; where the data actually lives is the adapter's to say.
 */
export { createStorage } from './core/storage.js';
export {
  StorageError,
  StorageSerializationError,
  StorageDeserializationError,
  StorageUnavailableError,
  StorageQuotaError,
  StorageSecurityError,
  StorageAdapterError,
} from './core/errors.js';
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
} from './core/types.js';
export { memoryStorage } from './adapters/memory.js';
export { jsonSerializer } from './serialization/json.js';
export { createSerializer } from './serialization/serializer.js';
export { copyStorage } from './utils/copy.js';
