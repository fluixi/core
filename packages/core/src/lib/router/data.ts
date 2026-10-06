/**
 * @module @fluixi/core/router/data
 */

import {
  createResource,
  createSignal,
  type Accessor,
  type Setter,
  Resource
} from '@fluixi/reactive/signal';

import { currentResourceCache, type ResourceCache } from '@fluixi/reactive/signal';

import { useContext, createContext } from '../context/context.js';

// ============================================================================
// TYPES
// ============================================================================

export type CacheFn<T, Args extends any[]> = (
  ...args: Args
) => Promise<T> | T | undefined;

export interface Action<T, Args extends any[]> {
  // (formData: FormData | Args[0]): Promise<T>;
  (...args: Args): Promise<T>;
  url?: string;
  with?: (args: any)=> Action<T, Args>;
}

export interface Submission<T, Args extends any[]> {
  input: Args;
  result?: T;
  error?: any;
  pending: boolean;
  clear: () => void;
  retry: () => void;
}

// ============================================================================
// CACHE (QUERY) SYSTEM
// ============================================================================

export interface CacheOptions {
  /** Milliseconds a value stays fresh. Default: until revalidated. */
  ttl?: number;
  /**
   * Once stale, return the old value at once and refresh in the background; the routes on
   * screen then load again and pick up the new one. Default true.
   */
  staleWhileRevalidate?: boolean;
  /** Where entries live. Defaults to the request's cache on the server and the page's in a browser. */
  cache?: ResourceCache;
}

// Mounted route layers: each refetches its data when something is revalidated.
const revalidationListeners = new Set<() => void>();

/** @internal: the router registers each layer's refetch here. */
export function onRevalidate(listener: () => void): () => void {
  revalidationListeners.add(listener);
  return () => void revalidationListeners.delete(listener);
}

const reloadMounted = () => {
  for (const listener of [...revalidationListeners]) listener();
};

/**
 * A function whose results are kept by name and arguments: route data that should not be
 * fetched again on every visit.
 *
 * Readers of the same key share one request in flight. Entries live in the request's cache on
 * the server, so visitors never share one, and in the page's cache in a browser.
 *
 * @example
 * ```ts
 * const organisations = cache(() => api.get('/api/v1/organizations'), 'orgs', { ttl: 30_000 });
 * export const routeData = () => organisations();
 * // after a change:
 * revalidate('orgs');
 * ```
 */
export function cache<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T> | T,
  name: string,
  options: CacheOptions = {}
): (...args: Args) => Promise<T> {
  const { ttl = Infinity, staleWhileRevalidate = true } = options;
  return (...args: Args): Promise<T> => {
    const store = options.cache ?? currentResourceCache();
    const key = name + ':' + JSON.stringify(args);
    const fetchFresh = (): Promise<T> => {
      const running = store.inflight.get(key) as Promise<T> | undefined;
      if (running) return running;
      const promise = Promise.resolve(fn(...args)).then(
        (value) => {
          store.set(key, { value, timestamp: Date.now() });
          store.inflight.delete(key);
          return value;
        },
        (error) => {
          store.inflight.delete(key);
          throw error;
        }
      );
      store.inflight.set(key, promise);
      return promise;
    };

    const hit = store.get(key);
    if (hit && (ttl === Infinity || Date.now() - hit.timestamp <= ttl)) return Promise.resolve(hit.value as T);
    if (hit && staleWhileRevalidate) {
      // The page gets the old value now; when the new one lands, the routes load again from it.
      fetchFresh().then(reloadMounted, () => undefined);
      return Promise.resolve(hit.value as T);
    }
    return fetchFresh();
  };
}

/**
 * Drops cached entries, by name (`'orgs'` matches every `orgs:` key), several names, or a
 * predicate, then loads the data of the routes on screen again. What is still cached is
 * served from the cache, so only the dropped entries are fetched.
 */
export function revalidate(
  key: string | string[] | ((key: string) => boolean),
  store?: ResourceCache
): void {
  const names = typeof key === 'string' ? [key] : Array.isArray(key) ? key : null;
  drop(names ?? (key as (k: string) => boolean), store ?? currentResourceCache());
  // The other tabs of this site cache the same data in their own pages. A predicate cannot
  // travel, and a cache passed in by hand is not theirs, so only names on the page cache go.
  if (names && !store) tellOtherTabs(names);
}

