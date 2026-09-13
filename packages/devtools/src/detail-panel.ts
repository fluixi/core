// One commit, with room to read it.
//
// A column beside the graph is the wrong shape for six before-and-after objects, so the full
// view floats over the page, moved and resized by whoever is reading it.
//
// It does not block: the graph keeps updating behind it and stays clickable.

import { changeRows, handleCopyClick, CHANGE_CSS } from './change-view.js';
import type { Commit, GraphEvent } from './history.js';
import type { RNode } from './instrument.js';

export interface DetailPanel {
  /** Show a commit. Opening a second one replaces the first rather than stacking. */
  open(commit: Commit, graph: Map<number, RNode>): void;
  close(): void;
  readonly isOpen: boolean;
  /** Remove the panel and its listeners. */
  destroy(): void;
}

export interface DetailPanelOptions {
  /** A node in the panel was clicked — the host can select it on the graph. */
  onPick?(id: number): void;
}

const escape = (text: string): string =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const clock = (t: number): string => {
  const d = new Date(t);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

const VERBS: Record<GraphEvent['kind'], string> = {
  write: 'written',
  ran: 'ran',
  created: 'made',
  disposed: 'gone',
};

/** So it cannot be resized into a sliver. */
const MIN_W = 320;
const MIN_H = 200;

/**
 * Pointer capture, for the reason the splitters need it: without it the events stop arriving
 * when the pointer crosses the graph or an iframe, the release is never seen, and the panel
 * keeps following the mouse.
 */
function draggable(handle: HTMLElement, onMove: (dx: number, dy: number) => void): void {
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    // Capturing here retargets the following click onto the bar, so the button never hears
    // it. That is why the close button did nothing.
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    event.stopPropagation();
    handle.setPointerCapture(event.pointerId);
    let lastX = event.clientX;
    let lastY = event.clientY;

    const move = (e: PointerEvent): void => {
      onMove(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const stop = (): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
      handle.removeEventListener('lostpointercapture', stop);
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };

    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
    handle.addEventListener('lostpointercapture', stop);
  });
}

export function createDetailPanel(host: HTMLElement, options: DetailPanelOptions = {}): DetailPanel {
  const panel = host.ownerDocument.createElement('div');
  panel.className = 'dp-panel';
  panel.hidden = true;
  panel.innerHTML =
    '<div class="dp-bar"><span class="dp-title"></span>' +
    '<button type="button" class="dp-close" title="Close" aria-label="Close">✕</button></div>' +
    '<div class="dp-body"></div>' +
    '<div class="dp-grip" title="Drag to resize"></div>';
  host.appendChild(panel);

  const title = panel.querySelector('.dp-title') as HTMLElement;
  const body = panel.querySelector('.dp-body') as HTMLElement;
  const bar = panel.querySelector('.dp-bar') as HTMLElement;
  const grip = panel.querySelector('.dp-grip') as HTMLElement;

  let x = 0;
  let y = 0;
  let width = 520;
  let height = 380;
  let open = false;

  const place = (): void => {
    panel.style.left = `${Math.round(x)}px`;
    panel.style.top = `${Math.round(y)}px`;
    panel.style.width = `${Math.round(width)}px`;
    panel.style.height = `${Math.round(height)}px`;
  };

  draggable(bar, (dx, dy) => {
    // Clamped, or a panel dragged off the top has no bar left to drag back by.
    const view = panel.ownerDocument.defaultView;
    x = Math.max(0, Math.min((view?.innerWidth ?? width) - 60, x + dx));
    y = Math.max(0, Math.min((view?.innerHeight ?? height) - 30, y + dy));
    place();
  });

  draggable(grip, (dx, dy) => {
    width = Math.max(MIN_W, width + dx);
    height = Math.max(MIN_H, height + dy);
    place();
  });

  panel.querySelector('.dp-close')?.addEventListener('click', () => close());

  body.addEventListener('click', (e) => {
    // Copy first: the button sits inside a row.
    if (handleCopyClick(e)) return;
    const row = (e.target as HTMLElement).closest('.dp-node') as HTMLElement | null;
    if (row?.dataset.id) options.onPick?.(Number(row.dataset.id));
  });

  function close(): void {
    open = false;
    panel.hidden = true;
  }

  return {
    open(commit, graph) {
      const nameOf = (e: GraphEvent): string => graph.get(e.id)?.label ?? e.label ?? `#${e.id}`;
      const cause = commit.cause;

      title.textContent = cause
        ? `${nameOf(cause)} · ${clock(commit.t)}`
        : `${commit.commit === 0 ? 'first render' : `commit ${commit.commit}`} · ${clock(commit.t)}`;

      const headline =
        cause && cause.from !== undefined && cause.to !== undefined
          ? `<div class="dp-change"><span class="ch-from">${escape(cause.from)}</span>` +
            `<span class="ch-arrow">→</span><span class="ch-to">${escape(cause.to)}</span></div>`
          : '';

      // Every event: this view exists because the row could not hold them all.
      const groups = (['write', 'ran', 'created', 'disposed'] as const)
        .map((kind) => {
          const rows = commit.events.filter((e) => e.kind === kind && e !== cause);
          if (!rows.length) return '';
          const seen = new Map<number, { name: string; count: number }>();
          for (const event of rows) {
            const found = seen.get(event.id);
            if (found) found.count++;
            else seen.set(event.id, { name: nameOf(event), count: 1 });
          }
          const items = [...seen]
            .map(
              ([id, { name, count }]) =>
                `<button type="button" class="dp-node" data-id="${id}">${escape(name)}${
                  count > 1 ? ` ×${count}` : ''
                }</button>`,
            )
            .join('');
          return `<div class="dp-group"><div class="dp-verb">${VERBS[kind]}</div><div class="dp-nodes">${items}</div></div>`;
        })
        .join('');

      // Where the value reaches the page — the last step of the chain.
      const node = cause ? graph.get(cause.id) : undefined;
      // Both: a template's holes can share one original position, and then only the compiled
      // line tells them apart.
      const where = (t: { source?: { file?: string; line?: number; compiled?: { line?: number } } }): string => {
        if (!t.source) return '';
        const file = (t.source.file ?? '').split('/').pop() ?? '';
        const out = t.source.compiled;
        const tail = out && out.line !== t.source.line ? ` · out ${out.line}` : '';
        return ` — ${file}:${t.source.line ?? ''}${tail}`;
      };
      const targets = node?.targets?.length
        ? `<div class="dp-group"><div class="dp-verb">updates</div><div class="dp-targets">${node.targets
            .map(
              (t) =>
                `<div>${escape(t.name ? `${t.name} of ${t.element}` : t.element)}` +
                `<span class="dp-where">${escape(where(t))}</span></div>`,
            )
            .join('')}</div></div>`
        : '';

      body.innerHTML = headline + changeRows(cause?.change) + groups + targets;

      if (!open) {
        // Once per opening: jumping back to the middle on every entry would be unusable.
        const view = panel.ownerDocument.defaultView;
        x = Math.max(12, ((view?.innerWidth ?? 900) - width) / 2);
        y = Math.max(12, ((view?.innerHeight ?? 600) - height) / 3);
        place();
      }
      open = true;
      panel.hidden = false;
    },
    close,
    get isOpen() {
      return open;
    },
    destroy() {
      panel.remove();
    },
  };
}

