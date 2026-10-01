import type { EncryptionOptions } from '../encryption/types.js';

/** The value types a typed storage holds, by key. */
export type StorageSchema = Record<string, unknown>;

/** The keys of a schema that can name a stored value. */
export type StorageKey<S> = Extract<keyof S, string>;

/**
 * Where data lives and for how long. A lifecycle, not an implementation: `local` survives a
 * browser restart, `session` the tab, `request` one server request, `memory` the process or
 * page, `cookie` travels with each request, `persistent` a server-side store.
 */
export type StorageScope = 'local' | 'session' | 'request' | 'memory' | 'cookie' | 'persistent';

/** What an adapter can actually guarantee. Nothing it cannot. */
export interface StorageCapabilities {
  /** Reads and writes return at once. */
  synchronous: boolean;
  /** Data outlives the page or process that wrote it. */
  persistent: boolean;
  /** The adapter reports changes made elsewhere (another tab, another writer). */
  reactive: boolean;
  /** Data is shared beyond this execution context (tabs, requests, devices). */
  crossContext: boolean;
  /** The adapter expires entries itself. The storage expires them either way. */
  expiration: boolean;
  /** Several writes can be applied together or not at all. */
  transactions: boolean;
}

/** A change an adapter observed from outside this storage instance. `key: null` is a clear. */
export interface AdapterChange {
  key: string | null;
  value: string | null;
}

/**
 * A synchronous backend. It stores strings; serialization, namespaces and expiry belong to the
 * storage around it, so an adapter stays small and every adapter gets them.
 */
export interface StorageAdapter {
  readonly name: string;
  readonly scope: StorageScope;
  readonly capabilities: StorageCapabilities;
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  has(key: string): boolean;
  keys(): string[];
  clear(): void;
  /** Changes made outside this instance, when the backend can report them. */
  subscribe?(listener: (change: AdapterChange) => void): () => void;
}

/** A stored value and what is known about it. */
export interface StorageEntry<T> {
  value: T;
  /** Epoch milliseconds when it was written; 0 when the value was written without metadata. */
  createdAt: number;
  /** Epoch milliseconds after which it reads as absent. */
  expiresAt?: number;
  /** The value's schema version, for migrations. */
  version?: number;
  /** Present when the value is stored encrypted. */
  encrypted?: true;
}

export interface SetOptions {
  /** Milliseconds until the entry expires. Checked on every read, so it survives reloads. */
  ttl?: number;
  /** The value's schema version. Defaults to the latest migration for the key, when any. */
  version?: number;
}

export type StorageEventType = 'set' | 'remove' | 'clear' | 'expire';

export interface StorageEvent<S = StorageSchema> {
  type: StorageEventType;
  /** The key, without the namespace; null for a clear. */
  key: StorageKey<S> | null;
  /** The new value, for `set`. */
  value?: unknown;
  /** True when the change came from outside this instance (another tab). */
  external: boolean;
}

export interface StorageSerializer {
  serialize(value: unknown): string;
  deserialize<T = unknown>(text: string): T;
}

/** Per key, the function that brings a value up to each version. */
export type StorageMigrations<S> = { [K in StorageKey<S>]?: Record<number, (value: unknown) => unknown> };

export interface StorageOptions<S extends StorageSchema = StorageSchema> {
  /** Where values live. Defaults to an in-memory adapter. */
  adapter?: StorageAdapter;
  /** Prefix for every key: `app` stores `theme` as `app:theme`. */
  namespace?: string;
  /** Defaults to the strict JSON serializer. */
  serializer?: StorageSerializer;
  migrations?: StorageMigrations<S>;
  /** The clock for expiry; for tests. */
  now?: () => number;
}

type Listener<S> = (event: StorageEvent<S>) => void;

/** A stored value with its key, as `entries` and `search` return it. */
export interface StoredItem<S extends StorageSchema, K extends StorageKey<S> = StorageKey<S>> {
  key: K;
  value: S[K];
  entry: StorageEntry<S[K]>;
}

export interface StorageQuery<S extends StorageSchema> {
  /** Keys starting with this. */
  prefix?: string;
  /** Keys matching a glob (`draft:*`, `user:?`) or a RegExp. */
  match?: string | RegExp;
  /** Keep the items this returns true for: by value, key or metadata. */
  where?: (item: StoredItem<S>) => boolean;
  /** At most this many, in key order. */
  limit?: number;
}

/** What a storage holds, roughly: for quota decisions, not accounting. */
export interface StorageUsage {
  keys: number;
  /** UTF-16 code units of keys and stored text, times two: what browsers count against quota. */
  bytes: number;
}

/** Plain data for export and import: key to value, with optional metadata. */
export type StorageSnapshot<S extends StorageSchema = StorageSchema> = {
  [K in StorageKey<S>]?: StorageEntry<S[K]>;
};

