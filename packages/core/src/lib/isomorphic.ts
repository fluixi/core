/**
 * Isomorphic request state, the generic form of "ensureInit + transfer".
 *
 * A value that is resolved ONCE on the server (per request, before the app renders),
 * serialized into the page, and seeded SYNCHRONOUSLY on the client so the first client
 * render matches the server (no hydration mismatch) and nothing refetches.
 *
 * - Server: @fluixi/server's `preloadServerState(event)` walks the registry below,
 *   runs each `server(event)` resolver, sets the signal, and stashes the value for
 *   serialization (it lands in `window.__FX_DATA__['__iso:<key>']`).
 * - Client: `createIsomorphicState` reads that seed at creation and starts there.
 *
 * This module is client-safe (no node imports) so app stores can call it on both sides.
 * It talks to @fluixi/server only through a `globalThis` registry, no import edge.
 *
 * NOTE (prototype): the signal is module-scoped, so concurrent SSR requests share it.
 * That is fine for a single default value; per-user, per-request isolation wants the
 * request-scoped (AsyncLocalStorage) store, a follow-up.
 */
import { createSignal, createMemo, type Accessor } from '@fluixi/reactive/signal';
import { getServerData } from '@fluixi/dom';
import { createSyncStorage, type TypedStorage } from '@fluixi/storage';
import { localStorageAdapter } from '@fluixi/storage/browser';

const REGISTRY_KEY = '__fluixi_iso_states__';
const SEED_PREFIX = '__iso:';

interface IsoEntry {
  server: (event: any) => any;
  set: (v: any) => void;
}

function registry(): Map<string, IsoEntry> {
  return ((globalThis as any)[REGISTRY_KEY] ??= new Map<string, IsoEntry>());
}

export interface IsomorphicState<T> {
  /** Reactive accessor for the current value (a real signal: safe in JSX/control flow). */
  value: Accessor<T | undefined>;
  /** Update the value (client-side preference changes, optimistic updates). */
  set: (v: T | undefined) => void;
  /** Stable serialization key. */
  key: string;
}

export interface IsomorphicOptions<T> {
  /** Resolve the value on the server for this request (receives the RequestEvent). */
  server: (event: any) => T | Promise<T>;
  /** Optional client-only initial value when there is no server seed (pure SPA load). */
  client?: () => T | undefined;
  /** Value before resolution. */
  fallback?: T;
}

/** The server seed for `key`, if the page was server-rendered. */
function readSeed<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  const data = getServerData();
  return data ? (data[SEED_PREFIX + key] as T | undefined) : undefined;
}

/**
 * A value resolved on the server, transferred to the client, and resolvable there too.
 *
 * The server resolver runs per request and its result is serialized into the page, so the
 * client starts with the answer rather than fetching it again. On a cold client load with
 * no seed, the client resolver runs once instead.
 *
 * `key` names the transfer slot and has to be stable across the two sides.
 *
 * @example
 * ```ts
 * const user = createIsomorphicState('user', {
 *   server: (event) => event.locals.user,
 *   client: () => fetch('/api/me').then((r) => r.json()),
 * });
 * ```
 */
export function createIsomorphicState<T>(
  key: string,
  options: IsomorphicOptions<T>,
): IsomorphicState<T> {
  const seed = readSeed<T>(key);
  const initial =
    seed !== undefined
      ? seed
      : typeof window !== 'undefined' && options.client
        ? options.client()
        : options.fallback;

  const [value, set] = createSignal<T | undefined>(initial, { name: key });
  registry().set(key, { server: options.server, set: set as (v: any) => void });

  return { value, set: set as (v: T | undefined) => void, key };
}

// ─── createIsomorphicStore ─────────────────────────────────────────────────────
//
// The object-shaped sibling of createIsomorphicState: for an isomorphic value that
// is a RECORD ({ active, list }, { region, regions }, ...). It removes the boilerplate
// that piles up when you hand-roll this on top of the single-value primitive:
//
//   - per-field accessors (so JSX reads `store.fields.region()`, fine-grained)
//   - a field setter that PRESERVES the other fields (no `{ ...current, k: v }` by hand)
//   - a built-in `ensureInit()`, memoised once + retry-on-failure, that runs the
//     async `client` resolver exactly once on a pure-SPA cold load and is a no-op
//     when the server already seeded the value (kills the duplicate cold-load fetch)
//   - optional `persist` mirror into storage on every write
//
// Server-resolve / serialize / client-seed all flow through createIsomorphicState, so
// the @fluixi/server half (preloadServerState) needs no changes.

