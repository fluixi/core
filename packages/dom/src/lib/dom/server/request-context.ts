/**
 * Per-request SSR context, the request-scoping that fixes the "P0 #4"
 * module-global concurrency hazard. State that must not be shared across
 * concurrent server renders (route data, the matched-route map, the hydration
 * id counter, the request event) lives here, keyed by an injectable store.
 *
 * The store interface is deliberately the shape of node's AsyncLocalStorage
 * (`run(store, cb)` + `getStore()`), so a real ALS can be injected verbatim by
 * the Node-only @fluixi/server package (and by tests). @fluixi/dom itself stays
 * environment-agnostic: it never imports `node:async_hooks`, so browser bundles
 * don't pull it in. The default store is a synchronous module-global: correct
 * for a single sync render; concurrency isolation comes from the injected ALS.
 */

/**
 * Per-request mutable bag for data middleware attaches and loaders / server functions /
 * the render read back (e.g. the authenticated user). Augment it from app/binding code:
 *
 *   declare module '@fluixi/dom' {
 *     interface RequestLocals { auth?: { user: User | null } }
 *   }
 */
export interface RequestLocals {
  [key: string]: unknown;
}

export interface RequestEvent {
  /** request URL/path being rendered */
  url?: string;
  /** the underlying platform request, when available (web Request, etc.) */
  request?: unknown;
  /** response headers/status the render wants to set */
  responseHeaders?: Record<string, string>;
  /** Mutable per-request data set by middleware, read by loaders/server fns/render. */
  locals?: RequestLocals;
  [key: string]: unknown;
}

export interface RequestContext {
  event: RequestEvent;
  /** Stamp hydration keys (`data-hk`) on elements. Off for markup nothing will hydrate. */
  hydrationKeys?: boolean;
  /** loader/resource data resolved during this request (was sharedConfig.routeData) */
  routeData: Map<unknown, unknown>;
  /** the route match tree for this request (was sharedConfig.matchedRoute) */
  matchedRoute: Map<unknown, unknown>;
  /** monotonic per-request id source for hydration markers (was module-global ssrMarkerId) */
  nextId(): string;
  /**
   * Per-request resource id (creation order): matched on the client. Outside an island
   * the id is global creation order (`r0`, `r1`, ...). Inside an island scope it is namespaced
   * and counted PER island (`Counter#0:r0`, ...) so the client, which hydrates each island
   * independently and restarts its local counter, reproduces the same ids and seeds each
   * island's resources from `__FX_DATA__` without a global render.
   */
  nextResourceId(): string;
  /** Allocate the next namespace for an island of this name (doc/render order): `name#N`. */
  nextIslandNamespace(name: string): string;
  /** Run `fn` with resource ids scoped to island `ns` (server: namespaced creation order). */
  withResourceScope<T>(ns: string, fn: () => T): T;
  /** in-flight resource fetch promises collected during async SSR */
  pending: Set<Promise<unknown>>;
  /** resolved resource data to serialize for client hydration, keyed by resource id */
  data: Map<string, unknown>;
}

/** Matches AsyncLocalStorage<RequestContext>: inject one for real isolation. */
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

/**
 * A per-request context: the event, its locals, and the data bag hydration reads.
 *
 * `locals` is adopted from the platform request when there is one, so anything
 * middleware wrote is the same object the render sees. Without a request it starts
 * empty.
 */
export function createRequestContext(event: RequestEvent = {}): RequestContext {
  // An entry written `renderRequestAsync(App, { url })` never forwarded the request, so
  // nothing middleware put on locals reached the render: a signed-in visitor rendered
  // signed out. The request @fluixi/start is answering is used instead.
  if (event.request === undefined) {
    const ambient = platformRequest();
    if (ambient) event.request = ambient;
  }
  // Seed the locals bag, if the event carries the platform request, ADOPT the bag that
  // middleware wrote via getRequestLocals(request) (the middleware -> render bridge); else
  // start a fresh empty one. Either way the render's getLocals() sees the right object.
  if (!event.locals) {
    event.locals = event.request ? getRequestLocals(event.request as object) : {};
  }
  let id = 0;
  let rid = 0;
  // Active island scope (namespace) and a per-namespace resource counter, so each island's
  // resources are numbered from 0 independently of global render order.
  let scope: string | null = null;
  const scopeCounters = new Map<string, number>();
  const islandCounts = new Map<string, number>();
  return {
    event,
    routeData: new Map(),
    matchedRoute: new Map(),
    nextId: () => `s${id++}`,
    nextResourceId: () => {
      if (scope === null) return `r${rid++}`;
      const n = scopeCounters.get(scope) ?? 0;
      scopeCounters.set(scope, n + 1);
      return `${scope}:r${n}`;
    },
    nextIslandNamespace: (name) => {
      const n = islandCounts.get(name) ?? 0;
      islandCounts.set(name, n + 1);
      return `${name}#${n}`;
    },
    withResourceScope(ns, fn) {
      const prev = scope;
      scope = ns;
      try {
        return fn();
      } finally {
        scope = prev;
      }
    },
    pending: new Set(),
    data: new Map(),
  };
}

