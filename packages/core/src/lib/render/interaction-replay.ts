/**
 * `load:interaction` on a component's own nodes: the first trigger event inside them starts the
 * load, and what the user does there until the component renders (the click after the
 * `pointerdown`, the text typed) is played again on the nodes that replace them, so the
 * interaction that woke the component is not lost.
 */

/** Played again once the component renders. Pointer events only start the load. */
const REPLAYED = ['click', 'dblclick', 'input', 'change', 'keydown', 'keyup', 'submit', 'focusin'] as const;

interface Recorded {
  type: string;
  path: number[];
  key?: string;
  code?: string;
  value?: string;
  checked?: boolean;
}

export interface InteractionCapture {
  /** Play what was recorded on the component's rendered nodes, and stop listening. */
  replay(rendered: readonly Node[]): void;
}

/**
 * Listen on `roots` for `triggers` (and the events worth replaying). `start` runs on the first
 * trigger; events from it on are recorded.
 */
export function captureInteraction(roots: readonly Element[], triggers: readonly string[], start: () => void): InteractionCapture {
  const events = [...new Set([...triggers, ...REPLAYED])];
  const recorded: Recorded[] = [];
  let started = false;

  const listener = (event: Event): void => {
    const target = event.target as Element | null;
    if (!target) return;
    if (!started && triggers.includes(event.type)) {
      started = true;
      start();
    }
    if (!started || !(REPLAYED as readonly string[]).includes(event.type)) return;
    const path = pathOf(roots, target);
    if (!path) return;
    // The form has no handler yet: submitting would leave the page.
    if (event.type === 'submit') event.preventDefault();
    const field = target as HTMLInputElement;
    recorded.push({
      type: event.type,
      path,
      key: (event as KeyboardEvent).key,
      code: (event as KeyboardEvent).code,
      value: 'value' in field && typeof field.value === 'string' ? field.value : undefined,
      checked: 'checked' in field && typeof field.checked === 'boolean' ? field.checked : undefined,
    });
  };

  for (const root of roots) for (const type of events) root.addEventListener(type, listener, { capture: true });

  return {
    replay(rendered) {
      for (const root of roots) for (const type of events) root.removeEventListener(type, listener, { capture: true });
      const elements = rendered.filter((node): node is Element => node.nodeType === 1);
      for (const entry of recorded) {
        const target = resolve(elements, entry.path);
        if (target) play(target, entry);
      }
      recorded.length = 0;
    },
  };
}

/** Root index, then element-child indices: text nodes may differ between the two renders. */
function pathOf(roots: readonly Element[], target: Element): number[] | null {
  const path: number[] = [];
  for (let at: Element | null = target; at; at = at.parentElement) {
    const root = roots.indexOf(at);
    if (root >= 0) return [root, ...path];
    const parent = at.parentElement;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.children, at));
  }
  return null;
}

function resolve(roots: readonly Element[], [root, ...path]: number[]): Element | null {
  let at: Element | null = roots[root!] ?? null;
  for (const index of path) at = at?.children[index] ?? null;
  return at;
}

function play(target: Element, entry: Recorded): void {
  // A field's state goes with its own events only: a replayed click on a checkbox toggles it.
  if (entry.type === 'input' || entry.type === 'change') {
    const field = target as HTMLInputElement;
    if (entry.value !== undefined && 'value' in field) field.value = entry.value;
    if (entry.checked !== undefined && 'checked' in field) field.checked = entry.checked;
  }
  const init = { bubbles: true, cancelable: true, composed: true };
  switch (entry.type) {
    case 'click':
    case 'dblclick':
      target.dispatchEvent(new MouseEvent(entry.type, init));
      return;
    case 'keydown':
    case 'keyup':
      target.dispatchEvent(new KeyboardEvent(entry.type, { ...init, key: entry.key, code: entry.code }));
      return;
    case 'focusin':
      (target as HTMLElement).focus?.();
      return;
    default:
      target.dispatchEvent(new Event(entry.type, init));
  }
}
