/**
 * `cachedResource`: a resource whose results are kept, by key, for a TTL.
 *
 * Fetches once and serves the cached result to later reads within the TTL; after it, the
 * next read fetches again, showing the stale value meanwhile unless `staleWhileRevalidate`
 * is off. Readers of the same key share one request in flight.
 *
 *   const workspace = cachedResource(workspaceId, (id) => api.get(`/workspaces/${id}`), {
 *     name: 'workspace',
 *     ttl: 5 * 60_000,
 *   });
 *   workspace();            // the value; suspends under <Suspense> on the first load
 *   workspace.stale;        // true while a background refetch runs
 *   workspace.invalidate(); // drop the entry and fetch again
 *
 * Where entries live is the cache's business (`ResourceCache`). By default: one cache per
 * request on the server, so visitors never share an entry or an in-flight fetch; the page in
 * a browser. Pass `cache` to keep them elsewhere, for instance a storage that survives a reload.
 *
 * A value fetched during the server render travels to the browser with the page, like a
 * plain resource's, and seeds the first read there instead of a second fetch.
 *
 * It runs on the live graph. Suspense needs no bookkeeping here: the accessor throws the
 * pending promise and the runtime finds the nearest boundary from the reading effect.
 */

import {
  createSignal,
  createEffect,
  onCleanup,
  batch,
  untrack,
} from './graph/compat.js';
// Graph-agnostic SSR hooks, the same ones graph/resource.ts uses.
import {
  currentResourceCache,
  getServerData,
  nextResourceId,
  reportResourceData,
  trackResourcePromise,
  type ResourceCache,
} from './graph/ssr-hooks.js';
// Types only. The archive contributes no runtime here, which is the point.
import type { Setter, Resource, ResourceState } from './signal.js';

let _autoId = 0;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CachedResourceOptions {
  /**
   * Cache lifetime in milliseconds.
   * Default: `Infinity`, data lives until `invalidate()` is called.
   */
  ttl?: number;
  /**
   * Cache namespace. Two calls that share the same `name` share their cache
   * entries. When omitted, each `cachedResource` call gets a
   * private cache isolated from all others.
   */
  name?: string;
  /**
   * When `true` (default), stale data is returned immediately while a
   * background re-fetch runs. The resource stays in `state='ready'` and
   * `stale=true` during revalidation, no loading skeleton.
   *
   * When `false`, a foreground re-fetch is triggered that sets
   * `state='refreshing'` (data is still visible but `loading=true`).
   */
  staleWhileRevalidate?: boolean;
  /** Where entries live. Defaults to the request's cache on the server and the page's in a browser. */
  cache?: ResourceCache;
  /** Carry the server-fetched value to the browser with the page. Default true. */
  transport?: boolean;
  /**
   * Other values the data depends on: the signed-in user, the active organisation. Each
   * combination is cached apart and a change reads (or fetches) its own entry. The fetcher
   * still receives only the source's key.
   */
  deps?: ReadonlyArray<() => unknown>;
}

export type CachedResource<T> = Resource<T> & {
  /** `true` while serving stale data during a background re-fetch. */
  stale: boolean;
};

export interface CachedResourceActions<T> {
  mutate: Setter<T | undefined>;
  /** Fetch again now, whatever the TTL. The current value stays visible. */
  refetch: () => void;
  /** Drop the entry for the current key and fetch again. */
  invalidate: () => void;
}

/** One binding: the accessor, with the actions on it. */
export type CachedResourceHandle<T> = CachedResource<T> & CachedResourceActions<T>;

// ── Brand symbols ─────────────────────────────────────────────────────────────
// Registry symbols, so every copy of every graph agrees on them without importing
// anything. graph/resource.ts stamps a resource with the same two.
const $SIGNAL = Symbol.for('signal');
const $RESOURCE = Symbol.for('resource');

// ── Implementation ─────────────────────────────────────────────────────────────

/** Not keyed by a reactive value. */
export function cachedResource<T>(
  fetcher: () => Promise<T> | T,
  options?: CachedResourceOptions,
): CachedResourceHandle<T>;

/**
 * Keyed by `source`: a new key reads its own entry, or fetches. A falsy source holds the
 * fetch, as for `resource`.
 */
export function cachedResource<T, S>(
  source: () => S | false | null | undefined,
  fetcher: (key: S) => Promise<T> | T,
  options?: CachedResourceOptions,
): CachedResourceHandle<T>;

