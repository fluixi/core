import { Accessor, mapArray, keyArray } from '@fluixi/reactive/signal';
import { normalizeAccessor } from './utils.js';
import { hydrateAdvancePast } from '../dom/hydration.js';

type EachSource<T> =
  | ReadonlyArray<T>
  | (() => ReadonlyArray<T> | null | undefined)
  | Accessor<ReadonlyArray<T>>
  | null
  | undefined
  | false;

/** Props when `by` is NOT provided — item is the plain value `T`. */
export interface ForPropsUnkeyed<T, U = any> {
  /** Reactive array to iterate over — static, readonly, accessor, or signal. */
  each: EachSource<T>;
  /** Rendered when the array is empty or nullish. */
  fallback?: any;
  /**
   * Render function called once per unique item (keyed by object reference).
   *
   * @example
   * <For each={rows}>{(row, idx) => <tr>...</tr>}</For>
   */
  children: (item: T, index: Accessor<number>) => U;
  by?: undefined;
}

/** Props when `by` IS provided — item is a reactive `Accessor<T>`. */
export interface ForPropsKeyed<T, U = any> {
  /** Reactive array to iterate over — static, readonly, accessor, or signal. */
  each: EachSource<T>;
  /** Rendered when the array is empty or nullish. */
  fallback?: any;
  /**
   * Render function called once per unique key.
   * `item` is a reactive accessor — call `item()` inside to read the current value.
   * The same DOM is reused whenever `by(item)` returns the same key, even if the
   * object reference changes.
   *
   * @example
   * <For each={rows} by={r => r.id}>{(row, idx) => <tr>{row().name}</tr>}</For>
   */
  children: (item: Accessor<T>, index: Accessor<number>) => U;
  /**
   * Key function for stable DOM reuse across reference changes.
   * When provided, `item` in the render function is an `Accessor<T>`.
   */
  by: (item: T) => any;
}

export type ForProps<T, U = any> = ForPropsUnkeyed<T, U> | ForPropsKeyed<T, U>;

/**
 * Keyed list rendering — mirrors SolidJS `<For>`.
 *
 * Default: keyed by object reference. Same object at new index → only index
 * signal updates (no DOM re-render). Removed items are disposed.
 *
 * With `by`: keyed by the return value of `by(item)`. When the same key is
 * found in the previous render, the DOM entry is reused and the index signal
 * is updated. The item accessor is a live `createMemo(() => list[idx()])` so
 * that reading `item().someField` inside a reactive context creates a
 * fine-grained dependency on the store proxy property — not a frozen snapshot.
 *
 * @example Reference-keyed (default)
 * <For each={items}>{(item, idx) => <li>{item.name}</li>}</For>
 *
 * @example Stable-key (by prop) — survives object recreation
 * <For each={rows} by={r => r.id}>
 *   {(row, idx) => <tr><td>{() => row().name}</td></tr>}
 * </For>
 */


export function For<T, U>(props: ForPropsKeyed<T, U>): Accessor<U[]>;
export function For<T, U>(props: ForPropsUnkeyed<T, U>): Accessor<U[]>;
export function For<T, U>(props: ForProps<T, U>): Accessor<U[]> {
  const each = normalizeAccessor(props.each as any);
  const fallback = () => props.fallback ?? null;

  // Render the children (a fn, or an array of fn/values) for one item, then
  // ascend the hydration cursor past what was placed.
  const render = (item: any, index: Accessor<number>): U => {
    const children = props.children as any;
    const rendered = (
      Array.isArray(children)
        ? children.map((c: any) => (typeof c === 'function' ? c(item, index) : c))
        : typeof children === 'function'
        ? children(item, index)
        : children
    ) as U;
    hydrateAdvancePast(rendered);
    return rendered;
  };

  // `by` → key-function reconciliation (item is a live accessor); default →
  // reference reconciliation (item is the plain value). Both keep each item in
  // its own root so list items stay owner-stable.
  return props.by
    ? keyArray<T, U>(each, props.by, (item, index) => render(item, index), { fallback })
    : mapArray<T, U>(each, (item, index) => render(item, index), { fallback });
}
