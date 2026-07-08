export * from './utils.js';
export * from './runtime.js';
export * from './integration.js';
// Only the server node classes + guards belong in the client runtime barrel — the
// runtime's leaf factories reference them in their `isServer` branches. The string
// renderer (renderToString/serialize/request-context) is SSR-only and heavier; it is
// re-exported as named bindings from the package entry (index.ts) so bundlers can
// tree-shake it out of client builds, and it lives on the `@fluixi/dom/server` subpath.
export {
  isServer,
  setServerMode,
  ServerNode,
  ServerElement,
  ServerText,
  ServerComment,
  isDomNode,
  isDomElement,
  isDomText,
  isServerNodeValue,
} from './server/nodes.js';
export { Island, hydrateIslands, type IslandProps, type IslandRegistry } from './island.js';
export type {CreateComponentReturnType, CreateComponent} from './types.js'
