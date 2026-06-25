import type { ResolvedConfig } from './config.js';
import type { FetchHandler } from './handler.js';

/** The virtual module that registers every `"use server"` fn + re-exports the dispatcher. */
export const SERVER_FNS_VMOD = 'virtual:fluixi-server-fns';

/**
 * Load env files into `process.env` for SERVER code — the framework's environment manager.
 *
 * SECURITY MODEL (Vite-aligned): only `VITE_`-prefixed vars are exposed to the client (via
 * `import.meta.env`, inlined into the browser bundle). Everything else is server-only. This
 * loads ALL vars (`.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`) into `process.env`
 * so loaders + `"use server"` functions can read secrets — WITHOUT ever exposing non-`VITE_`
 * vars to the browser. A real (OS) env var always wins, so deploys/secret managers override files.
 *
 * Result: `process.env.STRIPE_SECRET` works on the server and never ships to the web; only
 * `VITE_*` reaches the client. Apps stop hand-rolling dotenv loaders + risking secret leaks.
 */
export async function loadServerEnv(root: string, mode: string): Promise<void> {
  const { loadEnv } = await import('vite');
  const env = loadEnv(mode, root, ''); // '' prefix = ALL vars (server-only via process.env)
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v; // real env wins
  }
}

/**
 * The fluixi build plugins @fluixi/start provides by default: file-based routing
 * (fluixiRoutesPlugin → virtual:fluixi-routes) + the JSX/SSR transform
 * (createVitePlugin). This is what makes start "sit on top of fluixi" — apps get
 * zero-config routing + SSR. Apps using `fluixi dev|build` should therefore NOT add
 * these to their own vite.config (start owns them); keep vite.config for app-specific
 * bits only (optimizeDeps, ssr.noExternal via config, etc.).
 */
export async function fluixiPlugins(cfg: ResolvedConfig): Promise<any[]> {
  const { createVitePlugin, fluixiRoutesPlugin } = await import('@fluixi/core/plugins');
  const { serverFunctionsVitePlugin } = await import('@fluixi/compiler/integrations');
  // polyfills:false — the meta-framework is SSR-first; the browser node-polyfill shims
  // break server rendering. Apps that need Buffer/process in the browser opt in later.
  // serverFunctionsVitePlugin applies the "use server" transform (client RPC stub /
  // server registration) per-build via the ssr flag.
  return [
    serverFunctionsVitePlugin(),
    fluixiRoutesPlugin({ routesDir: cfg.routesDir, polyfills: false }),
    createVitePlugin(),
  ];
}

/**
 * Inject server-rendered app HTML into the template's mount element
 * (`<div id="root"></div>`). Falls back to a `<!--ssr-outlet-->` marker, then to
 * just before `</body>`.
 */
export function injectApp(template: string, appHtml: string, mountId = 'root'): string {
  const mount = new RegExp(`<div id=["']${mountId}["']\\s*>\\s*</div>`);
  if (mount.test(template)) {
    return template.replace(mount, `<div id="${mountId}">${appHtml}</div>`);
  }
  if (template.includes('<!--ssr-outlet-->')) {
    return template.replace('<!--ssr-outlet-->', appHtml);
  }
  return template.replace('</body>', `<div id="${mountId}">${appHtml}</div></body>`);
}

/**
 * Split the template at the mount point for streaming: `head` is everything up to and
 * including the open mount tag (flushed first so the browser fetches assets while the
 * server awaits data); `tail` is the close tag onward (client script + `</body>`).
 * Mirrors injectApp's three cases (mount div, `<!--ssr-outlet-->`, before `</body>`).
 */
export function splitTemplate(template: string, mountId = 'root'): { head: string; tail: string } {
  const mount = new RegExp(`<div id=["']${mountId}["']\\s*>\\s*</div>`);
  const m = template.match(mount);
  if (m && m.index !== undefined) {
    return {
      head: template.slice(0, m.index) + `<div id="${mountId}">`,
      tail: `</div>` + template.slice(m.index + m[0].length),
    };
  }
  const outlet = template.indexOf('<!--ssr-outlet-->');
  if (outlet !== -1) {
    return {
      head: template.slice(0, outlet),
      tail: template.slice(outlet + '<!--ssr-outlet-->'.length),
    };
  }
  const body = template.indexOf('</body>');
  if (body !== -1) {
    return {
      head: template.slice(0, body) + `<div id="${mountId}">`,
      tail: `</div>` + template.slice(body),
    };
  }
  return { head: template, tail: '' };
}

/**
 * Wrap a fetch handler so a thrown/rejected error becomes a 500 instead of an
 * unhandled rejection. `createRequestHandler` already guards the renderer; this
 * covers the middleware chain that wraps it. `onError` lets dev map the stack first.
 */
export function guardHandler(
  handler: FetchHandler,
  onError?: (e: unknown) => void,
): FetchHandler {
  return async (request) => {
    try {
      return await handler(request);
    } catch (e: any) {
      onError?.(e);
      return new Response(String(e?.stack || e), {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  };
}

let _guardsInstalled = false;

/**
 * A render fires the route's data fetches eagerly; if the backend is down those
 * promises can reject AFTER we've already responded, with nothing awaiting them —
 * a floating rejection would kill the dev server. Swallow + log instead.
 */
export function installCrashGuards(): void {
  if (_guardsInstalled) return;
  _guardsInstalled = true;
  process.on('unhandledRejection', (reason: any) =>
    console.warn('[fluixi] unhandled rejection (backend likely down) —', reason?.message || reason),
  );
  process.on('uncaughtException', (err: any) =>
    console.warn('[fluixi] uncaught exception —', err?.message || err),
  );
}
