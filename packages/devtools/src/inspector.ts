// What one node is, in words.
//
// The graph draws a node in the space of a card: a name, a kind, a clipped value, a file and
// a line. Everything else about it — the version, the run count, what it reads, what reads
// it, where it was declared as against where it was used — needs room, and every host that
// draws the graph wants the same answer. So it lives here rather than in each of them.
//
// Rendered as html into an element the host owns, and re-rendered only when what it says
// would change: a panel repainting on every frame makes text impossible to select.
import { nodeState, nodeVersion, type RNode } from './instrument.js';
import { formatValue } from './format.js';
import type { ReactiveSourceLocation } from './source.js';

export interface Inspector {
  /** Draw the node with this id, or the empty state when it is undefined. */
  show(graph: Map<number, RNode>, id: number | null | undefined): void;
  clear(): void;
}

export interface InspectorOptions {
  /** What to say when nothing is selected. */
  empty?: string;
  /** How much of a value to show. */
  limit?: number;
}

const escape = (text: string): string =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const clip = (text: string, n = 140): string => (text.length > n ? `${text.slice(0, n - 1)}…` : text);

const at = (source?: ReactiveSourceLocation): string =>
  source ? `${source.file ?? ''}:${source.line ?? ''}:${source.column ?? ''}` : '';

/**
 * The location, and where it is in the compiled file when the two differ.
 *
 * A template's holes all map back to the line the template opens at, so the original position
 * names the component and nothing finer. The compiled one is what separates this binding from
 * the three beside it.
 */
const bothAt = (source?: ReactiveSourceLocation): string => {
  if (!source) return '';
  const out = source.compiled;
  const same = out?.line === source.line && out?.column === source.column;
  return out && !same ? `${at(source)} · out ${out.line ?? ''}:${out.column ?? ''}` : at(source);
};

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
  let signature = '';

  return {
    show(graph, id) {
      const node = id == null ? undefined : graph.get(id);
      if (!node) {
        if (signature === 'empty') return;
        signature = 'empty';
        host.innerHTML = `<span class="ins-empty">${escape(empty)}</span>`;
        return;
      }

      const labelOf = (other: number) => graph.get(other)?.label ?? '?';
      const reads = [...node.deps].map(labelOf);
      const feeds = [...graph.values()].filter((n) => n.deps.has(node.id)).map((n) => n.label);
      const writes = [...node.writes].map(labelOf);
      const value = valueOf(node, limit);
      const state = nodeState(node);
      // A card the view invented, not a node: version and run count are the signal's, and
      // repeating them here would read as facts about a thing that does not compute.
      const synthetic = node.kind === 'binding' || node.kind === 'setter' || node.kind === 'group';

      const owner = node.createdIn !== undefined ? graph.get(node.createdIn)?.label : undefined;
      const made = [...graph.values()].filter((n) => n.createdIn === node.id).map((n) => n.label);
      // Bindings are not nodes, so a signal read only by the dom shows no readers at all.
      // Named when the dom layer said what they write, counted when it did not.
      const bound = node.targets?.length
        ? node.targets
            .map((t) => {
              const where = bothAt(t.source);
              const what = t.name ? `${t.name} of ${t.element}` : t.element;
              return where ? `${what} (${where})` : what;
            })
            .join(', ')
        : node.bindings
          ? `${node.bindings} dom binding${node.bindings > 1 ? 's' : ''}`
          : '';
      // A node on screen is part of the graph, so every line says something: "nothing yet" is
      // an answer, and leaving the row out reads as the inspector having failed to look.
      const relations = [
        `<span>↤ reads ${reads.length ? `<b>${escape(reads.join(', '))}</b>` : '<i>nothing</i>'}</span>`,
        `<span>↦ feeds ${
          feeds.length || bound
            ? `<b>${escape([...feeds, bound].filter(Boolean).join(', '))}</b>`
            : '<i>nothing yet</i>'
        }</span>`,
        writes.length ? `<span>✎ writes <b>${escape(writes.join(', '))}</b></span>` : '',
        // Where the value is set from code the graph has no node for.
        node.setAt?.length
          ? `<span>⌁ set at <b>${escape(node.setAt.map(bothAt).join(', '))}</b></span>`
          : '',
        owner ? `<span>◧ made in <b>${escape(owner)}</b></span>` : '',
        made.length ? `<span>▸ made <b>${escape(made.join(', '))}</b></span>` : '',
      ]
        .filter(Boolean)
        .join('');

      const next = `${node.id}|${node.kind}|${value}|${node.runs}|${state ?? ''}|${relations}|${at(node.source)}|${at(node.usedAt)}|${bound}`;
      if (next === signature) return;
      signature = next;

      host.innerHTML =
        `<div class="ins-head"><span class="ins-kind n-${node.kind}">${node.kind}</span>` +
        `<b>${escape(node.label)}</b>` +
        (synthetic
          ? '<span class="ins-meta">not a node</span></div>'
          : `<span class="ins-meta">v${nodeVersion(node)} · ${node.runs} runs${state ? ` · ${state}` : ''}</span></div>`) +
        `<div class="ins-val" title="${escape(value)}">${escape(clip(value))}</div>` +
        `<div class="ins-rel">${relations}</div>` +
        // Only when the graph carries one. A snapshot from a build that was not marked has
        // no locations at all, and an empty line there reads as missing data.
        (node.source
          ? `<div class="ins-source">${node.source.external ? '📦' : '📍'} ${escape(bothAt(node.source))}</div>`
          : '') +
        // A component is created where its tag is written; where it is declared is somewhere
        // else, and only worth a line when it is.
        (node.declaredAt && at(node.declaredAt) !== at(node.source)
          ? `<div class="ins-source">◧ declared ${escape(at(node.declaredAt))}</div>`
          : '') +
        // A node a package made on the application's behalf: the package's line is where it
        // was created, and this is the line that asked for it.
        (node.usedAt ? `<div class="ins-source">↗ used at ${escape(bothAt(node.usedAt))}</div>` : '') +
        // Nothing said where it came from at all: the compiler did not mark this project and
        // the stack had nothing to offer either. Saying so beats a card that just sits there.
        (!node.source && !node.usedAt && !node.declaredAt
          ? '<div class="ins-source">— no source: build without sourceLocations</div>'
          : '');
    },
    clear() {
      signature = '';
      host.innerHTML = `<span class="ins-empty">${escape(empty)}</span>`;
    },
  };
}

