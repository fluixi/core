/**
 * The awaited storage. Same envelope as the sync one, so both read each other's plaintext
 * entries; it also works over async adapters and is where per-item encryption runs.
 */
import { memoryStorage } from '../adapters/memory.js';
import { open, seal, type Sealer } from '../encryption/seal.js';
import { webCryptoProvider } from '../encryption/web-crypto.js';
import { jsonSerializer } from '../serialization/json.js';
import { joinNamespace, namespacePrefix } from '../utils/keys.js';
import {
  decodeEnvelope,
  deserializeOrThrow,
  isExpired,
  latestVersion,
  metaFor,
  migrate,
  selectItems,
  serializeOrThrow,
  toEntry,
  type Envelope,
  type Migrations,
} from './envelope.js';
import { StorageEncryptionKeyError } from './errors.js';
import type { AsyncStorageAdapter, AsyncStorageOptions, AsyncTypedStorage, StorageEvent, StorageKey, StorageSchema, StoredItem } from './types.js';

type Meta = Omit<Envelope, 'v' | 'value' | 'enc'>;

/**
 * A typed storage whose operations all return promises. It works over a synchronous adapter or
 * an asynchronous one (IndexedDB, a remote store), and it is the storage that can encrypt.
 *
 * It reads and writes the same envelope as the synchronous storage, so the two can share an
 * adapter. Without `encryption`, writing with `{ encrypt: true }` or reading an encrypted item
 * throws `StorageEncryptionKeyError`.
 *
 * @param options As for `createStorage`, plus `encryption` and an asynchronous `adapter`.
 *
 * @example
 * const storage = createAsyncStorage<{ token: string }>({ encryption: { keyProvider } });
 * await storage.set('token', token, { encrypt: true, ttl: 3_600_000 });
 */
