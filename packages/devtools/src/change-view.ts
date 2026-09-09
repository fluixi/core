// A diff, drawn. Shared between the timeline's open row and the panel that opens from it —
// same rows, cut to a handful in the sidebar and shown in full when there is room.
//
// An object is drawn as an object: `{id: 1, text: "go"}` on one line is what the cards
// already say.

import type { ValueChange } from './diff.js';

const escape = (text: string): string =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const SIGN: Record<string, string> = { added: '+', removed: '−', changed: '~' };

/** Indented JSON, or nothing when the value was not JSON to begin with. */
function pretty(json: string | undefined): string | undefined {
  if (!json) return undefined;
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    // It came from JSON.stringify, so this should not happen — but a malformed payload is
    // not worth losing the row over.
    return undefined;
  }
}

/** Structured values get a block with a copy button; a number on three lines is worse. */
function sideOf(text: string | undefined, json: string | undefined, cls: string): string {
  const block = pretty(json);
  if (!block) return `<span class="ch-${cls}">${escape(text ?? '')}</span>`;
  return (
    `<div class="ch-block ch-${cls}">` +
    `<button type="button" class="ch-copy" title="Copy" data-copy="${escape(block)}">copy</button>` +
    `<pre class="ch-json">${escape(block)}</pre>` +
    '</div>'
  );
}

/** Empty when there is nothing structural: a plain value is already on the row above. */
export function changeRows(change: ValueChange | undefined, limit = Infinity): string {
  if (!change?.entries?.length) return '';
  const shown = change.entries.slice(0, limit);
  const hidden = change.entries.length - shown.length + (change.more ?? 0);

  const rows = shown
    .map((entry) => {
      const from = sideOf(entry.from, entry.fromJson, 'from');
      const to = sideOf(entry.to, entry.toJson, 'to');
      const sides =
        entry.op === 'changed'
          ? `${from}<span class="ch-arrow">→</span>${to}`
          : entry.op === 'added'
            ? to
            : from;
      // A block stacks; two inline values stay on the line.
      const stacked = (entry.fromJson || entry.toJson) ? ' ch-stacked' : '';
      return (
        `<div class="ch-row ch-${entry.op}${stacked}">` +
        `<span class="ch-sign">${SIGN[entry.op] ?? '·'}</span>` +
        `<span class="ch-key">${escape(entry.key)}</span>` +
        `<span class="ch-sides">${sides}</span>` +
        '</div>'
      );
    })
    .join('');

  // Only when it moved: an in-place replacement is not a list that grew.
  const size = change.length
    ? `<div class="ch-size">${change.length.from} → ${change.length.to} items</div>`
    : '';

  return `<div class="ch-list">${size}${rows}${
    hidden > 0 ? `<div class="ch-more">and ${hidden} more</div>` : ''
  }</div>`;
}

/**
 * Delegated: the rows are rebuilt on every render and per-button listeners would go with them.
 * True when the click was a copy, so a host does not also treat it as a click on the row.
 */
export function handleCopyClick(event: Event): boolean {
  const button = (event.target as HTMLElement | null)?.closest?.('.ch-copy') as HTMLElement | null;
  if (!button) return false;
  const text = button.dataset.copy ?? '';

  const done = (): void => {
    // On the button itself: a toast needs somewhere to live.
    const was = button.textContent;
    button.textContent = 'copied';
    setTimeout(() => {
      button.textContent = was;
    }, 1200);
  };

  const clipboard = (globalThis as { navigator?: { clipboard?: { writeText(t: string): Promise<void> } } })
    .navigator?.clipboard;
  if (clipboard?.writeText) {
    void clipboard.writeText(text).then(done, fallback);
  } else {
    fallback();
  }

  function fallback(): void {
    // A webview without clipboard permission, or an insecure origin.
    try {
      const doc = button!.ownerDocument;
      const area = doc.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      doc.body.appendChild(area);
      area.select();
      doc.execCommand('copy');
      area.remove();
      done();
    } catch {
      // Nothing left to try; the text is on screen to select by hand.
    }
  }

  return true;
}

export const CHANGE_CSS = `
.ch-list { margin-top: 4px; font-family: ui-monospace, monospace; font-size: 11px; }
.ch-size { color: var(--fx-muted, #8a90a2); margin-bottom: 2px; }
.ch-row { display: flex; gap: 6px; align-items: baseline; padding: 1px 0; }
.ch-row.ch-stacked { align-items: flex-start; padding: 3px 0; }
.ch-sign { flex: none; width: 9px; text-align: center; }
.ch-added .ch-sign { color: var(--state, #34d399); }
.ch-removed .ch-sign { color: var(--fx-write, #fb7185); }
.ch-changed .ch-sign { color: var(--effect, #fbbf24); }
.ch-key { flex: none; color: var(--fx-muted, #8a90a2); }
.ch-sides { min-width: 0; flex: 1; overflow-wrap: anywhere; }
.ch-stacked .ch-sides { display: flex; flex-direction: column; gap: 2px; }
.ch-from { color: var(--fx-muted, #8a90a2); }
.ch-row:not(.ch-stacked) .ch-from { text-decoration: line-through; }
.ch-arrow { color: var(--fx-muted, #8a90a2); margin: 0 4px; }
.ch-to { color: var(--fx-label, #e7e9ee); }
.ch-more { color: var(--fx-muted, #8a90a2); margin-top: 2px; }
/* In the corner: an object can be tall, and a button under it is a scroll away. */
.ch-block { position: relative; border-radius: 4px; border: 1px solid var(--fx-line, #ffffff14); }
.ch-block.ch-from { opacity: .72; }
.ch-json { margin: 0; padding: 5px 7px; overflow-x: auto; white-space: pre; font: inherit; }
.ch-copy {
  position: absolute; top: 3px; right: 3px; padding: 1px 6px; cursor: pointer;
  font: inherit; font-size: 9.5px; opacity: 0; transition: opacity .12s;
  border: 1px solid var(--fx-line, #ffffff26); border-radius: 3px;
  background: var(--fx-panel, #14161c); color: var(--fx-muted, #8a90a2);
}
.ch-block:hover .ch-copy, .ch-copy:focus { opacity: 1; }
.ch-copy:hover { color: var(--fx-label, #e7e9ee); }
`;
