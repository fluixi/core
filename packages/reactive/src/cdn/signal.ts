/**
 * CDN entry: the raw TC39 Signal core as a browser global.
 *
 *   <script src="https://.../@fluixi/reactive/signal.global.js"></script>
 *   const c = new Signal.State(0);   // window.Signal.State / .Computed / .subtle
 *
 * Exports the flat TC39 shape (State/Computed/subtle) as named bindings so the iife
 * global is `window.Signal = { State, Computed, subtle }` — matching the future native
 * globalThis.Signal, not a nested `Signal.Signal`.
 */
import { Watcher, untrack, currentComputed, hasSinks } from '../lib/signal/graph/core.js';

export { State, Computed } from '../lib/signal/graph/core.js';

export const subtle = {
  Watcher,
  untrack,
  currentComputed,
  hasSinks,
};
