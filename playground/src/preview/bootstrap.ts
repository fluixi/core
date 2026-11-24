// Runs inside the preview iframe.
//
// The framework has to be loaded here rather than handed in from the page around it. Event
// delegation attaches to `document`, and a runtime taken from the outer document would bind
// its listeners there: the preview would render and then ignore every click. Loading it in
// this realm also means `document.getElementById('app')` finds the project's own element,
// and the project's html, head and body styling are simply the document.
//
// Vite serves this module, so its bare imports are already resolved; importing it from the
// iframe loads the framework into the iframe.
import { observeGraph, type ObservedGraph } from '@fluixi/devtools';
import { createRegistry, loadInto } from '../modules';

const REGISTRY = Symbol.for('fluixi.playground.registry');

declare global {
  interface Window {
    /** Set by the page before this runs. */
    __fxEntry?: string;
    /** The bare specifiers the project imports: fluixi-ui packages and stylesheets load here. */
    __fxPackages?: string[];
    /** The page's source-map tracer: a compiled position, put back in the author's file. */
    __fxOrigin?: (file: string, at: { line: number; column: number }) => { line: number; column: number } | undefined;
    /** How to put the app on the page: client render, or server html then hydrate. */
    __fxMode?: 'spa' | 'ssr';
    /** What the server would have sent, when the mode asked for it. */
    __fxSsrHtml?: string;
    /** Read by the page once it has. */
    __fxGraph?: ObservedGraph;
    __fxError?: string;
  }
}

async function boot(): Promise<void> {
  const entry = window.__fxEntry;
  if (!entry) return;

  // Before the entry loads: a node made earlier than this is not in the graph.
  const observed = observeGraph({
    // `//# sourceURL` gets the file right; only the maps get the line right.
    mapSource: (location) => {
      const at = window.__fxOrigin?.(location.file, {
        line: location.line ?? 1,
        column: location.column ?? 0,
      });
      return at ? { file: location.file, line: at.line, column: at.column } : undefined;
    },
  });

  const registry = createRegistry();
  // In this realm, so components build their DOM here and stylesheets style this document.
  await loadInto(registry, window.__fxPackages ?? []);
  const ssr = window.__fxMode === 'ssr';

  // In ssr mode the entry's `render(() => <App/>, root)` is caught rather than run: the same
  // call says what to render and where, which is all the server pass needs. The compiled code
  // is the same either way: the runtime builds string nodes instead of dom ones when the
  // server mode flag is on, so there is no second compilation to do.
  let root: (() => unknown) | null = null;
  let host: Element | null = null;
  if (ssr) {
    const core = registry['@fluixi/core'] as Record<string, unknown>;
    registry['@fluixi/core'] = {
      ...core,
      render: (fn: () => unknown, el: Element) => {
        root = fn;
        host = el;
        return () => {};
      },
    };
  }

  // Published under a symbol the linked modules look for, so a shim resolves to this realm's
  // copy of the framework: the same one being watched.
  (globalThis as Record<PropertyKey, unknown>)[REGISTRY] = registry;

  try {
    await import(/* @vite-ignore */ entry);
    if (ssr && root && host) {
      const { renderToString } = await import('@fluixi/dom/server');
      const html = renderToString(root as () => never);
      window.__fxSsrHtml = html;
      // What a browser would have received, then the client taking it over in place.
      host.innerHTML = html;
      const { hydrate } = await import('@fluixi/dom');
      hydrate(root as never, host);
    }
  } catch (error) {
    window.__fxError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
  window.__fxGraph = observed;
}

void boot();
