// What one node is, in words.
//
// The graph draws a node in the space of a card: a name, a kind, a clipped value, a file and
// a line. Everything else about it: the version, the run count, what it reads, what reads
// it, where it was declared as against where it was used, needs room, and every host that
// draws the graph wants the same answer. So it lives here rather than in each of them.
//
// Rendered as html into an element the host owns, and re-rendered only when what it says
// would change: a panel repainting on every frame makes text impossible to select.
import { nodeState, nodeVersion, type RNode } from './instrument.js';
import { formatValue } from './format.js';
import type { ReactiveSourceLocation } from './source.js';
import { shortenPath } from './path.js';
import type { DomNode } from './dom.js';
import { pluginRows, pluginElementRows } from './plugin.js';
import { kindRules } from './palette.js';
import { createValuePane, VALUE_PANE_CSS, type ValuePane } from './value-pane.js';

export interface Inspector {
  /** Draw the node with this id, or the empty state when it is undefined. */
  show(graph: Map<number, RNode>, id: number | null | undefined): void;
  /**
   * Draw an element instead of a node.
   *
   * An element is not in the graph: nothing computes it, but it is the part of the page a
   * reader recognises, and the graph knows which tag rendered it and which values write into
   * it. Those, and the line each binding was written on, are what there is to say.
   */
  showElement(graph: Map<number, RNode>, pick: ElementInspection | null | undefined): void;
  clear(): void;
}

/** An element to inspect. The shape `createComponentTree` hands to its `onPick`. */
export interface ElementInspection {
  key: string;
  label: string;
  owner?: number;
  writes?: number[];
  /** What plugins attached to this element. */
  extra?: Record<string, unknown>;
  /** Where the element itself was written, when the build recorded it. */
  at?: ReactiveSourceLocation;
}

export interface InspectorOptions {
  /** What to say when nothing is selected. */
  empty?: string;
  /** How much of a value to show. */
  limit?: number;
  /**
   * Clicking a location. Omitted leaves them as plain text, which is what a host with
   * nowhere to open a file wants.
   */
  onReveal?: (location: ReactiveSourceLocation) => void;
  /**
   * The project a path is shown relative to. Without it, a path is shortened to the package
   * it names, which is as much as a graph can work out on its own.
   */
  root?: string;
  /**
   * Write a value from the panel. Given the text as typed: the host parses it, since what
   * counts as a value is the application's business, and returns whether it took.
   *
   * Omitted leaves values read-only, which is what a panel reading a snapshot over a wire
   * wants: there is nothing on the other end to write to.
   */
  onEdit?: (id: number, raw: string) => boolean;
  /**
   * Start with framework locations shown. Off by default: for someone writing an
   * application, where the framework instantiated a component is noise. For someone working
   * on the framework it is the whole point, so it is a toggle rather than a rule.
   */
  internals?: boolean;
}

const escape = (text: string): string =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const clip = (text: string, n = 140): string => (text.length > n ? `${text.slice(0, n - 1)}…` : text);

/**
 * A location the host can open, carrying enough to find it again on the click.
 *
 * The position travels in the markup rather than in a closure because the panel is written
 * as a string of html and replaced wholesale on each change.
 */
const place = (text: string, source: ReactiveSourceLocation | undefined, live: boolean): string => {
  if (!source || !live || !source.file) return escape(text);
  return (
    `<button type="button" class="ins-at" data-file="${escape(source.file)}"` +
    ` data-line="${source.line ?? ''}" data-column="${source.column ?? ''}"` +
    ` title="Open ${escape(source.file)}">${escape(text)}</button>`
  );
};

const at = (source?: ReactiveSourceLocation, root?: string): string =>
  source ? `${source.file ? shortenPath(source.file, root) : ''}:${source.line ?? ''}:${source.column ?? ''}` : '';

/**
 * The location, and where it is in the compiled file when the two differ.
 *
 * A template's holes all map back to the line the template opens at, so the original position
 * names the component and nothing finer. The compiled one is what separates this binding from
 * the three beside it.
 */
const bothAt = (source?: ReactiveSourceLocation, root?: string): string => {
  if (!source) return '';
  const out = source.compiled;
  const same = out?.line === source.line && out?.column === source.column;
  return out && !same
    ? `${at(source, root)} · out ${out.line ?? ''}:${out.column ?? ''}`
    : at(source, root);
};

/**
 * The line worth opening for a tag.
 *
 * A component the framework instantiated: a lazy route, a layout the router mounted, was
 * created inside the framework, so `source` is a line in a package. `declaredAt` is where it
 * was actually written. Only one line is shown for an element, so it had better be that one.
 */
