/**
 * @fileoverview Main entry point for @fluixi/dom package
 * @module @fluixi/dom
 *
 * This package provides a comprehensive reactive DOM runtime with fine-grained updates
 * similar to SolidJS's dom-expressions. It includes:
 * - Core DOM manipulation utilities
 * - Reactive rendering with signal/store support
 * - Control flow components (Show, For, Switch, etc.)
 * - Event delegation
 * - Template caching and optimization
 * - Integration with signal and store systems
 */

// Core imperative runtime + Solid-style control flow (flow/). The lit renderer
// (templates, directives, lit control-flow) is intentionally NOT re-exported
// here so the core barrel stays lit-free and separable — import it from
// '@fluixi/lit' (and its subpaths). This also removes the Show/For name
// collision that arose from re-exporting both flow/ and lit/control-flow/.
export * from './dom/index.js';
export * from './dom/integration.js';
export * from './shared/types.js';
export * from './component/index.js';
export * from './flow/index.js';

export type {
  ComponentObserver,
} from './dom/types.js';

// No reactive primitives re-exported here — import createSignal/createMemo/… from
// @fluixi/reactive. dom only owns createComponent (./dom/integration.js).

// SSR string renderer + request context. Re-exported as named bindings (not spread into a
// barrel), so a client-only bundle that never references them tree-shakes them out — they
// also live on the `@fluixi/dom/server` subpath. The node classes/guards (isServer, etc.)
// come from the runtime barrel above; keep them out of this list to avoid duplicate exports.
export {
  renderToString,
  renderToStringAsync,
  serializeNode,
  serializeResourceData,
  setDataRedactor,
  getServerData,
  escapeFxJson,
  FX_DATA_ID,
  setRequestStore,
  createRequestContext,
  runWithRequestContext,
  getRequestContext,
  getRequestEvent,
  getLocals,
  getRequestLocals,
  type RenderOptions,
  type RequestStore,
  type RequestContext,
  type RequestEvent,
  type RequestLocals,
} from './dom/server/index.js';
