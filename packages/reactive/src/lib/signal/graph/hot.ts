/**
 * Where hot reload keeps state across a swap. `@fluixi/dom/hot` installs it in dev when an app
 * asks to keep the edited component's state; nothing else does, so everywhere else a signal or
 * store costs one null check.
 */
import { G } from './state.js';

export type HotStateKind = 'signal' | 'store';

export interface HotState {
  /** A signal or store is being created from `initial`: the value it should start from. */
  take(kind: HotStateKind, initial: unknown): unknown;
  /** Its current value and a way back to `initial`, in the same order as `take`. */
  keep(read: () => unknown, reset: () => void): void;
}

/**
 * Make the signals `fn` creates invisible to the hook: a store's per-key signals and a
 * resource's own appear when something first reads them, so counting them would shift every
 * position after them.
 */
export function withoutHotState<T>(fn: () => T): T {
  const hook = G.hot;
  if (!hook) return fn();
  G.hot = null;
  try {
    return fn();
  } finally {
    G.hot = hook;
  }
}

/** Install the hook, or remove it with `null`. For dev tooling. */
export function setHotState(hook: HotState | null): void {
  G.hot = hook;
}
