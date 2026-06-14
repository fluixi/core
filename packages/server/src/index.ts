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
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  renderToString,
  serializeNode,
  getRequestEvent,
  getRequestContext,
  runWithRequestContext,
  createRequestContext,
  setRequestStore,
  isServer,
  setServerMode,
  type RequestContext,
  type RequestEvent,
} from '@fluixi/dom';

// Enable request-scoped isolation for concurrent async renders.
setRequestStore(new AsyncLocalStorage<RequestContext>());

export {
  renderToString,
  serializeNode,
  getRequestEvent,
  getRequestContext,
  runWithRequestContext,
  createRequestContext,
  setRequestStore,
  isServer,
  setServerMode,
};
export type { RequestContext, RequestEvent, RequestStore, RenderOptions } from '@fluixi/dom';

export interface DocumentOptions {
  title?: string;
  lang?: string;
  stylesheets?: string[];
  scripts?: string[];
  head?: string;
  bodyAttributes?: string;
}

/** Wrap rendered content in a complete HTML document. */
export function createHtmlDocument(content: string, options: DocumentOptions = {}): string {
  const {
    title = 'Fluixi App',
    lang = 'en',
    stylesheets = [],
    scripts = [],
    head = '',
    bodyAttributes = '',
  } = options;

  const styleTags = stylesheets.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n    ');
  const scriptTags = scripts.map((src) => `<script type="module" src="${src}"></script>`).join('\n    ');

  return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${styleTags}
    ${head}
  </head>
  <body${bodyAttributes ? ' ' + bodyAttributes : ''}>
    ${content}
    ${scriptTags}
  </body>
</html>`;
}

/** Render a request to an HTML string, exposing the event via getRequestEvent(). */
export function renderRequest(app: (props: { url: string }) => any, event: RequestEvent): string {
  return renderToString(() => app({ url: event.url ?? '/' }), { event });
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
  };
}
