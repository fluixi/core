/**
 * The storage: one typed API over any adapter. Values are wrapped in an envelope with their
 * metadata, so expiry, versions and migrations work the same on every backend.
 */
import { memoryStorage } from '../adapters/memory.js';
import type { EncryptionOptions } from '../encryption/types.js';
import { jsonSerializer } from '../serialization/json.js';
import { joinNamespace, namespacePrefix } from '../utils/keys.js';
import { createAsyncStorage } from './async-storage.js';
import { decodeEnvelope, isExpired, latestVersion, metaFor, migrate, selectItems, serializeOrThrow, toEntry, type Envelope, type Migrations } from './envelope.js';
import { StorageEncryptionUnavailableError } from './errors.js';
import type {
  AsyncStorageOptions,
  AsyncTypedStorage,
  SetOptions,
  StorageAdapter,
  StorageEvent,
  StorageKey,
  StorageOptions,
  StorageSchema,
  StoredItem,
  TypedStorage,
} from './types.js';

/** With `encryption`, the storage is asynchronous: encrypting never blocks the main thread. */
export function createStorage<S extends StorageSchema = StorageSchema>(options: AsyncStorageOptions<S> & { encryption: EncryptionOptions }): AsyncTypedStorage<S>;
export function createStorage<S extends StorageSchema = StorageSchema>(options?: StorageOptions<S>): TypedStorage<S>;
export function createStorage<S extends StorageSchema = StorageSchema>(
  options: StorageOptions<S> | (AsyncStorageOptions<S> & { encryption: EncryptionOptions }) = {},
): TypedStorage<S> | AsyncTypedStorage<S> {
  if ('encryption' in options && options.encryption) return createAsyncStorage(options);
  return createSyncStorage(options as StorageOptions<S>);
}

