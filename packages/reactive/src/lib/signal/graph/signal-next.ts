/**
 * The complete reactive API, running on the TC39 Signals core and the runtime over it.
 *
 * This is what `@fluixi/reactive/signal` re-exports, so it is the default and not an
 * opt-in. It had its own `signal-next` subpath during the migration, when the legacy
 * implementation was still the default; that subpath is gone, having ended up with no
 * export `./signal` did not already have. When the native `globalThis.Signal` ships,
 * `core.ts` becomes a thin polyfill swap underneath this same surface.
 *
 * Coverage: signals, memos, effects, computed, render effects, roots, ownership,
 * batch, untrack, on, transitions (minimal), context, resources (+ SSR seeding),
 * Suspense, and error boundaries, all on the TC39 graph.
 *
 * As a complete drop-in for `@fluixi/reactive/signal`, it first re-exports the FULL
 * legacy surface (operators, list helpers, schedulers, etc.), then OVERRIDES the core
 * reactive primitives below with the TC39 implementations: explicit named re-exports
 * take precedence over this star, so consumers get the new core for those. (Legacy
 * operators that still hold their own module state run on the legacy graph until ported.)
 *
 * The legacy surface is pulled from the SOURCE modules directly (not `../index.js`, which
 * now re-exports this file, importing it here would be a cycle).
 */
// Types only from the legacy file, its runtime values are all provided by the TC39
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
// (`@fluixi/reactive/cached-resource`) keep their own subpaths so the default entry
// stays small. cached-resource runs on this graph now, so it no longer pulls the
// archive in either; the subpath is about entry size rather than tree-shaking, and
// moving it here is a decision nobody has taken. `list.ts` stays: dom <For> and
// <Index> use it.
export * from '../list.js';

// Detection guards + helpers: sourced from the TC39-owned module (not signal.js),
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

// SSR resource injectables: sourced from the TC39-owned module, not signal.js.
export {
  setResourceTracker,
  trackResourcePromise,
  setServerDataGetter,
  getServerData,
  setResourceIdSource,
  nextResourceId,
  setResourceDataSink,
  reportResourceData,
  setResourceCacheScope,
  currentResourceCache,
  createResourceCache,
  type ResourceCache,
  type ResourceCacheEntry,
} from './ssr-hooks.js';

// Derived utilities on the TC39 graph.
export { createSelector, createDeferred, createDebounce } from './derived.js';
export {
  createDebouncedSignal,
  createDebouncedResource,
  type DebounceControls,
  type DebouncedResourceOptions,
  type DebouncedResourceControls,
} from './debounced.js';

// Reactive children resolver.
export { readChildren } from './children.js';

// Primitives and scheduling, from the compat layer
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
  // TYPE re-exports are intentionally not pulled from compat, the legacy `Accessor`/
  // `Signal`/`SignalOptions` types (a superset, incl. `toObservable`) win, so consumers
  // like the store keep type-checking. (Runtime is identical; only the surface type differs.)
} from './compat.js';

// Context (owner-tree)
export { useContext, provide, isOwnerDisposed, createChildOwner, disposeScope, type Context, type Owner } from './runtime.js';
export { createContext } from './context-children.js';

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
  nearestErrorBoundary,
  type ErrorBoundary,
} from './error-boundary.js';

// The raw TC39 primitive surface (Signal.State / Computed / subtle.Watcher)
// `Signal` is the TC39 namespace value (Signal.State/Computed/subtle, and the rest). The legacy `[get,set]`
// tuple type is exported as `SignalTuple` (via `export *` above), a value and a type of the
// same name can't be re-exported together, so consumers use `SignalTuple<T>` for the tuple.
export { Signal } from './index.js';

// Marker symbols consumers use to detect signals/proxies (e.g. the store, which builds
// only on the public primitives). $SIGNAL uses the global registry: identical to the
// legacy `Symbol.for('signal')`, so detection is interoperable. Defined locally (not
// re-exported from legacy) so signal-next has no import dependency on signal.ts here,
// which would create an async-resolution cycle when consumers alias signal -> signal-next.
export const $SIGNAL = Symbol.for('signal');
export const $PROXY = Symbol.for('fluixi-proxy');
