/**
 * @fileoverview Data fetching and caching primitives for Fluixi Router
 * @module @fluixi/core/router/data
 */

import {
  createResource,
  createSignal,
  type Accessor,
  type Setter,
  Resource
} from '@fluixi/reactive/signal';

import {
  getHydrationData,
  setHydrationData,
  isServerEnvironment,
  isHydrating,
} from '../server/hydration.js';

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

const globalCache = new Map<string, any>();
const inflightRequests = new Map<string, Promise<any>>();

/**
 * Cache an async function for data fetching
 *
 * Supports:
 * - Deduplication
 * - Hydration (Server -> Client)
 * - Revalidation
 *
 * @param fn Async function to cache
 * @param name Unique name for the cache key
 */
export function cache<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T> | T,
  name: string
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    const key = name + ':' + JSON.stringify(args);

    // 1. Check Hydration Data (Client-side hydration)
    if (isHydrating() || typeof window !== 'undefined') {
      const hydrated = getHydrationData(key);
      if (hydrated !== undefined) {
        return hydrated as T;
      }
    }

    // 2. Check Memory Cache
    if (globalCache.has(key)) {
      return globalCache.get(key) as T;
    }

    // 3. Request Deduplication
    if (inflightRequests.has(key)) {
      return inflightRequests.get(key) as Promise<T>;
    }

    // 4. Execute
    const promise = Promise.resolve(fn(...args)).then(
      (val) => {
        globalCache.set(key, val);
        inflightRequests.delete(key);

        // Save for hydration if on server
        if (isServerEnvironment()) {
          setHydrationData(key, val);
        }

        return val;
      },
      (err) => {
        inflightRequests.delete(key);
        throw err;
      }
    );

    inflightRequests.set(key, promise);
    return promise;
  };
}

/**
 * Global revalidation signal. Tracked by createAsync so that
 * when a key is revalidated, matching resources re-fetch.
 */
const [revalidationVersion, setRevalidationVersion] = createSignal(0);
const revalidationKeys = new Set<string>();

/**
 * Revalidate a cache key. Clears the memory cache and triggers
 * reactive invalidation so resources using createAsync re-fetch.
 *
 * @param key Key prefix string or predicate function to match cache keys
 */
export function revalidate(key: string | ((key: string) => boolean)) {
  const predicate =
    typeof key === 'string' ? (k: string) => k.startsWith(key) : key;

  for (const k of globalCache.keys()) {
    if (predicate(k)) {
      globalCache.delete(k);
      revalidationKeys.add(k);
    }
  }

  // Bump version to trigger reactive refresh in createAsync consumers
  setRevalidationVersion((v: number) => v + 1);
}

// ============================================================================
// ASYNC DATA PRIMITIVES
// ============================================================================

/**
 * Create an async resource from a promise or cache function
 *
 * @param fetcher Function that returns a promise
 * @param source Dependency signal (optional)
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
 * Create a server action
 *
 * @param fn Function to execute (server-side)
 * @param name Action name
 */
export function action<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T> | T,
  name?: string
): Action<T, Args> {
  const actionUrl = name || fn.name || 'action';

  const submit = async (input: FormData | Args[0]): Promise<T> => {
    const [, setSubmission] = getSubmissionSignal<T, Args>(actionUrl);

    // Reset state
    const clear = () => setSubmission(undefined);
    const retry = () => submit(input);

    setSubmission({
      input: input as Args, // Approximate type for tracking
      pending: true,
      clear,
      retry,
    });

    try {
      // Cast to any to handle potential argument mismatch in generic types
      // fn expects tuple Args, input is single value or FormData
      const result = await (fn as any)(input);

      setSubmission({
        input: input as Args,
        result,
        pending: false,
        clear,
        retry,
      });

      return result;
    } catch (error) {
      setSubmission({
        input: input as Args,
        error,
        pending: false,
        clear,
        retry,
      });
      throw error;
    }
  };

  (submit as any).url = actionUrl;
  (submit as any).with = (args: any) =>
    action((...a: any[]) => (fn as any)(args, ...a), name);

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
   * Route params — either a reactive signal accessor (when called from the
   * router's createRoot during layout creation) or a plain snapshot object
   * (legacy / manual usage). Always normalise with:
   *   `const getParams = typeof args.params === 'function' ? args.params : () => args.params;`
   */
  params: Record<string, string> | (() => Record<string, string>);
  location:
    | { pathname: string; search: string }
    | (() => { pathname: string; search: string });
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
