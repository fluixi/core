import { createServer as createHttp } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FluixiConfig } from '../config.js';
import { resolveConfig } from '../config.js';
import { injectApp, installCrashGuards, fluixiPlugins, guardHandler } from '../internal.js';
import { createRequestHandler, toNodeHandler, type FetchHandler } from '../handler.js';
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
  const renderHandler = createRequestHandler(async (url) => {
    const mod = await vite.ssrLoadModule('/' + cfg.serverEntry);
    const render = mod.render ?? mod.default;
    try {
      const appHtml = await render(url); // sync or async
      return await vite.transformIndexHtml(url, injectApp(template, appHtml, cfg.mountId));
    } catch (e: any) {
      vite.ssrFixStacktrace?.(e); // dev: map the stack back to source
      throw e;
    }
  });

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
