/**
 * Focus and keyboard behaviour a component needs and the platform leaves to it.
 *
 * `delegatesFocus` on the shadow root (see `HTMLReactiveElement.shadow`) covers a host that
 * should hand focus to its inner input. This covers the other two: arrow keys moving through
 * a group with one tab stop (a menu, a listbox, tabs), and keeping focus inside a panel until
 * it closes (a dialog, a popover that behaves like one).
 *
 * Both follow the composed tree, so a focusable element inside another component's shadow
 * root, or slotted in from the page, counts where the user sees it.
 */
import { effect, onCleanup } from '@fluixi/reactive/signal';

const FOCUSABLE = 'a[href],area[href],button,input,select,textarea,iframe,summary,[tabindex],[contenteditable]:not([contenteditable="false"])';

function isTabbable(el: HTMLElement): boolean {
  if (!el.matches(FOCUSABLE) || el.tabIndex < 0) return false;
  if ((el as HTMLButtonElement).disabled || el.closest('[inert]')) return false;
  if (el instanceof HTMLInputElement && el.type === 'hidden') return false;
  // Not rendered, so the browser skips it too. Absent in older engines: assume shown.
  return el.checkVisibility?.({ visibilityProperty: true } as CheckVisibilityOptions) ?? true;
}

/** Every element the Tab key reaches under `root`, in order, through shadow roots and slots. */
export function tabbables(root: ParentNode): HTMLElement[] {
  const out: HTMLElement[] = [];
  const visit = (node: Element): void => {
    if (node instanceof HTMLSlotElement) {
      const assigned = node.assignedElements({ flatten: true });
      for (const child of assigned.length ? assigned : Array.from(node.children)) visit(child);
      return;
    }
    const shadow = node.shadowRoot;
    // A host that delegates focus is reached through what it delegates to, not itself.
    if (node instanceof HTMLElement && isTabbable(node) && !shadow?.delegatesFocus) out.push(node);
    if (shadow) for (const child of Array.from(shadow.children)) visit(child);
    else for (const child of Array.from(node.children)) visit(child);
  };
  for (const child of Array.from(root.children)) visit(child);
  return out;
}

/** The element that really has focus, looking through shadow roots. */
export function deepActiveElement(doc: Document = document): Element | null {
  let active = doc.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

export interface RovingFocusOptions {
  /** The items, in order. Read reactively: a list that changes is followed. */
  items: () => readonly HTMLElement[];
  /** Which arrow keys move. `vertical` for a menu, `horizontal` for tabs. */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** Past the last item wraps to the first. */
  loop?: boolean;
  /** Called when the active item changes, by key or by click. */
  onMove?: (item: HTMLElement, index: number) => void;
}

/**
 * One tab stop for a group: the active item has `tabindex="0"`, the rest `-1`, and the arrow
 * keys, Home and End move between them. Disabled items are skipped. Stops when the reactive
 * scope it was called in ends; the returned function stops it earlier.
 */
export function rovingFocus(container: HTMLElement, options: RovingFocusOptions): () => void {
  const { orientation = 'vertical', loop = true } = options;
  let active: HTMLElement | undefined;

  const enabled = (): HTMLElement[] =>
    options.items().filter((item) => !(item as HTMLButtonElement).disabled && item.getAttribute('aria-disabled') !== 'true');

  const settle = (items: readonly HTMLElement[]): void => {
    if (!active || !items.includes(active)) active = enabled()[0];
    for (const item of items) item.tabIndex = item === active ? 0 : -1;
  };

  const move = (to: HTMLElement): void => {
    const items = options.items();
    if (to === active) return;
    active = to;
    settle(items);
    to.focus();
    options.onMove?.(to, items.indexOf(to));
  };

  const keys = {
    next: orientation === 'horizontal' ? ['ArrowRight'] : orientation === 'vertical' ? ['ArrowDown'] : ['ArrowRight', 'ArrowDown'],
    previous: orientation === 'horizontal' ? ['ArrowLeft'] : orientation === 'vertical' ? ['ArrowUp'] : ['ArrowLeft', 'ArrowUp'],
  };

  const onKey = (event: KeyboardEvent): void => {
    const list = enabled();
    if (!list.length) return;
    const at = active ? list.indexOf(active) : -1;
    let next: HTMLElement | undefined;
    if (keys.next.includes(event.key)) next = list[at + 1] ?? (loop ? list[0] : undefined);
    else if (keys.previous.includes(event.key)) next = list[at - 1] ?? (loop ? list[list.length - 1] : undefined);
    else if (event.key === 'Home') next = list[0];
    else if (event.key === 'End') next = list[list.length - 1];
    else return;
    event.preventDefault();
    if (next) move(next);
  };

  // A click or programmatic focus makes that item the tab stop, so Tab comes back to it.
  const onFocus = (event: FocusEvent): void => {
    const item = enabled().find((candidate) => event.composedPath().includes(candidate));
    if (item && item !== active) move(item);
  };

  container.addEventListener('keydown', onKey);
  container.addEventListener('focusin', onFocus);
  const stopTracking = effect(() => settle(options.items()), undefined, { name: 'roving focus' });

  let stopped = false;
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    container.removeEventListener('keydown', onKey);
    container.removeEventListener('focusin', onFocus);
    stopTracking();
  };
  onCleanup(stop);
  return stop;
}

