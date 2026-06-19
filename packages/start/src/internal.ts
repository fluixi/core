import type { ResolvedConfig } from './config.js';
import type { FetchHandler } from './handler.js';

/**
 * The kettlejs build plugins @fluixi/start provides by default: file-based routing
 * (kettleRoutesPlugin → virtual:kettle-routes) + the JSX/SSR transform
 * (createVitePlugin). This is what makes start "sit on top of kettlejs" — apps get
 * zero-config routing + SSR. Apps using `fluixi dev|build` should therefore NOT add
 * these to their own vite.config (start owns them); keep vite.config for app-specific
 * bits only (optimizeDeps, ssr.noExternal via config, etc.).
 */
export async function fluixiPlugins(cfg: ResolvedConfig): Promise<any[]> {
  const { createVitePlugin, kettleRoutesPlugin } = await import('@fluixi/kettlejs/plugins');
  // polyfills:false — the meta-framework is SSR-first; the browser node-polyfill shims
  // break server rendering. Apps that need Buffer/process in the browser opt in later.
  return [kettleRoutesPlugin({ routesDir: cfg.routesDir, polyfills: false }), createVitePlugin()];
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