function createSyncStorage<S extends StorageSchema>(options: StorageOptions<S>): TypedStorage<S> {
  const adapter: StorageAdapter = options.adapter ?? memoryStorage();
  const serializer = options.serializer ?? jsonSerializer;
  const now = options.now ?? Date.now;
  const migrations = (options.migrations ?? {}) as Migrations;
  const prefix = namespacePrefix(options.namespace);
  const listeners = new Set<{ key?: string; fn: (event: StorageEvent<S>) => void }>();

  const emit = (event: StorageEvent<S>) => {
    for (const { key, fn } of listeners) if (key === undefined || event.key === null || key === event.key) fn(event);
  };

  const encode = (key: string, envelope: Envelope) => serializeOrThrow(serializer, key, envelope);

  /** The plaintext value. An encrypted one needs the async storage, which can decrypt. */
  const valueOf = (key: string, envelope: Envelope) => {
    if (envelope.enc) {
      throw new StorageEncryptionUnavailableError(`${key} is encrypted; read it through createStorage({ encryption }), which is asynchronous.`, { key });
    }
    return envelope.value;
  };

  /** The live entry, expiry applied and migrations run, or null. */
  const read = (key: string): Envelope | null => {
    const text = adapter.get(prefix + key);
    if (text === null) return null;
    const envelope = decodeEnvelope(serializer, key, text);
    if (isExpired(envelope, now())) {
      adapter.remove(prefix + key);
      emit({ type: 'expire', key: key as StorageKey<S>, external: false });
      return null;
    }
    // An encrypted value is migrated when the async storage reads it.
    if (envelope.enc) return envelope;
    const migrated = migrate(migrations[key], envelope.version, envelope.value);
    if (!migrated) return envelope;
    const next = { ...envelope, ...migrated };
    adapter.set(prefix + key, encode(key, next));
    return next;
  };

  const ownKeys = (): string[] =>
    adapter
      .keys()
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));

  // Changes the adapter saw from elsewhere (another tab), in this namespace only.
  adapter.subscribe?.((change) => {
    if (change.key === null) return emit({ type: 'clear', key: null, external: true });
    if (!change.key.startsWith(prefix)) return;
    const key = change.key.slice(prefix.length) as StorageKey<S>;
    if (change.value === null) return emit({ type: 'remove', key, external: true });
    try {
      const envelope = decodeEnvelope(serializer, key, change.value);
      emit({ type: 'set', key, value: envelope.enc ? undefined : envelope.value, external: true });
    } catch {
      // Unreadable text from another writer: reported when it is read, not here.
    }
  });

  const liveItems = (): StoredItem<S>[] => {
    const items: StoredItem<S>[] = [];
    for (const key of ownKeys().sort()) {
      const envelope = read(key);
      if (!envelope) continue;
      const value = valueOf(key, envelope);
      items.push({ key: key as StorageKey<S>, value: value as never, entry: toEntry(envelope, value) as never });
    }
    return items;
  };

  const write = (key: string, value: unknown, meta: Omit<Envelope, 'v' | 'value' | 'enc'>) => {
    adapter.set(prefix + key, encode(key, { v: 1, value, ...meta }));
    emit({ type: 'set', key: key as StorageKey<S>, value, external: false });
  };

  const storage: TypedStorage<S> = {
    scope: adapter.scope,
    // The storage expires entries itself, whatever the adapter can do.
    capabilities: { ...adapter.capabilities, expiration: true },

    get(key) {
      const envelope = read(key);
      return (envelope ? valueOf(key, envelope) ?? null : null) as never;
    },

    getEntry(key) {
      const envelope = read(key);
      return envelope ? (toEntry(envelope, valueOf(key, envelope)) as never) : null;
    },

    set(key, value, setOptions: SetOptions = {}) {
      write(key, value, metaFor(now(), setOptions.ttl, setOptions.version ?? latestVersion(migrations[key])));
    },

    entries() {
      return liveItems();
    },

    search(query) {
      return selectItems(liveItems(), query);
    },

    size() {
      return ownKeys().filter((key) => read(key) !== null).length;
    },

    prune() {
      let removed = 0;
      for (const key of ownKeys()) {
        const text = adapter.get(prefix + key);
        if (text === null) continue;
        if (isExpired(decodeEnvelope(serializer, key, text), now())) {
          adapter.remove(prefix + key);
          emit({ type: 'expire', key: key as StorageKey<S>, external: false });
          removed++;
        }
      }
      return removed;
    },

    usage() {
      let bytes = 0;
      const keys = ownKeys();
      for (const key of keys) bytes += ((prefix + key).length + (adapter.get(prefix + key)?.length ?? 0)) * 2;
      return { keys: keys.length, bytes };
    },

    update(key, fn) {
      const current = read(key);
      const value = fn((current ? valueOf(key, current) : null) as never);
      const meta = metaFor(now(), undefined, current?.version ?? latestVersion(migrations[key]));
      if (current?.expiresAt !== undefined) meta.expiresAt = current.expiresAt;
      write(key, value, meta);
      return value;
    },

    getOrSet(key, factory, setOptions) {
      const current = read(key);
      if (current) return valueOf(key, current) as never;
      const value = factory();
      storage.set(key, value, setOptions);
      return value;
    },

    touch(key, ttl) {
      const current = read(key);
      if (!current) return false;
      // The expiry of an encrypted entry is authenticated, so only the async storage can move it.
      valueOf(key, current);
      adapter.set(prefix + key, encode(key, { ...current, expiresAt: now() + ttl }));
      return true;
    },

    snapshot() {
      const out: Record<string, unknown> = {};
      for (const item of liveItems()) out[item.key] = item.entry;
      return out as never;
    },

    restore(snapshot, restoreOptions = {}) {
      let written = 0;
      for (const [key, entry] of Object.entries(snapshot as Record<string, StoredItem<S>['entry'] | undefined>)) {
        if (!entry) continue;
        if (entry.encrypted) {
          throw new StorageEncryptionUnavailableError(`${key} was encrypted; restore it through createStorage({ encryption }).`, { key });
        }
        if (!restoreOptions.overwrite && read(key)) continue;
        if (entry.expiresAt !== undefined && entry.expiresAt <= now()) continue;
        const meta: Omit<Envelope, 'v' | 'value' | 'enc'> = { createdAt: entry.createdAt };
        if (entry.expiresAt !== undefined) meta.expiresAt = entry.expiresAt;
        if (entry.version !== undefined) meta.version = entry.version;
        write(key, entry.value, meta);
        written++;
      }
      return written;
    },

    remove(key) {
      adapter.remove(prefix + key);
      emit({ type: 'remove', key, external: false });
    },

    has(key) {
      return read(key) !== null;
    },

    keys() {
      return ownKeys() as StorageKey<S>[];
    },

    clear() {
      if (prefix) for (const key of ownKeys()) adapter.remove(prefix + key);
      else adapter.clear();
      emit({ type: 'clear', key: null, external: false });
    },

    namespace(name) {
      return createSyncStorage({ adapter, serializer, now, namespace: joinNamespace(options.namespace, name) });
    },

    subscribe(keyOrListener: unknown, maybeListener?: unknown) {
      const entry =
        typeof keyOrListener === 'function'
          ? { fn: keyOrListener as (event: StorageEvent<S>) => void }
          : { key: keyOrListener as string, fn: maybeListener as (event: StorageEvent<S>) => void };
      listeners.add(entry);
      return () => void listeners.delete(entry);
    },
  };
  return storage;
}
