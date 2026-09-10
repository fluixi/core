// The history, as something to read.
//
// Commits, not a flat log: one click makes a write, four runs and a disposal, interleaved with
// whatever the router was doing. Grouped, they read as "this is what that click did".
//
// Newest first, and re-rendered only when it would say something different — a panel that
// repaints on every poll cannot be scrolled or selected.
import { toCommits, type Commit, type GraphEvent } from './history.js';
import { changeRows, handleCopyClick, CHANGE_CSS } from './change-view.js';
import type { RNode } from './instrument.js';

export interface Timeline {
  /** Fold in what a snapshot carried. Events already seen are ignored, so polling is safe. */
  push(events: readonly GraphEvent[]): void;
  /** Stop taking new events, or start again. Paused, what is on screen holds still. */
  setPaused(paused: boolean): void;
  readonly paused: boolean;
  /** Draw. `graph` supplies the labels, which the events only carry ids for. */
  render(graph: Map<number, RNode>): void;
  /** Node ids in the selected commit, for a view to highlight. Empty when none is selected. */
  selected(): number[];
  clear(): void;
}

export interface TimelineOptions {
  /** What to say before anything has happened. */
  empty?: string;
  /** How many commits to keep. */
  limit?: number;
  /** A commit was selected, or deselected with null. */
  onSelect?(ids: number[], commit: Commit | null): void;
  /** A side panel can say six rows changed; it cannot show six before-and-after objects. */
  onExpand?(commit: Commit): void;
}

