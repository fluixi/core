/**
 * DOM-reuse hydration.
 *
 * Walk the server-rendered DOM with a single depth-first cursor, adopting the
 * existing nodes instead of recreating them. The runtime's leaf factories and
 * insert() call into the helpers here:
 *   - createNativeElement → hydrateElement: reuse the matched element and DESCEND
 *     into its children (cursor = firstChild).
 *   - createTextNode/createMarker → hydrateText/hydrateMarker: reuse + ADVANCE.
 *   - insert → isAdopted/ascendPast: a node already in place is adopted (not
 *     re-inserted) and the cursor ASCENDS past its (already-walked) subtree.
 *
 * This matches the depth-first nested order the imperative codegen emits (each
 * element is fully built before the next sibling is created).
 *
 * `hydration.active` is read on the runtime hot path (every node create/insert,
 * even when NOT hydrating), so it is a plain field read — deliberately not a
 * getter call. All hydration behaviour is gated on it, so the normal client
 * render path is unaffected.
 */
import { render } from './runtime.js';

export const hydration: { active: boolean; cursor: Node | null } = {
  active: false,
  cursor: null,
};

/** Reuse the matched element at the cursor and descend into its children. */
export function hydrateElement(tag: string): Element | null {
  const c = hydration.cursor;
  if (c && c.nodeType === 1 && (c as Element).tagName.toLowerCase() === tag.toLowerCase()) {
    hydration.cursor = c.firstChild;
    return c as Element;
  }
  return null;
}

/** Reuse the text node at the cursor (syncing its value) and advance. */
export function hydrateText(value: string): Text | null {
  const c = hydration.cursor;
  if (c && c.nodeType === 3) {
    hydration.cursor = c.nextSibling;
    if ((c as Text).nodeValue !== value) (c as Text).nodeValue = value;
    return c as Text;
  }
  return null;
}

/** Reuse a matching comment marker at the cursor and advance. */
export function hydrateMarker(value: string): Comment | null {
  const c = hydration.cursor;
  if (c && c.nodeType === 8 && (c as Comment).data === value) {
    hydration.cursor = c.nextSibling;
    return c as Comment;
  }
  return null;
}

/** True when hydrating and `node` is already server-rendered in `parent`. */
export function isAdopted(parent: Node, node: Node): boolean {
  return hydration.active && node.parentNode === parent;
}

/** Ascend the cursor past an adopted node's (already-walked) subtree. */
export function ascendPast(node: Node): void {
  hydration.cursor = node.nextSibling;
}

/**
 * Hydrate `element` over the server-rendered markup already in `container`:
 * reuse the existing DOM and wire events/reactivity in place (no re-render).
 */
export function hydrate<T>(element: T, container: Element): () => void {
  hydration.active = true;
  hydration.cursor = container.firstChild;
  try {
    return render(element, container);
  } finally {
    hydration.active = false;
    hydration.cursor = null;
  }
}
