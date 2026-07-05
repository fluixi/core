import { createRoot, onCleanup } from '@fluixi/reactive/signal';
import { handleRef, insert } from '../dom/runtime.js';

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
 * Works in both JSX and lit-html contexts.
 *
 * @example JSX
 * <Portal mount={document.getElementById('modal-root')!}>
 *   <Modal />
 * </Portal>
 *
 * @example lit-html
 * Portal({ mount: () => document.getElementById('modal-root')!, children: html`<p>Hello</p>` })
 */
export function Portal(props: PortalProps): null {
  const getMount = (): Element => {
    if (!props.mount) return document.body;
    return typeof props.mount === 'function' ? props.mount() : props.mount;
  };

  let dispose!: () => void;
  let container!: HTMLDivElement;

  // Use a dedicated container so we can remove the exact node on cleanup.
  createRoot((d) => {
    dispose = d;
    container = document.createElement('div');
    container.style.display = 'contents';
    const target = getMount();
    target.appendChild(container);
    const inserted = insert(container, props.children);
    if(inserted) {
      handleRef(props.ref, container);
    }
  });

  onCleanup(() => {
    dispose();
    container.remove();
  });

  return null;
}