function authoredPlace(node: RNode): ReactiveSourceLocation | undefined {
  for (const place of [node.source, node.declaredAt, node.usedAt]) {
    if (place && !place.external) return place;
  }
  return node.declaredAt ?? node.source ?? node.usedAt;
}

/**
 * The tags this value writes inside, and how many times each.
 *
 * A signal handed to a component through a prop is read by the render effect that binds it,
 * which is machinery the graph does not draw: so there is no edge from the signal to the
 * component, and a card for it looks connected only to whatever declared it. The
 * descriptions already say it exactly: each element records the values writing into it, and
 * it sits in the tree of the tag that rendered it.
 */
function reaches(graph: Map<number, RNode>, id: number): string[] {
  const count = new Map<string, number>();
  const writesHere = (nodes: readonly DomNode[]): boolean =>
    nodes.some((n) => n.writes?.includes(id) || writesHere(n.children));
  for (const node of graph.values()) {
    if (node.id === id || !node.dom?.length) continue;
    if (writesHere(node.dom)) count.set(node.label, (count.get(node.label) ?? 0) + 1);
  }
  return [...count].map(([label, n]) => (n > 1 ? `${label} ×${n}` : label));
}

/** The live value when the node can be read, the last one it reported otherwise. */
function valueOf(node: RNode, limit: number): string {
  if (node.read) {
    try {
      return formatValue(node.read(), limit);
    } catch {
      // A reader that throws is still a node worth inspecting.
    }
  }
  return node.detail ?? node.value ?? '';
}

