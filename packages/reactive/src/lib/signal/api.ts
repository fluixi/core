/**
 * The short reactive API: `signal`, `memo`, `effect`.
 *
 * Same primitives as `createSignal`/`createMemo`/`createEffect`, handed back as one
 * object instead of a tuple:
 *
 *   const count = signal(0);
 *   count.get();
 *   count.set(1);
 *
 * The `get` and `set` here ARE the accessor and setter `createSignal` returns, so
 * everything that tracks one tracks the other. Nothing new runs underneath — this is a
 * shape, not a second reactive system, and the two forms interleave freely.
 *
 * Why a shape at all: one binding instead of a destructured pair, no `setCount` to name,
 * and `.get()`/`.set()` reads the way the TC39 proposal does — which is what the graph
 * underneath is already modelled on. `memo` exposes `get` alone because a derived value
 * has nothing to set.
 *
 * `createSignal` and friends stay exactly as they are. A library that prefers the tuple,
 * or that already ships against it, needs no change.
 */
import { createEffect, createMemo, createSignal } from './graph/compat.js';
import type { Accessor, Setter, SignalOptions } from './signal.js';

/** A writable reactive cell. */
export interface SignalHandle<T> {
  /** Read the current value, tracking it in whatever computation is running. */
  get: Accessor<T>;
  /** Write a value, or derive one from the previous. */
  set: Setter<T>;
}

/** A cached derived value. Read-only, so there is no `set`. */
export interface MemoHandle<T> {
  get: Accessor<T>;
}

export function signal<T>(value: T, options?: SignalOptions<T>): SignalHandle<T>;
export function signal<T = undefined>(): SignalHandle<T | undefined>;
export function signal<T>(value?: T, options?: SignalOptions<T>): SignalHandle<T> {
  const [get, set] = createSignal(value as T, options);
  return { get, set };
}

export function memo<T>(fn: (prev?: T) => T, value?: T, options?: SignalOptions<T>): MemoHandle<T> {
  return { get: createMemo(fn, value, options) };
}

/** Run `fn` and re-run it when anything it read changes. Returns its disposer. */
export function effect<T>(fn: (prev?: T) => T | (() => void), value?: T): () => void {
  return createEffect(fn, value);
}
