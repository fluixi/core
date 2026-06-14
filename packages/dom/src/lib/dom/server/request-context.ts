/**
 * Per-request SSR context — the request-scoping that fixes the "P0 #4"
 * module-global concurrency hazard. State that must NOT be shared across
 * concurrent server renders (route data, the matched-route map, the hydration
 * id counter, the request event) lives here, keyed by an injectable store.
 *
 * The store interface is deliberately the shape of node's AsyncLocalStorage
 * (`run(store, cb)` + `getStore()`), so a real ALS can be injected verbatim by
 * the Node-only @fluixi/server package (and by tests). @fluixi/dom itself stays
 * environment-agnostic: it never imports `node:async_hooks`, so browser bundles
 * don't pull it in. The default store is a synchronous module-global — correct
 * for a single sync render; concurrency isolation comes from the injected ALS.
 */

export interface RequestEvent {
  /** request URL/path being rendered */
  url?: string;
  /** the underlying platform request, when available (web Request, etc.) */
  request?: unknown;
  /** response headers/status the render wants to set */
  responseHeaders?: Record<string, string>;
  [key: string]: unknown;
}

export interface RequestContext {
  event: RequestEvent;
  /** loader/resource data resolved during this request (was sharedConfig.routeData) */
  routeData: Map<unknown, unknown>;
  /** the route match tree for this request (was sharedConfig.matchedRoute) */
  matchedRoute: Map<unknown, unknown>;
  /** monotonic per-request id source for hydration markers (was module-global ssrMarkerId) */
  nextId(): string;
  /** in-flight resource fetch promises collected during async SSR */
  pending: Set<Promise<unknown>>;
  /** resolved resource data to serialize for client hydration, keyed by SSR id */
  data: Map<string, unknown>;
}

/** Matches AsyncLocalStorage<RequestContext> — inject one for real isolation. */
export interface RequestStore {
  getStore(): RequestContext | undefined;
  run<T>(ctx: RequestContext, fn: () => T): T;
}

// Default synchronous store. A single sync render runs start-to-finish without
// interleaving, so a module-global is safe; under concurrent async renders an
// ALS store must be injected (see setRequestStore).
let _current: RequestContext | undefined;
const syncStore: RequestStore = {
  getStore: () => _current,
  run(ctx, fn) {
    const prev = _current;
    _current = ctx;
    try {
      return fn();
    } finally {
      _current = prev;
    }
  },
};

let _store: RequestStore = syncStore;

/** Inject an AsyncLocalStorage-shaped store (Node @fluixi/server / tests). */
export function setRequestStore(store: RequestStore | null): void {
  _store = store ?? syncStore;
}

export function createRequestContext(event: RequestEvent = {}): RequestContext {
  let id = 0;
  return {
    event,
    routeData: new Map(),
    matchedRoute: new Map(),
    nextId: () => `s${id++}`,
    pending: new Set(),
    data: new Map(),
  };
}

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return _store.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return _store.getStore();
}

export function getRequestEvent(): RequestEvent | undefined {
  return getRequestContext()?.event;
}
