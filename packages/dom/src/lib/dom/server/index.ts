/**
 * @fluixi/dom server rendering — universal string renderer. The leaf node
 * factories in runtime.ts branch to ServerNode when `isServer`, so the same
 * imperative runtime (insert/spread/Show/For/createComponent) builds a
 * serializable tree that renderToString turns into HTML.
 */
export {
  isServer,
  setServerMode,
  isDomNode,
  isDomElement,
  isDomText,
} from './host.js';
export {
  ServerNode,
  ServerElement,
  ServerText,
  ServerComment,
  isServerNodeValue,
} from './nodes.js';
export { serializeNode } from './serialize.js';
export { getServerData, escapeFxJson, FX_DATA_ID } from './fx-data.js';
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
