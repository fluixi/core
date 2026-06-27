/**
 * @fluixi/server — the environment-agnostic SSR engine.
 *
 * The string renderer itself lives in @fluixi/dom (the universal `renderToString`
 * + the request-scoping primitives), so it stays usable in any environment.
 * This package is the Node-side home that:
 *
 *   1. injects a real AsyncLocalStorage into @fluixi/dom's request store, so
 *      concurrent SSR requests are isolated out of the box (the "P0 #4" fix) —
 *      @fluixi/dom can't import `node:async_hooks` itself without breaking
 *      browser bundles, so the Node-only server package wires it here;
 *   2. re-exports the SSR surface so apps import one place;
 *   3. adds request helpers (renderRequest / renderToPage / startServer).
 *
 * No vinxi coupling — the meta-framework was never wired into the render path;
 * SSR is a plain function you call from any server (Express/Hono/Nitro/worker).
 */
import {
  renderToString,
  renderToStringAsync,
  serializeNode,
  setDataRedactor,
  getRequestEvent,
  getRequestContext,
  getLocals,
  getRequestLocals,
  runWithRequestContext,
  createRequestContext,
  setRequestStore,
  isServer,
  setServerMode,
  type RequestContext,
  type RequestEvent,
} from '@fluixi/dom';

// Request-scoped isolation for concurrent async renders. Acquire AsyncLocalStorage in a
// runtime-agnostic way so @fluixi/server LOADS on edge: prefer a global ALS (Cloudflare
// Workers with nodejs_compat, Deno, Bun all expose it), else dynamically import node:async_hooks
// (Node — a static import would fail to resolve on edge), else fall back to the sync store.
type ALSCtor = new <T>() => { getStore(): T | undefined; run<R>(s: T, fn: () => R): R };
const AsyncLocalStorage: ALSCtor | undefined =
  (globalThis as { AsyncLocalStorage?: ALSCtor }).AsyncLocalStorage ??
  (await import('node:async_hooks').then((m) => m.AsyncLocalStorage as unknown as ALSCtor).catch(() => undefined));

if (AsyncLocalStorage) {
  setRequestStore(new AsyncLocalStorage<RequestContext>());
} else {
  // No ALS (a bare edge runtime). The sync store works for one render at a time but can't
  // isolate concurrent async renders sharing an isolate — enable a Node/Workers compat flag.
  console.warn('[fluixi/server] AsyncLocalStorage unavailable — using a sync request store (no async isolation across concurrent requests)');
}

export {
  renderToString,
  renderToStringAsync,
  serializeNode,
  setDataRedactor,
  getRequestEvent,
  getRequestContext,
  getLocals,
  getRequestLocals,
  runWithRequestContext,
  createRequestContext,
  setRequestStore,
  isServer,
  setServerMode,
};
export type { RequestContext, RequestEvent, RequestLocals, RequestStore, RenderOptions } from '@fluixi/dom';

export interface DocumentOptions {
  title?: string;
  lang?: string;
  stylesheets?: string[];
  scripts?: string[];
  head?: string;
  bodyAttributes?: string;
  /** Emit the pre-hydration event-capture script in <head> (default true). */
  eventReplay?: boolean;
}

/** Discrete events captured before hydration and replayed by startClient. */
export const EVENT_REPLAY_TYPES = ['click', 'input', 'change', 'submit', 'keydown'];

/**
 * Inline script that records events fired BEFORE hydration so the client can
 * replay them once the delegated handlers are wired (see startClient →
 * replayEvents). Must run early — emit it near the top of <head>. Records only
 * `{type, target}`; since hydration REUSES the server DOM nodes, each recorded
 * target stays live for replay. Custom servers that don't use createHtmlDocument
 * should inject this string into their <head> themselves.
 */
export function eventCaptureScript(): string {
  const t = JSON.stringify(EVENT_REPLAY_TYPES);
  // Minified IIFE: queue events on window.__FX_REPLAY__ via capture-phase
  // listeners; expose __FX_REPLAY_STOP__ so the client detaches them after replay.
  return (
    `<script>(function(){var q=window.__FX_REPLAY__=[],t=${t},` +
    `r=function(e){q.push({type:e.type,target:e.target})},i=0;` +
    `for(;i<t.length;i++)document.addEventListener(t[i],r,true);` +
    `window.__FX_REPLAY_STOP__=function(){for(var j=0;j<t.length;j++)` +
    `document.removeEventListener(t[j],r,true)}})();</script>`
  );
}

