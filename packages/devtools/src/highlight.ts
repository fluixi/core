/**
 * Showing where something is on the page.
 *
 * Two things use this. Hovering a node in a panel draws a box round what it writes into, and
 * picking works the other way: move over the page and the box follows whatever is under the
 * pointer, until a click says which one.
 *
 * The overlay is not part of the application: it sits in its own fixed layer, takes no
 * pointer events, and is torn down with `stop`. Nothing it holds outlives a call.
 */

const LAYER = 'fx-highlight-layer';

interface Overlay {
  layer: HTMLElement;
  /** One per region. Kept and reused: a pointer moving redraws this many times a second. */
  boxes: HTMLElement[];
  label: HTMLElement;
}

let overlay: Overlay | null = null;

function build(doc: Document): Overlay {
  const layer = doc.createElement('div');
  layer.id = LAYER;
  layer.style.cssText =
    'position:fixed;inset:0;z-index:2147483646;pointer-events:none;contain:strict;';

  const label = doc.createElement('div');
  label.style.cssText =
    'position:absolute;padding:1px 5px;border-radius:3px;background:#5eead4;color:#07131a;' +
    "font:11px/1.5 ui-monospace,monospace;white-space:nowrap;";

  layer.append(label);
  doc.body.appendChild(layer);
  return { layer, boxes: [], label };
}

function boxIn(overlay: Overlay, index: number): HTMLElement {
  const held = overlay.boxes[index];
  if (held) return held;
  const box = overlay.layer.ownerDocument.createElement('div');
  box.style.cssText =
    'position:absolute;border:1px solid #5eead4;background:rgba(94,234,212,.16);' +
    'border-radius:2px;transition:none;';
  overlay.layer.append(box);
  overlay.boxes.push(box);
  return box;
}

/**
 * Draw over everything `target` covers.
 *
 * A box each, rather than one around the lot: a component's regions are usually not
 * adjacent, and a rectangle spanning them covers plenty it has nothing to do with. The
 * label sits above the topmost.
 *
 * Called repeatedly while a pointer moves, so the boxes are reused rather than remade.
 */
export function showHighlight(target: Element | readonly Element[], text?: string): void {
  const elements = (Array.isArray(target) ? target : [target as Element]).filter(
    (el) => el?.isConnected,
  );
  const first = elements[0];
  const doc = first?.ownerDocument;
  if (!doc?.body) {
    hideHighlight();
    return;
  }
  // Rebuilt when the document changed, or when the page removed the layer from under us.
  if (!overlay || overlay.layer.ownerDocument !== doc || !overlay.layer.isConnected) {
    overlay = build(doc);
  }
  const { label, layer } = overlay;
  layer.style.display = '';

  let top = Infinity;
  let left = Infinity;
  let bottom = 0;
  elements.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const box = boxIn(overlay!, index);
    box.style.display = '';
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    bottom = Math.max(bottom, rect.bottom);
  });
  // Whatever the last target needed and this one does not.
  for (let i = elements.length; i < overlay.boxes.length; i++) {
    overlay.boxes[i]!.style.display = 'none';
  }

  if (!text) {
    label.style.display = 'none';
    return;
  }
  label.style.display = '';
  label.textContent = text;
  label.style.left = `${Math.max(2, left)}px`;
  label.style.top = top >= 20 ? `${top - 18}px` : `${bottom + 4}px`;
}

export function hideHighlight(): void {
  if (overlay) overlay.layer.style.display = 'none';
}

/** Take the overlay off the page. Safe to call when there is none. */
export function removeHighlight(): void {
  overlay?.layer.remove();
  overlay = null;
}

export interface PickOptions {
  /** The node under the pointer, for the box's label and for what a click reports. */
  nodeAt: (element: Element | null) => number | undefined;
  /**
   * What the box is labelled. The element comes too, because the owning tag alone reads
   * `App` over every heading and input that component wrote.
   */
  describe?: (id: number, element: Element) => string;
  /**
   * A click on something the graph knows. Picking stops first unless `sticky`.
   *
   * The element comes too: the owning tag alone is too coarse to be useful, since every
   * `<h3>` and `<input>` a component wrote answers with that component.
   */
  onPick: (id: number, element: Element | null) => void;
  /** Picking has ended: escape, or a click on nothing when it is not sticky. */
  onCancel?: () => void;
  /**
   * Stay armed after a pick, so several elements can be chosen in a row. Escape and the
   * returned stop still end it, and a click on nothing is ignored rather than cancelling.
   */
  sticky?: boolean;
  /** Defaults to the page this module is running in. */
  document?: Document;
}

/**
 * Follow the pointer until something is clicked.
 *
 * Listeners are on the capture phase so the application never sees the click that chose an
 * element, since picking a button should not press it. Returns a function that stops early.
 */
export function startPicking(options: PickOptions): () => void {
  const doc = options.document ?? globalThis.document;
  if (!doc?.body) return () => {};

  const was = doc.body.style.cursor;
  doc.body.style.cursor = 'crosshair';

  const under = (event: Event): Element | null => {
    const target = event.target as Element | null;
    // Inside the overlay is not a pick; it should not be hit anyway, but a page can move it.
    return target?.closest?.(`#${LAYER}`) ? null : target;
  };

  const move = (event: Event): void => {
    const element = under(event);
    const id = options.nodeAt(element);
    if (element && id !== undefined) showHighlight(element, options.describe?.(id, element));
    else hideHighlight();
  };

  const click = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    const target = under(event);
    const id = options.nodeAt(target);
    if (!options.sticky) stop();
    if (id !== undefined) options.onPick(id, target);
    // Only a real end reports a cancel. A sticky miss leaves the pointer armed, so saying
    // it ended would put the toolbar out of step with the listeners still attached.
    else if (!options.sticky) options.onCancel?.();
  };

  const key = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    stop();
    options.onCancel?.();
  };

  const stop = (): void => {
    doc.body.style.cursor = was;
    doc.removeEventListener('pointermove', move, true);
    doc.removeEventListener('click', click, true);
    doc.removeEventListener('keydown', key, true);
    hideHighlight();
  };

  doc.addEventListener('pointermove', move, true);
  doc.addEventListener('click', click, true);
  doc.addEventListener('keydown', key, true);
  return stop;
}