export function createAsyncStorage<S extends StorageSchema = StorageSchema>(options: AsyncStorageOptions<S> = {}): AsyncTypedStorage<S> {
  const adapter: AsyncStorageAdapter = options.adapter ?? memoryStorage();
  const serializer = options.serializer ?? jsonSerializer;
  const now = options.now ?? Date.now;
  const migrations = (options.migrations ?? {}) as Migrations;
  const prefix = namespacePrefix(options.namespace);
  const listeners = new Set<{ key?: string; fn: (event: StorageEvent<S>) => void }>();
  // Without `encryption` a provider is still there, so reading an encrypted entry says the key is missing.
  const sealer: Sealer = {
    keyProvider: options.encryption?.keyProvider,
    provider: options.encryption?.provider ?? webCryptoProvider(),
  };
  const context = (key: string) => (options.namespace ? { key, namespace: options.namespace } : { key });

  const emit = (event: StorageEvent<S>) => {
    for (const { key, fn } of listeners) if (key === undefined || event.key === null || key === event.key) fn(event);
  };

  const store = async (key: string, value: unknown, meta: Meta, encrypt: boolean) => {
    const envelope: Envelope = { v: 1, ...meta };
    if (encrypt) {
      if (!sealer.keyProvider) throw new StorageEncryptionKeyError(`Encrypting ${key} needs encryption on the storage.`, { key });
      envelope.enc = await seal(sealer, context(key), prefix + key, serializeOrThrow(serializer, key, value), meta);
    } else {
      envelope.value = value;
    }
    await adapter.set(prefix + key, serializeOrThrow(serializer, key, envelope), { expiresAt: meta.expiresAt });
  };

  const write = async (key: string, value: unknown, meta: Meta, encrypt: boolean) => {
    await store(key, value, meta, encrypt);
    emit({ type: 'set', key: key as StorageKey<S>, value, external: false });
  };

  const metaOf = ({ createdAt, expiresAt, version }: Envelope): Meta => {
    const meta: Meta = { createdAt };
    if (expiresAt !== undefined) meta.expiresAt = expiresAt;
    if (version !== undefined) meta.version = version;
    return meta;
  };

  /** The live entry and its plaintext value, expiry applied and migrations run, or null. */
  const read = async (key: string): Promise<{ envelope: Envelope; value: unknown } | null> => {
    const text = await adapter.get(prefix + key);
    if (text === null) return null;
    let envelope = decodeEnvelope(serializer, key, text);
    if (isExpired(envelope, now())) {
      await adapter.remove(prefix + key);
      emit({ type: 'expire', key: key as StorageKey<S>, external: false });
      return null;
    }
    let value = envelope.enc
      ? deserializeOrThrow(serializer, key, await open(sealer, context(key), prefix + key, envelope.enc, metaOf(envelope)))
      : envelope.value;
    const migrated = migrate(migrations[key], envelope.version, value);
    if (migrated) {
      value = migrated.value;
      const meta = { ...metaOf(envelope), version: migrated.version };
      // Encrypted again under a fresh IV: the version is part of what is authenticated.
      await store(key, value, meta, !!envelope.enc);
      envelope = { v: 1, ...meta, ...(envelope.enc ? { enc: envelope.enc } : { value }) };
    }
    return { envelope, value };
  };

  const ownKeys = async (): Promise<string[]> =>
    (await adapter.keys()).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));

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

  const liveItems = async (): Promise<StoredItem<S>[]> => {
    const items: StoredItem<S>[] = [];
    for (const key of (await ownKeys()).sort()) {
      const current = await read(key);
      if (current) items.push({ key: key as StorageKey<S>, value: current.value as never, entry: toEntry(current.envelope, current.value) as never });
    }
    return items;
  };

  const storage: AsyncTypedStorage<S> = {
    scope: adapter.scope,
    keyPrefix: prefix,
    capabilities: { ...adapter.capabilities, expiration: true },
    encryption: !!sealer.keyProvider,

    async get(key) {
      return ((await read(key))?.value ?? null) as never;
    },

    async getEntry(key) {
      const current = await read(key);
      return current ? (toEntry(current.envelope, current.value) as never) : null;
    },

    async set(key, value, setOptions = {}) {
      const meta = metaFor(now(), setOptions.ttl, setOptions.version ?? latestVersion(migrations[key]));
      await write(key, value, meta, setOptions.encrypt === true);
    },

    entries: liveItems,

    async search(query) {
      return selectItems(await liveItems(), query);
    },

    async size() {
      let count = 0;
      for (const key of await ownKeys()) {
        const text = await adapter.get(prefix + key);
        if (text !== null && !isExpired(decodeEnvelope(serializer, key, text), now())) count++;
      }
      return count;
    },

    async prune() {
      let removed = 0;
      for (const key of await ownKeys()) {
        const text = await adapter.get(prefix + key);
        if (text === null) continue;
        if (isExpired(decodeEnvelope(serializer, key, text), now())) {
          await adapter.remove(prefix + key);
          emit({ type: 'expire', key: key as StorageKey<S>, external: false });
          removed++;
        }
      }
      return removed;
    },

    async usage() {
      let bytes = 0;
      const keys = await ownKeys();
      for (const key of keys) bytes += ((prefix + key).length + ((await adapter.get(prefix + key))?.length ?? 0)) * 2;
      return { keys: keys.length, bytes };
    },

    async update(key, fn, updateOptions = {}) {
      const current = await read(key);
      const value = await fn((current?.value ?? null) as never);
      const meta = metaFor(now(), undefined, current?.envelope.version ?? latestVersion(migrations[key]));
      if (current?.envelope.expiresAt !== undefined) meta.expiresAt = current.envelope.expiresAt;
      await write(key, value, meta, updateOptions.encrypt ?? !!current?.envelope.enc);
      return value;
    },

    async getOrSet(key, factory, setOptions) {
      const current = await read(key);
      if (current) return current.value as never;
      const value = await factory();
      await storage.set(key, value, setOptions);
      return value;
    },

    async touch(key, ttl) {
      const current = await read(key);
      if (!current) return false;
      await store(key, current.value, { ...metaOf(current.envelope), expiresAt: now() + ttl }, !!current.envelope.enc);
      return true;
    },

    async snapshot() {
      const out: Record<string, unknown> = {};
      for (const item of await liveItems()) out[item.key] = item.entry;
      return out as never;
    },

    async restore(snapshot, restoreOptions = {}) {
      let written = 0;
      for (const [key, entry] of Object.entries(snapshot as Record<string, StoredItem<S>['entry'] | undefined>)) {
        if (!entry) continue;
        if (!restoreOptions.overwrite && (await read(key))) continue;
        if (entry.expiresAt !== undefined && entry.expiresAt <= now()) continue;
        const meta: Meta = { createdAt: entry.createdAt };
        if (entry.expiresAt !== undefined) meta.expiresAt = entry.expiresAt;
        if (entry.version !== undefined) meta.version = entry.version;
        await write(key, entry.value, meta, entry.encrypted === true);
        written++;
      }
      return written;
    },

    async remove(key) {
      await adapter.remove(prefix + key);
      emit({ type: 'remove', key, external: false });
    },

    async has(key) {
      const text = await adapter.get(prefix + key);
      if (text === null) return false;
      if (!isExpired(decodeEnvelope(serializer, key, text), now())) return true;
      await adapter.remove(prefix + key);
      emit({ type: 'expire', key, external: false });
      return false;
    },

    async keys() {
      return (await ownKeys()) as StorageKey<S>[];
    },

    async clear() {
      if (prefix) for (const key of await ownKeys()) await adapter.remove(prefix + key);
      else await adapter.clear();
      emit({ type: 'clear', key: null, external: false });
    },

    namespace(name) {
      return createAsyncStorage({ ...options, migrations: undefined, namespace: joinNamespace(options.namespace, name) });
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
