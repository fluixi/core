/**
 * Picks which kinds of node the graph draws.
 *
 * Nine checkboxes took up too much of the toolbar, so they sit in a dropdown. The button
 * shows the count while a filter is active.
 *
 * Not a `<select multiple>`: it renders as a list box, takes the full height, and needs
 * ctrl-click to select more than one.
 */
import type { NodeKind } from './instrument.js';

/** Every kind a graph can hold, in the order they are offered. */
export const FILTERABLE_KINDS: readonly NodeKind[] = [
  'state', 'memo', 'effect', 'store', 'resource', 'component', 'control', 'router', 'handler',
];

/** Only `handler` needs renaming; the other kinds read fine as they are. */
const LABEL: Partial<Record<NodeKind, string>> = { handler: 'route' };

export interface KindFilterOptions {
  /** Offered, in this order. Defaults to every kind a graph can hold. */
  kinds?: readonly NodeKind[];
  /**
   * Called when the selection changes. Null means every kind is on — passing a set of all
   * nine instead would hide any kind that has no checkbox here.
   */
  onChange: (kinds: NodeKind[] | null) => void;
  /** What the button says. @default 'Kinds' */
  label?: string;
}

export interface KindFilter {
  /** The kinds currently on. */
  readonly selected: readonly NodeKind[];
  /** Set from outside, e.g. a host restoring the last used selection. */
  select(kinds: Iterable<NodeKind> | null): void;
  destroy(): void;
}

/**
 * Builds the control inside `host`. Call `destroy` to remove it — it holds a document
 * listener for closing the panel on an outside click.
 */
export function createKindFilter(host: HTMLElement, options: KindFilterOptions): KindFilter {
  const doc = host.ownerDocument;
  const kinds = options.kinds ?? FILTERABLE_KINDS;
  const on = new Set<NodeKind>(kinds);

  const root = doc.createElement('div');
  root.className = 'fx-kinds';

  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'fx-kinds-button';
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  button.title = 'Choose which kinds of node the graph draws';

  const panel = doc.createElement('div');
  panel.className = 'fx-kinds-panel';
  panel.hidden = true;

  const all = doc.createElement('input');
  all.type = 'checkbox';
  const allRow = doc.createElement('label');
  allRow.className = 'fx-kinds-all';
  allRow.append(all, doc.createTextNode('all'));

  const boxes = new Map<NodeKind, HTMLInputElement>();
  for (const kind of kinds) {
    const box = doc.createElement('input');
    box.type = 'checkbox';
    box.checked = true;
    const row = doc.createElement('label');
    row.append(box, doc.createTextNode(LABEL[kind] ?? kind));
    panel.append(row);
    boxes.set(kind, box);
  }
  panel.prepend(allRow);
  root.append(button, panel);
  host.append(root);

  const everything = (): boolean => on.size === kinds.length;
  // Read back in the order they are offered: a Set re-orders as entries come and go.
  const chosen = (): NodeKind[] => kinds.filter((kind) => on.has(kind));

  function paint(): void {
    const name = options.label ?? 'Kinds';
    button.textContent = everything() ? name : `${name} · ${on.size}`;
    button.classList.toggle('on', !everything());
    all.checked = everything();
    // Partly selected: show the box as indeterminate rather than guessing a state.
    all.indeterminate = on.size > 0 && !everything();
    for (const [kind, box] of boxes) box.checked = on.has(kind);
  }

  function report(): void {
    options.onChange(everything() ? null : chosen());
  }

  for (const [kind, box] of boxes) {
    box.addEventListener('change', () => {
      if (box.checked) on.add(kind);
      else on.delete(kind);
      paint();
      report();
    });
  }

  all.addEventListener('change', () => {
    // Unticking would select nothing, leaving an empty graph with no obvious way back,
    // so either direction turns everything on.
    for (const kind of kinds) on.add(kind);
    paint();
    report();
  });

  const close = (): void => {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
  });
  // Stop clicks inside the panel reaching the document listener, which would close it.
  panel.addEventListener('click', (event) => event.stopPropagation());
  const away = (): void => close();
  const key = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') close();
  };
  doc.addEventListener('click', away);
  doc.addEventListener('keydown', key);

  paint();

  return {
    get selected() {
      return chosen();
    },
    select(next) {
      on.clear();
      for (const kind of next ?? kinds) on.add(kind);
      paint();
    },
    destroy() {
      doc.removeEventListener('click', away);
      doc.removeEventListener('keydown', key);
      root.remove();
    },
  };
}

export const KIND_FILTER_CSS = `
.fx-kinds { position: relative; display: inline-flex; }
.fx-kinds-button { white-space: nowrap; }
.fx-kinds-panel {
  position: absolute; top: calc(100% + 4px); right: 0; z-index: 40;
  display: grid; gap: 2px; padding: 6px 8px; min-width: 132px;
  background: var(--fx-panel, #14161c);
  border: 1px solid var(--fx-line, #262a35); border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .38);
}
.fx-kinds-panel label {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--fx-muted, #8a90a2); cursor: pointer; user-select: none;
}
.fx-kinds-panel label:hover { color: var(--fx-label, #e7e9ee); }
.fx-kinds-panel input { width: 11px; height: 11px; margin: 0; accent-color: var(--fx-accent, #5eead4); }
.fx-kinds-all {
  padding-bottom: 4px; margin-bottom: 2px;
  border-bottom: 1px solid var(--fx-line, #262a35);
  color: var(--fx-label, #e7e9ee) !important;
}
`;
