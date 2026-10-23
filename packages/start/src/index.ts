/**
 * @fluixi/start: the Fluixi meta-framework.
 *
 * Packages the dev server, build, and production SSR server over @fluixi/server +
 * Vite, so apps stop hand-rolling server.mjs. Use the `fluixi` CLI (dev/build/start)
 * or call the commands programmatically.
 *
 * **This entry is safe to import from a browser bundle.** Everything that reads the
 * filesystem, starts a server, or runs the bundler lives behind a subpath instead, and
 * that is a rule rather than an accident: an app's client entry legitimately wants
 * `addInterceptor`, and a root export that also carried the dev server put `node:fs`,
 * `node:http` and esbuild into the page. Vite reports that as
 * `"resolve" is not exported by "__vite-browser-external"`, from a line nobody wrote.
 *
 * What moved, and where it is now:
 *
 *   loadConfig, resolveConfig                     `@fluixi/start/config`
 *   serveNode, createRequestHandler, and the
 *     rest of the request layer                   `@fluixi/start/handler`
 *   nodeAdapter, webAdapter, cloudflareAdapter,
 *     netlifyAdapter, vercelAdapter,
 *     createProdHandler, ssrBuildOptions          `@fluixi/start/adapter`
 *   createImageHandler                            `@fluixi/start/image`
 *   the dev/build/start commands                  `@fluixi/start/commands`
 *
 * `defineConfig` stays here, because a config file is the first thing an app writes and
 * it is only a type-level helper.
 */

// Config authoring. The loader is not here: it resolves and reads a file.
export { defineConfig } from './define-config.js';
export type { FluixiConfig, ResolvedConfig } from './config.js';

// The html``/svg`` template tags, so a meta-framework app can author without JSX:
// `import { html } from '@fluixi/start'`. Inert markers; the compiler lowers them.
export { html, svg } from '@fluixi/core';

// Document assembly: string work over a template, with nothing to read from disk.
export { injectApp, injectAppAndHead, splitTemplate } from './document.js';

// The handler's runtime-neutral core. The node/http half is behind `/handler`.
export { createHandlerFrom } from './handler-core.js';
export { ServerFunctionError } from './server-fn.js';
export type { HandlerParts, ServerModule } from './handler-core.js';

// Request middleware: a `(request, next) => Response` chain run before render.
export { defineMiddleware, composeMiddleware, normalizeMiddleware } from './middleware.js';
export { clientAddress } from './client-address.js';
export { forward, type ForwardOptions } from './forward.js';
export type { Middleware, MiddlewareNext } from './middleware.js';

// HTTP interceptors: request/response/error pipeline around fetch (server-fn RPC + app
// fetch). Client-side by nature, and the reason this entry has to stay importable.
export { addInterceptor, clearInterceptors, fetchWithInterceptors } from './interceptors.js';
export type { Interceptor } from './interceptors.js';

// Builds an image URL. The handler that serves it reads files, so it is behind `/image`.
export { imageLoader } from './image-loader.js';
export type { ImageLoaderOptions } from './image-loader.js';
export type { ImageHandlerOptions, ImageTransform, ImageTransformArgs } from './image.js';

// Middleware→render locals bridge: write `getRequestLocals(request).x = ...` in middleware;
// read it back in loaders/server-fns/render via getLocals() (the app entry forwards
// `request` on the render event: `renderRequestAsync(App, { url, request })`).
export { getRequestLocals, getLocals, type RequestLocals } from '@fluixi/server';

// Types only, so naming them here costs a browser bundle nothing.
export type { Adapter, AdapterContext, AdapterBuildContext } from './adapter.js';
export type {
  FetchHandler,
  RenderFn,
  StreamRenderFn,
  ServeNodeOptions,
} from './handler.js';
