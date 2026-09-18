/**
 * createResource, on the TC39 core by way of the compat layer. This is
 * Additive, the legacy `createResource` in ../signal.ts stays intact; this is the
 * parallel implementation that runs on the new graph.
 *
 * Resources are the one part of the surface that touches framework-coupled bits, so
 * they're ported by hand. The SSR transport hooks (`nextResourceId`/`getServerData`/
 * `trackResourcePromise`/`reportResourceData`) are standalone module functions, so we
 * Reuse them from ../signal.ts, same `__FX_DATA__` seeding + async-SSR drain as legacy.
 *
 * Suspense boundary integration (throwing the pending promise to a boundary that
 * increments/decrements) lands with the Suspense port; the throwing getter is here so
 * a boundary built on the new effect can catch it.
 */
import {
  createSignal,
  createEffect,
  batch,
  untrack,
  onCleanup,
} from './compat.js';
// Standalone SSR hooks: graph-agnostic injectables.
import {
  nextResourceId,
  getServerData,
  trackResourcePromise,
  reportResourceData,
} from './ssr-hooks.js';

type ResourceState = 'unresolved' | 'pending' | 'ready' | 'refreshing' | 'errored';

function isPromise(v: unknown): v is Promise<unknown> {
  return !!v && typeof (v as { then?: unknown }).then === 'function';
}

export interface ResourceActions<T> {
  mutate: (v: T | ((prev: T | undefined) => T)) => unknown;
  refetch: () => void;
}
export type ResourceReturn<T> = [
  resource: (() => T | undefined) & {
    loading: boolean;
    error: unknown;
    latest: T | undefined;
    state: ResourceState;
  },
  actions: ResourceActions<T>,
];

const UNSET = Symbol();

/**
 * createResource(fetcher, options?) or createResource(source, fetcher, options?).
 * Matches the legacy state machine + SSR seeding (no first fetch when seeded).
 *
 * The two typed overloads infer `T` from the fetcher's return: without them the
 * `unknown` implementation signature gives every call site `ResourceReturn<{}>`,
 * so the accessor loses its type (the regression seen after the TC39-core switch).
 */
