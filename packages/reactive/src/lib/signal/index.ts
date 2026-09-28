/**
 * `@fluixi/reactive/signal`, now the TC39 core. This re-exports the complete reactive
 * API running on the TC39 Signals graph (graph/signal-next.ts): the full legacy surface
 * with the core primitives (createSignal/createMemo/createEffect/createRoot, and the rest) swapped to
 * the new graph, plus `Signal.State`/`Computed`/`subtle.Watcher`, resources, Suspense,
 * context, and error boundaries.
 *
 * The pre-TC39 implementation is preserved, byte-for-byte, behind the explicit
 * `@fluixi/reactive/signal-legacy` entry (./index-legacy.ts).
 */
export * from './graph/signal-next.js';

// Watching nodes as they are made: what @fluixi/devtools attaches to.
export { observeReactiveNodes, reportReactiveBinding, reportReactiveProps, reportReactiveDirective, reportReactiveContext, reportReactiveContextCreated, openReactiveScope, withReactiveScope, closeReactiveScope, adoptReactiveScope, markReactiveScope, reactiveScopeOf } from './graph/observe.js';
export type { ReactiveScopeInfo, ReactiveScopeKind } from './graph/observe.js';
// Which builds reached the shared graph. @fluixi/dom reports on it; a standalone web
// component is the case where two of them can genuinely meet.
export { joinedVersions } from './graph/state.js';
export type { ReactiveNodeKind, ReactiveNodeReport, ReactiveObserver } from './graph/observe.js';

// The short API: `signal`/`memo`/`effect` over the same primitives.
export * from './api.js';
export { resource } from './resource-api.js';
export type { ResourceHandle } from './resource-api.js';
