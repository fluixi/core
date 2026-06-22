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
// The legacy createSignal attaches a ReactiveNode (with a live `.value`/`.version`)
// under this symbol; consumers like the store read `signal[$NODE].value` to gate
// updates. compat exposes a matching node-like view so those consumers work unchanged.
const $NODE = Symbol.for('signal-node');

export type Accessor<T> = () => T;
export type Setter<T> = (value: T | ((prev: T) => T)) => T;
export type Signal<T> = [get: Accessor<T>, set: Setter<T>];
export interface SignalOptions<T> {
  equals?: ((a: T, b: T) => boolean) | false;
  name?: string;
}
export interface MemoOptions<T> extends SignalOptions<T> {
  initial?: T;
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
  // Node-like view for consumers (e.g. the store) that read `signal[$NODE].value`.
  Object.defineProperty(read, $NODE, {
    value: {
      get value() {
        return state.peek();
      },
      get version() {
        return state.version;
      },
    },
    enumerable: false,
  });
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

/**
 * createComputed — an EAGER, owner-managed reactive computation (returns void).
 * Unlike a lazy memo it runs immediately and re-runs eagerly when a dep changes;
 * used for derivations with side effects (e.g. store internals). On L1 that is an
 * eager effect whose dispose is owned by the current scope.
 */
export function createComputed<T>(fn: (prev?: T) => T, value?: T): void {
  let prev = value;
  l1effect(() => {
    prev = fn(prev) as T;
  });
}

/**
 * createRenderEffect — an effect that runs in the render phase. For the reactive
 * core this is an eager effect (the render-vs-commit timing distinction is a DOM-
 * layer concern); returns a dispose like createEffect.
 */
export function createRenderEffect<T>(
  fn: (prev?: T) => T | (() => void),
  value?: T,
): () => void {
  let prev = value;
  return l1effect(() => {
    prev = fn(prev) as T;
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

/**
 * startTransition — run `fn`'s updates as one batch. (Minimal port: the concurrent
 * time-slicing/deferral of the legacy implementation is a later refinement; the
 * batched-commit semantics that callers rely on are preserved.)
 */
export function startTransition(fn: () => void): Promise<void> {
  l1batch(fn);
  return Promise.resolve();
}

/** useTransition — `[isPending, startTransition]`. isPending is synchronous here (no deferral). */
export function useTransition(): [() => boolean, (fn: () => void) => Promise<void>] {
  return [() => false, startTransition];
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
