/**
 * `@fluixi/reactive/signal-next` — the complete reactive API running on the TC39
 * Signals core (L0 graph + L1 runtime), as a drop-in for `@fluixi/reactive/signal`.
 *
 * This is the OPT-IN entry for the migration. It is purely additive: the legacy
 * `@fluixi/reactive/signal` (signal.ts) remains the default and the fallback, fully
 * intact. Adopt this entry to run on the new core; when the native `globalThis.Signal`
 * ships, L0 becomes a thin polyfill swap underneath this same surface.
 *
 * Coverage: signals, memos, effects, computed, render effects, roots, ownership,
 * batch, untrack, on, transitions (minimal), context, resources (+ SSR seeding),
 * Suspense, and error boundaries — all on the TC39 graph.
 */

// Core primitives + scheduling (L2 compat over L0/L1)
export {
  createSignal,
  createMemo,
  createEffect,
  createComputed,
  createRenderEffect,
  createRoot,
  onCleanup,
  getOwner,
  runWithOwner,
  batch,
  untrack,
  on,
  flush,
  startTransition,
  useTransition,
  type Accessor,
  type Setter,
  type Signal as SignalTuple,
  type SignalOptions,
} from './compat.js';

// Context (owner-tree)
export { createContext, useContext, provide, type Context, type Owner } from './runtime.js';

// Resources (+ __FX_DATA__ SSR seeding, reused from legacy hooks)
export { createResource, type ResourceReturn, type ResourceActions } from './resource.js';

// Suspense
export {
  createSuspenseBoundary,
  provideSuspense,
  SuspenseContext,
  type SuspenseBoundary,
} from './suspense.js';

// Error boundaries
export {
  createErrorBoundary,
  provideErrorBoundary,
  type ErrorBoundary,
} from './error-boundary.js';

// The raw TC39 primitive surface (Signal.State / Computed / subtle.Watcher)
export { Signal } from './index.js';