function drop(what: string[] | ((key: string) => boolean), store: ResourceCache): void {
  const matches = Array.isArray(what) ? (k: string) => what.some((n) => k === n || k.startsWith(n + ':')) : what;
  for (const k of [...store.keys()]) if (matches(k)) store.delete(k);
  reloadMounted();
}

// Other tabs hear a write to this key through the `storage` event, which a browser fires in
// every other tab of the origin and never in the one that wrote. The value changes each time
// (`at`), or a repeat of the same names would not fire.
const TABS_KEY = 'fluixi:revalidate';

function tellOtherTabs(names: string[]): void {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify({ names, at: Date.now() + Math.random() }));
  } catch {
    /* no storage here (server, private mode): the other tabs refresh on their own schedule */
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== TABS_KEY || !event.newValue) return;
    try {
      const names = (JSON.parse(event.newValue) as { names?: unknown }).names;
      if (Array.isArray(names) && names.every((n) => typeof n === 'string')) drop(names, currentResourceCache());
    } catch {
      /* not ours */
    }
  });
}

// `@fluixi/api/client` applies `x-fx-revalidate` through this, without importing the router.
(globalThis as Record<symbol, unknown>)[Symbol.for('fluixi.revalidate')] = (names: string[]) => revalidate(names);

// ============================================================================
// ASYNC DATA PRIMITIVES
// ============================================================================

/**
 * Create an async resource from a promise or cache function
 */
export function createAsync<T, S extends any = true>(
  fetcher: (source: S) => Promise<T> | T,
  source?: () => S
):  Resource<S> {
  const [data] = createResource(source || (() => true as S) as any, fetcher as any);
  return data as Resource<S>;
  // return () => '' as any;
}

// ============================================================================
// ACTIONS
// ============================================================================

const submissionState = new Map<
  string,
  [
    Accessor<Submission<any, any> | undefined>,
    Setter<Submission<any, any> | undefined>
  ]
>();

function getSubmissionSignal<T, Args extends any[]>(url: string) {
  if (!submissionState.has(url)) {
    submissionState.set(
      url,
      createSignal<Submission<T, Args> | undefined>(undefined)
    );
  }
  return submissionState.get(url)! as [
    Accessor<Submission<T, Args> | undefined>,
    Setter<Submission<T, Args> | undefined>
  ];
}

/**
 * Every call of an action, by action name: the ones in flight and the ones that failed.
 * `submissionState` above keeps only the latest call, so two calls at once overwrote each
 * other; this list is what an optimistic UI renders from.
 */
const submissionsState = new Map<string, [Accessor<Submission<any, any>[]>, Setter<Submission<any, any>[]>]>();

function getSubmissionsSignal<T, Args extends any[]>(url: string) {
  if (!submissionsState.has(url)) submissionsState.set(url, createSignal<Submission<any, any>[]>([]));
  return submissionsState.get(url)! as unknown as [Accessor<Submission<T, Args>[]>, Setter<Submission<T, Args>[]>];
}

/**
 * Create a server action
 */
export interface ActionOptions<T> {
  /**
   * Cache names this action changes (`['orgs']`), or a function of its result that returns
   * them. They are revalidated when it succeeds, so the routes on screen show the change.
   */
  invalidates?: string[] | ((result: T) => string[]);
}