export function cachedResource<T, S = true>(
  sourceOrFetcher: (() => S | false | null | undefined) | (() => Promise<T> | T),
  fetcherOrOptions?: ((key: S) => Promise<T> | T) | CachedResourceOptions,
  opts: CachedResourceOptions = {},
): CachedResourceHandle<T> {
  // ── Normalise overloads ──────────────────────────────────────────────────
  let sourceFn: () => S | false | null | undefined;
  let fetchFn: (key: S) => Promise<T> | T;
  let options: CachedResourceOptions;

  if (typeof fetcherOrOptions === 'function') {
    sourceFn = sourceOrFetcher as () => S;
    fetchFn = fetcherOrOptions;
    options = opts;
  } else {
    // No source: treat the first arg as fetcher, source = () => true
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
  const cache = options.cache ?? currentResourceCache();
  const inflight = cache.inflight;
  // The same transport as a plain resource: an id in creation order, matched on both sides.
  const ssrId = options.transport === false ? undefined : nextResourceId();
  const seed = ssrId !== undefined ? getServerData(ssrId) : undefined;

  const deps = options.deps ?? [];
  // Tracked inside the effect, untracked from invalidate().
  const depValues = () => deps.map((dep) => dep());
  const buildKey = (key: S, values: unknown[] = untrack(depValues)): string =>
    `${ns}:${JSON.stringify(key)}` + (deps.length ? `:${JSON.stringify(values)}` : '');

  const isFresh = (entry: { timestamp: number }): boolean =>
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
    const running = inflight.get(ck) as Promise<T> | undefined;
    if (running) {
      running.then(
        (v) => { if (!isCancelled()) settle(v, background); },
        (e) => { if (!isCancelled() && !background) fail(e); },
      );
      if (!background) {
        trackResourcePromise(running);
        setPendingP(running);
      }
      return;
    }

    const promise: Promise<T> = Promise.resolve(fetchFn(key)).then(
      (v) => {
        cache.set(ck, { value: v, timestamp: Date.now() });
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
      // No boundary bookkeeping here. The accessor throws the pending promise, and
      // the runtime's suspend handler finds the nearest boundary from the effect that
      // was reading. graph/resource.ts leaves it to the same path.
    }

    promise.then(
      (v) => { if (!isCancelled()) settle(v, background); },
      (e) => { if (!isCancelled() && !background) fail(e); },
    );
  }

  function settle(v: T, _background: boolean): void {
    if (ssrId !== undefined) reportResourceData(ssrId, v); // serialize for hydration
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

  // ── Main effect ───────────────────────────────────────────────────────────
  createEffect(() => {
    const key = sourceFn() as S | false | null | undefined;
    const values = depValues();
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

    const ck = buildKey(key as S, values);

    // A value the server fetched for this page: the first read takes it as fresh.
    if (seed && prevKey === UNSET && !cache.get(ck)) cache.set(ck, { value: seed.value, timestamp: Date.now() });

    // Clear cache on explicit invalidate
    if (doInvalidate) cache.delete(ck);

    const keyChanged = prevKey === UNSET || (key as unknown) !== prevKey;
    prevKey = key as S;

    let cancelled = false;
    onCleanup(() => { cancelled = true; });

    const cached = cache.get(ck) as { value: T; timestamp: number } | undefined;

    // ── Cache HIT (fresh) ─────────────────────────────────────────────────
    if (cached && isFresh(cached) && !doRefetch && !doInvalidate) {
      // Serve synchronously, no loading state, no fetch.
      if (ssrId !== undefined) reportResourceData(ssrId, cached.value);
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
  // During 'pending': throw the pending promise -> Suspense shows skeleton.
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
      cache.delete(buildKey(key as S));
    }
    flagInvalidate = true;
    setTick(v => v + 1);
  };

  return Object.assign(resource, { mutate: setValue, refetch, invalidate }) as CachedResourceHandle<T>;
}

// ── Cache utilities ────────────────────────────────────────────────────────────

/**
 * Drops cached entries in the current scope: those of one `name`, or all of them. On a
 * logout or a workspace switch, so nothing fetched for the previous one is served.
 */
export function clearCachedResources(name?: string, cache: ResourceCache = currentResourceCache()): void {
  if (name === undefined) return cache.clear();
  const prefix = `${name}:`;
  for (const key of [...cache.keys()]) if (key.startsWith(prefix)) cache.delete(key);
}

export { createResourceCache, type ResourceCache, type ResourceCacheEntry } from './graph/ssr-hooks.js';
