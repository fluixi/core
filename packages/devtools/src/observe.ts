// Watching an ordinary app.
//
// createReactor hands out its own primitives, so it only ever sees code written against it.
// This sees code written against @fluixi/core: the runtime reports each node it makes, and
// the node it reports carries its own edges — a source keeps `observers`, a consumer keeps
// `sources` — so dependencies are read off the real graph instead of being rebuilt from
// wrapped reads.
//
// The graph it fills is the same Map<number, RNode> createGraphView already draws, so a
// renderer does not care which of the two produced it.
import {
  observeReactiveNodes,
  untrack,
  type ReactiveNodeReport,
  type ReactiveObserver,
} from '@fluixi/reactive/signal';
import { componentSource, installSourceMarker, takeReactiveSource } from './source.js';
import { currentCallSite } from './callsite.js';
import { type NodeKind, type RNode } from './instrument.js';
import { formatValue, shorten } from './format.js';

/** The core node behind a signal or a computation, as far as this file needs to see it. */
interface CoreNode {
  version?: number;
  state?: number;
  sources?: Set<CoreNode> | null;
  observers?: Set<CoreNode> | null;
}

export interface ObservedGraph {
  readonly graph: Map<number, RNode>;
  /** Ids whose value or run count moved since the last call. Drives the pulse. */
  sample(): number[];
  /** Ids dropped since the last call, for a consumer folding in deltas. Reading clears it. */
  takeRemoved(): number[];
  detach(): void;
}

export interface ObserveOptions {
  /**
   * Trimmed off a file name that a dev server serves from its own origin. Defaults to the
   * page's origin, which is what a preview in an iframe wants too.
   */
  origin?: string;
  /**
   * How to register. Defaults to this copy of the runtime — pass the application's own
   * `observeReactiveNodes` when watching from outside its module graph, since a second copy
   * of the framework watches a graph nobody is using.
   */
  observe?: (observer: ReactiveObserver) => () => void;
}

const KINDS: Record<ReactiveNodeReport['kind'], NodeKind> = {
  signal: 'state',
  memo: 'memo',
  effect: 'effect',
  store: 'store',
  resource: 'resource',
};

const PREFIX: Record<NodeKind, string> = {
  state: 's',
  memo: 'm',
  effect: 'e',
  store: 'st',
  resource: 'r',
  component: 'c',
  // Never produced here: a group is a card a view draws, not a node anything creates.
  group: 'g',
};

/**
 * Start watching. Nodes made before this returns are not in the graph — attach before the
 * app's modules load, which in practice means before the entry import.
 */
