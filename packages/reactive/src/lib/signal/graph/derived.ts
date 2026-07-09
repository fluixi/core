/**
 * Derived signal utilities on the TC39 core: a keyed selector, a deferred
 * (idle-scheduled) signal, and a debounce wrapper. They build their signals and
 * effects on the TC39 graph (compat primitives) rather than the legacy signal.ts
 * graph, so they track TC39 signals correctly.
 */
import { createSignal, createEffect, onCleanup } from './compat.js';
import type { Accessor, EqualityFn, SignalTuple, SignalOptions } from '../signal.js';

/** Keyed selector: `selector(key)` is a fine-grained boolean that flips only when its own key's match changes. */
export function createSelector<T, U = T>(
  source: () => T,
  fn: (key: U, value: T) => boolean = (k, v) => (k as any) === (v as any),
): (key: U) => boolean {
  const map = new Map<U, SignalTuple<boolean>>();
  createEffect(() => {
    const value = source();
    for (const [key, signal] of map) {
      const [get, set] = signal;
      const match = fn(key, value);
      if (get() !== match) set(match);
    }
  });
  return (key: U): boolean => {
    let signal = map.get(key);
    if (!signal) {
      const [get, set] = createSignal(false);
      signal = [get, set] as SignalTuple<boolean>;
      map.set(key, signal);
      const value = source();
      set(fn(key, value));
    }
    return signal[0]();
  };
}

/** A signal that tracks `source` but applies updates on idle/timeout, keeping the current UI responsive. */
export function createDeferred<T>(
  source: Accessor<T>,
  options?: { timeoutMs?: number; equals?: false | EqualityFn<T> },
): Accessor<T> {
  const [delayed, setDelayed] = createSignal(source(), options as SignalOptions<T>);
  createEffect(() => {
    const v = source();
    if (options?.timeoutMs) setTimeout(() => setDelayed(() => v), options.timeoutMs);
    else if (typeof requestIdleCallback === 'function')
      requestIdleCallback(() => setDelayed(() => v));
    else Promise.resolve().then(() => setDelayed(() => v));
  });
  return delayed;
}

/**
 * Debounce wrapper — delays invoking `fn` until `delay` ms after the last call.
 * Pending timers are cancelled when the owning scope disposes (via onCleanup).
 */
export function createDebounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: Parameters<T>): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      if (args.length > 0) {
        let element = args[args.length - 1];
        if (
          typeof element === 'object' &&
          element &&
          !element.tagName &&
          element.target &&
          element.target.tagName
        ) {
          element = element.target;
        }
        if (
          element &&
          typeof element === 'object' &&
          element.tagName &&
          (element.tagName.toLowerCase() === 'input' ||
            element.tagName.toLowerCase() === 'textarea')
        )
          element.focus();
      }
      fn(...args);
    }, delay);
  };
  onCleanup(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
  return debounced as unknown as T;
}