/** One typed key/value API, whatever the adapter underneath. */
export interface TypedStorage<S extends StorageSchema = StorageSchema> {
  /**
   * The value, or null when absent or expired. With a schema the type follows the key; without
   * one, name it: `storage.get<User>('user')`.
   */
  get<T = never, K extends StorageKey<S> = StorageKey<S>>(key: K): ([T] extends [never] ? S[K] : T) | null;
  /** The value with its metadata, or null when absent or expired. */
  getEntry<T = never, K extends StorageKey<S> = StorageKey<S>>(key: K): StorageEntry<[T] extends [never] ? S[K] : T> | null;
  set<K extends StorageKey<S>>(key: K, value: S[K], options?: SetOptions): void;
  remove(key: StorageKey<S>): void;
  /** True when a value is stored and not expired. */
  has(key: StorageKey<S>): boolean;
  /** The keys under this storage's namespace, without it. */
  keys(): StorageKey<S>[];
  /** Removes every key under this namespace (everything, without a namespace). */
  clear(): void;
  /** Every live item, in key order. Expired ones are removed on the way. */
  entries(): StoredItem<S>[];
  /** The live items a query selects, in key order. */
  search(query: StorageQuery<S>): StoredItem<S>[];
  /** How many live items there are. */
  size(): number;
  /** Removes every expired item now, rather than on its next read. Returns how many. */
  prune(): number;
  /** Keys and approximate bytes stored under this namespace. */
  usage(): StorageUsage;
  /** Reads, transforms and writes back one value; `fn` receives null when absent. Keeps the expiry. */
  update<K extends StorageKey<S>>(key: K, fn: (current: S[K] | null) => S[K]): S[K];
  /** The value, or the factory's result stored under the key when absent. */
  getOrSet<K extends StorageKey<S>>(key: K, factory: () => S[K], options?: SetOptions): S[K];
  /** Gives a stored value a new expiry, `ttl` from now. False when absent. */
  touch(key: StorageKey<S>, ttl: number): boolean;
  /** Every live item with its metadata, as plain data. */
  snapshot(): StorageSnapshot<S>;
  /** Writes items from a snapshot, keeping their metadata; existing keys are kept unless `overwrite`. */
  restore(snapshot: StorageSnapshot<S>, options?: { overwrite?: boolean }): number;
  /** A storage whose keys live under `name` inside this one. */
  namespace<S2 extends StorageSchema = StorageSchema>(name: string): TypedStorage<S2>;
  /** Every change; returns the unsubscribe. */
  subscribe(listener: Listener<S>): () => void;
  /** Changes to one key; returns the unsubscribe. */
  subscribe(key: StorageKey<S>, listener: Listener<S>): () => void;
  readonly capabilities: StorageCapabilities;
  readonly scope: StorageScope;
}

type MaybePromise<T> = T | Promise<T>;

/** An adapter whose backend may answer later: IndexedDB, a remote store. Every sync adapter is one. */
export interface AsyncStorageAdapter {
  readonly name: string;
  readonly scope: StorageScope;
  readonly capabilities: StorageCapabilities;
  get(key: string): MaybePromise<string | null>;
  set(key: string, value: string): MaybePromise<void>;
  remove(key: string): MaybePromise<void>;
  has(key: string): MaybePromise<boolean>;
  keys(): MaybePromise<string[]>;
  clear(): MaybePromise<void>;
  subscribe?(listener: (change: AdapterChange) => void): () => void;
}

export interface AsyncSetOptions extends SetOptions {
  /** Store this value encrypted. Needs `encryption` on the storage. Reads detect it on their own. */
  encrypt?: boolean;
}

export interface AsyncStorageOptions<S extends StorageSchema = StorageSchema> extends Omit<StorageOptions<S>, 'adapter'> {
  adapter?: StorageAdapter | AsyncStorageAdapter;
  encryption?: EncryptionOptions;
}

/** The storage API with every operation awaited. Encryption lives here. */
export interface AsyncTypedStorage<S extends StorageSchema = StorageSchema> {
  get<T = never, K extends StorageKey<S> = StorageKey<S>>(key: K): Promise<([T] extends [never] ? S[K] : T) | null>;
  getEntry<T = never, K extends StorageKey<S> = StorageKey<S>>(key: K): Promise<StorageEntry<[T] extends [never] ? S[K] : T> | null>;
  set<K extends StorageKey<S>>(key: K, value: S[K], options?: AsyncSetOptions): Promise<void>;
  remove(key: StorageKey<S>): Promise<void>;
  has(key: StorageKey<S>): Promise<boolean>;
  keys(): Promise<StorageKey<S>[]>;
  clear(): Promise<void>;
  /** Every live item, decrypted, in key order. */
  entries(): Promise<StoredItem<S>[]>;
  search(query: StorageQuery<S>): Promise<StoredItem<S>[]>;
  size(): Promise<number>;
  /** Removes expired items without decrypting anything. */
  prune(): Promise<number>;
  usage(): Promise<StorageUsage>;
  /** Keeps the expiry and the encryption state unless `options.encrypt` says otherwise. */
  update<K extends StorageKey<S>>(key: K, fn: (current: S[K] | null) => MaybePromise<S[K]>, options?: { encrypt?: boolean }): Promise<S[K]>;
  getOrSet<K extends StorageKey<S>>(key: K, factory: () => MaybePromise<S[K]>, options?: AsyncSetOptions): Promise<S[K]>;
  touch(key: StorageKey<S>, ttl: number): Promise<boolean>;
  /** Decrypted values, each marked `encrypted` so `restore` encrypts it again. */
  snapshot(): Promise<StorageSnapshot<S>>;
  restore(snapshot: StorageSnapshot<S>, options?: { overwrite?: boolean }): Promise<number>;
  namespace<S2 extends StorageSchema = StorageSchema>(name: string): AsyncTypedStorage<S2>;
  /** An external change to an encrypted entry arrives without `value`: decrypting is async. */
  subscribe(listener: Listener<S>): () => void;
  subscribe(key: StorageKey<S>, listener: Listener<S>): () => void;
  readonly capabilities: StorageCapabilities;
  readonly scope: StorageScope;
  /** True when this storage can encrypt: `encryption` was configured. */
  readonly encryption: boolean;
}
