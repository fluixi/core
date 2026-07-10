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
 *
 * As a complete drop-in for `@fluixi/reactive/signal`, it first re-exports the FULL
 * legacy surface (operators, list helpers, schedulers, etc.), then OVERRIDES the core
 * reactive primitives below with the TC39 implementations — explicit named re-exports
 * take precedence over this star, so consumers get the new core for those. (Legacy
 * operators that still hold their own module state run on the legacy graph until ported.)
 *
 * The legacy surface is pulled from the SOURCE modules directly (not `../index.js`, which
 * now re-exports THIS file — importing it here would be a cycle).
 */
// Types only from the legacy file — its runtime values are all provided by the TC39
// core below (this used to be a value `export *`, which just re-exported dead legacy
// implementations for the explicit exports to shadow). Type-only = weightless.
// Context and ResourceReturn come from the TC39 modules (runtime.js / resource.js).
export type {
  Accessor, Setter, SignalOptions, SignalTuple, MemoOptions, EqualityFn,
  EffectFn, EffectOptions, ComputationFn, Computation, Cleanup, DerivedFn, AsyncFn,
  Resource, ResourceFetcher, ResourceSource, ResourceOptions, ResourceState,
  RootOwner, ReactiveNode, Trigger, EnhancedTrigger, EnhancedSignal, AsyncSignal,
  LazySignal, SignalWithHistory,
  SuspenseContextType, SuspenseListContextType, SuspenseListRegisteredState,
} from '../signal.js';
// Signal operators (`@fluixi/reactive/operators`) and the cached-resource helper
// (`@fluixi/reactive/cached-resource`) live on their own subpaths — cached-resource
// still runs on the legacy graph, and keeping both out of the default entry lets the
// legacy `signal.js` fully tree-shake. `list.ts` stays: dom <For>/<Index> use it.
export * from '../list.js';

// Detection guards + helpers — sourced from the TC39-owned module (not signal.js),
// so they survive once signal.ts is retired. Explicit re-export wins over the star.
export {
  __DEV__,
  isSignal,
  isMemo,
  isResource,
  isComponent,
  isSuspense,
  isProvider,
  makeArrayFlat,
} from './detect.js';

// SSR resource injectables — sourced from the TC39-owned module, not signal.js.
export {
  setResourceTracker,
  trackResourcePromise,
  setServerDataGetter,
  getServerData,
  setResourceIdSource,
  nextResourceId,
  setResourceDataSink,
  reportResourceData,
} from './ssr-hooks.js';

// Derived utilities on the TC39 graph.
export { createSelector, createDeferred, createDebounce } from './derived.js';

// Reactive children resolver.
export { readChildren } from './children.js';

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
  setOwner,
  runWithOwner,
  batch,
  untrack,
  on,
  flush,
  startTransition,
  useTransition,
  // Note: the value re-exports above override the legacy ones from `export *`, but the
  // TYPE re-exports are intentionally NOT pulled from compat — the legacy `Accessor`/
  // `Signal`/`SignalOptions` types (a superset, incl. `toObservable`) win, so consumers
  // like the store keep type-checking. (Runtime is identical; only the surface type differs.)
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
// `Signal` is the TC39 namespace VALUE (Signal.State/Computed/subtle…). The legacy `[get,set]`
// tuple type is exported as `SignalTuple` (via `export *` above) — a value and a type of the
// same name can't be re-exported together, so consumers use `SignalTuple<T>` for the tuple.
export { Signal } from './index.js';

// Marker symbols consumers use to detect signals/proxies (e.g. the store, which builds
// only on the public primitives). $SIGNAL uses the global registry — identical to the
// legacy `Symbol.for('signal')` — so detection is interoperable. Defined locally (not
// re-exported from legacy) so signal-next has no import dependency on signal.ts here,
// which would create an async-resolution cycle when consumers alias signal → signal-next.
export const $SIGNAL = Symbol.for('signal');
export const $PROXY = Symbol.for('fluixi-proxy');
