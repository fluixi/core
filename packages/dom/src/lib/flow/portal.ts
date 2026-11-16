import { createRoot, getOwner, onCleanup, runWithOwner } from '@fluixi/reactive/signal';
import { handleRef, insert } from '../dom/runtime.js';
import { isServer } from '../dom/server/host.js';
import { hydration } from '../dom/hydration-state.js';

export interface PortalProps<Children = any> {
  /**
   * The DOM node to mount content into.
   * Defaults to `document.body`.
   */
  mount?: Element | (() => Element);
  /** Content to render inside the portal. */
  children: Children;
  ref?: {current: Element | HTMLElement | HTMLDivElement | null};
}

/**
 * Renders children into a DOM node outside the current component tree.
 *
 * Useful for modals, tooltips, and overlays.  The portal is disposed when
 * the parent component unmounts.  Returns null (no in-place DOM output).
 *
 * On the server it renders nothing, there being no document to mount into; in the browser the
 * content mounts once the page has hydrated.
 *
 * Works in both JSX and `html` templates.
 *
 * @example JSX
 * <Portal mount={document.getElementById('modal-root')!}>
 *   <Modal />
 * </Portal>
 *
 * @example html template
 * Portal({ mount: () => document.getElementById('modal-root')!, children: html`<p>Hello</p>` })
 */
export function Portal(props: PortalProps): null {
  // Children not read: nothing of them is built where it could not be placed.
  if (isServer()) return null;

  const getMount = (): Element => {
    if (!props.mount) return document.body;
    return typeof props.mount === 'function' ? props.mount() : props.mount;
  };

  let dispose: (() => void) | undefined;
  let container: HTMLDivElement | undefined;
  let removed = false;
  const owner = getOwner();

  const mount = () =>
    // Under the component's owner, so the content sees the context around the portal.
    runWithOwner(owner, () =>
      createRoot((d) => {
        dispose = d;
        // A dedicated container, so cleanup removes exactly what was added.
        container = document.createElement('div');
        container.style.display = 'contents';
        getMount().appendChild(container);
        const inserted = insert(container, props.children);
        if (inserted) handleRef(props.ref, container);
      }),
    );

  // The server sent nothing for the portal: built while the page hydrates, its content would
  // claim server nodes at the hydration cursor. Hydration ends synchronously, so a microtask is
  // the first moment it is over.
  if (hydration.active) {
    queueMicrotask(() => {
      if (!removed) mount();
    });
  } else {
    mount();
  }

  onCleanup(() => {
    removed = true;
    dispose?.();
    container?.remove();
  });

  return null;
}
