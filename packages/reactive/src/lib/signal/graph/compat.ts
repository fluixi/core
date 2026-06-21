/**
 * L2 (core) — the legacy public reactive API re-expressed on top of L0 (graph) +
 * L1 (runtime), with byte-identical signatures so it is a drop-in for the existing
 * `createSignal`/`createMemo`/`createEffect`/… surface. This is the "re-point": the
 * old API delegates to the TC39-shaped core instead of the bespoke Computation graph.
 *
 * Scope: the CORE primitives (signals, memos, effects, roots, batch, untrack, on).
 * The wider surface (resources, stores, context, suspense, transitions, the SSR
 * eager-stale/drain hooks) is ported separately before the production export flips
 * — until then this lives behind its own module + spec, validated for behavioural
 * equivalence against the legacy oracle.
 *
 * Timing note: legacy effects flush SYNCHRONOUSLY on a write (outside batch), so we
 * install a synchronous L1 scheduler here; `batch` still coalesces to one flush.
 */
import { State, Computed, untrack as l0untrack } from './core.js';
import {
  effect as l1effect,
  batch as l1batch,
  setScheduler,
  afterWrite,
  flushSync,
} from './runtime.js';

export { createRoot, onCleanup, getOwner, runWithOwner } from './runtime.js';

// Compat owns all flush points (afterWrite / batch), so the host scheduler is a
// no-op: enqueue only QUEUES; a write marks the whole graph then flushes once via
// afterWrite. This separates marking from running (glitch-free, legacy-equivalent
// synchronous effects) — a synchronous scheduler that flushed mid-propagation would
// run effects before all observers were marked.
setScheduler(() => {});

const $SIGNAL = Symbol.for('signal');
const $MEMO = Symbol.for('memo');

export type Accessor<T> = () => T;
export type Setter<T> = (value: T | ((prev: T) => T)) => T;
export type Signal<T> = [get: Accessor<T>, set: Setter<T>];
export interface SignalOptions<T> {
  equals?: ((a: T, b: T) => boolean) | false;
  name?: string;
}

/** createSignal — a writable cell, returned as the legacy `[get, set]` tuple. */
export function createSignal<T>(value: T, options?: SignalOptions<T>): Signal<T> {
  const state = new State<T>(value, { equals: options?.equals });
  const read = (() => state.get()) as Accessor<T>;
  const write = ((next: T | ((prev: T) => T)) => {
    const v =
      typeof next === 'function' ? (next as (prev: T) => T)(state.peek()) : next;
    state.set(v); // marks the graph dirty
    afterWrite(); // then flush effects once (no-op inside a batch)
    return v;
  }) as Setter<T>;
  Object.defineProperty(read, $SIGNAL, { value: true, enumerable: true });
  return [read, write];
}

/** createMemo — a lazy, cached derived value (legacy accessor). */
export function createMemo<T>(
  fn: (prev?: T) => T,
  value?: T,
  options?: SignalOptions<T>,
): Accessor<T> {
  let prev = value;
  const c = new Computed<T>(() => (prev = fn(prev)), { equals: options?.equals });
  const read = (() => c.get()) as Accessor<T>;
  Object.defineProperty(read, $MEMO, { value: true, enumerable: true });
  return read;
}

/**
 * createEffect — a re-running side effect. The fn receives the previous return
 * value and may return a new one (legacy signature) or a cleanup function.
 */
export function createEffect<T>(
  fn: (prev?: T) => T | (() => void),
  value?: T,
): () => void {
  let prev = value;
  return l1effect(() => {
    const r = fn(prev);
    // A function result is treated as the next "prev" (legacy) — unless the fn
    // never returns one, in which case onCleanup is the cleanup path. We keep the
    // legacy carry-the-value behaviour; cleanups use onCleanup.
    prev = r as T;
  });
}

/** batch — coalesce writes so dependent effects flush once. */
export function batch<T>(fn: () => T): T {
  return l1batch(fn);
}

/** untrack — read without subscribing. */
export function untrack<T>(fn: () => T): T {
  return l0untrack(fn);
}

/** Force any pending effects to run now. */
export { flushSync as flush };

/**
 * on(deps, fn, { defer }) — an explicit-dependency helper. Reads `deps` (tracked),
 * then runs `fn(value, prevValue, prevResult)` untracked. `defer` skips the first run.
 */
export function on<D, R>(
  deps: Accessor<D> | Array<Accessor<unknown>>,
  fn: (value: D, prev: D | undefined, prevResult: R | undefined) => R,
  options?: { defer?: boolean },
): (prev?: R) => R | undefined {
  const isArray = Array.isArray(deps);
  let prevValue: D | undefined;
  let defer = options?.defer ?? false;
  return (prevResult?: R) => {
    const value = (
      isArray ? (deps as Array<Accessor<unknown>>).map((d) => d()) : (deps as Accessor<D>)()
    ) as D;
    if (defer) {
      defer = false;
      prevValue = value;
      return undefined;
    }
    const result = l0untrack(() => fn(value, prevValue, prevResult));
    prevValue = value;
    return result;
  };
}
