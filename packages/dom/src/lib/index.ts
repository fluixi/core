/**
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

// Core imperative runtime + Solid-style control flow (flow/).
export * from './dom/index.js';

// html`` / svg`` template markers (compiled away by `format: 'html'`). These are
// the no-JSX authoring surface; fluixi re-exports them for convenience.
export { html, svg, css } from './html.js';
export type { TemplateResult, Reactive, FluixiStyle } from './html.js';
export * from './dom/integration.js';
export * from './dom/dynamic-element.js';
export * from './shared/types.js';
export * from './component/index.js';
export * from './flow/index.js';

export type {
  ComponentObserver,
} from './dom/types.js';

// No reactive primitives re-exported here: import createSignal/createMemo/... from
// @fluixi/reactive. dom only owns createComponent (./dom/integration.js).

// SSR string renderer + request context. Re-exported as named bindings (not spread into a
// barrel), so a client-only bundle that never references them tree-shakes them out, they
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
  setRequestStoreIfUnset,
  onRequestEnd,
  endRequestContext,
  endRequestScope,
  requestScope,
  createRequestContext,
  runWithRequestContext,
  getRequestContext,
  getRequestEvent,
  getLocals,
  getRequestLocals,
  appendResponseHeader,
  takeResponseHeaders,
  setResponseRedirect,
  takeResponseRedirect,
  setResponseStatus,
  takeResponseStatus,
  type ResponseRedirect,
  type RenderOptions,
  type RequestStore,
  type RequestContext,
  type RequestEvent,
  type RequestLocals,
} from './dom/server/index.js';
