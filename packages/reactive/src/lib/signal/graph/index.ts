/**
 * The TC39-shaped surface over the graph core: `Signal.State`, `Signal.Computed`,
 * and the `Signal.subtle` namespace of Watcher, untrack, currentComputed and
 * hasSinks.
 *
 * It mirrors the proposal so that the runtime layer, and eventually app code, target
 * the shape a native `globalThis.Signal` would expose. When that ships, `core.ts`
 * becomes a `globalThis.Signal ?? polyfill` swap and nothing above it moves.
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
