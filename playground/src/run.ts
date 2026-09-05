// Import the linked entry module and mount whatever it exports.
//
// The entry decides how it mounts: export a component and the playground renders it, or call
// render() yourself against the element passed to `mount`. Both are ordinary module code.
import { render } from '@fluixi/core';
import { createRegistry } from './modules';
import { linkProject } from './link';
import type { Project } from './project';
import type { Reactor } from '@fluixi/devtools';

export interface RunResult {
  error: string | null;
  compiled: Map<string, string>;
  dispose: () => void;
}

export async function runProject(project: Project, previewEl: HTMLElement, reactor: Reactor): Promise<RunResult> {
  previewEl.innerHTML = '';
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
