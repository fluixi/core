/**
 * createCachedResource — reactive resource with TTL-based caching.
 *
 * Fetches once and returns the cached result for subsequent reads within the
 * TTL window. After the TTL expires the next read triggers a re-fetch.
 *
 * Two forms (mirrors createResource):
 *
 *   // 1. no reactive source
 *   const [data, { refetch, invalidate }] = createCachedResource(
 *     () => apiClient.get('/data'),
 *     { ttl: 5 * 60_000, name: 'my-data' }
 *   );
 *
 *   // 2. reactive source (re-fetches when source value changes)
 *   const [data, { refetch, invalidate }] = createCachedResource(
 *     () => workspaceId(),
 *     (id) => apiClient.get(`/workspaces/${id}`),
 *     { ttl: 5 * 60_000, name: 'workspace' }
 *   );
 *
 * Options:
 *   ttl                  — cache lifetime in ms. Default: Infinity (manual invalidate only)
 *   name                 — cache namespace. If omitted, each call-site gets its own isolated cache.
 *   staleWhileRevalidate — when true (default), show stale data while background-fetching.
 *                          When false, show a loading state during revalidation.
 *
 * Resource shape (same as createResource):
 *   data()        — current value (throws pending promise during initial load for Suspense)
 *   data.loading  — true during initial load
 *   data.latest   — value without throwing
 *   data.error    — last error
 *   data.stale    — true when showing stale data during background revalidation
 *
 * Actions:
 *   refetch()     — force re-fetch regardless of TTL, keeps showing current value while loading
 *   invalidate()  — delete cache entry and re-fetch (shows loading on next read)
 */

import {
  createSignal,
  createEffect,
  onCleanup,
  batch,
  untrack,
  useContext,
  getSuspenseContext,
  trackResourcePromise,
  type Setter,
  type Resource,
  type ResourceState,
} from './signal.js';

// ── Module-level TTL cache ────────────────────────────────────────────────────
// Shared across instances that use the same `name + key` combination.

interface TtlEntry<T> {
  value: T;
  timestamp: number; // Date.now() when cached
}

const ttlCache = new Map<string, TtlEntry<any>>();
const inflight = new Map<string, Promise<any>>();
let _autoId = 0;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CachedResourceOptions {
  /**
   * Cache lifetime in milliseconds.
   * Default: `Infinity` — data lives until `invalidate()` is called.
   */
  ttl?: number;
  /**
   * Cache namespace. Two calls that share the same `name` share their cache
   * entries. When omitted, each `createCachedResource` call-site gets a
   * private cache isolated from all others.
   */
  name?: string;
  /**
   * When `true` (default), stale data is returned immediately while a
   * background re-fetch runs. The resource stays in `state='ready'` and
   * `stale=true` during revalidation — no loading skeleton.
   *
   * When `false`, a foreground re-fetch is triggered that sets
   * `state='refreshing'` (data is still visible but `loading=true`).
   */
  staleWhileRevalidate?: boolean;
}

export type CachedResource<T> = Resource<T> & {
  /** `true` while serving stale data during a background re-fetch. */
  stale: boolean;
};

export type CachedResourceReturn<T> = [
  CachedResource<T>,
  {
    mutate: Setter<T | undefined>;
    /** Force re-fetch, bypassing TTL. Current value stays visible. */
    refetch: () => void;
    /** Delete the cache entry for the current key and trigger a fresh fetch. */
    invalidate: () => void;
  },
];

// ── Symbol constants (must match signal.ts) ───────────────────────────────────
const $SIGNAL = Symbol.for('signal');
const $RESOURCE = Symbol.for('resource');

// ── Implementation ─────────────────────────────────────────────────────────────

/**
 * No-source overload — fetch is not keyed by any reactive value.
 */
export function createCachedResource<T>(
  fetcher: () => Promise<T> | T,
  options?: CachedResourceOptions,
): CachedResourceReturn<T>;

/**
 * With-source overload — fetch re-runs whenever the source accessor returns a
 * new value (falsy source suspends the fetch, same as `createResource`).
 */
export function createCachedResource<T, S>(
  source: () => S | false | null | undefined,
  fetcher: (key: S) => Promise<T> | T,
  options?: CachedResourceOptions,
): CachedResourceReturn<T>;

