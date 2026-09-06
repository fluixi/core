// Runs inside the preview iframe.
//
// The framework has to be loaded here rather than handed in from the page around it. Event
// delegation attaches to `document`, and a runtime taken from the outer document would bind
// its listeners there — the preview would render and then ignore every click. Loading it in
// this realm also means `document.getElementById('app')` finds the project's own element,
// and the project's html, head and body styling are simply the document.
//
// Vite serves this module, so its bare imports are already resolved; importing it from the
// iframe loads the framework into the iframe.
import { createReactor, type Reactor } from '@fluixi/devtools';
import { createRegistry } from '../modules';

const REGISTRY = Symbol.for('fluixi.playground.registry');

declare global {
  interface Window {
    /** Set by the page before this runs. */
    __fxEntry?: string;
    /** Read by the page once it has. */
    __fxReactor?: Reactor;
    __fxError?: string;
  }
}

async function boot(): Promise<void> {
  const entry = window.__fxEntry;
  if (!entry) return;

  const reactor = createReactor();
  window.__fxReactor = reactor;

  await new Promise<void>((resolve) => {
    reactor.run((api) => {
      // Published under a symbol the linked modules look for, so a shim resolves to the
      // instrumented primitives of this realm.
      (globalThis as Record<PropertyKey, unknown>)[REGISTRY] = createRegistry(
        api as unknown as Record<string, unknown>,
      );

      import(/* @vite-ignore */ entry)
        .then(() => resolve())
        .catch((error: unknown) => {
          window.__fxError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
          resolve();
        });
    });
  });
}

void boot();
