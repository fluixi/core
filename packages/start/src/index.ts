/**
 * @fluixi/start — the Fluixi meta-framework.
 *
 * Packages the dev server, build, and production SSR server over @fluixi/server +
 * Vite, so apps stop hand-rolling server.mjs. Use the `fluixi` CLI (dev/build/start)
 * or call the commands programmatically.
 */
export { defineConfig, resolveConfig, loadConfig } from './config.js';
export type { FluixiConfig, ResolvedConfig } from './config.js';
export { dev } from './commands/dev.js';
export { build } from './commands/build.js';
export { start } from './commands/start.js';
export { prerender } from './commands/prerender.js';
export { injectApp, splitTemplate } from './internal.js';
// The runtime-neutral request layer — the seam adapters (edge/worker/Bun/Deno) build on.
export {
  createRequestHandler,
  toNodeHandler,
  nodeToRequest,
  sendResponse,
  serveNode,
  streamDocument,
  withStaticFiles,
} from './handler.js';
export type { FetchHandler, RenderFn, StreamRenderFn, ServeNodeOptions } from './handler.js';
// Deploy adapters: the portable prod handler + the node/web reference adapters.
export { createProdHandler, nodeAdapter, webAdapter } from './adapter.js';
export type { Adapter, AdapterContext } from './adapter.js';
// Request middleware — a `(request, next) => Response` chain run before render.
export { defineMiddleware, composeMiddleware, normalizeMiddleware } from './middleware.js';
export type { Middleware, MiddlewareNext } from './middleware.js';
// HTTP interceptors — request/response/error pipeline around fetch (server-fn RPC + app fetch).
export { addInterceptor, clearInterceptors, fetchWithInterceptors } from './interceptors.js';
export type { Interceptor } from './interceptors.js';
// Middleware→render locals bridge: write `getRequestLocals(request).x = …` in middleware;
// read it back in loaders/server-fns/render via getLocals() (the app entry forwards
// `request` on the render event — `renderRequestAsync(App, { url, request })`).
export { getRequestLocals, getLocals, type RequestLocals } from '@fluixi/server';
