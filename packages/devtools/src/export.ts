/**
 * The graph as something to paste somewhere else.
 *
 * A panel shows one node at a time; a bug report needs all of them at once. This is the whole
 * graph as plain json — values, kinds, ownership, sources, what each node reaches in the
 * document and where it is written from.
 *
 * Names rather than ids wherever a reader has to follow a reference: `deps: ["count"]` can be
 * read, `deps: [3]` has to be looked up. Ids stay on the nodes, and a name shared by two nodes
 * is disambiguated so the export is never ambiguous.
 */
import { nodeState, nodeVersion, type RNode } from './instrument.js';
import { formatValue } from './format.js';
import type { GraphEvent } from './history.js';
import type { ReactiveSourceLocation } from './source.js';

export interface ExportOptions {
  /** How much of each value to include. */
  limit?: number;
  /** The history, when the host has one. */
  events?: readonly GraphEvent[];
  /** Says the graph was read from source rather than from a running application. */
  fromSource?: boolean;
}

interface ExportedNode {
  id: number;
  label: string;
  kind: string;
  value?: string;
  runs?: number;
  version?: number;
  state?: string;
  reads?: string[];
  writes?: string[];
  madeIn?: string;
  source?: string;
  declaredAt?: string;
  usedAt?: string;
  /** Where it reaches the document, with the line each binding was written on. */
  updates?: string[];
  /** Where it is written from, outside any computation. */
  setAt?: string[];
}

const at = (source?: ReactiveSourceLocation): string | undefined => {
  if (!source) return undefined;
  const where = `${source.file ?? ''}:${source.line ?? ''}:${source.column ?? ''}`;
  // Both when they differ: a template's holes share one original position.
  const out = source.compiled;
  const same = out?.line === source.line && out?.column === source.column;
  return out && !same ? `${where} (out ${out.line ?? ''}:${out.column ?? ''})` : where;
};

/** A name, made unique when two nodes share it. */
function naming(graph: Map<number, RNode>): (id: number) => string {
  const seen = new Map<string, number>();
  for (const node of graph.values()) seen.set(node.label, (seen.get(node.label) ?? 0) + 1);
  return (id) => {
    const node = graph.get(id);
    if (!node) return `#${id}`;
    return (seen.get(node.label) ?? 0) > 1 ? `${node.label}#${node.id}` : node.label;
  };
}

export interface ExportedGraph {
  t: number;
  nodes: ExportedNode[];
  /** Present only when the host passed a history. */
  events?: GraphEvent[];
  from: 'source' | 'running application';
}

/** The graph as a plain object. */
export function exportGraph(graph: Map<number, RNode>, options: ExportOptions = {}): ExportedGraph {
  const limit = options.limit ?? 400;
  const name = naming(graph);

  const nodes = [...graph.values()].map((node): ExportedNode => {
    let value = node.detail ?? node.value;
    if (node.read) {
      try {
        value = formatValue(node.read(), limit);
      } catch {
        // A reader that throws is still a node worth exporting.
      }
    }
    const feeds = [...node.deps].map(name);
    const wrote = [...node.writes].map(name);
    const state = nodeState(node);

    return {
      id: node.id,
      label: node.label,
      kind: node.kind,
      ...(value ? { value } : {}),
      ...(node.runs ? { runs: node.runs } : {}),
      // Only a node with a core has one; a static node would report a version of 0.
      ...(node.core?.version !== undefined ? { version: nodeVersion(node) } : {}),
      ...(state ? { state } : {}),
      ...(feeds.length ? { reads: feeds } : {}),
      ...(wrote.length ? { writes: wrote } : {}),
      ...(node.createdIn !== undefined ? { madeIn: name(node.createdIn) } : {}),
      ...(at(node.source) ? { source: at(node.source) } : {}),
      ...(at(node.declaredAt) ? { declaredAt: at(node.declaredAt) } : {}),
      ...(at(node.usedAt) ? { usedAt: at(node.usedAt) } : {}),
      ...(node.targets?.length
        ? {
            updates: node.targets.map((target) => {
              const what = target.name ? `${target.name} of ${target.element}` : target.element;
              const where = at(target.source);
              return where ? `${what} — ${where}` : what;
            }),
          }
        : {}),
      ...(node.setAt?.length ? { setAt: node.setAt.map((s) => at(s)!).filter(Boolean) } : {}),
    };
  });

  return {
    t: Date.now(),
    from: options.fromSource ? 'source' : 'running application',
    nodes,
    ...(options.events?.length ? { events: [...options.events] } : {}),
  };
}

/** The same thing as text, indented so it can be read where it is pasted. */
export function graphToJson(graph: Map<number, RNode>, options: ExportOptions = {}): string {
  return JSON.stringify(exportGraph(graph, options), null, 2);
}
