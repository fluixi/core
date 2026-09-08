// The graph as something you can post to another process.
//
// A snapshot is RNode with the parts that cannot cross a boundary flattened: Sets become
// arrays, the live core node becomes plain version/state fields, and the reader closure is
// dropped. Rehydrating gives back a Map the renderer accepts, so a panel in an extension
// draws the same graph as the page it came from.
//
// This lives beside RNode on purpose. A copy kept anywhere else drifts the first time a node
// gains a field, which is how `component`, `source` and `declaredAt` went missing from one.
import type { NodeKind, NodeState, RNode } from './instrument.js';
import type { ReactiveSourceLocation } from './source.js';

// A consumer reading a snapshot needs the vocabulary it is written in, and this module is
// what it imports; making it go to two places for one message is a needless seam.
export type { NodeKind, NodeState } from './instrument.js';
export type { ReactiveSourceLocation } from './source.js';

const STATE_NAME: Record<number, NodeState> = { 0: 'clean', 1: 'check', 2: 'dirty' };
const STATE_CODE: Record<NodeState, number> = { clean: 0, check: 1, dirty: 2 };

export interface WireNode {
  readonly id: number;
  readonly label: string;
  readonly kind: NodeKind;
  /** Source ids read on the last run (read edges: source → this). */
  readonly deps: number[];
  /** Signal ids written while this node ran. Empty on an observed graph. */
  readonly writes: number[];
  readonly value?: string;
  /** The value with room to read it, for a tooltip or an inspector. */
  readonly detail?: string;
  readonly runs: number;
  /** Producer's Date.now() at the last change. The consumer's clock agrees with it. */
  readonly lastPulse: number;
  readonly version?: number;
  readonly state?: NodeState;
  readonly loading?: boolean;
  /** Where the node was created, when the compiler marked it. */
  readonly source?: ReactiveSourceLocation;
  /** Components only: where the component itself was declared. */
  readonly declaredAt?: ReactiveSourceLocation;
  /** The node whose run created this one. */
  readonly createdIn?: number;
}

export interface GraphSnapshot {
  /** Producer clock (ms since epoch), so a pulse still ages correctly after the trip. */
  readonly t: number;
  readonly nodes: WireNode[];
  /** True when `nodes` is only what changed, so a consumer keeps the rest of what it has. */
  readonly partial?: boolean;
  /** Ids the producer no longer has. Only meaningful on a partial. */
  readonly removed?: number[];
  /**
   * Why there is nothing to show, when a producer can say. A dev server that is running but
   * has no devtools installed answers with this rather than with a 404, which reads the same
   * as a server that is not a fluixi project at all.
   */
  readonly reason?: string;
}

export interface SerializeOptions {
  /** Send only these nodes — what `sample()` returned. Makes it a partial. */
  ids?: Iterable<number>;
  removed?: Iterable<number>;
}

/** Flatten a live graph for transport. */
export function serializeGraph(
  graph: Map<number, RNode>,
  now = Date.now(),
  options: SerializeOptions = {},
): GraphSnapshot {
  const nodes: WireNode[] = [];
  const wanted = options.ids ? new Set(options.ids) : null;
  for (const node of graph.values()) {
    if (wanted && !wanted.has(node.id)) continue;
    const state = typeof node.core?.state === 'number' ? STATE_NAME[node.core.state] : undefined;
    nodes.push({
      id: node.id,
      label: node.label,
      kind: node.kind,
      deps: [...node.deps],
      writes: [...node.writes],
      value: node.value,
      detail: node.detail,
      runs: node.runs,
      lastPulse: node.lastPulse,
      version: node.core?.version,
      state,
      loading: node.loading,
      source: node.source,
      declaredAt: node.declaredAt,
      createdIn: node.createdIn,
    });
  }
  const removed = options.removed ? [...options.removed] : undefined;
  return wanted ? { t: now, nodes, partial: true, removed } : { t: now, nodes };
}

/** Rebuild a graph the renderer can draw. Nodes have no reader: a snapshot is already read. */
export function snapshotToRenderMap(snapshot: GraphSnapshot): Map<number, RNode> {
  const map = new Map<number, RNode>();
  for (const node of snapshot.nodes) {
    map.set(node.id, {
      id: node.id,
      label: node.label,
      kind: node.kind,
      deps: new Set(node.deps),
      writes: new Set(node.writes),
      value: node.value,
      detail: node.detail,
      runs: node.runs,
      lastPulse: node.lastPulse,
      core: { version: node.version, state: node.state ? STATE_CODE[node.state] : undefined },
      loading: node.loading,
      source: node.source,
      declaredAt: node.declaredAt,
      createdIn: node.createdIn,
    });
  }
  return map;
}

/**
 * Fold a snapshot into what is already on screen. A full one replaces the graph; a partial
 * updates the nodes it carries and drops the ones the producer says are gone.
 */
export function applySnapshot(graph: Map<number, RNode>, snapshot: GraphSnapshot): Map<number, RNode> {
  if (!snapshot.partial) return snapshotToRenderMap(snapshot);
  for (const [id, node] of snapshotToRenderMap(snapshot)) graph.set(id, node);
  for (const id of snapshot.removed ?? []) graph.delete(id);
  return graph;
}