export interface FocusTrapOptions {
  /** What to focus first. Defaults to the first tabbable element inside. */
  initial?: HTMLElement | (() => HTMLElement | null | undefined);
  /** Give focus back to what had it before, on release. Defaults to true. */
  restore?: boolean;
}

/**
 * Keep keyboard focus inside `container`: Tab and Shift+Tab wrap at the ends, and focus that
 * lands outside is brought back. `<dialog>` opened with `showModal()` does this natively; this
 * is for a panel that is not a modal dialog. Released when the reactive scope it was called in
 * ends, or by the returned function.
 */
export function trapFocus(container: HTMLElement, options: FocusTrapOptions = {}): () => void {
  const doc = container.ownerDocument;
  const previous = deepActiveElement(doc) as HTMLElement | null;
  const first = (): HTMLElement | undefined => tabbables(container)[0];
  const inside = (node: EventTarget | null): boolean =>
    node instanceof Node && (container.contains(node) || containsComposed(container, node));

  const initial = typeof options.initial === 'function' ? options.initial() : options.initial;
  (initial ?? first() ?? container).focus();

  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;
    const list = tabbables(container);
    if (!list.length) {
      event.preventDefault();
      return;
    }
    const current = deepActiveElement(doc);
    const at = list.indexOf(current as HTMLElement);
    if (event.shiftKey && at <= 0) {
      event.preventDefault();
      list[list.length - 1]!.focus();
    } else if (!event.shiftKey && at === list.length - 1) {
      event.preventDefault();
      list[0]!.focus();
    }
  };

  const onFocusIn = (event: FocusEvent): void => {
    if (!inside(event.composedPath()[0] ?? event.target)) (first() ?? container).focus();
  };

  container.addEventListener('keydown', onKey);
  doc.addEventListener('focusin', onFocusIn, true);

  let released = false;
  const release = (): void => {
    if (released) return;
    released = true;
    container.removeEventListener('keydown', onKey);
    doc.removeEventListener('focusin', onFocusIn, true);
    if (options.restore !== false && previous?.isConnected) previous.focus();
  };
  onCleanup(release);
  return release;
}

/** Whether `node` sits under `container` once shadow roots are looked through. */
function containsComposed(container: Node, node: Node): boolean {
  let at: Node | null = node;
  while (at) {
    if (at === container) return true;
    at = at.parentNode ?? (at instanceof ShadowRoot ? at.host : null);
  }
  return false;
}
