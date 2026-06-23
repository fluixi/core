/**
 * @fluixi/dom server rendering — universal string renderer. The leaf node
 * factories in runtime.ts branch to ServerNode when `isServer`, so the same
 * imperative runtime (insert/spread/Show/For/createComponent) builds a
 * serializable tree that renderToString turns into HTML.
 */
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
} from './nodes.js';
export { serializeNode } from './serialize.js';
export {
  renderToString,
  renderToStringAsync,
  serializeResourceData,
  setDataRedactor,
  type RenderOptions,
} from './render.js';
export {
  setRequestStore,
  createRequestContext,
  runWithRequestContext,
  getRequestContext,
  getRequestEvent,
  getLocals,
  getRequestLocals,
  type RequestStore,
  type RequestContext,
  type RequestEvent,
  type RequestLocals,
} from './request-context.js';
