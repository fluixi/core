import { getOwner, onCleanup, signal, untrack, type Accessor } from '@fluixi/reactive/signal';
import type { AsyncTypedStorage, SetOptions, StorageKey, StorageSchema, TypedStorage } from '@fluixi/storage';

type Next<T> = T | ((previous: T) => T);

export interface PersistedOptions<T> {
  /** The value while the key is absent, expired or removed. Without it, null. */
  fallback?: T;
  /** Every write expires this long after it is made. */
  ttl?: number;
  /** Async storage only: store each write encrypted. */
  encrypt?: boolean;
  /** For devtools. Defaults to `storage:<prefix><key>`. */
  name?: string;
}

/** A signal whose value lives in a storage key. Writes go to the storage first. */
export type Persisted<T> = Accessor<T> & {
  /** Writes the storage, then the signal. Throws what the storage throws, leaving both as they were. */
  set(next: Next<T>, options?: SetOptions): void;
  /** Removes the key; the signal falls back. */
  remove(): void;
};

/** The awaited form, over an async (or encrypted) storage. */
export type AsyncPersisted<T> = Accessor<T> & {
  /** Sets the signal at once and writes the storage; on failure the signal goes back and this rejects. */
  set(next: Next<T>, options?: SetOptions & { encrypt?: boolean }): Promise<void>;
  remove(): Promise<void>;
  /** Settles once the stored value has been read. Until then the signal holds the fallback. */
  readonly ready: Promise<void>;
};

const isAsync = (storage: TypedStorage<any> | AsyncTypedStorage<any>): storage is AsyncTypedStorage<any> => 'encryption' in storage;

/**
 * A signal bound to one key of a storage: it starts with the stored value, writes through on
 * `set`, and follows changes made by any other storage over the same adapter, or by another
 * tab where the adapter reports them. Created under an owner, it stops listening with it.
 *
 * Over a cookie storage it reads the same value in the server render and in the browser, so a
 * stored preference renders without a flash. An async storage cannot answer during the render;
 * the signal holds the fallback until `ready`.
 *
 * @example
 * const theme = persisted(useStorage({ scope: 'cookie', namespace: 'ui' }), 'theme', { fallback: 'light' });
 * theme.set((t) => (t === 'light' ? 'dark' : 'light'));
 */
export function persisted<S extends StorageSchema, K extends StorageKey<S>>(
  storage: TypedStorage<S>,
  key: K,
  options: PersistedOptions<S[K]> & { fallback: S[K] },
): Persisted<S[K]>;
export function persisted<S extends StorageSchema, K extends StorageKey<S>>(
  storage: TypedStorage<S>,
  key: K,
  options?: PersistedOptions<S[K]>,
): Persisted<S[K] | null>;
export function persisted<S extends StorageSchema, K extends StorageKey<S>>(
  storage: AsyncTypedStorage<S>,
  key: K,
  options: PersistedOptions<S[K]> & { fallback: S[K] },
): AsyncPersisted<S[K]>;
export function persisted<S extends StorageSchema, K extends StorageKey<S>>(
  storage: AsyncTypedStorage<S>,
  key: K,
  options?: PersistedOptions<S[K]>,
): AsyncPersisted<S[K] | null>;
export function persisted(
  storage: TypedStorage<any> | AsyncTypedStorage<any>,
  key: string,
  options: PersistedOptions<unknown> = {},
): Persisted<unknown> | AsyncPersisted<unknown> {
  const fallback = options.fallback ?? null;
  const name = options.name ?? `storage:${storage.keyPrefix}${key}`;
  // `set(() => v)`: a stored function value would otherwise be called as an updater.
  const state = signal<unknown>(isAsync(storage) ? fallback : (storage.get(key) ?? fallback), { name });
  const put = (value: unknown) => state.set(() => value);
  const resolve = (next: Next<unknown>) => (typeof next === 'function' ? (next as (p: unknown) => unknown)(untrack(state)) : next);
  const writeOptions = (extra?: SetOptions & { encrypt?: boolean }) => ({
    ...(options.ttl !== undefined ? { ttl: options.ttl } : {}),
    ...(options.encrypt ? { encrypt: true } : {}),
    ...extra,
  });

  if (!isAsync(storage)) {
    const off = storage.subscribe(key, (event) => {
      if (event.type !== 'set') return put(fallback);
      // An external write to an encrypted entry carries no value; reading it here would throw.
      if (event.value !== undefined) put(event.value);
    });
    if (getOwner()) onCleanup(off);
    return Object.assign(() => state(), {
      set(next: Next<unknown>, extra?: SetOptions) {
        const value = resolve(next);
        storage.set(key, value as never, writeOptions(extra));
        put(value);
      },
      remove() {
        storage.remove(key);
        put(fallback);
      },
    });
  }

  let written = false;
  const reread = () =>
    storage.get(key).then(
      (value) => put(value ?? fallback),
      () => undefined,
    );
  const off = storage.subscribe(key, (event) => {
    if (event.type !== 'set') return put(fallback);
    if (event.value !== undefined) put(event.value);
    else void reread();
  });
  if (getOwner()) onCleanup(off);
  const ready = storage.get(key).then((value) => {
    // A write made before the first read finished is newer than what it found.
    if (!written) put(value ?? fallback);
  });
  return Object.assign(() => state(), {
    ready,
    async set(next: Next<unknown>, extra?: SetOptions & { encrypt?: boolean }) {
      const previous = untrack(state);
      const value = resolve(next);
      written = true;
      put(value);
      try {
        await storage.set(key, value as never, writeOptions(extra));
      } catch (error) {
        put(previous);
        throw error;
      }
    },
    async remove() {
      written = true;
      await storage.remove(key);
      put(fallback);
    },
  });
}
