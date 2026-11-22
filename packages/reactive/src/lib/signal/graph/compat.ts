/**
 * The `create*` names, over the graph core and the runtime.
 *
 * Signatures are identical to the ones this API has always had, so nothing calling
 * `createSignal`, `createMemo` or `createEffect` can tell the difference. What
 * changed underneath is that they now delegate to the TC39-shaped core in `core.ts`
 * rather than to the bespoke `Computation` graph, which survives in `../signal.ts`
 * as archive.
 *
 * This module covers the primitives: signals, memos, effects, roots, batch, untrack
 * and on. The wider surface, resources and stores and context and suspense and
 * transitions and the SSR hooks, is ported in the modules beside it.
 *
 * Timing: effects flush synchronously on a write outside a batch, which is what this
 * API has always done, so the scheduler installed here is synchronous. `batch` still
 * coalesces a group of writes into one flush.
 */
import { State, Computed, untrack as l0untrack } from './core.js';
import {
  effect as l1effect,
  batch as l1batch,
  setScheduler,
  afterWrite,
  flushSync,
  reportSuspend,
  getOwner,
  runWithOwner,
  onCleanup as l1onCleanup,
} from './runtime.js';
import { isObserved, reportReactiveDispose, reportReactiveNode } from './observe.js';
import { G } from './state.js';
// `__DEV__` is folded by a build that defines it, so a bundler drops the devtools reporting it
// guards; without it the check reads NODE_ENV. Written inline at each use: a bundler keeps a
// function whose only caller sits behind a constant.
declare const __DEV__: boolean | undefined;
import { isDevelopment } from './dev-env.js';

function isThenable(v: unknown): v is Promise<unknown> {
  return !!v && typeof (v as { then?: unknown }).then === 'function';
}

export { createRoot, onCleanup, getOwner, setOwner, runWithOwner } from './runtime.js';

// Compat owns all flush points (afterWrite / batch), so the host scheduler is a
// no-op: enqueue only queues; a write marks the whole graph then flushes once via
// afterWrite. This separates marking from running (glitch-free, legacy-equivalent
// synchronous effects), a synchronous scheduler that flushed mid-propagation would
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
  /** Legacy passthrough flags (ignored by the TC39 core); kept for option compatibility. */
  internal?: boolean;
}
export interface MemoOptions<T> extends SignalOptions<T> {
  initial?: T;
}

/** createSignal, a writable cell, returned as the legacy `[get, set]` tuple. */
export function createSignal<T>(value: T, options?: SignalOptions<T>): Signal<T> {
  const hot = G.hot;
  const initial = value;
  if (hot) value = hot.take('signal', value) as T;
  const state = new State<T>(value, { equals: options?.equals });
  const read = (() => state.get()) as Accessor<T>;
  const write = ((next: T | ((prev: T) => T)) => {
    const v =
      typeof next === 'function' ? (next as (prev: T) => T)(state.peek()) : next;
    state.set(v); // marks the graph dirty
    afterWrite(); // then flush effects once (no-op inside a batch)
    return v;
  }) as Setter<T>;
  // Plain writes: defineProperty on a function costs several times a signal's own
  // creation at list scale. The node view for consumers that read
  // `signal[$NODE].value` (the store, devtools) is the State itself.
  (read as unknown as Record<symbol, unknown>)[$SIGNAL] = true;
  (read as unknown as Record<symbol, unknown>)[$NODE] = state;
  // The report object is built only when someone is listening: at list scale
  // an unobserved build per signal is creation cost with no reader.
  if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment()) && isObserved()) {
    reportReactiveNode({
      kind: 'signal',
      node: state,
      handle: read,
      name: options?.name,
      set: write as (value: unknown) => void,
    });
  }
  // A signal goes when its owner does, the same as a memo. A list rebuilt without a key
  // makes one per row per update, and a watcher that is never told keeps every one of them.
  if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment()) && isObserved()) l1onCleanup(() => reportReactiveDispose(state));
  if (hot) hot.keep(() => state.peek(), () => write(() => initial));
  return [read, write];
}

