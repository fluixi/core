/**
 * `@fluixi/reactive/signal` — now the TC39 core. This re-exports the complete reactive
 * API running on the TC39 Signals graph (graph/signal-next.ts): the full legacy surface
 * with the core primitives (createSignal/createMemo/createEffect/createRoot/…) swapped to
 * the new graph, plus `Signal.State`/`Computed`/`subtle.Watcher`, resources, Suspense,
 * context, and error boundaries.
 *
 * The pre-TC39 implementation is preserved, byte-for-byte, behind the explicit
 * `@fluixi/reactive/signal-legacy` entry (./index-legacy.ts).
 */
export * from './graph/signal-next.js';

// The short API — `signal`/`memo`/`effect` over the same primitives.
export * from './api.js';
