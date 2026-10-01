/**
 * Storage inside a Fluixi app: `useStorage` picks the backend for where the code runs, so one
 * component reads the same value on the server and in the browser. The storage itself is
 * `@fluixi/storage`; this module only binds it to the request, the owner tree and the page data.
 */
import { appendResponseHeader, getRequestContext, getServerData, type RequestContext } from '@fluixi/dom';
import { createContext, useContext } from '@fluixi/reactive/signal';
import {
  createAsyncStorage,
  createSyncStorage,
  memoryStorage,
  StorageUnavailableError,
  type AsyncTypedStorage,
  type EncryptionOptions,
  type StorageAdapter,
  type StorageEntry,
  type StorageKey,
  type StorageOptions,
  type StorageSchema,
  type TypedStorage,
} from '@fluixi/storage';
import { documentCookieAdapter, localStorageAdapter, sessionStorageAdapter } from '@fluixi/storage/browser';
import { cookieStorage, requestStorage, toStorageRequest, type RequestLike } from '@fluixi/storage/server';
import type { CookieOptions } from '@fluixi/utils/cookie';

/**
 * Where `useStorage` keeps values.
 *
 * - `auto`: a storage from `<StorageProvider>` when there is one; else localStorage in the
 *   browser and the request's own storage during a server render.
 * - `local`, `session`: the browser's storages. Reading them on a server throws.
 * - `request`: values for one server request, or for the page's lifetime in the browser.
 * - `cookie`: the request's cookies on the server, `document.cookie` in the browser. Both sides
 *   read the same value, which is what server-rendered preferences such as a theme need.
 */
export type UseStorageScope = 'auto' | 'local' | 'session' | 'request' | 'cookie';

export interface UseStorageCookieOptions extends CookieOptions {
  /** Largest `name=value` in bytes. Defaults to 4096. */
  maxSize?: number;
}

export interface UseStorageOptions<S extends StorageSchema = StorageSchema> extends Omit<StorageOptions<S>, 'adapter'> {
  scope?: UseStorageScope;
  /**
   * Cookie attributes for `scope: 'cookie'`. `httpOnly` defaults to false here, since the browser
   * half has to read the cookie; set it to true for a value only the server reads.
   */
  cookie?: UseStorageCookieOptions;
}

export interface UseAsyncStorageOptions<S extends StorageSchema = StorageSchema> extends UseStorageOptions<S> {
  /** Per-item encryption: `set(key, value, { encrypt: true })`, reads decrypt on their own. */
  encryption?: EncryptionOptions;
}

const StorageContext = createContext<TypedStorage<any> | undefined>(undefined, 'storage');
const AsyncStorageContext = createContext<AsyncTypedStorage<any> | undefined>(undefined, 'asyncStorage');

const isAsyncStorage = (storage: TypedStorage<any> | AsyncTypedStorage<any>): storage is AsyncTypedStorage<any> => 'encryption' in storage;

/**
 * Hands `storage` to every `useStorage()` below that asks for `scope: 'auto'` (the default), or
 * to every `useAsyncStorage()` when it is an asynchronous one: a test's memory storage, an
 * encrypted or app-specific one.
 *
 * @example
 * <StorageProvider storage={createStorage({ adapter: memoryStorage() })}>
 *   <Settings />
 * </StorageProvider>
 */
export function StorageProvider(props: { storage: TypedStorage<any> | AsyncTypedStorage<any>; children?: unknown }): any {
  const context = isAsyncStorage(props.storage) ? AsyncStorageContext : StorageContext;
  return (context.Provider as (p: { value: unknown; children?: unknown }) => any)({
    value: props.storage,
    get children() {
      return props.children;
    },
  });
}

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

// One adapter per request and kind, so a cookie written early in a render reads back later in
// the same render. Weakly held: they go with the request.
const perRequest = new WeakMap<RequestContext, Map<string, StorageAdapter>>();
// In the browser there is one user and one page, so the page is the scope.
const perPage = new Map<string, StorageAdapter>();

function cached(scope: Map<string, StorageAdapter>, id: string, make: () => StorageAdapter): StorageAdapter {
  let adapter = scope.get(id);
  if (!adapter) scope.set(id, (adapter = make()));
  return adapter;
}

function requestRequired(scope: string): never {
  throw new StorageUnavailableError(
    `useStorage({ scope: '${scope}' }) on the server needs a request: call it during a render, a loader or a server function, or provide a storage with <StorageProvider>.`,
  );
}

