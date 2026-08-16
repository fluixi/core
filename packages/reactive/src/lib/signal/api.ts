/**
 * The short reactive API: `signal`, `memo`, `effect`.
 *
 *   const count = signal(0);
 *   count();          // read
 *   count.set(1);     // write
 *
 * `signal` is `createSignal` with the setter attached to the accessor instead of handed
 * back beside it. The function IS that accessor, so a read is the same call it always
 * was, `count` passes anywhere an accessor is expected, and only the write changes
 * spelling. `memo` is `createMemo` under a shorter name — a derived value has nothing to
 * set, so there is nothing to attach.
 *
 * The rule across the API: read it the way its shape implies — a call for a value, a
 * property for an object (see `store`) — and `.set()` writes.
 *
 * `createSignal` and friends are unchanged; the two forms are one primitive and mix
 * freely.
 */
import { createEffect, createMemo, createSignal } from './graph/compat.js';
import type { Accessor, Setter, SignalOptions } from './signal.js';

/** A writable reactive value: call it to read, `.set()` to write. */
export type SignalHandle<T> = Accessor<T> & { set: Setter<T> };

/** A derived value. Read-only, so it is just the accessor. */
export type MemoHandle<T> = Accessor<T>;

export function signal<T>(value: T, options?: SignalOptions<T>): SignalHandle<T>;
export function signal<T = undefined>(): SignalHandle<T | undefined>;
export function signal<T>(value?: T, options?: SignalOptions<T>): SignalHandle<T> {
  const [read, write] = createSignal(value as T, options);
  return Object.assign(read, { set: write }) as SignalHandle<T>;
}

export function memo<T>(fn: (prev?: T) => T, value?: T, options?: SignalOptions<T>): MemoHandle<T> {
  return createMemo(fn, value, options);
}

/** Run `fn` and re-run it when anything it read changes. Returns its disposer. */
export function effect<T>(fn: (prev?: T) => T | (() => void), value?: T): () => void {
  return createEffect(fn, value);
}