export function action<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T> | T,
  name?: string,
  options: ActionOptions<T> = {}
): Action<T, Args> {
  const actionUrl = name || fn.name || 'action';

  const submit = async (...args: Args): Promise<T> => {
    // What the submission shows as its input: the argument, or all of them when there are
    // several. Every argument reaches `fn` either way.
    const input = (args.length > 1 ? args : args[0]) as unknown as Args;
    const [, setSubmission] = getSubmissionSignal<T, Args>(actionUrl);
    const [, setSubmissions] = getSubmissionsSignal<T, Args>(actionUrl);

    // This call's entry in the list: replaced, never mutated, so readers see each change.
    let entry: Submission<T, Args>;
    const drop = () => setSubmissions((list) => list.filter((s) => s !== entry));
    const settle = (next: Submission<T, Args>) => {
      setSubmissions((list) => list.map((s) => (s === entry ? next : s)));
      entry = next;
    };

    // Reset state
    const clear = () => {
      setSubmission(undefined);
      drop();
    };
    const retry = () => {
      drop();
      return submit(...args);
    };

    entry = {
      input,
      pending: true,
      clear,
      retry,
    };
    setSubmission(entry);
    setSubmissions((list) => [...list, entry]);

    try {
      const result = await fn(...args);

      setSubmission({
        input,
        result,
        pending: false,
        clear,
        retry,
      });
      // Done: the result is in whatever the page reads now, so the call leaves the list.
      drop();
      const stale = typeof options.invalidates === 'function' ? options.invalidates(result) : options.invalidates;
      for (const key of stale ?? []) revalidate(key);

      return result;
    } catch (error) {
      const failed: Submission<T, Args> = {
        input,
        error,
        pending: false,
        clear,
        retry,
      };
      setSubmission(failed);
      // Failed: it stays, with its error, until retried or cleared.
      settle(failed);
      throw error;
    }
  };

  (submit as any).url = actionUrl;
  (submit as any).with = (args: any) =>
    action((...a: any[]) => (fn as any)(args, ...a), name, options);

  return submit as any as Action<T, Args>;
}

/**
 * Hook to track action submission state
 */
export function useSubmission<T, Args extends any[]>(
  actionFn: Action<T, Args>
): Accessor<Submission<T, Args> | undefined> {
  const [submission] = getSubmissionSignal<T, Args>(actionFn.url!);
  return submission;
}

/**
 * Every call of `actionFn` still in flight, and the ones that failed, oldest first. One entry
 * per call, so concurrent calls do not overwrite each other. A call that succeeds leaves the
 * list; one that fails stays with its `error` until `retry()` or `clear()`.
 *
 * The optimistic pattern: render the server's rows, then the pending entries mapped to the
 * same shape. When a call succeeds its entry goes and the server row takes its place; when it
 * fails it stops being pending, so it leaves the optimistic rows by itself.
 *
 * @example
 * ```tsx
 * const moves = useSubmissions(moveDeal);
 * const rows = $memo(() => [
 *   ...deals(),
 *   ...moves().filter((s) => s.pending).map((s) => ({ ...s.input, pending: true })),
 * ]);
 * ```
 */
export function useSubmissions<T, Args extends any[]>(actionFn: Action<T, Args>): Accessor<Submission<T, Args>[]> {
  const [submissions] = getSubmissionsSignal<T, Args>(actionFn.url!);
  return submissions;
}

/**
 * Hook to get action executor
 */
export function useAction<T, Args extends any[]>(
  actionFn: Action<T, Args>
): (...args: Args) => Promise<T> {
  return actionFn as any;
}

// ============================================================================
// ROUTE DATA
// ============================================================================

export interface RouteDataArgs {
  /**
   * Route params, either a reactive signal accessor (when called from the
   * router's createRoot during layout creation) or a plain snapshot object
   * (legacy / manual usage). Always normalise with:
   *   `const getParams = typeof args.params === 'function' ? args.params : () => args.params;`
   */
  params: Record<string, string> | (() => Record<string, string>);
  location:
    | { pathname: string; search: string }
    | (() => { pathname: string; search: string });
  /**
   * What the route's `routeDeps` export returned when this load started: app-wide values the
   * data depends on, such as the signed-in user. Key a `cache()` call by them.
   */
  deps?: unknown;
}

export type RouteLoadFunc = (
  args: RouteDataArgs,
  owner?: any,
  isCancelled?: () => boolean
) => any;

export const RouteDataContext = createContext<any>(undefined, 'route-data');

export const RouteDataProvider = RouteDataContext.Provider;

/**
 * Access the data returned by the nearest ancestor route's `routeData` export.
 *
 * Returns a stable accessor function. Call it to get the current route data:
 *
 *   const data = useRouteData<WorkspaceRouteData>();
 *   createEffect(() => console.log(data()?.workspace()));
 */
export function useRouteData<T>(): () => T | undefined {
  const ctx = useContext(RouteDataContext) as T | undefined;
  return typeof ctx === 'function' ? (ctx as any) : () => ctx;
}
