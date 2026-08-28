/**
 * @fluixi/start — the Fluixi meta-framework.
 *
 * Packages the dev server, build, and production SSR server over @fluixi/server +
 * Vite, so apps stop hand-rolling server.mjs. Use the `fluixi` CLI (dev/build/start)
 * or call the commands programmatically.
 */
export { defineConfig, resolveConfig, loadConfig } from './config.js';
export type { FluixiConfig, ResolvedConfig } from './config.js';
// The html``/svg`` template tags — so a meta-framework app can author without JSX:
// `import { html } from '@fluixi/start'`. Inert markers; the compiler lowers them.
export { html, svg } from 'fluixi';
// The commands live at `@fluixi/start/commands`. Re-exporting them here would put
// the dev server and the bundler behind every runtime import of this package —
// and a deploy adapter, which inlines everything its entry can reach, would carry
// vite into a worker.
// From the leaf, not internal.js: that one reaches the dev server's env loader,
// and with it vite, which has no business in a runtime import of this package.
export { injectApp, injectAppAndHead, splitTemplate } from './document.js';
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
export {
  createProdHandler,
  nodeAdapter,
  webAdapter,
  cloudflareAdapter,
  netlifyAdapter,
  vercelAdapter,
  ssrBuildOptions,
} from './adapter.js';
export type { Adapter, AdapterContext, AdapterBuildContext } from './adapter.js';
export { createHandlerFrom } from './handler-core.js';
export type { HandlerParts, ServerModule } from './handler-core.js';
// Request middleware — a `(request, next) => Response` chain run before render.
export { defineMiddleware, composeMiddleware, normalizeMiddleware } from './middleware.js';
export type { Middleware, MiddlewareNext } from './middleware.js';
// HTTP interceptors — request/response/error pipeline around fetch (server-fn RPC + app fetch).
export { addInterceptor, clearInterceptors, fetchWithInterceptors } from './interceptors.js';
export type { Interceptor } from './interceptors.js';

export { createImageHandler, imageLoader } from './image.js';
export type { ImageHandlerOptions, ImageLoaderOptions, ImageTransform, ImageTransformArgs } from './image.js';
// Middleware→render locals bridge: write `getRequestLocals(request).x = …` in middleware;
// read it back in loaders/server-fns/render via getLocals() (the app entry forwards
// `request` on the render event — `renderRequestAsync(App, { url, request })`).
export { getRequestLocals, getLocals, type RequestLocals } from '@fluixi/server';