export function createCachedResource<T, S = true>(
  sourceOrFetcher: (() => S | false | null | undefined) | (() => Promise<T> | T),
  fetcherOrOptions?: ((key: S) => Promise<T> | T) | CachedResourceOptions,
  opts: CachedResourceOptions = {},
): CachedResourceReturn<T> {
  // ── Normalise overloads ──────────────────────────────────────────────────
  let sourceFn: () => S | false | null | undefined;
  let fetchFn: (key: S) => Promise<T> | T;
  let options: CachedResourceOptions;

  if (typeof fetcherOrOptions === 'function') {
    sourceFn = sourceOrFetcher as () => S;
    fetchFn = fetcherOrOptions;
    options = opts;
  } else {
    // No source — treat the first arg as fetcher, source = () => true
    sourceFn = () => true as unknown as S;
    fetchFn = sourceOrFetcher as unknown as (key: S) => Promise<T> | T;
    options = (fetcherOrOptions as CachedResourceOptions) ?? opts;
  }

  const {
    ttl = Infinity,
    name = `_auto_${_autoId++}`,
    staleWhileRevalidate = true,
  } = options;

  const ns = name;

  const buildKey = (key: S): string => `${ns}:${JSON.stringify(key)}`;

  const isFresh = (entry: TtlEntry<any>): boolean =>
    ttl === Infinity || Date.now() - entry.timestamp <= ttl;

  // ── Reactive state ────────────────────────────────────────────────────────
  const [value,         setValue]         = createSignal<T | undefined>(undefined, { equals: false });
  const [resourceState, setResourceState] = createSignal<ResourceState>('unresolved', { equals: false });
  const [resourceError, setResourceError] = createSignal<any>(undefined,  { equals: false });
  const [pendingP,      setPendingP]      = createSignal<Promise<T> | undefined>(undefined, { equals: false });
  const [isStale,       setIsStale]       = createSignal(false);
  const [tick,          setTick]          = createSignal(0, { equals: false });

  const UNSET = Symbol('unset');
  let prevKey: S | typeof UNSET = UNSET;
  let flagRefetch   = false;
  let flagInvalidate = false;

  // ── Fetch helper ──────────────────────────────────────────────────────────
  function doFetch(
    key: S,
    ck: string,
    background: boolean,
    isCancelled: () => boolean,
  ): void {
    // Attach to an in-flight request for the same key (dedup).
    if (inflight.has(ck)) {
      inflight.get(ck)!.then(
        (v) => { if (!isCancelled()) settle(v, background); },
        (e) => { if (!isCancelled() && !background) fail(e); },
      );
      if (!background) setPendingP(inflight.get(ck));
      return;
    }

    const promise: Promise<T> = Promise.resolve(fetchFn(key)).then(
      (v) => {
        ttlCache.set(ck, { value: v, timestamp: Date.now() });
        inflight.delete(ck);
        return v;
      },
      (e) => {
        inflight.delete(ck);
        throw e;
      },
    );
    inflight.set(ck, promise);

    if (!background) {
      trackResourcePromise(promise); // server async SSR: collect & await
      setPendingP(promise);
      // Register with nearest Suspense boundary for initial loads.
      const suspCtx = _SuspenseContext && useContext(_SuspenseContext);
      if (suspCtx) {
        suspCtx.increment();
        promise.finally(() => suspCtx.decrement());
      }
    }

    promise.then(
      (v) => { if (!isCancelled()) settle(v, background); },
      (e) => { if (!isCancelled() && !background) fail(e); },
    );
  }

  function settle(v: T, background: boolean): void {
    batch(() => {
      setValue(() => v);
      setResourceState('ready');
      setIsStale(false);
      setPendingP(undefined);
      setResourceError(undefined);
    });
  }

  function fail(e: unknown): void {
    batch(() => {
      setResourceError(e);
      setResourceState('errored');
      setPendingP(undefined);
    });
  }

  // ── Suspense context (lazy, avoid module-init order issues) ───────────────
  let _SuspenseContext: ReturnType<typeof getSuspenseContext> | undefined;

  // ── Main effect ───────────────────────────────────────────────────────────
  createEffect(() => {
    // Lazily grab the suspense context the first time the effect runs,
    // so it's looked up in the correct component Owner scope.
    if (_SuspenseContext === undefined) {
      _SuspenseContext = getSuspenseContext();
    }

    const key = sourceFn() as S | false | null | undefined;
    tick(); // track manual triggers

    // Suspend fetch when source is falsy (mirrors createResource)
    if (key === false || key === null || key === undefined) {
      prevKey = UNSET;
      batch(() => {
        setResourceState('unresolved');
        setPendingP(undefined);
        setResourceError(undefined);
      });
      return;
    }

    const doRefetch   = flagRefetch;
    const doInvalidate = flagInvalidate;
    flagRefetch   = false;
    flagInvalidate = false;

    const ck = buildKey(key as S);

    // Clear cache on explicit invalidate
    if (doInvalidate) ttlCache.delete(ck);

    const keyChanged = prevKey === UNSET || (key as unknown) !== prevKey;
    prevKey = key as S;

    let cancelled = false;
    onCleanup(() => { cancelled = true; });

    const cached = ttlCache.get(ck);

    // ── Cache HIT (fresh) ─────────────────────────────────────────────────
    if (cached && isFresh(cached) && !doRefetch && !doInvalidate) {
      // Serve synchronously — no loading state, no fetch.
      const cur = untrack(resourceState);
      if (cur !== 'ready' || untrack(value) !== cached.value) {
        batch(() => {
          setValue(() => cached!.value);
          setResourceState('ready');
          setIsStale(false);
          setResourceError(undefined);
        });
      }
      return;
    }

    // ── Cache HIT (stale) + staleWhileRevalidate ──────────────────────────
    if (cached && staleWhileRevalidate && !doInvalidate) {
      // Show stale value immediately, background-fetch new data.
      batch(() => {
        setValue(() => cached!.value);
        setResourceState('ready');
        setIsStale(true);
        setResourceError(undefined);
        setPendingP(undefined);
      });
      doFetch(key as S, ck, true /* background */, () => cancelled);
      return;
    }

    // ── No cache / invalidated / manual-refetch / SWR=false ──────────────
    // Show loading state (keeps current value visible during 'refreshing').
    const cur = untrack(resourceState);
    const isReload = cur === 'ready' || cur === 'refreshing';
    batch(() => {
      setResourceState(isReload ? 'refreshing' : 'pending');
      setResourceError(undefined);
      setIsStale(false);
    });
    doFetch(key as S, ck, false /* foreground */, () => cancelled);
  });

  // ── Resource accessor ─────────────────────────────────────────────────────
  // During 'pending': throw the pending promise → Suspense shows skeleton.
  // During 'refreshing': return stale value (no Suspense regression).
  // During 'ready'/'errored': return value or throw error.
  const resource = (() => {
    const e = resourceError();
    if (e) throw e;
    const s = resourceState();
    if (s === 'pending') {
      const p = pendingP();
      if (p) throw p;
    }
    return value();
  }) as CachedResource<T>;

  Object.defineProperty(resource, $RESOURCE, { value: true, enumerable: true });
  Object.defineProperty(resource, $SIGNAL,   { value: true, enumerable: true });

  Object.defineProperties(resource, {
    state:   { get: resourceState },
    loading: { get: () => { const s = resourceState(); return s === 'pending' || s === 'refreshing'; } },
    error:   { get: resourceError },
    latest:  { get: value },
    stale:   { get: isStale },
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  const refetch = (): void => {
    flagRefetch = true;
    setTick(v => v + 1);
  };

  const invalidate = (): void => {
    const key = untrack(sourceFn);
    if (key !== null && key !== undefined && key !== false) {
      ttlCache.delete(buildKey(key as S));
    }
    flagInvalidate = true;
    setTick(v => v + 1);
  };

  return [resource, { mutate: setValue, refetch, invalidate }];
}

// ── Cache utilities ────────────────────────────────────────────────────────────

/**
 * Clear all TTL cache entries for a given namespace (name).
 * Useful to invalidate a whole category of data at once.
 */
export function clearCachedResourceNamespace(name: string): void {
  const prefix = `${name}:`;
  for (const key of ttlCache.keys()) {
    if (key.startsWith(prefix)) ttlCache.delete(key);
  }
}

/**
 * Clear the entire TTL cache. Useful on logout / workspace switch.
 */
export function clearAllCachedResources(): void {
  ttlCache.clear();
  inflight.clear();
}