export interface IsomorphicStore<T extends Record<string, any>> {
  /** Reactive accessor for the whole record (always defined: falls back to `fallback`). */
  value: Accessor<T>;
  /** Per-field reactive accessors, one for every key of `fallback`. */
  fields: { [K in keyof T]: Accessor<T[K]> };
  /** Replace the whole record. */
  set: (v: T) => void;
  /** Update ONE field, preserving the rest. */
  setField: <K extends keyof T>(key: K, val: T[K]) => void;
  /**
   * Run the async `client` resolver exactly once (memoised; the promise is reset on
   * failure so a later call can retry). A no-op when the value was server-seeded, the
   * server already resolved and transferred it, so there is nothing to fetch.
   */
  ensureInit: () => Promise<void>;
  /** Stable serialization key. */
  key: string;
}

export interface IsomorphicStoreOptions<T> {
  /** Resolve the record on the server for this request (receives the RequestEvent). */
  server: (event: any) => T | Promise<T>;
  /** Resolve the record on a pure-SPA cold load (no server seed). Run once by ensureInit(). */
  client?: () => T | Promise<T>;
  /** Value before resolution / the per-field accessor key set. Required for a store. */
  fallback: T;
  /**
   * Mirror the record into storage on every write: a key in localStorage, or a key in a
   * storage of your own (`useStorage({ scope: 'cookie' })` to have the server see it too).
   */
  persist?: string | { storage: TypedStorage<any>; key: string };
}

/**
 * `createIsomorphicState` for a record, exposed as a store rather than a single value.
 *
 * Reads track per key, so a component using one field is untouched when another changes.
 * Otherwise the transfer is the same: the server resolver runs per request, the result is
 * serialized into the page, and a seeded client does not refetch.
 *
 * @example
 * ```ts
 * const settings = createIsomorphicStore('settings', {
 *   server: (event) => loadSettings(event.locals.userId),
 *   client: () => fetch('/api/settings').then((r) => r.json()),
 * });
 * settings.state.theme;   // tracks `theme` alone
 * ```
 */
export function createIsomorphicStore<T extends Record<string, any>>(
  key: string,
  options: IsomorphicStoreOptions<T>,
): IsomorphicStore<T> {
  // Whether the server transferred a value for this key (read before the base state
  // consumes the seed). When true, ensureInit() must not refetch on the client.
  const seeded = readSeed<T>(key) !== undefined;

  const base = createIsomorphicState<T>(key, {
    server: options.server,
    fallback: options.fallback,
  });

  const value: Accessor<T> = () => base.value() ?? options.fallback;

  const persistWrite = (v: T): void => {
    const target = options.persist;
    if (!target) return;
    if (typeof target === 'string' && typeof window === 'undefined') return;
    try {
      const { storage, key } = typeof target === 'string' ? { storage: createSyncStorage({ adapter: localStorageAdapter() }), key: target } : target;
      storage.set(key, v);
    } catch {
      /* quota / private mode: persistence is best-effort */
    }
  };

  const set = (v: T): void => {
    base.set(v);
    persistWrite(v);
  };
  const setField = <K extends keyof T>(k: K, val: T[K]): void => {
    set({ ...value(), [k]: val });
  };

  const fields = {} as { [K in keyof T]: Accessor<T[K]> };
  for (const k of Object.keys(options.fallback) as (keyof T)[]) {
    // Named for the devtools graph: `auth.user` rather than an anonymous memo.
    fields[k] = createMemo(() => value()[k], undefined, { name: `${key}.${String(k)}` });
  }

  let initPromise: Promise<void> | null = null;
  const ensureInit = (): Promise<void> => {
    if (seeded || !options.client) return Promise.resolve();
    if (!initPromise) {
      initPromise = Promise.resolve(options.client())
        .then((v) => {
          set(v);
        })
        .catch((e) => {
          initPromise = null; // allow a retry on the next call
          throw e;
        });
    }
    return initPromise;
  };

  return { value, fields, set, setField, ensureInit, key };
}