export function observeGraph(options: ObserveOptions = {}): ObservedGraph {
  installSourceMarker();
  const origin = options.origin ?? (typeof location === 'object' ? location.origin : undefined);

  const graph = new Map<number, RNode>();
  /** Core node → id, so a report about a node already seen finds it. */
  const ids = new WeakMap<object, number>();
  /**
   * Plumbing the graph does not draw, mapped to the drawn node it was created inside. A row
   * added to a list is created inside a render effect; without this it would arrive with no
   * ancestor at all, and the component that caused it would sit on its own.
   */
  const through = new WeakMap<object, number>();
  /**
   * The same plumbing, iterable.
   *
   * A signal whose only readers are dom bindings looks like a node nothing uses, because the
   * bindings are not drawn. They are still what makes it matter, so they are counted.
   * Dropped when the effect that holds them is disposed.
   */
  const internals = new Set<CoreNode>();
  const cores = new Map<number, CoreNode>();
  const runsAtLastSample = new Map<number, number>();
  const unnamed = new Set<number>();
  let seq = 0;

  const removed: number[] = [];
  /** The nearest node the graph knows, looking outward through anything it does not. */
  const ancestor = (parents?: readonly unknown[]): number | undefined => {
    if (!parents) return undefined;
    for (let i = parents.length - 1; i >= 0; i--) {
      const key = parents[i] as object;
      const found = ids.get(key) ?? through.get(key);
      if (found !== undefined) return found;
    }
    return undefined;
  };

  const stop = (options.observe ?? observeReactiveNodes)({
    created(report) {
      const core = report.node as CoreNode;
      if (!core || typeof core !== 'object') return;
      if (report.internal) {
        // Not drawn, but remembered: whatever it creates belongs to what created it, and
        // what it reads is the reason a signal with no visible readers is not idle.
        const owner = ancestor(report.parents);
        if (owner !== undefined) through.set(core, owner);
        internals.add(core);
        return;
      }
      const id = seq++;
      const kind = KINDS[report.kind];
      const handle = report.handle;
      // One mark, one node — read here and nowhere else, matching the reactor.
      const mark = takeReactiveSource();
      const named = report.name ?? mark?.name;
      if (!named) unnamed.add(id);
      // Only for a node the compiler did not mark. This is called from inside the creating
      // call, so the frames that led to it are still on the stack.
      const site = mark?.location ? undefined : currentCallSite(origin);

      const node: RNode = {
        id,
        label: named ?? `${PREFIX[kind]}${id}`,
        kind,
        deps: new Set(),
        // A write edge needs to know which consumer was running when a setter fired, and
        // nothing observed records that. Reads carry the graph; writes do not.
        writes: new Set(),
        runs: 0,
        lastPulse: 0,
        core,
        // The application's line is where it was asked for; a package's is where it was made,
        // and for a node made while that package loaded it is the only thing there is.
        ...(mark?.location ? { source: mark.location } : {}),
        ...(site && !site.external ? { usedAt: site.location } : {}),
        ...(site && site.external && !mark?.location ? { source: site.location } : {}),
      };
      const owner = ancestor(report.parents);
      if (owner !== undefined) node.createdIn = owner;

      // A node made on another's behalf — a store's key signal, built the first time
      // something reads it — belongs where that one was declared, not where it was read.
      const originId = report.origin ? ids.get(report.origin as object) : undefined;
      const from = originId !== undefined ? graph.get(originId) : undefined;
      if (from) {
        node.createdIn = originId;
        if (from.source) node.source = from.source;
      }
      // An effect returns nothing worth showing, so it has no reader and pulses on its runs.
      if (kind !== 'effect' && typeof handle === 'function') {
        // Not read here: a memo is lazy, and forcing it from inside its own creation would
        // run the author's fn earlier than the app asked for. The first sample reads it.
        const read = handle as () => unknown;
        node.read = () => untrack(read);
      }
      ids.set(core, id);
      // The accessor too: a node built on another's behalf names its owner by the handle it
      // was given, which is the reader, not the core node behind it.
      if (handle && (typeof handle === 'object' || typeof handle === 'function')) {
        ids.set(handle as object, id);
      }
      cores.set(id, core);
      graph.set(id, node);
    },
    ran(target) {
      const id = ids.get(target as object);
      if (id !== undefined) {
        const node = graph.get(id);
        if (node) node.runs++;
      }
    },
    moved(target, origin, name) {
      const node = graph.get(ids.get(target as object) ?? -1);
      if (!node) return;
      const owner = ids.get(origin as object);
      if (owner !== undefined && graph.has(owner)) node.createdIn = owner;
      if (name) {
        node.label = name;
        unnamed.delete(node.id);
      }
    },
    disposed(target) {
      internals.delete(target as CoreNode);
      const id = ids.get(target as object);
      if (id === undefined) return;
      removed.push(id);
      graph.delete(id);
      cores.delete(id);
      runsAtLastSample.delete(id);
      unnamed.delete(id);
    },
  });

  /** What this node read on its last run, as ids — the edges the core already holds. */
  const edges = (id: number, node: RNode): void => {
    const sources = cores.get(id)?.sources;
    node.deps.clear();
    if (!sources) return;
    for (const source of sources) {
      const dep = ids.get(source as object);
      if (dep !== undefined && dep !== id) node.deps.add(dep);
    }
  };

  return {
    graph,
    sample() {
      const changed: number[] = [];
      const now = Date.now();

      // What the dom reads, per node. Recounted rather than kept: a binding's sources change
      // with every run, and a stale count is worse than none.
      const bindings = new Map<number, number>();
      for (const internal of internals) {
        for (const source of internal.sources ?? []) {
          const id = ids.get(source as object);
          if (id !== undefined) bindings.set(id, (bindings.get(id) ?? 0) + 1);
        }
      }
      for (const node of graph.values()) {
        const count = bindings.get(node.id) ?? 0;
        if (node.bindings !== count) node.bindings = count || undefined;
      }
      for (const node of graph.values()) {
        if (!node.read) {
          edges(node.id, node);
          // A node absent from the table is one this call is seeing for the first time. It
          // counts as changed, or an effect would be created into a delta nobody sends.
          const seen = runsAtLastSample.get(node.id);
          if (seen === undefined || node.runs > seen) {
            node.lastPulse = now;
            changed.push(node.id);
          }
          runsAtLastSample.set(node.id, node.runs);
          continue;
        }
        const raw = node.read();
        // After the read: a memo that has never been pulled has no sources yet, and reading
        // it is what makes it collect them.
        edges(node.id, node);
        // A memo holding something the runtime stamped a component name on is the wrapper
        // the compiler put round that component, so it can say what the author wrote.
        const stamped = (raw as { $name?: unknown })?.$name;
        if (node.kind === 'memo' && typeof stamped === 'string' && stamped) {
          node.kind = 'component';
          node.declaredAt = componentSource(stamped);
          node.source ??= node.declaredAt;
          if (unnamed.has(node.id)) {
            node.label = stamped;
            unnamed.delete(node.id);
          }
        }
        // Formatted once: the card shows the head of it, the tooltip and the inspector the
        // rest. Reading the value twice would be reading a proxy twice.
        const detail = formatValue(raw);
        const next = shorten(detail);
        if (next !== node.value || detail !== node.detail) {
          node.detail = detail;
          node.value = next;
          // A signal never recomputes, so a write is the only thing it can count.
          if (node.kind === 'state') node.runs++;
          node.lastPulse = now;
          changed.push(node.id);
        }
        runsAtLastSample.set(node.id, node.runs);
      }
      return changed;
    },
    takeRemoved() {
      return removed.splice(0, removed.length);
    },
    detach() {
      stop();
      internals.clear();
      graph.clear();
      cores.clear();
      runsAtLastSample.clear();
      unnamed.clear();
    },
  };
}