/** Default styling for what createInspector writes, in the shape DEVTOOLS_CSS is used. */
export const INSPECTOR_CSS = `
.ins-empty { color: var(--fx-muted, #8a90a2); font-size: 12px; }
.ins-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.ins-head b { font-size: 13px; color: var(--fx-label, #e7e9ee); }
.ins-kind { font-family: ui-monospace, monospace; font-size: 9.5px; text-transform: uppercase; letter-spacing: 1px; }
.ins-kind.n-state { color: var(--state, #34d399); }
.ins-kind.n-memo { color: var(--memo, #a78bfa); }
.ins-kind.n-effect { color: var(--effect, #fbbf24); }
.ins-kind.n-store { color: var(--store, #38bdf8); }
.ins-kind.n-resource { color: var(--fx-write, #fb7185); }
.ins-kind.n-component { color: var(--component, #f0abfc); }
.ins-kind.n-control { color: var(--control, #7dd3fc); }
.ins-kind.n-router { color: var(--router, #c4b5fd); }
.ins-kind.n-handler { color: var(--handler, #fca5a5); }
.ins-kind.n-binding { color: var(--fx-accent, #5eead4); }
.ins-kind.n-setter { color: var(--fx-write, #fb7185); }
.ins-kind.n-group { color: var(--fx-muted, #8a90a2); }
.ins-meta { margin-left: auto; color: var(--fx-muted, #8a90a2); font-family: ui-monospace, monospace; font-size: 10.5px; }
.ins-val { font-family: ui-monospace, monospace; font-size: 12px; color: var(--fx-label, #e7e9ee); word-break: break-word; }
.ins-rel { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 6px; color: var(--fx-muted, #8a90a2); font-size: 11.5px; }
.ins-rel b { color: var(--fx-label, #e7e9ee); font-weight: 600; }
.ins-rel i { font-style: normal; opacity: .6; }
.ins-source { margin-top: 6px; font-family: ui-monospace, monospace; font-size: 10.5px; color: var(--fx-muted, #8a90a2); }
`;
