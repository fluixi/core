/**
 * SSR resource injectables: graph-agnostic module state. The server (@fluixi/server
 * via @fluixi/dom) injects these so async SSR can await in-flight resource fetches and
 * seed resources from server-serialized data on the client. All no-ops when unset -> * zero client/runtime impact. Used by both the TC39 resource core and the legacy graph,
 * so they live in a TC39-owned module (not signal.ts, which is being retired).
 */

let _resourceTracker: ((p: Promise<any>) => void) | null = null;
/** Register a sink that receives every resource fetch promise (server: collect & await). */
export function setResourceTracker(fn: ((p: Promise<any>) => void) | null): void {
  _resourceTracker = fn;
}
/** @internal: resources report their fetch promise here. */
export function trackResourcePromise(p: Promise<any>): void {
  if (_resourceTracker) _resourceTracker(p);
}

let _serverDataGetter: ((id: string) => { value: any } | undefined) | null = null;
/** Inject server-serialized resource data (client hydration: seed without refetch). */
export function setServerDataGetter(fn: ((id: string) => { value: any } | undefined) | null): void {
  _serverDataGetter = fn;
}
/** @internal: resources look up seeded data by their SSR id. */
export function getServerData(id: string): { value: any } | undefined {
  return _serverDataGetter ? _serverDataGetter(id) : undefined;
}

let _resourceIdSource: (() => string) | null = null;
/** Inject a stable per-resource id source (server render order / hydration order). */
export function setResourceIdSource(fn: (() => string) | null): void {
  _resourceIdSource = fn;
}
/** @internal, a resource asks for its SSR id at creation; undefined on a plain client. */
export function nextResourceId(): string | undefined {
  return _resourceIdSource ? _resourceIdSource() : undefined;
}

let _resourceDataSink: ((id: string, value: any) => void) | null = null;
/** Inject a sink for resolved resource values (server: collect for serialization). */
export function setResourceDataSink(fn: ((id: string, value: any) => void) | null): void {
  _resourceDataSink = fn;
}
/** @internal, a resource reports its resolved value here. */
export function reportResourceData(id: string, value: any): void {
  if (_resourceDataSink) _resourceDataSink(id, value);
}

/** Where cached resources keep their entries and in-flight fetches. */
export interface ResourceCacheEntry {
  value: unknown;
  /** Date.now() when it was fetched. */
  timestamp: number;
}

export interface ResourceCache {
  get(key: string): ResourceCacheEntry | undefined;
  set(key: string, entry: ResourceCacheEntry): void;
  delete(key: string): void;
  keys(): Iterable<string>;
  clear(): void;
  /** Fetches running now, by key, so two readers share one request. Same scope as the entries. */
  readonly inflight: Map<string, Promise<unknown>>;
}

/** A cache held in memory, values kept as they are (Dates, class instances). */
export function createResourceCache(): ResourceCache {
  const entries = new Map<string, ResourceCacheEntry>();
  const inflight = new Map<string, Promise<unknown>>();
  return {
    get: (key) => entries.get(key),
    set: (key, entry) => void entries.set(key, entry),
    delete: (key) => void entries.delete(key),
    keys: () => entries.keys(),
    clear: () => {
      entries.clear();
      inflight.clear();
    },
    inflight,
  };
}

let _cacheScope: (() => ResourceCache | undefined) | null = null;
/**
 * Inject the cache for the current scope. The server sets one per request, so two visitors
 * never share an entry or an in-flight fetch.
 */
export function setResourceCacheScope(fn: (() => ResourceCache | undefined) | null): void {
  _cacheScope = fn;
}

// The browser serves one user, so the page is the scope there.
let _pageCache: ResourceCache | undefined;

/** The cache for where this runs: the injected scope, else the page in a browser, else a private one. */
export function currentResourceCache(): ResourceCache {
  const scoped = _cacheScope?.();
  if (scoped) return scoped;
  // A server with no scope injected: nothing safe to share, so nothing is shared.
  if (typeof window === 'undefined') return createResourceCache();
  return (_pageCache ??= createResourceCache());
}