function adapterFor(scope: Exclude<UseStorageScope, 'auto'>, cookie: UseStorageCookieOptions = {}): StorageAdapter {
  const ctx = getRequestContext();
  const options = { httpOnly: false, ...cookie };
  switch (scope) {
    case 'local':
      return localStorageAdapter();
    case 'session':
      return sessionStorageAdapter();
    case 'request':
      if (isBrowser()) return cached(perPage, 'request', memoryStorage);
      if (!ctx) requestRequired(scope);
      return cached(perRequest.get(ctx) ?? perRequest.set(ctx, new Map()).get(ctx)!, 'request', requestStorage);
    case 'cookie': {
      const id = `cookie:${JSON.stringify(options)}`;
      if (isBrowser()) {
        const { httpOnly: _ignored, ...browser } = options;
        return cached(perPage, id, () => documentCookieAdapter(browser));
      }
      if (!ctx) requestRequired(scope);
      const raw = ctx.event.request as RequestLike | undefined;
      // Bound now: an async write resumes after awaits, where the ambient request may be gone.
      const target = (raw && typeof raw === 'object' ? raw : undefined) as object | undefined;
      return cached(perRequest.get(ctx) ?? perRequest.set(ctx, new Map()).get(ctx)!, id, () =>
        cookieStorage({
          ...options,
          request: raw && typeof raw === 'object' && ('headers' in raw || 'getHeader' in raw) ? toStorageRequest(raw) : undefined,
          response: {
            appendHeader(name, value) {
              if (!appendResponseHeader(name, value, target)) {
                throw new StorageUnavailableError('The response headers were already sent, so this cookie cannot reach the browser. Write it before the page head goes out: in middleware, a loader, a server function or the render before its first chunk.');
              }
            },
          },
        }),
      );
    }
  }
}

/**
 * A typed storage for the place this code runs. Call it in a component, a loader or a server
 * function; the scope decides the backend (see `UseStorageScope`) and the rest of the options
 * are those of `createStorage`.
 *
 * Server-side state never lives in a module: each request gets its own adapters, so two
 * visitors rendering at once never see each other's values.
 *
 * @example
 * const prefs = useStorage<{ theme: 'light' | 'dark' }>({ scope: 'cookie', namespace: 'ui', cookie: { maxAge: 31536000 } });
 * const theme = prefs.get('theme') ?? 'light';
 */
export function useStorage<S extends StorageSchema = StorageSchema>(options: UseStorageOptions<S> = {}): TypedStorage<S> {
  const { scope = 'auto', cookie, ...storageOptions } = options;
  if (scope === 'auto') {
    const provided = useContext(StorageContext) as TypedStorage<any> | undefined;
    if (provided) return (options.namespace ? provided.namespace(options.namespace) : provided) as TypedStorage<S>;
  }
  return createSyncStorage({ ...storageOptions, adapter: resolveAdapter(scope, cookie) });
}

/**
 * `useStorage` with every operation awaited, and the one that can encrypt. Same scopes, same
 * per-request isolation; with `scope: 'auto'` it takes an asynchronous storage from
 * `<StorageProvider>` first.
 *
 * @example
 * const vault = useAsyncStorage<{ token: string }>({ namespace: 'auth', encryption: { keyProvider } });
 * await vault.set('token', token, { encrypt: true });
 */
export function useAsyncStorage<S extends StorageSchema = StorageSchema>(options: UseAsyncStorageOptions<S> = {}): AsyncTypedStorage<S> {
  const { scope = 'auto', cookie, ...storageOptions } = options;
  if (scope === 'auto') {
    const provided = useContext(AsyncStorageContext) as AsyncTypedStorage<any> | undefined;
    if (provided) return (options.namespace ? provided.namespace(options.namespace) : provided) as AsyncTypedStorage<S>;
  }
  return createAsyncStorage({ ...storageOptions, adapter: resolveAdapter(scope, cookie) });
}

function resolveAdapter(scope: UseStorageScope, cookie?: UseStorageCookieOptions): StorageAdapter {
  if (scope !== 'auto') return adapterFor(scope, cookie);
  if (isBrowser()) return adapterFor('local');
  if (!getRequestContext()) requestRequired(scope);
  return adapterFor('request');
}

const SLOT = '__storage:';
const seeded = new Set<string>();

/**
 * Carries `keys` from the server render to the browser. On the server it puts their values,
 * with expiry and version, in the page data; in the browser, the first call for a key writes
 * the server's value into `storage`, and later calls leave the browser's own value alone.
 *
 * Meant for request-scoped values the page needs again: call it with the same keys on both
 * sides. The page data is readable by anyone who sees the page, so never hydrate a secret,
 * and an encrypted value throws here rather than travel in clear.
 *
 * @example
 * const scratch = useStorage<{ draft: Draft }>({ scope: 'request', namespace: 'editor' });
 * hydrateStorage(scratch, ['draft']);
 */
export function hydrateStorage<S extends StorageSchema>(storage: TypedStorage<S>, keys: StorageKey<S>[]): void {
  const slot = SLOT + storage.keyPrefix;
  if (!isBrowser()) {
    const ctx = getRequestContext();
    if (!ctx) return;
    const entries = (ctx.data.get(slot) as Record<string, StorageEntry<unknown>> | undefined) ?? {};
    for (const key of keys) {
      const entry = storage.getEntry(key);
      if (entry) entries[key] = entry;
    }
    ctx.data.set(slot, entries);
    return;
  }
  const entries = getServerData()?.[slot] as Record<string, StorageEntry<unknown>> | undefined;
  if (!entries) return;
  const fresh: Record<string, StorageEntry<unknown>> = {};
  for (const key of keys) {
    const id = slot + key;
    if (seeded.has(id) || !entries[key]) continue;
    seeded.add(id);
    fresh[key] = entries[key];
  }
  storage.restore(fresh as never, { overwrite: true });
}

export { persisted, type Persisted, type AsyncPersisted, type PersistedOptions } from './persisted.js';
