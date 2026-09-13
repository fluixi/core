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
import { componentSource, holeLocation, installSourceMarker, propsLocations, takeReactiveSource } from './source.js';
import { currentCallSite } from './callsite.js';
import { KIND_OF_BUILTIN, type DomTarget, type NodeKind, type PropReport, type RNode } from './instrument.js';
import type { ReactiveSourceLocation } from './source.js';
import { formatValue, shorten } from './format.js';
import { createHistory, type GraphEvent } from './history.js';
import { diffValues } from './diff.js';
import { describeNode } from './describe.js';
import { describeAll, type DomNode } from './dom.js';
import { TREE_KINDS } from './tree.js';

/** The core node behind a signal or a computation, as far as this file needs to see it. */
interface CoreNode {
  version?: number;
  state?: number;
  sources?: Set<CoreNode> | null;
  observers?: Set<CoreNode> | null;
}

/** How far back a consumer may be and still be told what was dropped. */
const REMOVED_LOG = 500;

export interface ObservedGraph {
  readonly graph: Map<number, RNode>;
  /** Ids whose value or run count moved since the last call. Drives the pulse. */
  sample(): number[];
  /**
   * The cursor as it stands. A consumer folding in deltas keeps the one it was given and
   * asks for what came after it.
   */
  readonly revision: number;
  /**
   * Ids that moved after `rev`. Unlike `sample`, asking does not consume anything, so two
   * consumers reading at their own pace each see every change.
   */
  changedSince(rev: number): number[];
  /** Ids dropped after `rev`. Bounded: a consumer further back than that is told to reload. */
  removedSince(rev: number): number[];
  /** Whether `rev` is old enough that the removal log no longer covers it. */
  outrun(rev: number): boolean;
  /** What happened since the last call, in order. Empty when history is off. */
  takeEvents(): GraphEvent[];
  /** Where this node reaches the page, for whatever is still on it. */
  elementsFor(id: number): Element[];
  /** The node driving `element`, or the nearest ancestor that has one. */
  nodeAt(element: Element | null): number | undefined;
  /**
   * What this node rendered, described so it can be shown by a panel that is not in the
   * page. Stops wherever another tag begins, naming it.
   */
  domFor(id: number): DomNode[];
  /**
   * The elements this tag returned, and nothing else. Unlike `elementsFor` there is no
   * fallback to what the values inside it write to, so two tags can never claim the same
   * element.
   */
  renderedFor(id: number): Element[];
  /**
   * Write a signal from outside the application. False when the node is not something that
   * can be written — a memo is computed, and setting it would be a lie the next run undoes.
   */
  setValue(id: number, next: unknown): boolean;
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
  /** Events kept for the timeline. 0 for a host that only draws the graph. */
  history?: number;
  /** One stack capture per binding, at creation. Off for a host that never asks. */
  bindingSources?: boolean;
  /**
   * Put a stack location back in the author's file. A frame reports the compiled position and
   * knows nothing of the file it was generated from; a host with the source maps closes that.
   * Only stack-derived locations pass through — a compiler mark is already original.
   */
  mapSource?: (location: ReactiveSourceLocation) => ReactiveSourceLocation | undefined;
}

const KINDS: Record<ReactiveNodeReport['kind'], NodeKind> = {
  signal: 'state',
  memo: 'memo',
  effect: 'effect',
  store: 'store',
  resource: 'resource',
};

/** Long enough for an object's first fields, short enough that a few hundred stays small. */
const HISTORY_VALUE = 80;

/** How many distinct places may be remembered as writing one signal. */
const SET_SITES = 8;

const PREFIX: Record<NodeKind, string> = {
  state: 's',
  memo: 'm',
  effect: 'e',
  store: 'st',
  resource: 'r',
  component: 'c',
  // Only the static graph makes these: at runtime control flow is a named memo, and a route
  // handler never reaches a browser.
  control: 'x',
  router: 'rt',
  handler: 'h',
  // Never produced here: these are cards a view draws, not nodes anything creates.
  group: 'g',
  binding: 'b',
  setter: 'w',
};

/**
 * Start watching. Nodes made before this returns are not in the graph — attach before the
 * app's modules load, which in practice means before the entry import.
 */
/**
 * What a component was handed, read for display.
 *
 * Every prop is a getter over whatever the caller wrote, so reading one runs that
 * expression. Untracked, or the read would subscribe whatever is sampling to it and the
 * panel would drive the graph by looking at it. `children` is skipped: reading it builds
 * the subtree, which is a side effect nobody asked for by opening an inspector.
 */
