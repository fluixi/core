/**
 * The storage: one typed API over any adapter. Values are wrapped in an envelope with their
 * metadata, so expiry, versions and migrations work the same on every backend.
 */
import { memoryStorage } from '../adapters/memory.js';
import { jsonSerializer } from '../serialization/json.js';
import { joinNamespace, namespacePrefix } from '../utils/keys.js';
import { StorageDeserializationError, StorageError, StorageSerializationError } from './errors.js';
import type {
  SetOptions,
  StorageAdapter,
  StorageEntry,
  StorageEvent,
  StorageKey,
  StorageOptions,
  StorageSchema,
  StoredItem,
  TypedStorage,
} from './types.js';

/** The stored form. `v` is the envelope format, so a later format can read this one. */
interface Envelope {
  v: 1;
  value: unknown;
  createdAt: number;
  expiresAt?: number;
  version?: number;
}

function isEnvelope(x: unknown): x is Envelope {
  return !!x && typeof x === 'object' && (x as Envelope).v === 1 && 'value' in x && typeof (x as Envelope).createdAt === 'number';
}

/** The newest version a key's migrations reach, or undefined without migrations. */
function latestVersion(steps: Record<number, unknown> | undefined): number | undefined {
  if (!steps) return undefined;
  const versions = Object.keys(steps).map(Number).filter(Number.isFinite);
  return versions.length ? Math.max(...versions) : undefined;
}