export function createInspector(host: HTMLElement, options: InspectorOptions = {}): Inspector {
  const empty = options.empty ?? 'click a node to inspect';
  const limit = options.limit ?? 600;
  const reveals = typeof options.onReveal === 'function';
  const root = options.root;
  const edits = typeof options.onEdit === 'function';
  /** While the reader is typing, nothing redraws: the input would go with it. */
  let editing: number | null = null;
  let field: HTMLInputElement | null = null;
  let internals = options.internals === true;
  /** Built on first use: most sessions never open one. */
  let pane: ValuePane | null = null;

  const doc = host.ownerDocument;
  // Anything cut to fit carries the whole of it, and opens a pane rather than a tooltip.
  host.addEventListener('click', (event) => {
    const cell = (event.target as HTMLElement | null)?.closest?.('[data-full]') as HTMLElement | null;
    if (!cell) return;
    pane ??= createValuePane(host);
    pane.open(cell.dataset.label || 'value', cell.dataset.full || '');
  });
  // Kept out of the redrawn markup: the panel replaces its content wholesale, and a control
  // inside it would be rebuilt under the pointer every time something changed.
  const header = doc.createElement('div');
  header.className = 'ins-header';
  const bar = doc.createElement('label');
  bar.className = 'ins-bar';
  const box = doc.createElement('input');
  box.type = 'checkbox';
  box.checked = internals;
  bar.append(box, doc.createTextNode('framework'));
  bar.title = 'Also show where the framework created this, not only where it was written';
  const body = doc.createElement('div');
  body.className = 'ins-body';
  header.appendChild(bar);
  host.replaceChildren(header, body);
  box.addEventListener('change', () => {
    internals = box.checked;
    signature = '';
  });

  if (edits) {
    host.addEventListener('click', (event) => {
      const cell = (event.target as HTMLElement | null)?.closest?.('.ins-edit') as HTMLElement | null;
      if (!cell || editing !== null) return;
      const id = Number(cell.dataset.id);
      editing = id;
      const input = host.ownerDocument.createElement('input');
      field = input;
      input.className = 'ins-input';
      input.value = cell.dataset.raw ?? '';
      cell.replaceWith(input);
      input.focus();
      input.select();

      const done = (commit: boolean): void => {
        if (editing === null) return;
        editing = null;
        field = null;
        // Whatever it was is redrawn from the graph on the next frame.
        signature = '';
        if (commit) options.onEdit!(id, input.value);
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') done(true);
        else if (e.key === 'Escape') done(false);
      });
      input.addEventListener('blur', () => done(true));
    });
  }

  if (reveals) {
    host.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement | null)?.closest?.('.ins-at') as HTMLElement | null;
      if (!button) return;
      const line = Number(button.dataset.line);
      const column = Number(button.dataset.column);
      options.onReveal!({
        file: button.dataset.file,
        ...(Number.isFinite(line) && button.dataset.line ? { line } : {}),
        ...(Number.isFinite(column) && button.dataset.column ? { column } : {}),
      });
    });
  }
  let signature = '';

  return {
    show(graph, id) {
      const node = id == null ? undefined : graph.get(id);
      if (!node) {
        if (signature === 'empty') return;
        signature = 'empty';
        body.innerHTML = `<span class="ins-empty">${escape(empty)}</span>`;
        return;
      }

      const labelOf = (other: number) => graph.get(other)?.label ?? '?';
      const reads = [...node.deps].map(labelOf);
      // Binding cards are left out: `bound` below lists the same places, and says where
      // each one is. With both, every binding was named twice on the one line.
      const feeds = [...graph.values()]
        .filter((n) => n.deps.has(node.id) && n.kind !== 'binding')
        .map((n) => n.label);
      const writes = [...node.writes].map(labelOf);
      const value = valueOf(node, limit);
      const state = nodeState(node);
      // A card the view invented, not a node: version and run count are the signal's, and
      // repeating them here would read as facts about a thing that does not compute.
      const synthetic = node.kind === 'binding' || node.kind === 'setter' || node.kind === 'group';

      const owner = node.createdIn !== undefined ? graph.get(node.createdIn)?.label : undefined;
      const reaching = reaches(graph, node.id);
      const made = [...graph.values()].filter((n) => n.createdIn === node.id).map((n) => n.label);
      // Bindings are not nodes, so a signal read only by the dom shows no readers at all.
      // Named when the dom layer said what they write, counted when it did not.
      const bound = node.targets?.length
        ? node.targets
            .map((t) => {
              const where = bothAt(t.source, root);
              const what = escape(t.name ? `${t.name} of ${t.element}` : t.element);
              return where ? `${what} (${place(where, t.source, reveals)})` : what;
            })
            .join(', ')
        : node.bindings
          ? `${node.bindings} dom binding${node.bindings > 1 ? 's' : ''}`
          : '';
      // A node on screen is part of the graph, so every line says something: "nothing yet" is
      // an answer, and leaving the row out reads as the inspector having failed to look.
      const relations = [
        `<span>↤ reads ${reads.length ? `<b>${escape(reads.join(', '))}</b>` : '<i>nothing</i>'}</span>`,
        // `bound` already carries markup for the places a value reaches, so only the
        // labels are escaped here.
        `<span>↦ feeds ${
          feeds.length || bound
            ? `<b>${[...feeds.map(escape), bound].filter(Boolean).join(', ')}</b>`
            : '<i>nothing yet</i>'
        }</span>`,
        writes.length ? `<span>✎ writes <b>${escape(writes.join(', '))}</b></span>` : '',
        // Where the value is set from code the graph has no node for.
        node.setAt?.length
          ? `<span>⌁ set at <b>${node.setAt.map((w) => place(bothAt(w, root), w, reveals)).join(', ')}</b></span>`
          : '',
        owner ? `<span>◧ made in <b>${escape(owner)}</b></span>` : '',
        reaching.length ? `<span>◨ reaches <b>${escape(reaching.join(', '))}</b></span>` : '',
        ...pluginRows(node, graph).map((row) => {
          const where = row.at && { ...row.at, file: row.at.file ?? node.source?.file };
          const text = where?.file ? bothAt(where, root) : '';
          const more = row.value !== undefined && row.value.length > 140;
          return `<span${
            more
              ? ` class="ins-more" data-full="${escape(row.value!)}" data-label="${escape(row.label)}"`
              : ''
          } title="${escape(row.value ?? row.label)}">⌘ ${escape(row.label)}${
            row.value ? `=<b>${escape(clip(row.value))}</b>` : ''
          }${text ? ` ${place(text, where, reveals)}` : ''}</span>`;
        }),
        // What the tag was written with. A prop's position has no file of its own: it was
        // written on the tag, so it belongs to whichever file that is.
        ...(node.props ?? []).map((p) => {
          const where = p.at && { ...p.at, file: p.at.file ?? node.source?.file };
          const at = where?.file ? bothAt(where, root) : '';
          return `<span>⇥ ${escape(p.name)}=<b>${escape(clip(p.value ?? '', 60))}</b>${
            at ? ` ${place(at, where, reveals)}` : ''
          }</span>`;
        }),
        made.length ? `<span>▸ made <b>${escape(made.join(', '))}</b></span>` : '',
      ]
        .filter(Boolean)
        .join('');

      const next = `${node.id}|${node.kind}|${value}|${node.runs}|${state ?? ''}|${relations}|${at(node.source, root)}|${at(node.usedAt, root)}|${bound}`;
      // An input that has left the page is not one anybody is typing into. Without this a
      // commit that never arrived: the panel redrew, the tab changed, would hold the
      // inspector on whatever it last wrote, for good.
      if (editing !== null && field?.isConnected !== true) {
        editing = null;
        field = null;
      }
      if (editing !== null) return;
      if (next === signature) return;
      signature = next;

      body.innerHTML =
        `<div class="ins-head"><span class="ins-kind n-${node.kind}">${node.kind}</span>` +
        `<b>${escape(node.label)}</b>` +
        (synthetic
          ? '<span class="ins-meta">not a node</span></div>'
          : `<span class="ins-meta">v${nodeVersion(node)} · ${node.runs} runs${state ? ` · ${state}` : ''}</span></div>`) +
        (edits && node.kind === 'state'
          ? `<div class="ins-val ins-edit" data-id="${node.id}" data-raw="${escape(value)}"` +
            ` title="Click to set ${escape(node.label)}">${escape(clip(value))}</div>`
          : `<div class="ins-val${value.length > 140 ? ' ins-more' : ''}"${
              value.length > 140 ? ` data-full="${escape(value)}" data-label="${escape(node.label)}"` : ''
            } title="${escape(value)}">${escape(clip(value))}</div>`) +
        `<div class="ins-rel">${relations}</div>` +
        // Only when the graph carries one. A snapshot from a build that was not marked has
        // no locations at all, and an empty line there reads as missing data.
        (node.source
          ? `<div class="ins-source">${node.source.external ? '📦' : '📍'} ${place(bothAt(node.source, root), node.source, reveals)}</div>`
          : '') +
        // A component is created where its tag is written; where it is declared is somewhere
        // else, and only worth a line when it is.
        (node.declaredAt && at(node.declaredAt, root) !== at(node.source, root)
          ? `<div class="ins-source">◧ declared ${place(at(node.declaredAt, root), node.declaredAt, reveals)}</div>`
          : '') +
        // A node a package made on the application's behalf: the package's line is where it
        // was created, and this is the line that asked for it.
        (node.usedAt
          ? `<div class="ins-source">↗ used at ${place(bothAt(node.usedAt, root), node.usedAt, reveals)}</div>`
          : '') +
        // Nothing said where it came from at all: the compiler did not mark this project and
        // the stack had nothing to offer either. Saying so beats a card that just sits there.
        (!node.source && !node.usedAt && !node.declaredAt
          ? '<div class="ins-source">— no source: build without sourceLocations</div>'
          : '');
    },
    showElement(graph, pick) {
      if (!pick) {
        if (signature === 'empty') return;
        signature = 'empty';
        body.innerHTML = `<span class="ins-empty">${escape(empty)}</span>`;
        return;
      }
      const owner = pick.owner === undefined ? undefined : graph.get(pick.owner);
      const writers = (pick.writes ?? [])
        .map((id) => graph.get(id))
        .filter((n): n is RNode => n !== undefined);

      // Where the binding into this element was written. A value can write to several
      // places, so it is the one naming this element that matters, not the first.
      const bindingAt = (node: RNode): ReactiveSourceLocation | undefined =>
        node.targets?.find((t) => t.element === pick.label || t.element.endsWith(` in ${pick.label}`))
          ?.source;

      const rows = writers
        .map((node) => {
          const where = bindingAt(node);
          const text = where ? bothAt(where, root) : '';
          return `<span>⌁ <b>${escape(node.label)}</b>${
            text ? ` ${place(text, where, reveals)}` : ''
          }</span>`;
        })
        .join('');

      const relations = [
        owner
          ? `<span>◧ rendered by <b>${escape(owner.label)}</b></span>`
          : '<span>◧ rendered by <i>nothing in the graph</i></span>',
        writers.length ? rows : '<span>⌁ <i>nothing writes here</i></span>',
        ...pluginElementRows(pick.extra).map((row) => {
          const where = row.at && { ...row.at, file: row.at.file ?? owner?.source?.file };
          const text = where?.file ? bothAt(where, root) : '';
          const more = row.value !== undefined && row.value.length > 140;
          return `<span${
            more
              ? ` class="ins-more" data-full="${escape(row.value!)}" data-label="${escape(row.label)}"`
              : ''
          } title="${escape(row.value ?? row.label)}">⌘ ${escape(row.label)}${
            row.value ? `=<b>${escape(clip(row.value))}</b>` : ''
          }${text ? ` ${place(text, where, reveals)}` : ''}</span>`;
        }),
      ].join('');

      // The element's own line when the build recorded one. Failing that, where the tag was
      // declared rather than where it was used: an element sits in the component's body, so
      // the line `<App/>` was written on says nothing about it.
      const source = pick.at ?? (owner && (owner.declaredAt ?? authoredPlace(owner)));
      // Where the framework built it, when that is somewhere else. Only on request: for an
      // application it is a line in a package nobody asked about.
      const madeIn =
        internals && owner?.source && owner.source !== source ? owner.source : undefined;
      const next = `el|${pick.key}|${pick.label}|${relations}|${at(source, root)}|${at(madeIn, root)}`;
      if (editing !== null && field?.isConnected !== true) {
        editing = null;
        field = null;
      }
      if (editing !== null) return;
      if (next === signature) return;
      signature = next;

      body.innerHTML =
        `<div class="ins-head"><span class="ins-kind n-element">element</span>` +
        `<b>${escape(pick.label)}</b>` +
        `<span class="ins-meta">not a node</span></div>` +
        `<div class="ins-rel">${relations}</div>` +
        // The tag's own line. An element has no position of its own in the graph, only the
        // component that rendered it does: so this is as close as the source gets.
        (source
          ? `<div class="ins-source">${source.external ? '📦' : '📍'} ${place(bothAt(source, root), source, reveals)}</div>`
          : '') +
        (madeIn
          ? `<div class="ins-source">📦 made in ${place(bothAt(madeIn, root), madeIn, reveals)}</div>`
          : '');
    },
    clear() {
      signature = '';
      body.innerHTML = `<span class="ins-empty">${escape(empty)}</span>`;
    },
  };
}