function readProps(props: object): PropReport[] | undefined {
  const at = propsLocations(props);
  const out: PropReport[] = [];
  for (const name of Object.keys(props)) {
    if (name === 'children') continue;
    const where = at?.[name];
    const report: PropReport = {
      name,
      ...(where ? { at: { line: where[0], column: where[1] } } : {}),
    };
    try {
      report.value = formatValue(untrack(() => (props as Record<string, unknown>)[name]), 200);
    } catch {
      // A getter that throws is still a prop worth naming.
    }
    out.push(report);
  }
  return out.length ? out : undefined;
}

export function observeGraph(options: ObserveOptions = {}): ObservedGraph {
  installSourceMarker();
  const origin = options.origin ?? (typeof location === 'object' ? location.origin : undefined);

  const graph = new Map<number, RNode>();

  /**
   * Whether this node is the wrapper that made the stamped value rather than one further
   * down that only passes it along.
   *
   * `$name` is set on what a component returns, so it travels with the value and every memo
   * holding it looks like the component. The one that made it is the one none of its
   * dependencies already has — otherwise a component under `Suspense` draws twice.
   */
  const claims = (node: RNode, value: unknown): boolean => {
    for (const dep of node.deps) {
      const other = graph.get(dep);
      if (other?.read && other.read() === value) return false;
    }
    return true;
  };
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
  /**
   * What each binding effect writes into, keyed by the effect: one effect can read several
   * signals and all of them drive the same place. A description, never the element.
   */
  const targets = new WeakMap<CoreNode, DomTarget>();
  /** The props object each component was handed, so its values can be read on request. */
  const handed = new Map<number, object>();
  /**
   * Where each binding was wired up. Taken at creation: the first run is scheduled, so by the
   * time it reports, the frame that asked for it has left the stack.
   */
  const bindingSites = new WeakMap<CoreNode, ReactiveSourceLocation>();
  /**
   * The element each binding writes into, weakly.
   *
   * `targets` describes elements rather than holding them, because holding one keeps a
   * removed subtree alive. A WeakRef does not, so this can answer "show me that on the
   * page" without pinning anything.
   */
  const boundTo = new WeakMap<CoreNode, WeakRef<Element>>();
  /** The reverse, for a pointer landing somewhere: element → the node driving it. */
  const drivenBy = new WeakMap<Element, number>();
  /** Per node, the elements it drives. Rebuilt each sample, like the descriptions are. */
  let reaches = new Map<number, WeakRef<Element>[]>();
  /** Cleared on each sample: the page has moved on. */
  let described: Map<number, DomNode[]> | null = null;
  /**
   * What each tag rendered, weakly.
   *
   * A component's value is the dom it returned, so this is exact where the bindings are
   * only nearby: a binding is recorded against the element containing it, which for a small
   * component is whatever the page happens to have put it in.
   */
  const rendered = new Map<number, WeakRef<Element>[]>();

  /** The elements in a component's return value, however it was shaped. */
  const elementsIn = (value: unknown): Element[] => {
    if (value instanceof Element) return [value];
    if (value instanceof DocumentFragment) return [...value.children];
    // A component returning several roots hands back an array of nodes.
    if (Array.isArray(value)) return value.flatMap(elementsIn);
    return [];
  };
  const cores = new Map<number, CoreNode>();
  /**
   * How to write each signal, when the runtime said.
   *
   * The core node can be set directly, and doing that marks its readers dirty without
   * flushing them — the graph moves and the page does not. This is the application's own
   * setter, so a write from a panel lands the same way a click would.
   */
  const setters = new Map<number, (value: unknown) => void>();
  const runsAtLastSample = new Map<number, number>();
  const unnamed = new Set<number>();
  const recording = (options.history ?? 200) > 0;
  const wantSites = options.bindingSources ?? true;

  /** A stack location in the author's terms, when the host can say. */
  const mapped = (location: ReactiveSourceLocation): ReactiveSourceLocation => {
    if (!options.mapSource) return location;
    try {
      // A mapper that cannot place a position must not turn a usable location into none.
      const found = options.mapSource(location);
      // The compiled position is kept: it distinguishes bindings the map cannot.
      return found
        ? { ...location, ...found, compiled: { line: location.line, column: location.column } }
        : location;
    } catch {
      return location;
    }
  };
  const history = createHistory(options.history ?? 200);
  let seq = 0;

  /**
   * The raw value each node last reported, so a write can be diffed against it. A formatted
   * string cannot be. One reference per node, so this pins no more than the graph does.
   */
  const raws = new Map<number, unknown>();

/** Untracked: this runs inside a write, and a tracked read would change what it watches. */
  const readRaw = (node: RNode): unknown => {
    if (!node.read) return undefined;
    try {
      return untrack(() => node.read!());
    } catch {
      // A reader that throws is not worth losing the event over.
      return undefined;
    }
  };

  /**
   * Removals, kept rather than drained, each stamped with the revision it happened at.
   *
   * Draining meant whichever consumer polled first took them, and a page with both a
   * browser panel and an editor panel watching has two. Bounded, because nothing here is
   * ever consumed — a consumer older than the oldest entry is told to start again.
   */
  const removed: { id: number; rev: number }[] = [];
  /** Monotonic, bumped for every node the sample finds moved. */
  let revision = 0;
  /** The revision each node last moved at. */
  const revs = new Map<number, number>();
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
        if (wantSites) {
          // The package's frame when there is no application one: a binding inside a library
          // component is still somewhere. `external` marks the difference.
          const site = currentCallSite(origin);
          if (site) bindingSites.set(core, mapped(site.location));
        }
        return;
      }
      const id = seq++;
      const handle = report.handle;
      // One mark, one node — read here and nowhere else, matching the reactor.
      const mark = takeReactiveSource();
      // What a builtin tag is, decided from its name before anything reads its value.
      //
      // `Switch` names its own memo and returns a dom node, so nothing downstream carries a
      // `$name` to recognise it by later. `Router`, `Suspense` and `Outlet` are not named by
      // the runtime at all — what names them is the compiler's mark on the tag, and without
      // reading that they stay plain memos and the tree lists them as values.
      //
      // A mark on a memo is a tag the compiler saw. On anything else it is whatever the
      // author called their own value, so a signal someone named `Show` is left alone.
      const base = KINDS[report.kind];
      const marked = base === 'memo' && mark?.name ? KIND_OF_BUILTIN[mark.name] : undefined;
      const kind = (report.name ? KIND_OF_BUILTIN[report.name] : undefined) ?? marked ?? base;
      const named = report.name ?? mark?.name;
      if (!named) unnamed.add(id);
      // Only for a node the compiler did not mark. This is called from inside the creating
      // call, so the frames that led to it are still on the stack.
      const site = mark?.location ? undefined : currentCallSite(origin);

      const node: RNode = {
        id,
        label: named ?? `${PREFIX[kind]}${id}`,
        kind,
        // Only a compiler mark means the author wrote this and gave it that name. A name
        // the runtime supplies — `Show.when`, `mapArray`, `row index` — describes framework
        // machinery, and so does no name at all.
        authored: mark?.name != null,
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
        // Mapped, unlike `mark`: these two came off a stack, so they are positions in the
        // compiled file until a host translates them.
        ...(site && !site.external ? { usedAt: mapped(site.location) } : {}),
        ...(site && site.external && !mark?.location ? { source: mapped(site.location) } : {}),
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
      if (typeof report.set === 'function') setters.set(id, report.set);
      graph.set(id, node);
      history.created(id, node.createdIn, node.label);
    },
    ran(target) {
      const id = ids.get(target as object);
      if (id !== undefined) {
        const node = graph.get(id);
        if (node) node.runs++;
        history.ran(id);
      }
    },
    wrote(target, by) {
      const writer = by ? ids.get(by as object) : undefined;
      const written = ids.get(target as object);
      if (written === undefined) return;

      // Nothing running: a handler, a timer, a socket, none of which the graph has a node
      // for. Where it was called is all there is to say, and the stack still has it.
      if (wantSites && writer === undefined) {
        const node = graph.get(written);
        const site = currentCallSite(origin);
        if (node && site) {
          const seen = (node.setAt ??= []);
          const at = mapped(site.location);
          // One handler called two hundred times is one place.
          if (!seen.some((s) => s.file === at.file && s.line === at.line && s.column === at.column)) {
            if (seen.length >= SET_SITES) seen.shift();
            seen.push(at);
          }
        }
      }

      // Before the edge check and whether or not anything was running: the write with no
      // writer is the one the timeline is built around.
      if (recording) {
        const node = graph.get(written);
        // The write has landed, so this is the new value; the old one was kept last time.
        const after = node ? readRaw(node) : undefined;
        const before = raws.get(written);
        if (node) raws.set(written, after);
        // Both sides cut to the same budget, or the arrow reads as two kinds of thing.
        const shown = node?.detail ?? node?.value;
        history.wrote(written, writer, {
          from: shown === undefined ? undefined : shorten(shown, HISTORY_VALUE),
          to: node ? shorten(formatValue(after, HISTORY_VALUE * 2), HISTORY_VALUE) : undefined,
          // Which row was added is the fact a reader is after.
          change: diffValues(before, after),
          label: node?.label,
        });
      }

      // Only a write from inside a computation is an edge: a handler is not a node.
      if (writer === undefined || writer === written) return;
      graph.get(writer)?.writes.add(written);
    },
    props(node, props) {
      const core = node as CoreNode;
      if (!core || typeof core !== 'object' || !props) return;
      const id = ids.get(core);
      // Held, not read. Every prop is a getter over what the caller passed, so reading one
      // here would subscribe whatever is running to it.
      if (id !== undefined) handed.set(id, props as object);
    },
    bound(node, target, kind, name, accessor) {
      const core = node as CoreNode;
      if (!core || typeof core !== 'object') return;
      // The compiler's mark first. It names the hole itself; the stack only names the call
      // that built the template, which every binding in that template shares.
      const hole = holeLocation(accessor);
      const site = hole
        ? { ...hole, file: bindingSites.get(core)?.file }
        : bindingSites.get(core);
      // A content hole is reported against its marker comment, which has no box to draw.
      const box =
        target instanceof Element
          ? target
          : ((target as { parentElement?: Element } | null)?.parentElement ?? undefined);
      if (box) boundTo.set(core, new WeakRef(box));
      targets.set(core, {
        kind,
        element: describeNode(target),
        ...(name ? { name } : {}),
        ...(site ? { source: site } : {}),
      });
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
      removed.push({ id, rev: ++revision });
      revs.delete(id);
      if (removed.length > REMOVED_LOG) removed.splice(0, removed.length - REMOVED_LOG);
      // The label goes with it: nothing is left to look the name up in.
      history.disposed(id, graph.get(id)?.label);
      graph.delete(id);
      handed.delete(id);
      raws.delete(id);
      cores.delete(id);
      rendered.delete(id);
      setters.delete(id);
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

  const api: ObservedGraph = {
    graph,
    sample() {
      described = null;
      const changed: number[] = [];
      /** Recorded once here, so every consumer can be told about it at its own pace. */
      const moved = (id: number): void => {
        changed.push(id);
        revs.set(id, ++revision);
      };
      const now = Date.now();

      // What the dom reads, per node. Recounted rather than kept: a binding's sources change
      // with every run, and a stale count is worse than none.
      const bindings = new Map<number, number>();
      const drives = new Map<number, DomTarget[]>();
      const seen = new Map<number, WeakRef<Element>[]>();
      for (const internal of internals) {
        const target = targets.get(internal);
        const element = boundTo.get(internal);
        for (const source of internal.sources ?? []) {
          const id = ids.get(source as object);
          if (id === undefined) continue;
          bindings.set(id, (bindings.get(id) ?? 0) + 1);
          if (element) {
            const found = element.deref();
            // First writer wins: an element driven by two values answers with the one that
            // reached it first, and the rest are still reachable from the node itself.
            if (found && !drivenBy.has(found)) drivenBy.set(found, id);
            const held = seen.get(id);
            if (held) held.push(element);
            else seen.set(id, [element]);
          }
          if (!target) continue;
          const list = drives.get(id);
          if (list) list.push(target);
          else drives.set(id, [target]);
        }
      }
      reaches = seen;
      for (const node of graph.values()) {
        const count = bindings.get(node.id) ?? 0;
        if (node.bindings !== count) node.bindings = count || undefined;
        const list = drives.get(node.id);
        node.targets = list?.length ? list : undefined;
      }
      for (const node of graph.values()) {
        if (!node.read) {
          edges(node.id, node);
          // A node absent from the table is one this call is seeing for the first time. It
          // counts as changed, or an effect would be created into a delta nobody sends.
          const seen = runsAtLastSample.get(node.id);
          if (seen === undefined || node.runs > seen) {
            node.lastPulse = now;
            moved(node.id);
          }
          runsAtLastSample.set(node.id, node.runs);
          continue;
        }
        const raw = node.read();
        // For the next write to diff against; without it the first change has no entries.
        if (recording) raws.set(node.id, raw);
        // After the read: a memo that has never been pulled has no sources yet, and reading
        // it is what makes it collect them.
        edges(node.id, node);
        // A memo holding something the runtime stamped a component name on is the wrapper
        // the compiler put round that component, so it can say what the author wrote.
        const stamped = (raw as { $name?: unknown })?.$name;
        if (node.kind === 'memo' && typeof stamped === 'string' && stamped && claims(node, raw)) {
          // A control-flow tag stamps its name the same way, so the name decides what this
          // is. Without it `Show` and `Match` are drawn as components the author wrote.
          node.kind = KIND_OF_BUILTIN[stamped] ?? 'component';
          node.declaredAt = componentSource(stamped);
          node.source ??= node.declaredAt;
          // Loaded as its own chunk. Worth saying: it explains a tag that only turns up after
          // a navigation, and a suspense boundary that had something to wait for.
          if ((raw as { $lazy?: unknown }).$lazy) node.lazy = true;
          if (unnamed.has(node.id)) {
            node.label = stamped;
            unnamed.delete(node.id);
          }
        }
        // Whatever it returned, for a panel asking where this is on the page. Read every
        // sample because a tag can re-render into different elements.
        if (node.kind === 'component' || node.kind === 'control' || node.kind === 'router') {
          const found = elementsIn(raw);
          if (found.length) rendered.set(node.id, found.map((el) => new WeakRef(el)));
          const given = handed.get(node.id);
          if (given) node.props = readProps(given);
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
          moved(node.id);
        }
        runsAtLastSample.set(node.id, node.runs);
      }
      return changed;
    },
    get revision() {
      return revision;
    },
    changedSince(rev) {
      const out: number[] = [];
      for (const [id, at] of revs) if (at > rev) out.push(id);
      return out;
    },
    removedSince(rev) {
      return removed.filter((entry) => entry.rev > rev).map((entry) => entry.id);
    },
    outrun(rev) {
      return removed.length >= REMOVED_LOG && rev < removed[0]!.rev;
    },
    elementsFor(id) {
      const live: Element[] = [];
      const collect = (from: number, where = reaches): void => {
        for (const ref of where.get(from) ?? []) {
          const found = ref.deref();
          // Still in the document: an element detached since the last sample is not
          // somewhere anything can be shown.
          if (found?.isConnected && !live.includes(found)) live.push(found);
        }
      };
      // What the tag itself rendered, which is exact.
      collect(id, rendered);
      if (live.length) return live;
      collect(id);
      // A value drives the element its binding was recorded against. A tag that returned
      // nothing usable falls back to where the values inside it reach.
      if (!live.length) {
        const inside = (node: RNode): boolean => {
          const seen = new Set<number>();
          let at = node.createdIn;
          while (at !== undefined && !seen.has(at)) {
            if (at === id) return true;
            seen.add(at);
            at = graph.get(at)?.createdIn;
          }
          return false;
        };
        for (const node of graph.values()) if (inside(node)) collect(node.id);
      }
      return live;
    },
    setValue(id, next) {
      const node = graph.get(id);
      const write = setters.get(id);
      if (!node || node.kind !== 'state' || !write) return false;
      write(next);
      return true;
    },
    renderedFor(id) {
      const live: Element[] = [];
      for (const ref of rendered.get(id) ?? []) {
        const found = ref.deref();
        if (found?.isConnected && !live.includes(found)) live.push(found);
      }
      return live;
    },
    domFor(id) {
      // Built once per sample. Every tag needs the same element maps, and a page redraws
      // this many times a second.
      described ??= describeAll(graph, (of) => api.renderedFor(of), (of) => api.elementsFor(of), TREE_KINDS);
      return described.get(id) ?? [];
    },
    nodeAt(element) {
      let at: Element | null = element;
      while (at) {
        const id = drivenBy.get(at);
        if (id !== undefined && graph.has(id)) return id;
        at = at.parentElement;
      }
      return undefined;
    },
    takeEvents() {
      return history.take();
    },
    detach() {
      stop();
      internals.clear();
      graph.clear();
      cores.clear();
      rendered.clear();
      setters.clear();
      runsAtLastSample.clear();
      unnamed.clear();
      raws.clear();
      history.clear();
    },
  };

  return api;
}
