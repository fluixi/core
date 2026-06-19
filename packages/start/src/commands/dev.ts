import { createServer as createHttp } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FluixiConfig } from '../config.js';
import { resolveConfig } from '../config.js';
import { injectApp, splitTemplate, installCrashGuards, fluixiPlugins, guardHandler } from '../internal.js';
import { toNodeHandler, streamDocument, type FetchHandler } from '../handler.js';
import { composeMiddleware, normalizeMiddleware } from '../middleware.js';

/**
 * Dev server: Vite in middleware mode compiles the app on the fly; the server
 * entry renders the shell per request, injected into the template; the client
 * entry hydrates. Generalizes the hand-rolled server.mjs pattern.
 */
export async function dev(config: FluixiConfig = {}): Promise<void> {
  const cfg = resolveConfig(config);
  installCrashGuards();

  const { createServer } = await import('vite');
  const template = readFileSync(resolve(cfg.root, cfg.template), 'utf-8');

  // Create the HTTP server FIRST so Vite's HMR WebSocket attaches to it instead of
  // opening its own port (which, if held by a zombie, loops "[vite] server
  // connection lost" → reload forever). Sharing one port avoids that.
  let vite: any;
  // App render → a runtime-neutral fetch handler. In dev, "render" is Vite
  // ssrLoadModule + transformIndexHtml; the same handler shape powers prod + adapters.
  // If the entry exports `renderStream`, stream: transform+split the template, flush
  // the head, pipe the body stream, then the tail. guardHandler maps pre-flush errors
  // (a streaming error after the head is out can only truncate the response).
  const renderHandler: FetchHandler = guardHandler(async (request) => {
    const url = new URL(request.url);
    const path = url.pathname + url.search;
    const mod = await vite.ssrLoadModule('/' + cfg.serverEntry);
    if (typeof mod.renderStream === 'function') {
      const shell = await vite.transformIndexHtml(path, template);
      const { head, tail } = splitTemplate(shell, cfg.mountId);
      return streamDocument(head, await mod.renderStream(path, request), tail);
    }
    const render = mod.render ?? mod.default;
    const appHtml = await render(path); // sync or async
    const html = await vite.transformIndexHtml(path, injectApp(template, appHtml, cfg.mountId));
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }, (e) => vite.ssrFixStacktrace?.(e));

  // Optional request middleware. Loaded per request via ssrLoadModule so edits hot-
  // reload (no server restart); guardHandler turns a middleware throw into a 500.
  const hasMiddleware = existsSync(resolve(cfg.root, cfg.middleware));
  const handler: FetchHandler = hasMiddleware
    ? guardHandler(async (request) => {
        const mwMod = await vite.ssrLoadModule('/' + cfg.middleware);
        return composeMiddleware(normalizeMiddleware(mwMod), renderHandler)(request);
      }, (e) => vite.ssrFixStacktrace?.(e))
    : renderHandler;
  const nodeHandler = toNodeHandler(handler);
  const http = createHttp((req, res) => {
    // Vite middleware first (static assets + HMR), then our handler for app routes.
    vite.middlewares(req, res, () => nodeHandler(req, res));
  });

  vite = await createServer({
    root: cfg.root,
    plugins: await fluixiPlugins(cfg), // file routing + JSX/SSR transform (kettlejs)
    server: { middlewareMode: true, hmr: { server: http } },
    appType: 'custom',
    ssr: cfg.ssrNoExternal.length ? { noExternal: cfg.ssrNoExternal } : undefined,
  });

  http.listen(cfg.port, () =>
    console.log(`  fluixi dev → http://localhost:${cfg.port}`),
  );
}
