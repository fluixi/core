// Import the linked entry module and let it mount itself.
//
// A project is shaped like an app: index.html holds the markup and names the entry, and the
// entry does its own `render(() => <App/>, document.getElementById('app'))`. The preview
// starts as that html body, so the element the entry looks for is really there.
//
// A project with no index.html still works: export a component as default, or a
// mount(element) function.
import { render } from '@fluixi/core';
import { createRegistry } from './modules';
import { linkProject } from './link';
import { HTML_SHELL, shellOf, type Project } from './project';
import type { Reactor } from '@fluixi/devtools';

export interface RunResult {
  error: string | null;
  compiled: Map<string, string>;
  dispose: () => void;
}

export async function runProject(project: Project, previewEl: HTMLElement, reactor: Reactor): Promise<RunResult> {
  const shell = project.files.find((f) => f.path === HTML_SHELL);
  previewEl.innerHTML = shell ? shellOf(shell.code) : '';
  let error: string | null = null;
  let compiled = new Map<string, string>();
  let disposeRender: () => void = () => {};
  let revoke: () => void = () => {};

  try {
    // The reactor hands out instrumented primitives; the registry puts them behind the same
    // names the packages export, so an imported createSignal still lands in the graph.
    await new Promise<void>((resolve, reject) => {
      reactor.run((api) => {
        const registry = createRegistry(api as unknown as Record<string, unknown>);
        linkProject(project, registry)
          .then(async (linked) => {
            compiled = linked.compiled;
            revoke = linked.revoke;
            const module = (await import(/* @vite-ignore */ linked.entryUrl)) as Record<string, unknown>;
            // An entry that mounted itself has nothing left to export.
            if (shell) {
              resolve();
              return;
            }
            const entry = module.default ?? module.App ?? module.mount;
            if (typeof module.mount === 'function') {
              const returned = (module.mount as (el: HTMLElement) => unknown)(previewEl);
              if (typeof returned === 'function') disposeRender = returned as () => void;
            } else if (typeof entry === 'function') {
              disposeRender = render(() => (entry as (props: object) => unknown)({}), previewEl) as () => void;
            } else if (entry instanceof Node) {
              previewEl.appendChild(entry);
            } else {
              throw new Error(
                `${project.entry} exports nothing to mount. Export a component as default, or export ` +
                  `a mount(element) function.`,
              );
            }
            resolve();
          })
          .catch(reject);
      });
    });
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  return {
    error,
    compiled,
    dispose() {
      try {
        disposeRender();
      } catch {
        /* the module may already be gone */
      }
      revoke();
      reactor.dispose();
    },
  };
}