/** Second argument a fetcher receives: the previous value, and whether this is a refetch. */
export type ResourceFetcherInfo<T> = { value: T | undefined; refetching: boolean };
export function createResource<T>(
  fetcher: (k: true, info: ResourceFetcherInfo<T>) => T | Promise<T>,
  options?: { initialValue?: T; name?: string; transport?: boolean },
): ResourceReturn<T>;
export function createResource<T, S>(
  source: S | false | null | undefined | (() => S | false | null | undefined),
  fetcher: (k: S, info: ResourceFetcherInfo<T>) => T | Promise<T>,
  options?: { initialValue?: T; name?: string; transport?: boolean },
): ResourceReturn<T>;
export function createResource<T, S = true>(
  source: unknown,
  fetcherFn?: unknown,
  options: { initialValue?: T; name?: string; transport?: boolean } = {},
): ResourceReturn<T> {
  let s: () => S;
  let fetcher: (v: S, info: { value: T | undefined; refetching: boolean }) => T | Promise<T>;
  if (typeof fetcherFn === 'function') {
    s = typeof source === 'function' ? (source as () => S) : () => source as S;
    fetcher = fetcherFn as typeof fetcher;
  } else {
    s = () => true as unknown as S;
    fetcher = source as typeof fetcher;
    if (fetcherFn && typeof fetcherFn === 'object') options = fetcherFn as typeof options;
  }

  // SSR data transport: stable id; on the client seed from server-serialized value.
  // `transport: false` opts out, and takes the id with it. The id is a position in
  // a per-render sequence that the client re-derives by counting resources in the
  // same order, so a resource that exists on one side and not the other shifts
  // every id after it. `lazy()` is exactly that: on the server the first request
  // for a route creates a resource for the module import and later requests find
  // it cached and create none, so the page's own resource was r1 for the first
  // visitor after a restart and r0 for everyone else, while the client, which
  // preloads routes before hydrating, always said r0. Its value is a component
  // function and was never transportable anyway.
  const ssrId = options.transport === false ? undefined : nextResourceId();
  const seed = ssrId !== undefined ? getServerData(ssrId) : undefined;
  let skipFirstFetch = seed !== undefined;

  const [value, setValue] = createSignal<T | undefined>(
    seed !== undefined ? (seed.value as T) : options.initialValue,
    { equals: false },
  );
  const [error, setError] = createSignal<unknown>(undefined, { equals: false });
  const [state, setState] = createSignal<ResourceState>(
    seed !== undefined || options.initialValue !== undefined ? 'ready' : 'unresolved',
    { equals: false },
  );
  const [promise, setPromise] = createSignal<Promise<T> | undefined>(undefined, { equals: false });
  const [track, trigger] = createSignal(undefined, { equals: false });

  let prevKey: S | typeof UNSET = UNSET;
  let manualRefetch = false;

  createEffect(() => {
    const val = s();
    track();
    if (val === false || val === null || val === undefined) {
      prevKey = UNSET;
      batch(() => {
        setState('unresolved');
        setPromise(undefined);
        setError(undefined);
      });
      return;
    }
    const isManual = manualRefetch;
    manualRefetch = false;
    if (prevKey !== UNSET && (val as unknown) === prevKey && !isManual) return;
    prevKey = val;
    if (skipFirstFetch) {
      skipFirstFetch = false;
      return; // seeded: source tracked, but no first fetch (no flash on hydration)
    }
    let cancelled = false;
    onCleanup(() => (cancelled = true));
    const currentState = untrack(state);
    const currentValue = untrack(value);
    const isRefreshing = currentState === 'ready' || currentState === 'refreshing';
    batch(() => {
      setState(isRefreshing ? 'refreshing' : 'pending');
      setError(undefined);
    });
    try {
      const res = fetcher(val, { value: currentValue, refetching: isRefreshing });
      if (isPromise(res)) {
        setPromise(res as Promise<T>);
        trackResourcePromise(res); // server async SSR: collect & await
        (res as Promise<T>).then(
          (v) => {
            if (cancelled) return;
            if (ssrId !== undefined) reportResourceData(ssrId, v); // serialize for hydration
            batch(() => {
              setValue(() => v);
              setState('ready');
              setPromise(undefined);
            });
          },
          (e) => {
            if (cancelled) return;
            batch(() => {
              setError(e);
              setState('errored');
              setPromise(undefined);
            });
          },
        );
      } else {
        batch(() => {
          setValue(() => res as T);
          setState('ready');
          setPromise(undefined);
        });
      }
    } catch (e) {
      if (cancelled) return;
      batch(() => {
        setError(e);
        setState('errored');
        setPromise(undefined);
      });
    }
  });

  const loading = () => {
    const st = state();
    return st === 'pending' || st === 'refreshing';
  };
  const resource = (() => {
    const e = error();
    if (e) throw e;
    if (loading()) {
      const p = promise();
      if (p) throw p; // suspends, a boundary on the new effect catches this
    }
    return value();
  }) as ResourceReturn<T>[0];
  Object.defineProperties(resource, {
    state: { get: state },
    loading: { get: loading },
    error: { get: error },
    latest: { get: value },
  });
  // Stamp the detection markers the legacy createResource sets (signal.ts) so the
  // DOM runtime/control-flow recognise a resource accessor: $RESOURCE for
  // isResource() (e.g. Show's `.loading` gate) and $SIGNAL for isSignal() so
  // insert() reads it reactively instead of caching/freezing it.
  Object.defineProperty(resource, Symbol.for('resource'), { value: true, enumerable: true });
  Object.defineProperty(resource, Symbol.for('signal'), { value: true, enumerable: true });

  return [
    resource,
    {
      mutate: setValue as ResourceActions<T>['mutate'],
      refetch: () => {
        manualRefetch = true;
        trigger(undefined);
      },
    },
  ];
}
