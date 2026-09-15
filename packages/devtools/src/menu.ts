/**
 * A labelled dropdown of toggles and actions.
 *
 * The graph toolbar had grown to nine bare glyphs. Every one carried a `title`, so the only
 * way to learn what `⇥` did was to hover it and wait, and a reader who was not the author had
 * no chance. This is the same shape as the kind filter, which already solved that for kinds:
 * a named button, and the detail behind it.
 */
export type MenuItem =
  | {
      type: 'toggle';
      label: string;
      /** Starting state. Read once. */
      on?: boolean;
      hint?: string;
      onChange: (on: boolean) => void;
    }
  | {
      type: 'action';
      label: string;
      hint?: string;
      onRun: () => void;
    };

export interface MenuOptions {
  /** What the button says when nothing is on. */
  label: string;
  items: readonly MenuItem[];
  /** The button's own tooltip. */
  hint?: string;
}

export interface Menu {
  /** Set a toggle from outside, by label, for a host restoring what was last used. */
  set(label: string, on: boolean): void;
  destroy(): void;
}

export function createMenu(host: HTMLElement, options: MenuOptions): Menu {
  const doc = host.ownerDocument;
  const root = doc.createElement('div');
  root.className = 'fx-menu';

  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'fx-menu-button fx-dropdown-btn';
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  if (options.hint) button.title = options.hint;

  const caret = doc.createElement('div');
  caret.className = 'fx-dropdown-caret';

  const panel = doc.createElement('div');
  panel.className = 'fx-menu-panel';
  panel.hidden = true;

  const boxes = new Map<string, HTMLInputElement>();

  for (const item of options.items) {
    if (item.type === 'action') {
      const run = doc.createElement('button');
      run.type = 'button';
      run.className = 'fx-menu-action';
      run.textContent = item.label;
      if (item.hint) run.title = item.hint;
      run.addEventListener('click', () => {
        close();
        item.onRun();
      });
      panel.append(run);
      continue;
    }
    const box = doc.createElement('input');
    box.type = 'checkbox';
    box.checked = item.on === true;
    const row = doc.createElement('label');
    if (item.hint) row.title = item.hint;
    row.append(box, doc.createTextNode(item.label));
    box.addEventListener('change', () => {
      paint();
      item.onChange(box.checked);
    });
    panel.append(row);
    boxes.set(item.label, box);
  }

  root.append(button, panel);
  host.append(root);

  /** The count is what makes a folded menu honest: something is on in here. */
  function paint(): void {
    let on = 0;
    for (const box of boxes.values()) if (box.checked) on++;
    button.textContent = on ? `${options.label} · ${on}` : options.label;
    // textContent clears it, so the caret goes back after every repaint.
    button.appendChild(caret);
    button.classList.toggle('on', on > 0);
  }

  function close(): void {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
  });
  // Clicks inside must not reach the document listener, which closes it.
  panel.addEventListener('click', (event) => event.stopPropagation());
  const away = (): void => close();
  const key = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') close();
  };
  doc.addEventListener('click', away);
  doc.addEventListener('keydown', key);

  paint();

  return {
    set(label, on) {
      const box = boxes.get(label);
      if (!box) return;
      box.checked = on;
      paint();
    },
    destroy() {
      doc.removeEventListener('click', away);
      doc.removeEventListener('keydown', key);
      root.remove();
    },
  };
}

export const MENU_CSS = `
/* The button itself is styled by DROPDOWN_FILTER_CSS, shared with the kind filter. */
.fx-menu { position: relative; display: inline-flex; }
.fx-menu-button { white-space: nowrap; position: relative; padding-inline-end: 1.1rem; }
/* hidden is display:none from the user agent, which a class setting display outranks. */
.fx-menu-panel[hidden] { display: none; }
.fx-menu-panel {
  position: absolute; top: calc(100% + 4px); right: 0; z-index: 40;
  display: grid; gap: 2px; padding: 6px 8px; min-width: 150px;
  background: var(--fx-panel, #14161c);
  border: 1px solid var(--fx-line, #262a35); border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .38);
}
.fx-menu-panel label {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--fx-muted, #8a90a2); cursor: pointer; user-select: none;
}
.fx-menu-panel label:hover { color: var(--fx-label, #e7e9ee); }
.fx-menu-panel input { width: 11px; height: 11px; margin: 0; accent-color: var(--fx-accent, #5eead4); }
.fx-menu-action {
  text-align: left; padding: 2px 0; border: 0; background: none; cursor: pointer;
  font: inherit; font-size: 11px; color: var(--fx-muted, #8a90a2);
  /* A button does not inherit this, so an action read lowercase beside uppercase toggles. */
  text-transform: inherit; letter-spacing: inherit;
}
.fx-menu-action:hover { color: var(--fx-accent, #5eead4); }
`;
