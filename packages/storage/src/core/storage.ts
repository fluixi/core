/**
 * The storage: one typed API over any adapter. Values are wrapped in an envelope with their
 * metadata, so expiry, versions and migrations work the same on every backend.
 */
import { memoryStorage } from '../adapters/memory.js';
import type { EncryptionOptions } from '../encryption/types.js';
import { jsonSerializer } from '../serialization/json.js';
import { joinNamespace, namespacePrefix } from '../utils/keys.js';
import { createAsyncStorage } from './async-storage.js';
import { joinBus, publish } from './bus.js';
import { decodeEnvelope, isExpired, latestVersion, metaFor, migrate, selectItems, serializeOrThrow, toEntry, type Envelope, type Migrations } from './envelope.js';
import { StorageEncryptionUnavailableError } from './errors.js';
import type {
  AdapterChange,
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

/**
 * A typed storage with per-item encryption. Every operation returns a promise, since Web Crypto
 * is asynchronous and encrypting must not block the main thread.
 *
 * Items are stored in clear unless written with `{ encrypt: true }`; reads detect encrypted
 * items and decrypt them, so one storage holds both kinds.
 *
 * @param options `encryption.keyProvider` supplies the AES-256-GCM key; the rest is as for the
 *   synchronous overload, and `adapter` may also be asynchronous.
 * @returns The same storage as `createAsyncStorage(options)`.
 * @throws {StorageEncryptionError} From reads and writes, never from this call: a missing or
 *   unusable key, a payload that fails authentication, an unknown format.
 *
 * @example
 * const storage = createStorage<{ theme: string; session: Session }>({
 *   adapter: localStorageAdapter(),
 *   encryption: { keyProvider: staticKeyProvider(generateEncryptionKey()) },
 * });
 * await storage.set('theme', 'dark');
 * await storage.set('session', session, { encrypt: true });
 * const current = await storage.get('session');
 */
export function createStorage<S extends StorageSchema = StorageSchema>(options: AsyncStorageOptions<S> & { encryption: EncryptionOptions }): AsyncTypedStorage<S>;
/**
 * A typed, synchronous storage over any adapter, in memory by default.
 *
 * Each value is kept in an envelope with its write time, expiry and schema version, so `ttl`,
 * migrations and search behave the same on every backend. Type it with a schema and the value
 * type follows the key.
 *
 * Pass `encryption` to get the asynchronous storage instead (the other overload).
 *
 * @param options `adapter` (default `memoryStorage()`), `namespace` (a key prefix such as
 *   `app:`), `serializer` (default the strict JSON one), `migrations` per key, and `now` for tests.
 * @returns The same storage as `createSyncStorage(options)`.
 *
 * @example
 * const prefs = createStorage<{ theme: 'light' | 'dark' }>({ adapter: localStorageAdapter(), namespace: 'app' });
 * prefs.set('theme', 'dark', { ttl: 86_400_000 });
 * prefs.get('theme'); // 'dark' | null
 */
export function createStorage<S extends StorageSchema = StorageSchema>(options?: StorageOptions<S>): TypedStorage<S>;
export function createStorage<S extends StorageSchema = StorageSchema>(
  options: StorageOptions<S> | (AsyncStorageOptions<S> & { encryption: EncryptionOptions }) = {},
): TypedStorage<S> | AsyncTypedStorage<S> {
  if ('encryption' in options && options.encryption) return createAsyncStorage(options);
  return createSyncStorage(options as StorageOptions<S>);
}

/**
 * The synchronous storage, by name: what `createStorage` returns without `encryption`. Use it
 * when the code relies on reads returning at once and should not compile if someone adds
 * encryption later.
 *
 * It needs a synchronous adapter. It can list, check, expire and remove encrypted items
 * written by the asynchronous storage, but reading their value throws
 * `StorageEncryptionUnavailableError`.
 *
 * @param options See `createStorage`.
 *
 * @example
 * const cache = createSyncStorage<{ draft: string }>({ namespace: 'editor' });
 * cache.set('draft', text);
 */
export function createSyncStorage<S extends StorageSchema = StorageSchema>(options: StorageOptions<S> = {}): TypedStorage<S> {
  const adapter: StorageAdapter = options.adapter ?? memoryStorage();
  const serializer = options.serializer ?? jsonSerializer;
  const now = options.now ?? Date.now;
  const migrations = (options.migrations ?? {}) as Migrations;
  const prefix = namespacePrefix(options.namespace);
  const listeners = new Set<{ key?: string; fn: (event: StorageEvent<S>) => void }>();
  let leave: (() => void) | undefined;

  const deliver = (event: StorageEvent<S>) => {
    for (const { key, fn } of [...listeners]) if (key === undefined || event.key === null || key === event.key) fn(event);
  };
  // Through the adapter's bus, so every storage over it hears the write, this one included.
  const emit = (event: StorageEvent<S>) =>
    publish(adapter, event.type, event.key === null ? null : prefix + event.key, prefix, event.value);

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
    adapter.set(prefix + key, encode(key, next), { expiresAt: next.expiresAt });
    return next;
  };

  const ownKeys = (): string[] =>
    adapter
      .keys()
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));

  // Changes the adapter saw from elsewhere (another tab), in this namespace only.
  const external = (change: AdapterChange) => {
    if (change.key === null) return deliver({ type: 'clear', key: null, external: true });
    if (!change.key.startsWith(prefix)) return;
    const key = change.key.slice(prefix.length) as StorageKey<S>;
    if (change.value === null) return deliver({ type: 'remove', key, external: true });
    try {
      const envelope = decodeEnvelope(serializer, key, change.value);
      deliver({ type: 'set', key, value: envelope.enc ? undefined : envelope.value, external: true });
    } catch {
      // Unreadable text from another writer: reported when it is read, not here.
    }
  };

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
    adapter.set(prefix + key, encode(key, { v: 1, value, ...meta }), { expiresAt: meta.expiresAt });
    emit({ type: 'set', key: key as StorageKey<S>, value, external: false });
  };

  const storage: TypedStorage<S> = {
    scope: adapter.scope,
    keyPrefix: prefix,
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
      const expiresAt = now() + ttl;
      adapter.set(prefix + key, encode(key, { ...current, expiresAt }), { expiresAt });
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
      if (listeners.size === 1) {
        leave = joinBus(adapter, {
          prefix,
          external,
          local(type, key, value) {
            const event: StorageEvent<S> = { type, key: key === null ? null : (key.slice(prefix.length) as StorageKey<S>), external: false };
            if (type === 'set') event.value = value;
            deliver(event);
          },
        });
      }
      return () => {
        if (listeners.delete(entry) && listeners.size === 0) {
          leave?.();
          leave = undefined;
        }
      };
    },
  };
  return storage;
}