/** createMemo, a lazy, cached derived value (legacy accessor). */
export function createMemo<T>(
  fn: (prev?: T) => T,
  value?: T,
  options?: SignalOptions<T>,
): Accessor<T> {
  let prev = value;
  // Capture the owner at creation so the memo's fn (and any component it renders, e.g.
  // a lazy route) runs under this scope's owner, preserving context up the owner chain
  // even when the memo recomputes later (async SSR drain). Matches legacy memo semantics.
  const owner = getOwner();
  const c = new Computed<T>(
    () =>
      runWithOwner(owner, () => {
        try {
          return (prev = fn(prev));
        } catch (e) {
          // A suspended read (resource/lazy while pending) throws its promise. Legacy
          // memos keep their previous value and let a Suspense boundary handle it,
          // rather than rethrowing the promise as an error.
          if (isThenable(e)) {
            reportSuspend(e);
            return prev as T;
          }
          throw e;
        }
      }),
    { equals: options?.equals },
  );
  const read = (() => c.get()) as Accessor<T>;
  // A memo is a readable reactive accessor: stamp $SIGNAL (matching the legacy
  // createMemo) so `isSignal(memo)` is true. Without this, the DOM runtime's
  // insert() fails to recognise a control-flow memo (For/Switch/Index/Dynamic)
  // as reactive, caches it as a component, and freezes it -> updates never apply.
  Object.defineProperty(read, $SIGNAL, { value: true, enumerable: true });
  Object.defineProperty(read, $MEMO, { value: true, enumerable: true });
  if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment()) && isObserved()) reportReactiveNode({ kind: 'memo', node: c, handle: read, name: options?.name });
  // A memo goes when its owner does: unlink it from its sources, or a signal
  // that outlives the list keeps every row it ever had in its observers set.
  // Registered whether or not a watcher is looking; the report itself is not.
  l1onCleanup(() => {
    c.dispose();
    if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment()) && isObserved()) reportReactiveDispose(c);
  });
  return read;
}

/**
 * createEffect, a re-running side effect. The fn receives the previous return
 * value and may return a new one (legacy signature) or a cleanup function.
 */
export function createEffect<T>(
  fn: (prev?: T) => T | (() => void),
  value?: T,
  options?: { name?: string },
): () => void {
  let prev = value;
  return l1effect(() => {
    const r = fn(prev);
    // A function result is treated as the next "prev" (legacy), unless the fn
    // never returns one, in which case onCleanup is the cleanup path. We keep the
    // legacy carry-the-value behaviour; cleanups use onCleanup.
    prev = r as T;
  }, true, options?.name);
}

/**
 * createComputed, an EAGER, owner-managed reactive computation (returns void).
 * Unlike a lazy memo it runs immediately and re-runs eagerly when a dep changes;
 * used for derivations with side effects, such as store internals. It is an eager
 * effect whose dispose is owned by the current scope.
 */
export function createComputed<T>(fn: (prev?: T) => T, value?: T): void {
  let prev = value;
  l1effect(() => {
    prev = fn(prev) as T;
  });
}

/**
 * createRenderEffect, an effect that runs in the render phase. For the reactive
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

/** batch: coalesce writes so dependent effects flush once. */
export function batch<T>(fn: () => T): T {
  return l1batch(fn);
}

/** untrack: read without subscribing. */
export function untrack<T>(fn: () => T): T {
  return l0untrack(fn);
}

// Transitions. Shared through the global registry, as the graph state is, so every copy of
// this module sees the same one.
const transition = ((globalThis as Record<symbol, unknown>)[Symbol.for('fluixi.transition')] ??= {
  depth: 0,
  loads: new Set<Promise<unknown>>(),
  pending: undefined,
}) as { depth: number; loads: Set<Promise<unknown>>; pending: [() => number, (n: number) => void] | undefined };

function pendingSignal(): [() => number, (n: number) => void] {
  return (transition.pending ??= createSignal(0) as unknown as [() => number, (n: number) => void]);
}

/** Whether the code running now is inside `startTransition`: a load it starts keeps the current UI. */
export function inTransition(): boolean {
  return transition.depth > 0;
}

/** A load a transition started: counted in `isPending` until it settles. */
export function trackTransitionLoad(load: Promise<unknown>): void {
  const [, setPending] = pendingSignal();
  transition.loads.add(load);
  setPending(transition.loads.size);
  const done = () => {
    transition.loads.delete(load);
    setPending(transition.loads.size);
  };
  load.then(done, done);
}

/**
 * Run `fn`'s updates as a transition: a resource they make load again keeps showing its
 * current value instead of suspending, so the page stays as it is (no Suspense fallback)
 * until the new data is there. The returned promise settles once every load the transition
 * started has. A first load has no value to keep and suspends as usual.
 */
export function startTransition(fn: () => void): Promise<void> {
  const before = new Set(transition.loads);
  transition.depth++;
  try {
    l1batch(fn);
    // The loads `fn` causes start in effects: run them now, inside the transition.
    flushSync();
  } finally {
    transition.depth--;
  }
  const started = [...transition.loads].filter((load) => !before.has(load));
  return Promise.allSettled(started).then(() => undefined);
}

/**
 * useTransition: `[isPending, startTransition]`. `isPending` is true while a load a
 * transition started is in flight.
 */
export function useTransition(): [() => boolean, (fn: () => void) => Promise<void>] {
  const [pending] = pendingSignal();
  return [() => pending() > 0, startTransition];
}

/** Force any pending effects to run now. */
export { flushSync };

/**
 * flush: drain pending effects, returning a Promise (legacy `flush()` is async; many
 * callers do `flush().then(...)`). Effects already flush synchronously on each write via
 * afterWrite, so this just settles any remainder and resolves.
 */
export function flush(): Promise<void> {
  flushSync();
  return Promise.resolve();
}

/**
 * on(deps, fn, { defer }), an explicit-dependency helper. Reads `deps` (tracked),
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
