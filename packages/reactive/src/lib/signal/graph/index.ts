/**
 * The TC39-shaped public surface for the L0 graph core: `Signal.State`,
 * `Signal.Computed`, and the `Signal.subtle` namespace (Watcher / untrack /
 * currentComputed / hasSinks). This mirrors the TC39 Signals proposal so the L1
 * runtime (and, eventually, app code) can target the same shape that a native
 * `globalThis.Signal` would expose — at which point L0 becomes a thin
 * `globalThis.Signal ?? polyfill` swap.
 */
import { State, Computed, Watcher, untrack, currentComputed, hasSinks } from './core.js';

export const Signal = {
  State,
  Computed,
  subtle: {
    Watcher,
    untrack,
    currentComputed,
    hasSinks,
  },
} as const;

export { State, Computed, Watcher } from './core.js';
