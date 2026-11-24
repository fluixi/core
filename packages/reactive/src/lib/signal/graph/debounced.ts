/**
 * Debounced reactive values.
 *
 * The shape that matters: a debounced input has TWO values, not one. The
 * immediate value is what the user is typing and what a controlled input must be
 * bound to; the settled value is what a query should run on. Collapsing them into
 * a single delayed signal makes a controlled input lag behind the keyboard, which
 * is why this exposes both rather than only the settled one.
 *
 * `flush` and `cancel` are part of the primitive, not extras: a search box needs
 * "submit now" on Enter, and navigating away needs to drop a pending write instead
 * of firing it into a disposed scope.
 */
import { createSignal, onCleanup, untrack } from './compat.js';
import { createResource } from './resource.js';
import type { Accessor, Setter } from './compat.js';
import type { ResourceFetcherInfo, ResourceReturn } from './resource.js';

/** Controls beyond reading and writing the value. */
export interface DebounceControls<T> {
  /** The value as written, before the delay: bind a controlled input to this. */
  immediate: Accessor<T>;
  /** True while a write is waiting to settle. Distinct from a request in flight. */
  pending: Accessor<boolean>;
  /** Settle now, dropping the remaining delay. Returns the value that settled. */
  flush: () => T;
  /** Discard a pending write; the settled value keeps its last value. */
  cancel: () => void;
}

/**
 * A signal whose settled value trails writes by `delay`.
 *
 * @example
 * ```ts
 * const [query, setQuery, { immediate, pending, flush }] = createDebouncedSignal('', 300);
 *
 * // the input never lags: it binds the immediate value
 * <input value={immediate()} onInput={(e) => setQuery(e.currentTarget.value)}
 *        onKeyDown={(e) => e.key === 'Enter' && flush()} />
 *
 * // work keys off the settled value
 * createEffect(() => search(query()));
 * ```
 */
export function createDebouncedSignal<T>(
  initial: T,
  delay = 300,
): [Accessor<T>, Setter<T>, DebounceControls<T>] {
  const [immediate, setImmediate] = createSignal(initial);
  const [settled, setSettled] = createSignal(initial);
  const [pending, setPending] = createSignal(false);

  let timer: ReturnType<typeof setTimeout> | undefined;

  const clear = (): void => {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
  };

  const settle = (): T => {
    clear();
    // untrack, settling is a write, and must not subscribe whoever triggered it.
    const value = untrack(immediate);
    setSettled(() => value);
    setPending(false);
    return value;
  };

  const set = ((value: T | ((prev: T) => T)) => {
    const next =
      typeof value === 'function' ? (value as (prev: T) => T)(untrack(immediate)) : value;

    setImmediate(() => next);
    setPending(true);
    clear();
    timer = setTimeout(settle, delay);
    return next;
  }) as Setter<T>;

  // A pending write into a disposed scope is a write nobody asked for.
  onCleanup(clear);

  return [settled, set, { immediate, pending, flush: settle, cancel: () => { clear(); setPending(false); } }];
}

export interface DebouncedResourceOptions<T> {
  /** Delay before a change reaches the fetcher. Defaults to 300ms. */
  delay?: number;
  /** Seed value, so the resource has something to read before the first fetch. */
  initialValue?: T;
  /**
   * Whether a settled query should be fetched at all. Defaults to rejecting
   * `undefined`, `null` and `''`, an empty search box shouldn't hit the network.
   */
  shouldFetch?: (query: unknown) => boolean;
}

export interface DebouncedResourceControls<S> extends DebounceControls<S> {
  /** The settled query the resource is fetching for. */
  query: Accessor<S>;
  setQuery: Setter<S>;
  refetch: (info?: unknown) => unknown;
}

function meaningful(query: unknown): boolean {
  return query !== undefined && query !== null && query !== '';
}

/**
 * A resource driven by a debounced query: search-as-you-type, as one primitive.
 *
 * Two waiting states exist and they are not the same thing: `pending` is "the user
 * is still typing", `resource.loading` is "a request is in flight". A UI that
 * conflates them either flickers on every keystroke or looks frozen while typing.
 *
 * An empty query doesn't fetch, so a cleared search box doesn't hit the network.
 *
 * @example
 * ```ts
 * const [results, { setQuery, immediate, pending, flush }] =
 *   createDebouncedResource('', (q) => api.search(q));
 *
 * <input value={immediate()} onInput={(e) => setQuery(e.currentTarget.value)} />
 * <Show when={pending()}>typing...</Show>
 * <Show when={results.loading}>searching...</Show>
 * ```
 */
/** `''` as an initial query is any string afterwards: without this, `setQuery('a')` did not typecheck. */
type Widen<S> = S extends string ? string : S extends number ? number : S extends boolean ? boolean : S;

export function createDebouncedResource<T, S>(
  initial: S,
  fetcher: (query: Widen<S>, info: ResourceFetcherInfo<T>) => T | Promise<T>,
  options: DebouncedResourceOptions<T> = {},
): [ResourceReturn<T>[0], DebouncedResourceControls<Widen<S>>] {
  const { delay = 300, initialValue, shouldFetch = meaningful } = options;
  const [query, setQuery, controls] = createDebouncedSignal<Widen<S>>(initial as Widen<S>, delay);

  // createResource treats a falsy source as "don't fetch", which is exactly the
  // empty-query case, so the predicate rides on the source rather than the fetcher.
  const source = (): Widen<S> | false => (shouldFetch(query()) ? query() : false);

  const [resource, { refetch }] = createResource<T, Widen<S>>(
    source,
    fetcher,
    initialValue === undefined ? {} : { initialValue },
  );

  return [resource, { ...controls, query, setQuery, refetch }];
}
