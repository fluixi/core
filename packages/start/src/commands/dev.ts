import { createServer as createHttp } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { aliasesFromTsconfig } from '../tsconfig-paths.js';
import type { FluixiConfig } from '../config.js';
import { resolveConfig } from '../config.js';
import { injectAppAndHead, splitTemplate, installCrashGuards, fluixiPlugins, guardHandler, loadServerEnv, SERVER_FNS_VMOD } from '../internal.js';
import { toNodeHandler, streamDocument, exitOnListenError, withResponseHeaders, type FetchHandler } from '../handler.js';
import { composeMiddleware, normalizeMiddleware } from '../middleware.js';
import { isApiPath, API_VIRTUAL_MODULE } from '../api.js';
import { devReady } from '../ui.js';
import { APP_VMOD, findAppConfig, hasAppConfig } from '../app-plugin.js';
import { withPlatformRequest } from '../platform-request.js';
import { notFoundJson } from '../handler-core.js';

const STYLE_FILE = /\.(css|scss|sass|less|styl|stylus|pcss|postcss)(\?|$)/;

/**
 * Stylesheets the SSR render pulled in, walked from the server entry.
 *
 * Without these, dev serves a fully rendered page with no CSS at all and the styles
 * arrive with the client bundle: a flash of unstyled content on every load, in the one
 * environment you look at most. The build has no such gap: Vite emits real `<link>`s.
 *
 * Dev serves a `.css` URL as a JS module that injects a style tag, so `?direct` is what
 * asks for the stylesheet itself.
 */
async function renderedStyles(vite: any, entry: string): Promise<string[]> {
  const seen = new Set<string>();
  const found: string[] = [];

  const visit = (mod: any): void => {
    if (!mod || seen.has(mod.url)) return;
    seen.add(mod.url);
    if (STYLE_FILE.test(mod.url)) found.push(mod.url);
    for (const dep of mod.importedModules ?? []) visit(dep);
  };

  try {
    visit(await vite.moduleGraph.getModuleByUrl('/' + entry, true));
  } catch {
    // A graph we can't read is not worth failing a dev request over; the page still
    // works, it just flashes the way it did before.
    return [];
  }
  return found;
}

/** Put the stylesheets in <head>, before anything the render already put there. */
function injectStyles(html: string, urls: readonly string[]): string {
  if (urls.length === 0) return html;
  const links = urls
    .map((url) => `<link rel="stylesheet" href="${url}${url.includes('?') ? '&' : '?'}direct">`)
    .join('\n    ');
  return html.includes('</head>') ? html.replace('</head>', `  ${links}\n  </head>`) : html;
}

/**
 * Dev server: Vite in middleware mode compiles the app on the fly; the server
 * entry renders the shell per request, injected into the template; the client
 * entry hydrates. Generalizes the hand-rolled server.mjs pattern.
 */