/** Default styling for what createInspector writes, in the shape DEVTOOLS_CSS is used. */
export const INSPECTOR_CSS = `
${VALUE_PANE_CSS}
/* Anything cut to fit says so, and opens the whole of it. */
.ins-more { cursor: zoom-in; }
.ins-header{ display: flex; align-items: center; gap: 8px; padding: .3rem .5rem; }
.ins-body { padding: .5rem; }
.ins-more:hover { text-decoration: underline dotted; }
.ins-empty { color: var(--fx-muted, #8a90a2); font-size: 12px; }
.ins-bar {
  display: flex; align-items: center; gap: 5px; margin-bottom: 6px;
  font-size: 10.5px; color: var(--fx-muted, #8a90a2); cursor: pointer; user-select: none;
}
.ins-bar:hover { color: var(--fx-label, #e7e9ee); }
.ins-bar input { width: 11px; height: 11px; margin: 0; accent-color: var(--fx-accent, #5eead4); }
.ins-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.ins-head b { font-size: 13px; color: var(--fx-label, #e7e9ee); }
.ins-kind { font-family: ui-monospace, monospace; font-size: 9.5px; text-transform: uppercase; letter-spacing: 1px; }
${kindRules((k) => `.ins-kind.n-${k}`, 'color')}
.ins-meta { margin-left: auto; color: var(--fx-muted, #8a90a2); font-family: ui-monospace, monospace; font-size: 10.5px; }
.ins-val { font-family: ui-monospace, monospace; font-size: 12px; color: var(--fx-label, #e7e9ee); word-break: break-word; }
.ins-rel { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 6px; color: var(--fx-muted, #8a90a2); font-size: 11.5px; }
.ins-rel b { color: var(--fx-label, #e7e9ee); font-weight: 600; }
.ins-rel i { font-style: normal; opacity: .6; }
.ins-edit { cursor: text; border-bottom: 1px dashed var(--fx-line, #262a35); }
.ins-edit:hover { border-bottom-color: var(--fx-accent, #5eead4); }
.ins-input {
  width: 100%; box-sizing: border-box; padding: 1px 4px;
  font: inherit; font-family: ui-monospace, monospace;
  color: var(--fx-label, #e7e9ee); background: var(--fx-bg, #0f1115);
  border: 1px solid var(--fx-accent, #5eead4); border-radius: 3px;
}
.ins-at {
  font: inherit; color: inherit; background: none; border: 0; padding: 0;
  cursor: pointer; text-decoration: underline; text-decoration-style: dotted;
  text-underline-offset: 2px;
}
.ins-at:hover { color: var(--fx-accent, #5eead4); }
.ins-at:focus-visible { outline: 1px solid var(--fx-accent, #5eead4); outline-offset: 1px; }
.ins-source { margin-top: 6px; font-family: ui-monospace, monospace; font-size: 10.5px; color: var(--fx-muted, #8a90a2); }
`;
