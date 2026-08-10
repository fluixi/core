/**
 * The request handler, assembled from things already in memory.
 *
 * `createProdHandler` reads the template off disk and imports the server entry by
 * path — fine on Node, impossible in a worker, where there is no filesystem and
 * every module has to be part of the bundle. So the assembly lives here and takes
 * the template and the module as arguments; the platform entry a deploy adapter
 * generates imports both statically and calls this.
 *
 * One assembly, so an edge deploy cannot quietly behave differently from `fluixi
 * start` — the dispatch order (server functions, then API routes, then render,
 * all under middleware) is a property of the framework, not of the host.
 */
import type { ResolvedConfig } from './config.js';
import { injectAppAndHead, splitTemplate, guardHandler } from './document.js';
import { createRequestHandler, streamDocument, type FetchHandler } from './handler.js';
import { composeMiddleware, normalizeMiddleware } from './middleware.js';

/** The shape a built `entry-server.js` exposes. Every field is optional. */
export interface ServerModule {
  render?: (url: string, request: Request) => string | Promise<string>;
  default?: (url: string, request: Request) => string | Promise<string>;
  renderStream?: (url: string, request: Request) => unknown;
  isServerFnRequest?: (request: Request) => boolean;
  handleServerFn?: (request: Request) => Response | Promise<Response>;
  isApiRequest?: (request: Request) => boolean;
  handleApiRequest?: (request: Request) => Response | Promise<Response>;
}

export interface HandlerParts {
  /** `dist/client/index.html`, as a string. */
  template: string;
  /** The imported server entry. `{}` for an SPA that ships none. */
  mod: ServerModule;
  cfg: Pick<ResolvedConfig, 'ssr' | 'mountId'>;
  /** The imported `middleware.js`, if the app has one. */
  middleware?: unknown;
}

export function createHandlerFrom({ template, mod, cfg, middleware }: HandlerParts): FetchHandler {
  // Streaming when the entry exports `renderStream` (a body stream): flush the split
  // template head first, pipe the body, then the tail. Else inject the string render.
  let core: FetchHandler;
  if (!cfg.ssr) {
    // SPA: the page is the static shell; the client entry renders it. Server functions +
    // middleware still run through this handler — there's just no SSR render pass.
    core = createRequestHandler(async () => template);
  } else if (typeof mod.renderStream === 'function') {
    const { head, tail } = splitTemplate(template, cfg.mountId);
    core = async (request) => {
      const url = new URL(request.url);
      const body = await mod.renderStream!(url.pathname + url.search, request);
      return streamDocument(head, body as never, tail);
    };
  } else {
    const render = mod.render ?? mod.default;
    core = createRequestHandler(async (url, request) =>
      injectAppAndHead(template, await render!(url, request), cfg.mountId),
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

  if (!middleware) return guardHandler(core);
  return guardHandler(composeMiddleware(normalizeMiddleware(middleware as never), core));
}