/** The document up to (and including) the open <body> — flushable before content. */
function documentShell(options: DocumentOptions = {}): string {
  const { title = 'Fluixi App', lang = 'en', stylesheets = [], head = '', bodyAttributes = '', eventReplay = true } = options;
  const styleTags = stylesheets.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n    ');
  return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${eventReplay ? eventCaptureScript() : ''}
    ${styleTags}
    ${head}
  </head>
  <body${bodyAttributes ? ' ' + bodyAttributes : ''}>
    `;
}

/** The trailing scripts + closing tags — flushed after the app content. */
function documentClose(options: DocumentOptions = {}): string {
  const { scripts = [] } = options;
  const scriptTags = scripts.map((src) => `<script type="module" src="${src}"></script>`).join('\n    ');
  return `
    ${scriptTags}
  </body>
</html>`;
}

/** Wrap rendered content in a complete HTML document. */
export function createHtmlDocument(content: string, options: DocumentOptions = {}): string {
  return documentShell(options) + content + documentClose(options);
}

/** Render a request to an HTML string, exposing the event via getRequestEvent(). */
export function renderRequest(app: (props: { url: string }) => any, event: RequestEvent): string {
  return renderToString(() => app({ url: event.url ?? '/' }), { event });
}

// Isomorphic request state (paired with @fluixi/core's createIsomorphicState). The
// two halves communicate only through this globalThis registry — no import edge, so
// the client half stays free of this server module.
const ISO_REGISTRY_KEY = '__fluixi_iso_states__';
const ISO_SEED_PREFIX = '__iso:';

/**
 * Resolve every registered isomorphic state for THIS request (before the app renders):
 * run its `server(event)` resolver, set its signal so the server render reads the value,
 * and stash it in the request data so it serializes into the `__FX_DATA__` JSON transport
 * and the client seeds from the same value (no hydration mismatch, no refetch). Passed as the
 * `preload` hook to the renderer; runs inside the request context.
 */
export async function preloadServerState(event?: RequestEvent): Promise<void> {
  const reg = (globalThis as any)[ISO_REGISTRY_KEY] as
    | Map<string, { server: (e: any) => any; set: (v: any) => void }>
    | undefined;
  if (!reg || reg.size === 0) return;
  const ctx = getRequestContext();
  for (const [key, st] of reg) {
    try {
      const value = await st.server(event);
      st.set(value); // populate the signal for the server render
      ctx?.data.set(ISO_SEED_PREFIX + key, value); // → client seed
    } catch (err) {
      // A failing resolver (e.g. the backend is down/restarting) must NOT abort the
      // whole render. Leave the state at its fallback, skip its seed, and let the
      // client resolve/retry after hydration. Resilient SSR degrades, never blanks.
      console.error(`[fluixi] isomorphic state "${key}" failed to resolve on the server:`, err);
    }
  }
}

/** Async variant — awaits resources/Suspense before serializing. */
export function renderRequestAsync(
  app: (props: { url: string }) => any,
  event: RequestEvent,
): Promise<string> {
  return renderToStringAsync(() => app({ url: event.url ?? '/' }), {
    event,
    preload: preloadServerState,
  });
}

/** Render a full HTML document for a request. */
export function renderRequestToPage(
  app: (props: { url: string }) => any,
  event: RequestEvent,
  options?: DocumentOptions,
): string {
  return createHtmlDocument(renderRequest(app, event), options);
}

/**
 * Render a request to a web `ReadableStream<Uint8Array>` — works in Node 18+,
 * Deno, Bun, and edge/worker runtimes (which want a web stream, not a Node
 * Readable). The document **shell** (`<head>` + open `<body>`) is flushed
 * immediately so the browser can start loading assets, then the app HTML
 * (awaiting data loaders/Suspense) and the closing tags follow.
 *
 * Progressive out-of-order Suspense streaming is a later pass; today the body is
 * a single chunk emitted after the async render resolves.
 */
export function renderToStream(
  app: (props: { url: string }) => any,
  event: RequestEvent,
  options: DocumentOptions = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(documentShell(options))); // flush shell first
      try {
        const content = await renderRequestAsync(app, event); // awaits resources
        controller.enqueue(encoder.encode(content));
      } catch (err) {
        // SSR failed (e.g. backend down). The head/shell is already flushed (status 200),
        // so we can't send a 500. Emit an EMPTY body and still close the document so it
        // stays well-formed and the client bundle renders the app client-side (CSR
        // fallback) — degrade, never blank-and-truncate.
        console.error('[fluixi] SSR render failed — falling back to client render:', err);
      }
      controller.enqueue(encoder.encode(documentClose(options)));
      controller.close();
    },
  });
}

/**
 * Render a request to a web `ReadableStream<Uint8Array>` of JUST the app content —
 * NO document shell. For hosts that own the surrounding HTML document (e.g. a
 * `@fluixi/start` app streaming its `index.html` around the app body): the host
 * flushes the document head first, then pipes this body stream into the mount point,
 * then the document tail. The content includes the `__FX_DATA__` resource-transport
 * script (it's part of the async render output), so hydration seeds without refetch.
 *
 * Single chunk today (the async render resolves fully before emitting); progressive
 * out-of-order Suspense streaming is a later pass — same signature.
 */
export function renderToBodyStream(
  app: (props: { url: string }) => any,
  event: RequestEvent,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(await renderRequestAsync(app, event)));
      } catch (err) {
        // SSR failed (e.g. backend down) and the host already flushed the document head.
        // Emit an EMPTY body and close cleanly so the page stays well-formed and the
        // client bundle renders the app client-side, instead of erroring/truncating the
        // stream into a blank page.
        console.error('[fluixi] SSR render failed — falling back to client render:', err);
      }
      controller.close();
    },
  });
}

/**
 * Server entry helper — returns render/page closures bound to an app.
 *
 * @example
 *   import { startServer } from '@fluixi/server';
 *   import App from './app';
 *   const { render, page } = startServer(App);
 *   // express: res.send(page(req.url))
 */
export function startServer(App: (props: { url: string }) => any) {
  return {
    render: (url: string) => renderRequest(App, { url }),
    page: (url: string, opts?: DocumentOptions) => renderRequestToPage(App, { url }, opts),
    /** async render — awaits data loaders/Suspense */
    renderAsync: (url: string) => renderRequestAsync(App, { url }),
    /** async full-document render */
    pageAsync: async (url: string, opts?: DocumentOptions) =>
      createHtmlDocument(await renderRequestAsync(App, { url }), opts),
    /** web ReadableStream of the document (shell flushed first) */
    stream: (url: string, opts?: DocumentOptions) => renderToStream(App, { url }, opts),
    /** web ReadableStream of the app body only (host owns the document) */
    bodyStream: (url: string) => renderToBodyStream(App, { url }),
  };
}
