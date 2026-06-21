/**
 * Islands — partial hydration. By default Fluixi hydrates the whole app; an island
 * hydrates ONLY its own interactive subtree, leaving the rest of the page as inert
 * static server HTML (less client JS, faster TTI).
 *
 *   // server-rendered page
 *   <Island name="Counter" component={Counter} props={{ start: 0 }} />
 *
 *   // client entry — instead of startClient(App):
 *   hydrateIslands({ Counter });
 *
 * The server wraps the component in a `<fluixi-island name props>` boundary (props as a
 * JSON attribute). On the client, `hydrateIslands` finds those boundaries, looks each up
 * in the registry, and hydrates just that subtree in place.
 *
 * Note: islands are self-contained interactivity — pass data via `props`. Resource/
 * `__FX_DATA__` seeding spans the whole-app hydrate, not per-island (a later refinement).
 */
import { createNativeElement, insert } from './runtime.js';
import { setAttribute } from './utils.js';
import { hydrate } from './hydration.js';

const TAG = 'fluixi-island';

export interface IslandProps<P = any> {
  /** The interactive component to render + hydrate. */
  component: (props: P) => any;
  /** Props passed to the component (must be JSON-serializable for transport). */
  props?: P;
  /** Registry key the client looks this island up by. Defaults to `component.name`. */
  name?: string;
}

/**
 * Wrap a component in an island boundary. Renders the component normally (so the static
 * HTML is server-rendered), inside a `<fluixi-island>` element carrying the name + the
 * serialized props for the client to hydrate from.
 */
export function Island<P = any>(props: IslandProps<P>): any {
  const { component, props: cprops = {} as P, name } = props;
  const el = createNativeElement(TAG);
  setAttribute(el as Element, 'name', name ?? (component as any).name ?? 'Island');
  setAttribute(el as Element, 'props', JSON.stringify(cprops ?? {}));
  insert(el as Element, () => (component as any)(cprops));
  return el;
}

let _styleInjected = false;
function ensureDisplayContents(): void {
  if (_styleInjected || typeof document === 'undefined') return;
  _styleInjected = true;
  const style = document.createElement('style');
  // The boundary element must not affect layout.
  style.textContent = `${TAG}{display:contents}`;
  document.head.appendChild(style);
}

export type IslandRegistry = Record<string, (props: any) => any>;

/**
 * Client entry for an islands page: find every `<fluixi-island>`, look its component up
 * in `registry` by name, parse its props, and hydrate that subtree in place. The rest of
 * the page stays static (never hydrated → no reactivity wired, no extra JS executed).
 * Call this instead of `startClient(App)`.
 */
export function hydrateIslands(registry: IslandRegistry): void {
  if (typeof document === 'undefined') return;
  ensureDisplayContents();
  const els = document.querySelectorAll(TAG);
  els.forEach((el) => {
    const name = el.getAttribute('name') ?? '';
    const Comp = registry[name];
    if (!Comp) {
      if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'production') {
        console.warn(`[fluixi] island "${name}" has no component in the registry — left static.`);
      }
      return;
    }
    let props: any = {};
    try {
      props = JSON.parse(el.getAttribute('props') || '{}');
    } catch {
      /* malformed props → hydrate with none */
    }
    hydrate(() => (Comp as any)(props), el as Element);
  });
}
