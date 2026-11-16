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

// Held in the global registry, as the locals bag below is: a server bundle inlines its own
// copy of this module while packages loaded from node_modules use another, and a function
// run in a request context through one copy must find it through the other.
const _holder: { store: RequestStore; async: boolean } = ((globalThis as Record<symbol, unknown>)[
  Symbol.for('fluixi.requestStore')
] ??= { store: syncStore, async: false }) as { store: RequestStore; async: boolean };

/** Inject an AsyncLocalStorage-shaped store (Node @fluixi/server / tests). */
export function setRequestStore(store: RequestStore | null): void {
  _holder.store = store ?? syncStore;
  _holder.async = store !== null;
}

/**
 * Inject `store` unless an async store is already in place. What a runtime calls when it
 * loads: a second copy loading during a request would otherwise replace the store that
 * request runs in, and the request would lose its context.
 */
export function setRequestStoreIfUnset(store: RequestStore): void {
  if (!_holder.async) setRequestStore(store);
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
// What runs when a request ends, per context (a WeakMap in the global registry, like the
// store: a hook registered through one copy of this module runs from another).
const _endHooks: WeakMap<object, Array<() => void>> = ((globalThis as Record<symbol, unknown>)[
  Symbol.for('fluixi.requestEndHooks')
] ??= new WeakMap<object, Array<() => void>>()) as WeakMap<object, Array<() => void>>;

/**
 * Run `fn` when the current request ends (services releasing what they hold for the request,
 * say). Returns false outside a request context, where there is no request to end.
 */
export function onRequestEnd(fn: () => void): boolean {
  const scope = requestScope();
  if (!scope) return false;
  let hooks = _endHooks.get(scope);
  if (!hooks) _endHooks.set(scope, (hooks = []));
  hooks.push(fn);
  return true;
}

/**
 * What one request's state hangs on. Under @fluixi/start, the platform request being answered:
 * middleware, the render, an API route and a server function all run inside it, so they share
 * one per-request injector. Elsewhere, the render's own context.
 */
export function requestScope(): object | undefined {
  return platformRequest() ?? getRequestContext();
}

/**
 * End `ctx`: its `onRequestEnd` hooks run, latest first, each once. Called by whatever created
 * the context (a render, a server function, an API route) when it is done with it.
 */
export function endRequestContext(ctx: RequestContext): void {
  endRequestScope(ctx);
}

/** End a request scope (see {@link requestScope}): its `onRequestEnd` hooks run, latest first. */
export function endRequestScope(scope: object): void {
  const hooks = _endHooks.get(scope);
  if (!hooks) return;
  _endHooks.delete(scope);
  for (const hook of hooks.reverse()) {
    try {
      hook();
    } catch (error) {
      console.error('[fluixi] a request-end hook threw:', error);
    }
  }
}

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return _holder.store.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return _holder.store.getStore();
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

// middleware -> render bridge
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

// render -> response bridge
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

// render -> response bridge for a redirect: a page's data said the reader belongs elsewhere.

/** Where a response sends the browser instead of answering with the page. */
export interface ResponseRedirect {
  location: string;
  status: number;
}

const _redirects: WeakMap<object, ResponseRedirect> = ((globalThis as Record<symbol, unknown>)[
  Symbol.for('fluixi.responseRedirects')
] ??= new WeakMap<object, ResponseRedirect>()) as WeakMap<object, ResponseRedirect>;

/**
 * Answers the request being rendered with a redirect instead of the page. The first one wins.
 * Returns false when there is no request, or when its headers have already gone out (a
 * streamed page sends them before its data settles): the caller must redirect in the page.
 */
export function setResponseRedirect(location: string, status: number, request: object | undefined = currentRequest()): boolean {
  if (!request) return false;
  if (_responseHeaders.get(request)?.sent) return false;
  if (!_redirects.has(request)) _redirects.set(request, { location, status });
  return true;
}

const _statuses: WeakMap<object, number> = ((globalThis as Record<symbol, unknown>)[
  Symbol.for('fluixi.responseStatuses')
] ??= new WeakMap<object, number>()) as WeakMap<object, number>;

/**
 * The status the response to the request being rendered should carry, such as 500 when a
 * route failed and its error view was rendered in its place. Returns false when there is no
 * request or its headers have already gone out.
 */
export function setResponseStatus(status: number, request: object | undefined = currentRequest()): boolean {
  if (!request) return false;
  if (_responseHeaders.get(request)?.sent) return false;
  _statuses.set(request, status);
  return true;
}

/**
 * The HTTP status a failure shown in a page asks for: the error's own `status` when it is an
 * error status (404 for a record not found, 403 for a refusal), otherwise 500.
 */
export function errorResponseStatus(error: unknown): number {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

/** For the host, before it commits to a status: the one a render asked for, if any. */
export function takeResponseStatus(request: object): number | undefined {
  const status = _statuses.get(request);
  _statuses.delete(request);
  return status;
}

/** For the host, before it commits to a status: the redirect a render asked for, if any. */
export function takeResponseRedirect(request: object): ResponseRedirect | undefined {
  const redirect = _redirects.get(request);
  _redirects.delete(request);
  return redirect;
}