export function createStorage<S extends StorageSchema = StorageSchema>(options: StorageOptions<S> = {}): TypedStorage<S> {
  const adapter: StorageAdapter = options.adapter ?? memoryStorage();
  const serializer = options.serializer ?? jsonSerializer;
  const now = options.now ?? Date.now;
  const migrations = (options.migrations ?? {}) as Record<string, Record<number, (value: unknown) => unknown> | undefined>;
  const prefix = namespacePrefix(options.namespace);
  const listeners = new Set<{ key?: string; fn: (event: StorageEvent<S>) => void }>();

  const emit = (event: StorageEvent<S>) => {
    for (const { key, fn } of listeners) if (key === undefined || event.key === null || key === event.key) fn(event);
  };

  const encode = (key: string, envelope: Envelope): string => {
    try {
      return serializer.serialize(envelope);
    } catch (error) {
      if (error instanceof StorageError) throw Object.assign(error, { key });
      throw new StorageSerializationError(`The value of ${key} could not be serialized.`, { key, cause: error });
    }
  };

  const decode = (key: string, text: string): Envelope => {
    let parsed: unknown;
    try {
      parsed = serializer.deserialize(text);
    } catch (error) {
      throw new StorageDeserializationError(`The stored value of ${key} could not be read.`, { key, cause: error });
    }
    // Written by something else, without metadata: the value as it is.
    return isEnvelope(parsed) ? parsed : { v: 1, value: parsed, createdAt: 0 };
  };

  /** The live entry, expiry applied and migrations run, or null. */
  const read = (key: string): Envelope | null => {
    const text = adapter.get(prefix + key);
    if (text === null) return null;
    let envelope = decode(key, text);
    if (envelope.expiresAt !== undefined && envelope.expiresAt <= now()) {
      adapter.remove(prefix + key);
      emit({ type: 'expire', key: key as StorageKey<S>, external: false });
      return null;
    }
    const steps = migrations[key];
    const latest = latestVersion(steps);
    if (steps && latest !== undefined && (envelope.version ?? 0) < latest) {
      let value = envelope.value;
      for (const version of Object.keys(steps).map(Number).sort((a, b) => a - b)) {
        if (version > (envelope.version ?? 0)) value = steps[version]!(value);
      }
      envelope = { ...envelope, value, version: latest };
      adapter.set(prefix + key, encode(key, envelope));
    }
    return envelope;
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
      emit({ type: 'set', key, value: decode(key, change.value).value, external: true });
    } catch {
      // Unreadable text from another writer: reported when it is read, not here.
    }
  });

  /** `draft:*` style: `*` any run, `?` one character, everything else literal. */
  const globToRegExp = (glob: string) =>
    new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);

  const toEntry = (envelope: Envelope): StorageEntry<unknown> => {
    const entry: StorageEntry<unknown> = { value: envelope.value, createdAt: envelope.createdAt };
    if (envelope.expiresAt !== undefined) entry.expiresAt = envelope.expiresAt;
    if (envelope.version !== undefined) entry.version = envelope.version;
    return entry;
  };

  const liveItems = (): StoredItem<S>[] => {
    const items: StoredItem<S>[] = [];
    for (const key of ownKeys().sort()) {
      const envelope = read(key);
      if (envelope) items.push({ key: key as StorageKey<S>, value: envelope.value as never, entry: toEntry(envelope) as never });
    }
    return items;
  };

  const write = (key: string, envelope: Envelope) => {
    adapter.set(prefix + key, encode(key, envelope));
    emit({ type: 'set', key: key as StorageKey<S>, value: envelope.value, external: false });
  };

  const storage: TypedStorage<S> = {
    scope: adapter.scope,
    // The storage expires entries itself, whatever the adapter can do.
    capabilities: { ...adapter.capabilities, expiration: true },

    get(key) {
      return (read(key)?.value ?? null) as never;
    },

    getEntry(key) {
      const envelope = read(key);
      return envelope ? (toEntry(envelope) as never) : null;
    },

    set(key, value, setOptions: SetOptions = {}) {
      const createdAt = now();
      const envelope: Envelope = { v: 1, value, createdAt };
      if (setOptions.ttl !== undefined) envelope.expiresAt = createdAt + setOptions.ttl;
      const version = setOptions.version ?? latestVersion(migrations[key]);
      if (version !== undefined) envelope.version = version;
      write(key, envelope);
    },

    entries() {
      return liveItems();
    },

    search(query) {
      const pattern = typeof query.match === 'string' ? globToRegExp(query.match) : query.match;
      const out: StoredItem<S>[] = [];
      for (const item of liveItems()) {
        if (query.prefix !== undefined && !item.key.startsWith(query.prefix)) continue;
        if (pattern && !pattern.test(item.key)) continue;
        if (query.where && !query.where(item)) continue;
        out.push(item);
        if (query.limit !== undefined && out.length >= query.limit) break;
      }
      return out;
    },

    size() {
      return liveItems().length;
    },

    prune() {
      let removed = 0;
      for (const key of ownKeys()) {
        const text = adapter.get(prefix + key);
        if (text === null) continue;
        const envelope = decode(key, text);
        if (envelope.expiresAt !== undefined && envelope.expiresAt <= now()) {
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
      const value = fn((current?.value ?? null) as never);
      const envelope: Envelope = { v: 1, value, createdAt: now() };
      if (current?.expiresAt !== undefined) envelope.expiresAt = current.expiresAt;
      const version = current?.version ?? latestVersion(migrations[key]);
      if (version !== undefined) envelope.version = version;
      write(key, envelope);
      return value;
    },

    getOrSet(key, factory, setOptions) {
      const current = read(key);
      if (current) return current.value as never;
      const value = factory();
      storage.set(key, value, setOptions);
      return value;
    },

    touch(key, ttl) {
      const current = read(key);
      if (!current) return false;
      adapter.set(prefix + key, encode(key, { ...current, expiresAt: now() + ttl }));
      return true;
    },

    snapshot() {
      const out: Record<string, StorageEntry<unknown>> = {};
      for (const item of liveItems()) out[item.key] = item.entry as StorageEntry<unknown>;
      return out as never;
    },

    restore(snapshot, restoreOptions = {}) {
      let written = 0;
      for (const [key, entry] of Object.entries(snapshot as Record<string, StorageEntry<unknown> | undefined>)) {
        if (!entry) continue;
        if (!restoreOptions.overwrite && read(key)) continue;
        if (entry.expiresAt !== undefined && entry.expiresAt <= now()) continue;
        const envelope: Envelope = { v: 1, value: entry.value, createdAt: entry.createdAt };
        if (entry.expiresAt !== undefined) envelope.expiresAt = entry.expiresAt;
        if (entry.version !== undefined) envelope.version = entry.version;
        write(key, envelope);
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
      return createStorage({ adapter, serializer, now, namespace: joinNamespace(options.namespace, name) });
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
