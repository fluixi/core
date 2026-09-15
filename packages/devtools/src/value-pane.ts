// A value, whole, across lines.
//
// A card has room for a dozen characters and an inspector line for a hundred, so a router
// context or a props object was only ever read as its first clause. This is the same text
// with nothing cut, in a card that moves and resizes like every other pane.
import { indentValue } from './format.js';
import { floatCard, type FloatCard } from './float.js';

export interface ValuePane {
  /** Replace whatever is showing. */
  open(title: string, text: string): void;
  close(): void;
  readonly isOpen: boolean;
  destroy(): void;
}

const escape = (text: string): string =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function createValuePane(host: HTMLElement): ValuePane {
  const doc = host.ownerDocument;
  let built: FloatCard | null = null;

  const close = (): void => {
    built?.remove();
    built = null;
  };

  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') close();
  };
  doc.addEventListener('keydown', onKey);

  return {
    open(title, text) {
      // Rebuilt rather than refilled, so a second value opens where the reader last put the
      // card rather than inheriting a size chosen for the first.
      close();
      built = floatCard(doc, title, { x: 80, y: 80, width: 420, height: 320 });
      const shut = doc.createElement('button');
      shut.type = 'button';
      shut.className = 'vp-close';
      shut.textContent = '✕';
      shut.title = 'Close';
      shut.addEventListener('click', close);
      built.bar.append(shut);

      const body = doc.createElement('pre');
      body.className = 'vp-body';
      body.innerHTML = escape(indentValue(text));
      built.card.append(body);
      doc.body.appendChild(built.card);
    },
    close,
    get isOpen() {
      return built !== null;
    },
    destroy() {
      doc.removeEventListener('keydown', onKey);
      close();
    },
  };
}

export const VALUE_PANE_CSS = `
.vp-close {
  margin-left: auto; background: none; border: 0; cursor: pointer;
  color: var(--fx-muted, #8a90a2); font-size: 12px; line-height: 1; padding: 2px 4px;
}
.vp-close:hover { color: var(--fx-label, #e7e9ee); }
.vp-body {
  flex: 1; margin: 0; padding: 8px; overflow: auto; white-space: pre;
  font-family: ui-monospace, monospace; font-size: 11.5px; line-height: 1.5;
  color: var(--fx-label, #e7e9ee);
}
`;
