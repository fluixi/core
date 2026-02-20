/**
 * @fileoverview Server-Side Rendering Entry Point for KettleJS
 * @module @awc/kettlejs/server
 *
 * Implements Unified SSR Engine compatible with Lit and JSX.
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
  isServerEnvironment,
  isClientEnvironment,
  type HydrationData,
} from './hydration.js';

import {
  renderToString as domRenderToString,
  renderToStream as domRenderToStream,
} from '@awc/dom/server';

// ============================================================================
// TYPES
// ============================================================================

/**
 * SSR context for passing data during server rendering
 */
export interface SSRContext {
  url: string;
  headers: Record<string, string>;
  [key: string]: any;
}

/**
 * Document options
 */
export interface DocumentOptions {
  title?: string;
  lang?: string;
  stylesheets?: string[];
  scripts?: string[];
  head?: string;
  bodyAttributes?: string;
}

// ============================================================================
// SSR CONTEXT MANAGEMENT
// ============================================================================

let currentSSRContext: SSRContext | null = null;

/**
 * Get current SSR context
 */
export function getSSRContext(): SSRContext | null {
  return currentSSRContext;
}

/**
 * Set SSR context
 */
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

// ============================================================================
// HTML GENERATION
// ============================================================================

/**
 * Render complete HTML page
 *
 * @param {() => any} code - Component function
 * @param {DocumentOptions} options - Document options
 * @returns {Promise<string>} Complete HTML document
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
    title = 'KettleJS App',
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

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

export function isServer(): boolean {
  return typeof window === 'undefined';
}

export function isClient(): boolean {
  return typeof window !== 'undefined';
}

export function onServer<T>(fn: () => T, fallback: T): T {
  return isServer() ? fn() : fallback;
}

export function onClient<T>(fn: () => T, fallback: T): T {
  return isClient() ? fn() : fallback;
}

// ============================================================================
// EXPORTS
// ============================================================================

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
 * import { startServer } from '@awc/kettlejs/server';
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
  Signal,
  Accessor,
  Setter,
  SignalOptions,
  RootOwner,
  Context,
} from './reactive.js';

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
  isServerEnvironment,
  isClientEnvironment,
};

export type { HydrationData };