export const DETAIL_PANEL_CSS = `
.dp-panel {
  position: fixed; z-index: 40; display: flex; flex-direction: column;
  border: 1px solid var(--fx-line, #ffffff26); border-radius: 8px;
  background: var(--fx-panel, #14161c); color: var(--fx-label, #e7e9ee);
  box-shadow: 0 12px 40px rgba(0, 0, 0, .45); overflow: hidden;
}
.dp-panel[hidden] { display: none; }
.dp-bar {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 12px;
  cursor: move; user-select: none;
  border-bottom: 1px solid var(--fx-line, #ffffff1f);
}
.dp-title { font-family: ui-monospace, monospace; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dp-close {
  margin-left: auto; width: 22px; height: 20px; padding: 0; cursor: pointer; font: inherit; font-size: 11px;
  border: 1px solid var(--fx-line, #ffffff1f); border-radius: 4px;
  background: transparent; color: var(--fx-muted, #8a90a2);
}
.dp-close:hover { color: var(--fx-label, #e7e9ee); }
.dp-body { flex: 1; min-height: 0; overflow: auto; padding: 10px 12px; }
.dp-change { font-family: ui-monospace, monospace; font-size: 12px; overflow-wrap: anywhere; }
.dp-group { margin-top: 10px; }
.dp-verb { font-size: 10.5px; text-transform: uppercase; letter-spacing: 1px; color: var(--fx-muted, #8a90a2); }
.dp-nodes { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.dp-node {
  padding: 2px 7px; cursor: pointer; font: inherit; font-family: ui-monospace, monospace; font-size: 11px;
  border: 1px solid var(--fx-line, #ffffff1f); border-radius: 999px;
  background: transparent; color: var(--fx-label, #e7e9ee);
}
.dp-node:hover { border-color: var(--fx-accent, #5eead4); }
.dp-targets { margin-top: 4px; font-family: ui-monospace, monospace; font-size: 11px; color: var(--fx-label, #e7e9ee); }
.dp-where { color: var(--fx-muted, #8a90a2); }
/* Bottom-right, where every desktop puts it. */
.dp-grip {
  position: absolute; right: 0; bottom: 0; width: 16px; height: 16px; cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, var(--fx-line, #ffffff40) 50%);
}
${CHANGE_CSS}`;
