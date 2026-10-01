export * from './utils.js';
export * from './runtime.js';
export * from './integration.js';
// Client barrel exposes only the server seam (flag + guards). The ServerNode
// classes are registered through host.ts and exported from @fluixi/dom/server, so
// they stay out of client bundles.
export {
  isServer,
  setServerMode,
  isDomNode,
  isDomElement,
  isDomText,
} from './server/host.js';
export { Island, hydrateIslands, type IslandProps, type IslandRegistry } from './island.js';
// hydrate() is the heavy DOM-reuse walker, its own module so render-only apps
// tree-shake it. The small cursor helpers stay in the weightless state module.
export { hydrate, hydrateChildren } from './hydration.js';
export {
  captureHydrationCursor,
  runHydrationAt,
  runWithoutHydration,
  hydrateAdvancePast,
  beginAppHydration,
  endAppHydration,
  isAppHydrationPending,
  whenAppHydrated,
  setKeyScope,
  HYDRATION_KEY,
  removeUnclaimedKeyed,
  clearHydrationKeys,
} from './hydration-state.js';
export type {CreateComponentReturnType, CreateComponent} from './types.js'