export async function dev(config: FluixiConfig = {}): Promise<void> {
  const startedAt = Date.now();
  const cfg = resolveConfig(config);
  installCrashGuards();
  await loadServerEnv(cfg.root, 'development'); // .env → process.env (server-only secrets)

  // Said here too, so the mistake is caught while writing rather than at a deploy.
  const { findExposedSecrets } = await import('../env-guard.js');
  for (const { name, file } of findExposedSecrets(cfg.root)) {
    console.warn(
      `[fluixi] ${name} in ${file} carries the VITE_ prefix, so its value is inlined into the browser bundle. Drop the prefix and read it from process.env in server code.`,
    );
  }

  const { createServer } = await import('vite');
  // An API-only app has no page and so no template.
  const template = cfg.apiOnly ? '' : readFileSync(resolve(cfg.root, cfg.template), 'utf-8');

  // Create the HTTP server FIRST so Vite's HMR WebSocket attaches to it instead of
  // opening its own port (which, if held by a zombie, loops "[vite] server
  // connection lost" → reload forever). Sharing one port avoids that.
  let vite: any;
  // App render → a runtime-neutral fetch handler. In dev, "render" is Vite
  // ssrLoadModule + transformIndexHtml; the same handler shape powers prod + adapters.
  // If the entry exports `renderStream`, stream: transform+split the template, flush
  // the head, pipe the body stream, then the tail. guardHandler maps pre-flush errors
  // (a streaming error after the head is out can only truncate the response).
  // Cookies the render set (appendResponseHeader) join whatever Response comes back.
  const withHeaders = (fn: FetchHandler): FetchHandler => async (request) => withResponseHeaders(request, await fn(request));
  const renderHandler: FetchHandler = guardHandler(withHeaders(async (request) => {
    const url = new URL(request.url);
    const path = url.pathname + url.search;
    // Server-function RPC: auto-wired. Load the registry vmod (registers every "use server"
    // fn + wires the request-context runner + re-exports the dispatcher) and route /_server
    // through it: no need for the app's entry-server to re-export anything.
    if (url.pathname === '/_server') {
      const sf = await vite.ssrLoadModule(SERVER_FNS_VMOD);
      if (sf.isServerFnRequest(request)) return sf.handleServerFn(request);
    }
    // File-based API routes (src/api/** → /api/*), auto-wired, no entry change needed.
    if (isApiPath(url.pathname)) {
      const api = await vite.ssrLoadModule(API_VIRTUAL_MODULE);
      if (api.isApiRequest(request)) return api.handleApiRequest(request);
    }
    if (cfg.apiOnly) return notFoundJson(request);
    // SPA mode: serve the static shell; the client entry renders. The server still ran
    // (server functions above + middleware below), there's just no SSR render pass.
    if (!cfg.ssr) {
      const html = await vite.transformIndexHtml(path, template);
      return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    const mod = await vite.ssrLoadModule('/' + cfg.serverEntry);
    if (typeof mod.renderStream === 'function') {
      const shell = await vite.transformIndexHtml(
        path,
        injectStyles(template, await renderedStyles(vite, cfg.serverEntry)),
      );
      const { head, tail } = splitTemplate(shell, cfg.mountId);
      return await streamDocument(head, await withPlatformRequest(request, () => mod.renderStream(path, request)), tail);
    }
    const render = mod.render ?? mod.default;
    const appHtml = await withPlatformRequest(request, () => render(path, request)); // sync or async; request enables the locals bridge
    // injectAppAndHead (not injectApp): lift the @fluixi/head marker renderRequestAsync prepends to
    // the body into <head> + <html>, exactly like the prod adapter/prerender. Plain injectApp left
    // the `<!--fh:…-->` marker as the mount root's first child, which stranded the hydration cursor
    // (whole tree rebuilt → duplicated) AND skipped dev SEO. No marker → identical to injectApp.
    const styled = injectStyles(
      injectAppAndHead(template, appHtml, cfg.mountId),
      await renderedStyles(vite, cfg.serverEntry),
    );
    const html = await vite.transformIndexHtml(path, styled);
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }), (e) => vite.ssrFixStacktrace?.(e));

  // Optional request middleware. Loaded per request via ssrLoadModule so edits hot-
  // reload (no server restart); guardHandler turns a middleware throw into a 500.
  //
  // The app config loads first on every request, not only through the server entry: an
  // API route or server function never imports that entry here, so without this the first
  // `/api` call after a restart would find no providers.
  const hasMiddleware = existsSync(resolve(cfg.root, cfg.middleware));
  const hasApp = hasAppConfig(findAppConfig(cfg.root));
  const handler: FetchHandler =
    hasMiddleware || hasApp
      ? guardHandler(async (request) => {
          const app = hasApp ? await vite.ssrLoadModule(APP_VMOD) : null;
          const mwMod = hasMiddleware ? await vite.ssrLoadModule('/' + cfg.middleware) : null;
          const chain = [...normalizeMiddleware(app?.middleware), ...normalizeMiddleware(mwMod)];
          return composeMiddleware(chain, renderHandler)(request);
        }, (e) => vite.ssrFixStacktrace?.(e))
      : renderHandler;
  const nodeHandler = toNodeHandler(handler, { trustProxy: cfg.trustProxy });
  const http = createHttp((req, res) => {
    // API calls go straight to the handler: Vite has nothing to serve under /api, and its CORS
    // would answer their preflights before the app's middleware sees them.
    if (isApiPath((req.url ?? '/').split('?')[0]!)) return void nodeHandler(req, res);
    // Vite middleware first (static assets + HMR), then our handler for app routes.
    vite.middlewares(req, res, () => nodeHandler(req, res));
  });

  vite = await createServer({
    root: cfg.root,
    plugins: await fluixiPlugins(cfg), // file routing + JSX/SSR transform (fluixi)
    server: { middlewareMode: true, hmr: { server: http } },
    appType: 'custom',
    // No browser code to pre-bundle in an API: without this Vite searches for an entry and warns.
    ...(cfg.apiOnly ? { optimizeDeps: { noDiscovery: true, include: [] } } : {}),
    // `@fluixi/core` always goes through vite rather than being externalized.
    // `@fluixi/core/routes` is served by fluixiRoutesPlugin, and an externalized
    // dependency is imported by node directly, so no plugin ever sees the specifier and
    // the app gets the "did not replace it" stub instead of its route tree. A workspace
    // app hides this by resolving the package to source.
    ssr: { noExternal: ['@fluixi/core', ...cfg.ssrNoExternal] },
    // The app's tsconfig paths, so an import the type checker accepts is one the
    // bundler can resolve. Without this the two disagree and the build fails on an
    // alias that typechecked cleanly.
    resolve: { alias: aliasesFromTsconfig(cfg.root) },
  });

  exitOnListenError(http, cfg.port);
  http.listen(cfg.port, () => devReady({ port: cfg.port, startedAt }));
}