const escape = (text: string): string =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const clock = (t: number): string => {
  const d = new Date(t);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

/** The graph first, since a node can be renamed; then the name the event carried. */
export type NameOf = (event: GraphEvent) => string;

/** The name of what the commit started from: `count`, or what to say when there is none. */
function subject(commit: Commit, nameOf: NameOf): string {
  if (!commit.cause) return commit.commit === 0 ? 'first render' : 'continued';
  return nameOf(commit.cause);
}

/** `0 → 1`, when the write carried both sides of it. */
function change(commit: Commit): string {
  const cause = commit.cause;
  if (!cause || cause.from === undefined || cause.to === undefined) return '';
  return `${cause.from} → ${cause.to}`;
}

/** The whole of it, for the tooltip: the row elides, this does not. */
function detail(commit: Commit, nameOf: NameOf): string {
  const lines = [`${subject(commit, nameOf)} ${change(commit)}`.trim()];
  const named = (kind: GraphEvent['kind'], verb: string): void => {
    const ids = commit.events.filter((e) => e.kind === kind && e !== commit.cause).map(nameOf);
    if (ids.length) lines.push(`${verb}: ${[...new Set(ids)].join(', ')}`);
  };
  named('ran', 'ran');
  named('write', 'written');
  named('created', 'made');
  named('disposed', 'gone');
  return lines.join('\n');
}

/** "2 ran · 1 created" — what the commit caused, without listing every line of it. */
function summary(commit: Commit): string {
  const counts = { ran: 0, created: 0, disposed: 0, write: 0 };
  for (const event of commit.events) counts[event.kind]++;
  // The opening write is the title, so it is not also a thing the commit did.
  const writes = counts.write - (commit.cause ? 1 : 0);
  return [
    counts.ran && `${counts.ran} ran`,
    writes > 0 && `${writes} written`,
    counts.created && `${counts.created} made`,
    counts.disposed && `${counts.disposed} gone`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function createTimeline(host: HTMLElement, options: TimelineOptions = {}): Timeline {
  const empty = options.empty ?? 'nothing has happened yet';
  const limit = options.limit ?? 100;
  let events: GraphEvent[] = [];
  /** The highest seq folded in. Every producer counts up, so this is all dedupe needs. */
  let seen = -1;
  /** Selected, expanded and lit on the graph are one state: all three say "this one". */
  let selected: number | null = null;
  let filter = '';
  let signature = '';
  /**
   * Held still on request.
   *
   * A page that writes on every frame fills this faster than anyone can read it, and the
   * entry being looked at scrolls away. Dropped rather than buffered: catching up on a
   * thousand events nobody watched is not what the button is for.
   */
  let paused = false;

  // Built once: re-rendering the box being typed in would take the caret with it.
  host.innerHTML =
    '<div class="tl-head">' +
    '<input class="tl-filter" type="search" placeholder="filter by name or value" aria-label="Filter the timeline" />' +
    '<button type="button" class="tl-pause" title="Stop taking new updates, so the list holds still while you read it">❚❚</button>' +
    '</div>' +
    '<div class="tl-list"></div>';
  const input = host.querySelector('.tl-filter') as HTMLInputElement;
  const list = host.querySelector('.tl-list') as HTMLElement;
  const pause = host.querySelector('.tl-pause') as HTMLButtonElement;

  const all = (): Commit[] => toCommits(events).slice(-limit).reverse();

  const idsOf = (commit: Commit): number[] => {
    const ids = new Set<number>();
    for (const event of commit.events) {
      ids.add(event.id);
      if (event.by !== undefined) ids.add(event.by);
    }
    return [...ids];
  };

  /** Everything the row says, which is what a reader is searching against. */
  const haystack = (commit: Commit, nameOf: NameOf): string =>
    `${detail(commit, nameOf)} ${summary(commit)}`.toLowerCase();

  const shown = (nameOf: NameOf): Commit[] =>
    filter ? all().filter((c) => haystack(c, nameOf).includes(filter)) : all();

  input.addEventListener('input', () => {
    filter = input.value.trim().toLowerCase();
    signature = '';
  });

  const showPaused = (): void => {
    pause.textContent = paused ? '▶' : '❚❚';
    pause.classList.toggle('on', paused);
    pause.title = paused
      ? 'Taking updates again'
      : 'Stop taking new updates, so the list holds still while you read it';
  };
  pause.addEventListener('click', () => {
    paused = !paused;
    showPaused();
    signature = '';
  });

  list.addEventListener('click', (e) => {
    // Copying from an open row must not also shut it.
    if (handleCopyClick(e)) return;
    const row = (e.target as HTMLElement | null)?.closest?.('.tl-commit') as HTMLElement | null;
    if (!row) return;
    const number = Number(row.dataset.commit);

    // Inside the row, so it would otherwise shut what it was opening.
    if ((e.target as HTMLElement).classList.contains('tl-more')) {
      const full = all().find((c) => c.commit === number);
      if (full) options.onExpand?.(full);
      return;
    }

    // Clicking the open one shuts it — the only way back to watching everything.
    selected = selected === number ? null : number;
    const commit = all().find((c) => c.commit === selected) ?? null;
    options.onSelect?.(commit ? idsOf(commit) : [], commit);
    signature = '';
  });

  return {
    setPaused(next) {
      paused = next;
      showPaused();
      signature = '';
    },
    get paused() {
      return paused;
    },
    push(incoming) {
      if (paused) return;
      let added = false;
      for (const event of incoming) {
        if (event.seq <= seen) continue;
        events.push(event);
        seen = event.seq;
        added = true;
      }
      if (!added) return;
      // Bounded by commits: cutting mid-commit shows a click with half of what it caused.
      if (events.length > limit * 40) events = events.slice(-limit * 40);
    },
    render(graph) {
      const nameOf: NameOf = (e) => graph.get(e.id)?.label ?? e.label ?? `#${e.id}`;
      const rows = shown(nameOf);
      const next = `${seen}|${selected ?? ''}|${filter}|${rows.length}|${graph.size}`;
      if (next === signature) return;
      signature = next;

      if (!rows.length) {
        // With a filter typed, "nothing has happened" would read as recording being broken.
        list.innerHTML = `<span class="tl-empty">${escape(filter ? 'nothing matches' : empty)}</span>`;
        return;
      }

      list.innerHTML = rows
        .map((commit) => {
          const open = commit.commit === selected;
          const did = summary(commit);
          const moved = change(commit);
          const parts = [
            ['ran', 'ran'],
            ['write', 'written'],
            ['created', 'made'],
            ['disposed', 'gone'],
          ] as const;
          const body = parts
            .map(([kind, verb]) => {
              const names = [
                ...new Set(
                  commit.events.filter((e) => e.kind === kind && e !== commit.cause).map(nameOf),
                ),
              ];
              return names.length
                ? `<div class="tl-part"><span class="tl-verb">${verb}</span> ${escape(names.join(', '))}</div>`
                : '';
            })
            .join('');

          return (
            `<div class="tl-commit${open ? ' selected' : ''}"` +
            ` data-commit="${commit.commit}" title="${escape(detail(commit, nameOf))}">` +
            '<div class="tl-line">' +
            `<span class="tl-caret">${open ? '▾' : '▸'}</span>` +
            `<span class="tl-time">${clock(commit.t)}</span>` +
            `<span class="tl-name">${escape(subject(commit, nameOf))}</span>` +
            (did ? `<span class="tl-did">${escape(did)}</span>` : '') +
            '</div>' +
            // Open, the value gets the width and wraps.
            (open
              ? `<div class="tl-body">${
                  moved ? `<div class="tl-change">${escape(moved)}</div>` : ''
                }${changeRows(commit.cause?.change, 6)}${body}${
                  // Only worth offering when there is more than the row can hold.
                  options.onExpand && (commit.cause?.change || commit.events.length > 6)
                    ? '<button type="button" class="tl-more">open in full</button>'
                    : ''
                }</div>`
              : '') +
            '</div>'
          );
        })
        .join('');
    },
    selected() {
      const commit = all().find((c) => c.commit === selected);
      return commit ? idsOf(commit) : [];
    },
    clear() {
      events = [];
      seen = -1;
      selected = null;
      signature = '';
      // The filter box stays: a new run is usually a rerun of what they were narrowing to.
      list.innerHTML = `<span class="tl-empty">${escape(empty)}</span>`;
    },
  };
}

/** Default styling for what createTimeline writes, in the shape DEVTOOLS_CSS is used. */
export const TIMELINE_CSS = `
.tl-head { display: flex; gap: 4px; margin-bottom: 6px; }
.tl-pause {
  flex: none; width: 26px; cursor: pointer; font: inherit; font-size: 10px;
  border: 1px solid var(--fx-line, #ffffff1f); border-radius: 4px;
  background: transparent; color: var(--fx-muted, #8a90a2);
}
.tl-pause:hover { color: var(--fx-label, #e7e9ee); }
.tl-pause.on { color: var(--fx-accent, #5eead4); border-color: var(--fx-accent, #5eead4); }
.tl-filter {
  flex: 1; min-width: 0; box-sizing: border-box; padding: 3px 6px;
  font: inherit; font-size: 11.5px; border-radius: 4px;
  border: 1px solid var(--fx-line, #ffffff1f);
  background: var(--fx-input, transparent); color: var(--fx-label, #e7e9ee);
}
.tl-empty { color: var(--fx-muted, #8a90a2); font-size: 12px; }
.tl-commit { padding: 4px 6px; border-radius: 4px; cursor: pointer; font-size: 11.5px; }
.tl-commit:hover { background: var(--fx-hover, #ffffff10); }
.tl-commit.selected { background: var(--fx-selected, #ffffff1a); }
.tl-line { display: flex; align-items: baseline; gap: 6px; }
.tl-caret { color: var(--fx-muted, #8a90a2); font-size: 9px; flex: none; }
.tl-time { font-family: ui-monospace, monospace; font-size: 10px; color: var(--fx-muted, #8a90a2); flex: none; }
.tl-name { color: var(--fx-label, #e7e9ee); font-family: ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-did { margin-left: auto; color: var(--fx-muted, #8a90a2); flex: none; }
.tl-body { margin: 3px 0 2px 15px; }
/* Wraps: an open entry exists to show the whole value. */
.tl-change {
  font-family: ui-monospace, monospace; font-size: 11px;
  color: var(--fx-accent, #5eead4); overflow-wrap: anywhere; white-space: pre-wrap;
}
.tl-part { margin-top: 2px; color: var(--fx-label, #e7e9ee); font-size: 11px; overflow-wrap: anywhere; }
.tl-verb { color: var(--fx-muted, #8a90a2); }
.tl-more {
  margin-top: 5px; padding: 2px 8px; font: inherit; font-size: 10.5px; cursor: pointer;
  border: 1px solid var(--fx-line, #ffffff1f); border-radius: 4px;
  background: transparent; color: var(--fx-muted, #8a90a2);
}
.tl-more:hover { color: var(--fx-label, #e7e9ee); }
${CHANGE_CSS}`;