/**
 * Run `fn` with `ctx` as the current request.
 *
 * Backed by `AsyncLocalStorage` where the host provides one, which is what keeps two
 * concurrent renders from reading each other's request. A synchronous fallback covers
 * hosts without it.
 */
export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return _store.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return _store.getStore();
}

/**
 * The request being rendered, or undefined outside a server render.
 *
 * Undefined rather than throwing, because the same component code runs on the client
 * where there is no request to have.
 */
export function getRequestEvent(): RequestEvent | undefined {
  return getRequestContext()?.event;
}

/**
 * The current request's mutable `locals` bag (created if absent). Returns a fresh empty
 * object when called outside a request context, so reads never throw. This is the seam
 * middleware writes (e.g. `getLocals().auth = ...`) and loaders / server functions read.
 */
export function getLocals(): RequestLocals {
  const event = getRequestEvent();
  if (!event) return {};
  if (!event.locals) event.locals = {};
  return event.locals;
}

// ─── middleware -> render bridge ─────────────────────────────────────────────────
// Middleware runs on the raw platform request, OUTSIDE the render's request context.
// This WeakMap associates a per-request locals bag with that request object; the render
// adopts it in createRequestContext from the event's `request`, or from the one @fluixi/start
// is answering when the entry did not forward it. Keyed
// by the request, so concurrent requests stay isolated and entries GC with the request.
//
// Held in the global registry: a server bundle carrying its own copy of this module must
// still read what middleware wrote through another.
const _requestLocals: WeakMap<object, RequestLocals> = ((globalThis as Record<symbol, unknown>)[
  Symbol.for('fluixi.requestLocals')
] ??= new WeakMap<object, RequestLocals>()) as WeakMap<object, RequestLocals>;

/**
 * The platform request @fluixi/start is answering, when it runs the entry inside
 * `withPlatformRequest`. Read through the global registry for the same reason as above.
 */
function platformRequest(): object | undefined {
  const store = (globalThis as Record<symbol, { getStore(): object | undefined } | undefined>)[
    Symbol.for('fluixi.platformRequest')
  ];
  return store?.getStore();
}

/**
 * The mutable `locals` bag for a platform request object (created on first access).
 * Middleware writes here (e.g. `getRequestLocals(request).auth = ...`) before calling
 * `next()`; the render then reads the same object via `getLocals()`, finding the request on
 * the render event or, under @fluixi/start, from the request being answered.
 */
export function getRequestLocals(request: object): RequestLocals {
  let bag = _requestLocals.get(request);
  if (!bag) {
    bag = {};
    _requestLocals.set(request, bag);
  }
  return bag;
}

// ─── render -> response bridge ───────────────────────────────────────────────────
// The mirror of locals: headers code inside a render (a cookie write) wants on the response.
// Keyed by the platform request, which the host holds when it builds the Response.

interface ResponseHeaderBag {
  headers: Headers;
  /** Set once the host has copied the headers out; later writes cannot reach the client. */
  sent: boolean;
}

const _responseHeaders: WeakMap<object, ResponseHeaderBag> = ((globalThis as Record<symbol, unknown>)[
  Symbol.for('fluixi.responseHeaders')
] ??= new WeakMap<object, ResponseHeaderBag>()) as WeakMap<object, ResponseHeaderBag>;

function currentRequest(): object | undefined {
  const request = getRequestEvent()?.request;
  return request && typeof request === 'object' ? request : platformRequest();
}

/**
 * Adds a header to the response of the request being answered: a `Set-Cookie` from a
 * loader, a server function or the render itself. Values append, so several cookies each
 * keep their own header.
 *
 * Returns false when there is no request, or when its headers have already gone out (a
 * streamed page flushes them before the body renders): the write could not be delivered.
 *
 * `request` names the request explicitly, for code that resumes after an `await` where the
 * ambient one may be gone.
 */
export function appendResponseHeader(name: string, value: string, request: object | undefined = currentRequest()): boolean {
  if (!request) return false;
  let bag = _responseHeaders.get(request);
  if (!bag) {
    bag = { headers: new Headers(), sent: false };
    _responseHeaders.set(request, bag);
  }
  if (bag.sent) return false;
  bag.headers.append(name, value);
  return true;
}

/**
 * For the host: the headers collected for `request`, which it merges into its Response.
 * Marks them sent, so a later `appendResponseHeader` reports that it came too late.
 */
export function takeResponseHeaders(request: object): Headers | undefined {
  let bag = _responseHeaders.get(request);
  if (!bag) {
    bag = { headers: new Headers(), sent: true };
    _responseHeaders.set(request, bag);
    return undefined;
  }
  bag.sent = true;
  return bag.headers;
}
