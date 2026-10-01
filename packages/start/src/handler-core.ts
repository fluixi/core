/**
 * The request handler, assembled from things already in memory.
 *
 * `createProdHandler` reads the template off disk and imports the server entry by
 * path: fine on Node, impossible in a worker, where there is no filesystem and
 * every module has to be part of the bundle. So the assembly lives here and takes
 * the template and the module as arguments; the platform entry a deploy adapter
 * generates imports both statically and calls this.
 *
 * One assembly, so an edge deploy cannot quietly behave differently from `fluixi
 * start`: the dispatch order (server functions, then API routes, then render,
 * all under middleware) is a property of the framework, not of the host.
 */
import type { ResolvedConfig } from './config.js';
import { injectAppAndHead, injectPreload, splitTemplate, guardHandler } from './document.js';
import { createRequestHandler, streamDocument, withResponseHeaders, type FetchHandler } from './handler.js';
import { composeMiddleware, normalizeMiddleware } from './middleware.js';

// The platform entries import only this module; they record the client address with it.
export { setClientAddress } from './client-address.js';
import { withPlatformRequest } from './platform-request.js';

/** The shape a built `entry-server.js` exposes. Every field is optional. */
export interface ServerModule {
  render?: (url: string, request: Request) => string | Promise<string>;
  default?: (url: string, request: Request) => string | Promise<string>;
  renderStream?: (url: string, request: Request) => unknown;
  isServerFnRequest?: (request: Request) => boolean;
  handleServerFn?: (request: Request) => Response | Promise<Response>;
  isApiRequest?: (request: Request) => boolean;
  handleApiRequest?: (request: Request) => Response | Promise<Response>;
  /** Middleware from `app.config.ts` modules, re-exported into the entry by the start plugin. */
  __fluixiAppMiddleware?: unknown;
}

export interface HandlerParts {
  /** `dist/client/index.html`, as a string. */
  template: string;
  /** The imported server entry. `{}` for an SPA that ships none. */
  mod: ServerModule;
  cfg: Pick<ResolvedConfig, 'ssr' | 'mountId'> & { apiOnly?: boolean };
  /** The imported `middleware.js`, if the app has one. */
  middleware?: unknown;
  /**
   * The built files this path needs, for the document to reference up front. Optional:
   * without it a page is served exactly as before, just without preload hints.
   */
  preload?: (pathname: string) => string[];
}

export function createHandlerFrom({ template, mod, cfg, middleware, preload }: HandlerParts): FetchHandler {
  const withPreload = (html: string, pathname: string): string =>
    preload ? injectPreload(html, preload(pathname)) : html;

  // Streaming when the entry exports `renderStream` (a body stream): flush the split
  // template head first, pipe the body, then the tail. Else inject the string render.
  let core: FetchHandler;
  if (cfg.apiOnly) {
    // Nothing to render: whatever the API routes below do not claim is simply not here.
    core = async (request) => notFoundJson(request);
  } else if (!cfg.ssr) {
    // SPA: the page is the static shell; the client entry renders it. Server functions +
    // middleware still run through this handler: there's just no SSR render pass. The
    // path is still known, though, and the route it names still loads its own chunk, so
    // the shell can say so and save the client a round trip it would otherwise start
    // only after the router had booted.
    core = createRequestHandler(async (url) => withPreload(template, url.split('?')[0]));
  } else if (typeof mod.renderStream === 'function') {
    core = async (request) => {
      const url = new URL(request.url);
      // Split per request rather than once: the preload links belong in the head, and
      // the head is the part that flushes before the body is known, which is the whole
      // reason streaming wants them, since the browser can start fetching the route's
      // chunk while the server is still awaiting data for it.
      const { head, tail } = splitTemplate(withPreload(template, url.pathname), cfg.mountId);
      const body = await withPlatformRequest(request, () => mod.renderStream!(url.pathname + url.search, request));
      return streamDocument(head, body as never, tail);
    };
  } else {
    const render = mod.render ?? mod.default;
    core = createRequestHandler(async (url, request) =>
      // `url` here is `pathname + search`; matching only ever wants the path.
      injectAppAndHead(withPreload(template, url.split('?')[0]), await render!(url, request), cfg.mountId),
    );
  }

  // Server-function RPC dispatch. The entry-server module re-exports the dispatcher, so
  // it shares the registry that the app's "use server" modules populated (a separate
  // import would have an empty registry).
  if (typeof mod.handleServerFn === 'function' && typeof mod.isServerFnRequest === 'function') {
    const render = core;
    core = async (request) =>
      mod.isServerFnRequest!(request) ? mod.handleServerFn!(request) : render(request);
  }

  // File-based API routes, re-exported by the entry from `@fluixi/start/api-routes`.
  if (typeof mod.handleApiRequest === 'function' && typeof mod.isApiRequest === 'function') {
    const next = core;
    core = async (request) =>
      mod.isApiRequest!(request) ? mod.handleApiRequest!(request) : next(request);
  }

  // Modules first, in `imports` order, then the app's own `src/middleware.ts`.
  const chain = [...normalizeMiddleware(mod.__fluixiAppMiddleware), ...normalizeMiddleware(middleware as never)];
  // Inside the middleware, so it sees the cookies the page, function or route set.
  const inner = core;
  return guardHandler(composeMiddleware(chain, async (request) => withResponseHeaders(request, await inner(request))));
}

/**
 * The answer of an API-only app for a path no route claims: JSON, in the shape `@fluixi/api`
 * errors take, so a client sees one format whether the route or the server refused.
 */
export function notFoundJson(request: Request): Response {
  const { pathname } = new URL(request.url);
  const body = { error: { code: 'not_found', message: `No route for ${request.method} ${pathname}.` } };
  return new Response(JSON.stringify(body), {
    status: 404,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

