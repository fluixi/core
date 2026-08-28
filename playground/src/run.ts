// Eval compiled snippet code + mount it. The compiled code imports the DOM runtime from
// @fluixi/dom and leaves the reactive calls (createSignal/createMemo/createEffect/createStore)
// as free refs — those get the INSTRUMENTED versions from @fluixi/devtools so they land in the
// graph. ES imports can't run in `new Function`, so rewrite them to destructures from a module
// map, dropping the reactive names (the instrumented ones win).
import * as dom from '@fluixi/dom';
import * as jsx from '@fluixi/jsx';
import { render } from '@fluixi/core';
import type { Reactor } from '@fluixi/devtools';

const MODS: Record<string, unknown> = {
  '@fluixi/dom': dom,
  '@fluixi/dom/runtime': dom,
  '@fluixi/dom/reactive': dom,
  '@fluixi/jsx': jsx,
};

// instrumented reactive primitives shadow any same-named runtime import → graph captures them
const REACTIVE = new Set(['createSignal', 'createMemo', 'createEffect', 'createStore', 'createResource']);

function rewriteImports(code: string): string {
  return (
    code
      // import { a, b } from 'spec';  →  const { a, b } = __mods['spec'];  (minus reactive names)
      .replace(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?/g, (_m, names: string, spec: string) => {
        const kept = names
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .filter((n) => !REACTIVE.has(n.split(/\s+as\s+/)[0].trim()));
        return kept.length ? `const { ${kept.join(', ')} } = __mods[${JSON.stringify(spec)}];` : '';
      })
      // drop default + side-effect imports
      .replace(/import\s+\w+\s+from\s*['"][^'"]+['"];?/g, '')
      .replace(/import\s*['"][^'"]+['"];?/g, '')
      // the snippet is a module; strip exports so `function App` stays a local
      .replace(/export\s+default\s+/g, 'const __default = ')
      .replace(/export\s+/g, '')
  );
}

export interface RunResult {
  error: string | null;
  dispose: () => void;
}

// Run compiled code inside the reactor's root + mount <App/> into previewEl.
export function runCompiled(compiled: string, previewEl: HTMLElement, reactor: Reactor): RunResult {
  const body = rewriteImports(compiled);
  previewEl.innerHTML = '';
  let error: string | null = null;
  let disposeRender = () => {};

  try {
    reactor.run(({ createSignal, createMemo, createEffect, createStore, createResource }) => {
      const factory = new Function(
        '__mods',
        'createSignal',
        'createMemo',
        'createEffect',
        'createStore',
        'createResource',
        'render',
        `${body}\nreturn (typeof App !== 'undefined') ? App : (typeof __default !== 'undefined' ? __default : null);`,
      );
      const App = factory(MODS, createSignal, createMemo, createEffect, createStore, createResource, render);
      if (typeof App === 'function') {
        disposeRender = render(() => App({}), previewEl) as () => void;
      } else if (App instanceof Node) {
        previewEl.appendChild(App);
      }
    });
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  return {
    error,
    dispose() {
      try {
        disposeRender();
      } catch {
        /* ignore */
      }
      reactor.dispose();
    },
  };
}
