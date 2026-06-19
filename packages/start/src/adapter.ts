import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FluixiConfig, ResolvedConfig } from './config.js';
import { resolveConfig } from './config.js';
import { injectApp, splitTemplate, guardHandler } from './internal.js';
import {
  createRequestHandler,
  serveNode,
  streamDocument,
  withStaticFiles,
  type FetchHandler,
} from './handler.js';
import { composeMiddleware, normalizeMiddleware } from './middleware.js';

/**
 * Build the production SSR fetch handler from a `fluixi build` output (dist/server +
 * dist/client/index.html). It's runtime-neutral — the SAME handler runs on Node, Bun,
 * Deno, and edge/worker runtimes. Adapters decide how to serve it + assets.
 */
export async function createProdHandler(config: FluixiConfig = {}): Promise<FetchHandler> {
  const cfg = resolveConfig(config);
  const clientDir = resolve(cfg.root, 'dist/client');
  const template = await readFile(join(clientDir, 'index.html'), 'utf-8');
  const serverEntry = resolve(cfg.root, 'dist/server', 'entry-server.js');
  const mod = await import(pathToFileURL(serverEntry).href);

  // Streaming when the entry exports `renderStream` (a body stream): flush the split
  // template head first, pipe the body, then the tail. Else inject the string render.
  let core: FetchHandler;
  if (typeof mod.renderStream === 'function') {
    const { head, tail } = splitTemplate(template, cfg.mountId);
    core = async (request) => {
      const url = new URL(request.url);
      const body = await mod.renderStream(url.pathname + url.search, request);
      return streamDocument(head, body, tail);
    };
  } else {
    const render = mod.render ?? mod.default;
    core = createRequestHandler(async (url) => injectApp(template, await render(url), cfg.mountId));
  }

  // Optional request middleware (src/middleware.ts → dist/server/middleware.js).
  const mwFile = resolve(cfg.root, 'dist/server', 'middleware.js');
  if (!existsSync(mwFile)) return core;
  const mwMod = await import(pathToFileURL(mwFile).href);
  return guardHandler(composeMiddleware(normalizeMiddleware(mwMod), core));
}

export interface AdapterContext {
  handler: FetchHandler;
  cfg: ResolvedConfig;
  /** Built client assets dir (dist/client). */
  clientDir: string;
}

/**
 * A deploy target. The runtime-neutral fetch handler is the portable core; an adapter
 * packages it for a platform: filesystem runtimes (node) listen on a port and serve
 * static files from disk; edge/serverless runtimes return a `{ fetch }` export the
 * platform invokes (assets served by the platform/CDN). Build-time artifact emission
 * (worker bundle, function manifest) is a later increment.
 */
export interface Adapter {
  name: string;
  serve(ctx: AdapterContext): Promise<void> | { fetch: FetchHandler };
}

/** Reference filesystem adapter — Node `http` + static files from dist/client. */
export const nodeAdapter: Adapter = {
  name: 'node',
  async serve({ handler, cfg, clientDir }) {
    serveNode(withStaticFiles(handler, clientDir), {
      port: cfg.port,
      onListen: (p) => console.log(`  fluixi start (node) → http://localhost:${p}`),
    });
  },
};

/** Reference edge/web adapter — export `{ fetch }`; the platform serves assets. */
export const webAdapter: Adapter = {
  name: 'web',
  serve({ handler }) {
    return { fetch: handler };
  },
};
