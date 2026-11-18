/**
 * @module @fluixi/core/server
 *
 * Implements Unified SSR Engine for JSX and `html` templates.
 */

import {
  serializeHydrationData,
  setHydrating,
  isHydrating,
  setHydrationData,
  getHydrationData,
  hasHydrationData,
  clearHydrationData,
  clearHydrationDataKey,
  deserializeHydrationData,
  hydrationMarker,
  hydrationMarkerStart,
  hydrationMarkerEnd,
  createHydratableResource,
  useHydrationData,
  cleanupHydration,
  type HydrationData,
} from './hydration.js';

// SSR runs through @fluixi/server: the universal renderer + request-scoping,
// with AsyncLocalStorage injected so concurrent renders are isolated.
import { renderToString as domRenderToString } from '@fluixi/server';

// TYPES

/**
 * SSR context for passing data during server rendering
 */
export interface SSRContext {
  url: string;
  headers: Record<string, string>;
  [key: string]: any;
}

export interface DocumentOptions {
  title?: string;
  lang?: string;
  stylesheets?: string[];
  scripts?: string[];
  head?: string;
  bodyAttributes?: string;
}

// SSR CONTEXT MANAGEMENT

let currentSSRContext: SSRContext | null = null;

/**
 * Get current SSR context
 */
export function getSSRContext(): SSRContext | null {
  return currentSSRContext;
}

export function setSSRContext(context: SSRContext | null): void {
  currentSSRContext = context;
}

/**
 * Run function with SSR context
 */
export function withSSRContext<T>(context: SSRContext, fn: () => T): T {
  const prev = currentSSRContext;
  currentSSRContext = context;
  try {
    return fn();
  } finally {
    currentSSRContext = prev;
  }
}

// HTML GENERATION

/**
 * Render complete HTML page
 */
export async function renderToPage(
  code: () => any,
  options: DocumentOptions = {}
): Promise<string> {
  const content = await renderToString(code);
  return createHtmlDocument(content, options);
}

/**
 * Create HTML document wrapper
 */
export function createHtmlDocument(
  content: string,
  options: DocumentOptions = {}
): string {
  const {
    title = 'Fluixi App',
    lang = 'en',
    stylesheets = [],
    scripts = [],
    head = '',
    bodyAttributes = '',
  } = options;

  const styleTags = stylesheets
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join('\n    ');

  const scriptTags = scripts
    .map((src) => `<script type="module" src="${src}"></script>`)
    .join('\n    ');

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

// ENVIRONMENT DETECTION

/**
 * Whether this is a server render.
 *
 * Re-exported from `@fluixi/dom`, which owns the answer: the flag lives on a realm
 * singleton that `renderToString` sets, so it is true for the whole of a server render
 * even in a jsdom process where `window` exists.
 *
 * This used to be a local `typeof window === 'undefined'`, which meant
 * `@fluixi/core/server` and `@fluixi/core` disagreed about the same question, and the
 * local one was wrong in exactly the case that matters. Four copies of that test were
 * the alpha.83 SSR bug; do not add a fifth.
 */
export { isServer } from '@fluixi/dom';

/** Whether this is running in a browser, which is the negation of a server render. */
export function isClient(): boolean {
  return !domIsServer();
}

/**
 * Run `fn` only during a server render, otherwise take `fallback`.
 *
 * @example
 * ```ts
 * const secret = onServer(() => process.env.API_KEY, '');
 * ```
 */
export function onServer<T>(fn: () => T, fallback: T): T {
  return domIsServer() ? fn() : fallback;
}

/**
 * Run `fn` only in the browser, otherwise take `fallback`.
 *
 * @example
 * ```ts
 * const width = onClient(() => window.innerWidth, 0);
 * ```
 */
export function onClient<T>(fn: () => T, fallback: T): T {
  return !domIsServer() ? fn() : fallback;
}

// EXPORTS

/**
 * Render component to HTML string
 */
export async function renderToString(code: () => any): Promise<string> {
  const html = await domRenderToString(code);
  const script = serializeHydrationData();
  return html + script;
}

/**
 * Render component to stream (includes hydration data)
 */
export async function renderToStream(code: () => any): Promise<string> {
  const html = await domRenderToString(code);
  const script = serializeHydrationData();
  return html + script;
}

/**
 * Standard server entry point.
 * Returns an object with render/stream/page helpers
 * for use in server frameworks (Express, Hono, Nitro, etc.)
 *
 * @example
 * ```ts
 * // entry-server.ts
 * import { startServer } from '@fluixi/core/server';
 * import App from './app';
 *
 * export default startServer(App);
 * ```
 */
export function startServer(App: (props: { url: string }) => any) {
  return {
    /** Render the app to a full HTML string (includes hydration data) */
    render: (url: string) => renderToString(() => App({ url })),
    /** Render the app to a streamable HTML string (includes hydration data) */
    stream: (url: string) => renderToStream(() => App({ url })),
    /** Render the app to a complete HTML page document */
    page: (url: string, opts?: DocumentOptions) =>
      renderToPage(() => App({ url }), opts),
  };
}

// Re-export server-mapped reactive primitives
export {
  createSignal,
  createEffect,
  createMemo,
  createRoot,
  batch,
  untrack,
  onCleanup,
  getOwner,
  runWithOwner,
  createContext,
  useContext,
  createComputed,
  createRenderEffect,
  createDeferred,
  createSelector,
  createResource,
  startTransition,
  isServer as isServerReactive,
  isClient as isClientReactive,
} from './reactive.js';

export type {
  SignalTuple,
  Accessor,
  Setter,
  SignalOptions,
  RootOwner,
  Context,
} from './reactive.js';
import { isServer as domIsServer } from '@fluixi/dom';

// Re-export all hydration utilities
export {
  isHydrating,
  setHydrating,
  setHydrationData,
  getHydrationData,
  hasHydrationData,
  clearHydrationData,
  clearHydrationDataKey,
  serializeHydrationData,
  deserializeHydrationData,
  hydrationMarker,
  hydrationMarkerStart,
  hydrationMarkerEnd,
  createHydratableResource,
  useHydrationData,
  cleanupHydration,
};

export type { HydrationData };
