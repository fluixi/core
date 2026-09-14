// Graph inspector. Lays the graph out left→right by depth (sources left, the effects they feed
// right), draws read edges solid + write edges dashed, and flashes a node when it recomputes.
// Click a node to select it (onSelect), hover one to follow what it touches, drag to pan and
// wheel to zoom. Structure rebuilds on topology change; per frame just updates value text +
// the pulse glow.
import type { RNode, NodeKind } from './instrument.js';
import { shortenPath } from './path.js';
import { pluginBadge } from './plugin.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const COL = 200;
const ROW = 92;
const NW = 132;
/** file.ts:12 — the path's tail only; the full one is for an inspector with room for it. */
/**
 * The location a card shows.
 *
 * `source` is where the compiler marked it. A node the compiler never saw — anything the
 * framework made on the application's behalf — carries `usedAt` instead, and a component
 * carries where it was declared. The inspector already falls back this way; the card read
 * only the first of the three, so those nodes showed a location in one place and not the
 * other.
 */
const placeOf = (node: RNode): { file?: string; line?: number; column?: number } | undefined =>
  node.source ?? node.usedAt ?? node.declaredAt;

const shortSource = (s: { file?: string; line?: number; column?: number }): string => {
  const file = (s.file ?? '').split('/').pop() ?? '';
  return s.line == null ? file : `${file}:${s.line}`;
};

/** What the value column holds at 12px monospace, ellipsis included. */
const VALUE_CHARS = 7;
const fit = (v: string | undefined): string => {
  const text = v ?? '';
  return text.length > VALUE_CHARS ? text.slice(0, VALUE_CHARS - 1) + '…' : text;
};
const NH = 62;
const PAD = 48;

/** How far apart two steps of a propagation land, and how long each glow lasts. */
const STEP = 110;
const FLASH = 560;
/** An edge lights while the value is crossing it: from its source's step to the next. */
const EDGE_FLASH = 260;

const MIN_ZOOM = 0.2;
/**
 * How far past natural size the zoom goes.
 *
 * The ceiling cannot be a constant. The viewBox is the whole graph, so a big one is already
 * shrunk to fit before `scale` applies — a five-hundred-node graph is shrunk enormously, and
 * any fixed limit leaves its cards unreadable. The limit is worked out from how much the
 * viewBox is shrinking, so it grows with the graph.
 */
const OVER_NATURAL = 12;
/** For a graph smaller than the panel, where the viewBox is not shrinking anything. */
const MIN_MAX_ZOOM = 8;
/** A transform this deep is a bug somewhere, not a reader looking closely. */
const ABSOLUTE_MAX_ZOOM = 4000;
/** Past this the pointer was panning, not clicking. */
const DRAG_SLOP = 4;

const KIND_CLASS: Record<NodeKind, string> = { state: 'n-state', memo: 'n-memo', effect: 'n-effect', store: 'n-store', resource: 'n-resource', component: 'n-component', control: 'n-control', router: 'n-router', handler: 'n-handler', group: 'n-group', binding: 'n-binding', setter: 'n-setter', directive: 'n-directive', context: 'n-context' };
const KIND_GLYPH: Record<NodeKind, string> = { state: '◆ state', memo: 'ƒ memo', effect: '⚡ effect', store: '▤ store', resource: '⟳ resource', component: '◧ component', control: '⑂ control flow', router: '⤳ router', handler: '⇄ route', group: '▤ framework', binding: '⇥ dom', setter: '✎ sets', directive: '⌘ directive', context: '◈ context' };

/** The card that stands for everything a dependency made and the application never touched. */
const GROUP_ID = -1;

/**
 * Ids for the cards that stand for something outside the graph.
 *
 * Counted down from below the group card, and derived from the node they hang off so they
 * stay the same across renders — an id that moved would make the view rebuild every frame.
 */
/**
 * One card per place in the document, not per reader.
 *
 * Several values can drive the same binding — a resource's three signals all write the same
 * heading — and a card each made them look like duplicates of one another. Ids are handed
 * out per place and kept, so a card kept its identity between frames.
 */
const bindingIds = new Map<string, number>();
const bindingId = (place: string): number => {
  const held = bindingIds.get(place);
  if (held !== undefined) return held;
  const id = -100 - bindingIds.size;
  bindingIds.set(place, id);
  return id;
};
const setterId = (owner: number, index: number): number => -100000 - owner * 32 - index;

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  return n;
}

// Longest-path depth so every read edge points strictly rightward (the read graph is a DAG).
function computeDepths(graph: Map<number, RNode>, deps: (node: RNode) => Iterable<number>): void {
  const memo = new Map<number, number>();
  const depth = (id: number, seen: Set<number>): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const node = graph.get(id);
    let d = 0;
    if (node) for (const dep of deps(node)) d = Math.max(d, depth(dep, seen) + 1);
    seen.delete(id);
    memo.set(id, d);
    return d;
  };
  for (const node of graph.values()) node.depth = depth(node.id, new Set());
}

/** Which way a dependency runs on screen: left to right, or top to bottom. */
export type GraphDirection = 'horizontal' | 'vertical';

export interface GraphViewOptions {
  onSelect?: (node: RNode | null) => void;
  /**
   * Double-clicking a card. Given the node so the host can pick which of its locations to
   * open — a component has one for where it was declared and another for where it was used.
   */
  onReveal?: (node: RNode) => void;
  /**
   * A wide panel reads left to right; a tall narrow one, which is what a side panel usually
   * is, reads top to bottom.
   * @default 'horizontal'
   */
  direction?: GraphDirection;
  /**
   * Fold a store's key signals into the store card until it is opened. A cart with four
   * items is a dozen signals nobody asked to see, and the store already shows their value.
   * @default true
   */
  collapseStores?: boolean;
  /**
   * Put what a dependency made, and the application never asked for, behind one card. A
   * router's revalidation counter is real state, and it is not what anyone opened the graph
   * to look at.
   * @default true
   */
  groupExternal?: boolean;
  /**
   * Draw a card for each place a signal reaches the document, and each place it is set from.
   *
   * Off by default: one card per attribute and text hole is more cards than nodes on most
   * pages, and the graph is about the nodes. On, it is the whole chain — handler, signal,
   * memo, element.
   * @default false
   */
  showBindings?: boolean;
  /**
   * Draw only these kinds. Omitted — or null — draws every kind, which is what an empty
   * filter means to a reader: no filter, rather than nothing to see.
   */
  kinds?: Iterable<NodeKind> | null;
  /** The project a path is shown relative to. See the inspector's option of the same name. */
  root?: string;
}

export interface GraphView {
  update(graph: Map<number, RNode>, now?: number): void;
  clear(): void;
  select(id: number | null): void;
  /** Multiply the zoom, about the middle of the view. */
  zoomBy(factor: number): void;
  /** Back to 1:1, everything in frame. */
  resetView(): void;
  /** Open or fold a node that has children — a store. Returns what it now is. */
  toggle(id: number): boolean;
  /** Lay the graph out along the other axis. */
  setDirection(direction: GraphDirection): void;
  readonly direction: GraphDirection;
  /** Show what dependencies made as one card, or as themselves. */
  setGroupExternal(group: boolean): void;
  readonly groupExternal: boolean;
  /** Show the document and the handlers as cards around the signals. */
  setShowBindings(show: boolean): void;
  readonly showBindings: boolean;
  /** Draw only these kinds; null for all of them. */
  setKinds(kinds: Iterable<NodeKind> | null): void;
  readonly kinds: ReadonlySet<NodeKind> | null;
  /**
   * The graph as drawn, cards included.
   *
   * What a host should resolve a selected id against: the view invents nodes the host's own
   * map has never heard of.
   */
  readonly shown: Map<number, RNode>;
  /** Hold a set lit until called again. Hovering works over it and returns here. */
  focus(ids: readonly number[] | null): void;
}

export function createGraphView(svg: SVGSVGElement, options: GraphViewOptions = {}): GraphView {
  let signature = '';
  let selected: number | null = null;
  /** A set held lit until something clears it — one commit from the timeline. */
  let focused: Set<number> | null = null;
  const nodeEls = new Map<
    number,
    { g: SVGGElement; value: SVGTextElement; source: SVGTextElement; sourceTitle: SVGTitleElement }
  >();
  /** Edges as ids, so hovering a node can pick out the ones that touch it. */
  const edgeEls: { a: number; b: number; el: SVGPathElement }[] = [];
  /**
   * When each node and edge should glow.
   *
   * A write reaches every node that depends on it in one flush, so the graph knows about all
   * of them in the same frame. Flashing them together says "these changed"; flashing them a
   * step apart, along the edges between them, says which one caused which — which is the
   * thing the graph is for.
   */
  const staged = new Map<number, number>();
  const edgeStaged = new Map<SVGPathElement, number>();
  /** The pulse each node was last staged for, so one change is staged once. */
  const stagedFor = new Map<number, number>();
  /** Where a folded-away node is drawn: itself, unless a store it belongs to is folded. */
  let standIn: (id: number) => number = (id) => id;
  /** Stores the viewer opened, and ones it closed again. Nothing else is remembered. */
  const opened = new Set<number>();
  const closed = new Set<number>();
  const foldStores = options.collapseStores !== false;
  let direction: GraphDirection = options.direction ?? 'horizontal';
  let groupExternal = options.groupExternal !== false;
  let showBindings = options.showBindings === true;
  /** Which kinds to draw. Null is every kind, which is not the same as a set holding them all. */
  let kinds: ReadonlySet<NodeKind> | null = options.kinds ? new Set(options.kinds) : null;

  // A clip region per text, not one for the box: the label grows right from the left edge
  // and the value grows left from the right, so clipping both to the same box still let a
  // long label run under the value. Each gets its own half, with a gap between.
  const uid = Math.random().toString(36).slice(2, 8);
  const labelClip = `fx-label-clip-${uid}`;
  const valueClip = `fx-value-clip-${uid}`;
  const LABEL_W = 66;

  const defs = el('defs');
  const forLabel = el('clipPath', { id: labelClip });
  forLabel.appendChild(el('rect', { x: 8, y: 0, width: LABEL_W, height: NH }));
  const sourceClip = `fx-source-clip-${uid}`;
  const forSource = el('clipPath', { id: sourceClip });
  forSource.appendChild(el('rect', { x: 8, y: 0, width: NW - 16, height: NH }));

  const forValue = el('clipPath', { id: valueClip });
  // A little past the box on the right, so the ellipsis itself is not the thing clipped.
  forValue.appendChild(el('rect', { x: 8 + LABEL_W + 6, y: 0, width: NW - LABEL_W - 10, height: NH }));
  defs.append(forLabel, forValue, forSource);

  // Everything drawn hangs off one group, which is what pan and zoom move. The viewBox still
  // sizes the drawing to the graph; this rides on top of it.
  const viewport = el('g', { class: 'fx-viewport' });
  let edgeLayer = el('g', { class: 'fx-edges' });
  let nodeLayer = el('g', { class: 'fx-nodes' });
  viewport.append(edgeLayer, nodeLayer);
  svg.append(defs, viewport);

  /**
   * The furthest in this graph is worth zooming.
   *
   * `meet` fits by whichever axis is tighter, so the scale at which a card is its natural size
   * is the *larger* of the two ratios. Measuring width alone left a tall graph clamped while
   * its nodes were unreadable.
   */
  const maxZoom = (): number => {
    const box = svg.viewBox?.baseVal;
    const rect = svg.getBoundingClientRect?.();
    if (!box?.width || !rect?.width || !rect.height) return MIN_MAX_ZOOM;
    const natural = Math.max(box.width / rect.width, (box.height || 0) / rect.height);
    return Math.min(ABSOLUTE_MAX_ZOOM, Math.max(MIN_MAX_ZOOM, natural * OVER_NATURAL));
  };

  let scale = 1;
  let panX = 0;
  let panY = 0;
  const applyView = () => viewport.setAttribute('transform', `translate(${panX} ${panY}) scale(${scale})`);

  /** Client pixels → the coordinates the drawing is in, before pan and zoom. */
  const toUserSpace = (clientX: number, clientY: number): { x: number; y: number } => {
    const ctm = svg.getScreenCTM?.();
    if (!ctm) return { x: 0, y: 0 };
    const point = Object.assign(svg.createSVGPoint(), { x: clientX, y: clientY }).matrixTransform(ctm.inverse());
    return { x: point.x, y: point.y };
  };

  const zoomAt = (factor: number, at: { x: number; y: number }) => {
    const next = Math.min(maxZoom(), Math.max(MIN_ZOOM, scale * factor));
    if (next === scale) return;
    // Keep whatever is under the cursor under the cursor.
    panX = at.x - ((at.x - panX) * next) / scale;
    panY = at.y - ((at.y - panY) * next) / scale;
    scale = next;
    applyView();
  };

  svg.addEventListener(
    'wheel',
    (event: WheelEvent) => {
      event.preventDefault();
      zoomAt(Math.exp(-event.deltaY * 0.0015), toUserSpace(event.clientX, event.clientY));
    },
    { passive: false },
  );

  let dragging: { x: number; y: number; panX: number; panY: number; moved: boolean } | null = null;
  svg.addEventListener('pointerdown', (event: PointerEvent) => {
    if (event.button !== 0) return;
    // No capture yet. Capturing here retargets every later event at the svg, so the click
    // that follows never reaches the node it was aimed at and nothing gets selected.
    dragging = { x: event.clientX, y: event.clientY, panX, panY, moved: false };
  });
  svg.addEventListener('pointermove', (event: PointerEvent) => {
    if (!dragging) return;
    const dx = event.clientX - dragging.x;
    const dy = event.clientY - dragging.y;
    if (!dragging.moved && Math.abs(dx) + Math.abs(dy) < DRAG_SLOP) return;
    if (!dragging.moved) svg.setPointerCapture?.(event.pointerId);
    dragging.moved = true;
    // Screen pixels are not user units once the viewBox has scaled the drawing.
    const ratio = svg.getScreenCTM?.()?.a || 1;
    panX = dragging.panX + dx / ratio;
    panY = dragging.panY + dy / ratio;
    applyView();
  });
  const endDrag = (event: PointerEvent) => {
    if (dragging?.moved) svg.releasePointerCapture?.(event.pointerId);
    // Cleared after the click event, so a pan does not also select what it started on.
    setTimeout(() => {
      dragging = null;
    }, 0);
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('dblclick', () => {
    scale = 1;
    panX = 0;
    panY = 0;
    applyView();
  });

  /** Order this frame's changes into steps, following the edges that are actually drawn. */
  function stageWave(graph: Map<number, RNode>, now: number): void {
    const fresh: number[] = [];
    for (const node of graph.values()) {
      if (!node.lastPulse || stagedFor.get(node.id) === node.lastPulse) continue;
      stagedFor.set(node.id, node.lastPulse);
      if (nodeEls.has(node.id)) fresh.push(node.id);
    }
    if (!fresh.length) return;

    const changed = new Set(fresh);
    // Only the edges between things that changed together: the rest of the graph is not
    // part of this propagation.
    const after = new Map<number, number[]>();
    for (const { a, b } of edgeEls) {
      if (changed.has(a) && changed.has(b)) (after.get(a) ?? after.set(a, []).get(a)!).push(b);
    }
    const fed = new Set([...after.values()].flat());

    // Breadth-first from what nothing else in this change fed: those are the writes.
    const step = new Map<number, number>();
    const queue: { id: number; depth: number }[] = fresh
      .filter((id) => !fed.has(id))
      .map((id) => ({ id, depth: 0 }));
    // A cycle, or a change with no clear source, still has to be shown.
    if (!queue.length) for (const id of fresh) queue.push({ id, depth: 0 });
    while (queue.length) {
      const { id, depth } = queue.shift()!;
      if (step.has(id)) continue;
      step.set(id, depth);
      for (const next of after.get(id) ?? []) if (!step.has(next)) queue.push({ id: next, depth: depth + 1 });
    }

    for (const id of fresh) staged.set(id, now + (step.get(id) ?? 0) * STEP);
    for (const { a, b, el } of edgeEls) {
      const from = step.get(a);
      const to = step.get(b);
      if (from === undefined || to === undefined || to <= from) continue;
      // Lit while the value is between the two, which is the gap the nodes leave.
      edgeStaged.set(el, now + from * STEP + STEP * 0.35);
    }
  }

  function applySelected() {
    for (const [id, { g }] of nodeEls) g.classList.toggle('selected', id === selected);
  }

  /**
   * What this node is part of: everything upstream of it and everything downstream, along
   * the direction values actually travel.
   *
   * Ownership is one hop only — a component owns most of a page, and following it would
   * light the whole graph up, which is the same as highlighting nothing.
   */
  function related(graph: Map<number, RNode>, from: number): Set<number> {
    const feeds = new Map<number, Set<number>>();
    const fedBy = new Map<number, Set<number>>();
    const link = (source: number, target: number) => {
      (feeds.get(source) ?? feeds.set(source, new Set()).get(source)!).add(target);
      (fedBy.get(target) ?? fedBy.set(target, new Set()).get(target)!).add(source);
    };
    for (const node of graph.values()) {
      for (const dep of node.deps) link(dep, node.id);
      for (const written of node.writes) link(node.id, written);
    }

    const out = new Set<number>([from]);
    const walk = (edges: Map<number, Set<number>>) => {
      const queue = [from];
      while (queue.length) {
        for (const next of edges.get(queue.pop()!) ?? []) {
          if (!out.has(next)) {
            out.add(next);
            queue.push(next);
          }
        }
      }
    };
    walk(feeds);
    walk(fedBy);

    const node = graph.get(from);
    if (node?.createdIn !== undefined) out.add(node.createdIn);
    for (const other of graph.values()) if (other.createdIn === from) out.add(other.id);
    return out;
  }

  /** Light this set and dim the rest; no set puts everything back. */
  function light(set: Set<number> | null) {
    if (!set) {
      svg.classList.remove('fx-hovering');
      for (const { g } of nodeEls.values()) g.classList.remove('hot');
      for (const { el: path } of edgeEls) path.classList.remove('hot');
      return;
    }
    svg.classList.add('fx-hovering');
    for (const [nodeId, { g }] of nodeEls) g.classList.toggle('hot', set.has(nodeId));
    for (const { a, b, el: path } of edgeEls) path.classList.toggle('hot', set.has(a) && set.has(b));
  }

  function hover(graph: Map<number, RNode>, id: number | null) {
    // Back to the focus, not to nothing: leaving a node must not undo a picked commit.
    if (id === null) return light(focused);
    // Through the fold: a memo reading `cart.items` is reading the card marked `cart`.
    const set = new Set([...related(graph, id)].map(standIn));
    light(set);
    // Hovering a node that is folded away is hovering the card it is drawn as.
    nodeEls.get(standIn(id))?.g.classList.add('hot');
  }

  /**
   * The graph as it is drawn: the nodes the application made, plus one card standing for
   * everything a dependency made on its own account.
   *
   * A copy, not the host's map — what is drawn is a view of the graph, and the graph belongs
   * to whoever is filling it.
   */
  /**
   * The document and the handlers, as cards.
   *
   * A binding is not a node, which is why they are plumbing. But "where does this end up" is
   * the one thing the graph cannot otherwise answer, so they can be turned on.
   */
  function withEdges(graph: Map<number, RNode>): Map<number, RNode> {
    if (!showBindings) return graph;
    const shown = new Map(graph);
    let added = false;

    for (const node of graph.values()) {
      node.targets?.forEach((target) => {
        const at = target.source;
        const place = `${target.name ?? ''}|${target.element}|${at?.file ?? ''}:${at?.line ?? ''}:${at?.column ?? ''}`;
        const id = bindingId(place);
        const card = shown.get(id) ?? {
          id,
          label: target.name ? `${target.name} of ${target.element}` : target.element,
          kind: 'binding' as const,
          // The card reads the signal, so the arrow runs the way the value does.
          deps: new Set<number>(),
          writes: new Set<number>(),
          runs: 0,
          lastPulse: 0,
          ...(at ? { source: at } : {}),
        };
        card.deps.add(node.id);
        // Whichever of its readers ran last is when this place last changed.
        card.runs = Math.max(card.runs, node.runs);
        card.lastPulse = Math.max(card.lastPulse, node.lastPulse);
        shown.set(id, card);
        added = true;
      });
      node.setAt?.forEach((at, i) => {
        const id = setterId(node.id, i);
        shown.set(id, {
          id,
          // Two handlers in one component can share an original position; the compiled line
          // is what separates the cards.
          label: `set at ${(at.file ?? '').split('/').pop() ?? '?'}:${at.line ?? ''}${
            at.compiled && at.compiled.line !== at.line ? `→${at.compiled.line}` : ''
          }`,
          kind: 'setter',
          deps: new Set(),
          // A handler writes the signal, so it gets the write edge a computation would.
          writes: new Set([node.id]),
          runs: node.runs,
          // The write edge runs setter → signal, so the wave starts here.
          lastPulse: node.lastPulse,
          source: at,
        });
        added = true;
      });
    }
    return added ? shown : graph;
  }

  /**
   * A node the author did not write: the memo the compiler wraps a component in, the
   * signals a resource keeps, `Show.when`, `mapArray`, `row index`. All of it is real and
   * none of it is anything the author can go and edit.
   *
   * Control flow is excluded on purpose. `Show` and `Switch` are tags in the source, so
   * they stay drawn as themselves.
   */
  const machinery = (n: RNode): boolean =>
    n.authored === false && (n.kind === 'state' || n.kind === 'memo' || n.kind === 'effect');

  /**
   * Cards a view makes rather than nodes the application has. They follow their own toggles
   * and their owner's visibility, so a kind filter does not reach them.
   */
  const VIEW_CARD: ReadonlySet<NodeKind> = new Set<NodeKind>(['group', 'binding', 'setter']);

  const kindKey = (): string => (kinds ? [...kinds].sort().join('+') : '*');

  /**
   * Keep only the kinds asked for. `createdIn` is re-pointed at the nearest ancestor that
   * survived, so hiding the memos around a component does not orphan what they made.
   */
  function onlyKinds(graph: Map<number, RNode>): Map<number, RNode> {
    if (!kinds) return graph;
    const keep = (n: RNode): boolean => VIEW_CARD.has(n.kind) || kinds!.has(n.kind);
    const out = new Map<number, RNode>();
    for (const [id, node] of graph) {
      if (!keep(node)) continue;
      let owner = node.createdIn;
      const seen = new Set<number>();
      while (owner !== undefined && !seen.has(owner)) {
        seen.add(owner);
        const up = graph.get(owner);
        if (up && keep(up)) break;
        owner = up?.createdIn;
      }
      out.set(id, owner === node.createdIn ? node : { ...node, createdIn: owner });
    }
    return out;
  }

  function grouped(graph: Map<number, RNode>): Map<number, RNode> {
    if (!groupExternal) return graph;
    const outsiders = [...graph.values()].filter(
      // A card carries the source of whatever made it, often a package. It already hangs off
      // its signal and must not be moved under the group.
      (n) =>
        (n.source?.external && n.createdIn === undefined && n.kind !== 'binding' && n.kind !== 'setter') ||
        machinery(n),
    );
    if (!outsiders.length) return graph;

    const shown = new Map(graph);
    shown.set(GROUP_ID, {
      id: GROUP_ID,
      label: 'framework',
      kind: 'group',
      deps: new Set(),
      writes: new Set(),
      runs: 0,
      lastPulse: 0,
    });
    // Hung off the card, which is what the existing folding already knows how to draw.
    const moved = new Set(outsiders.map((n) => n.id));
    for (const node of outsiders) shown.set(node.id, { ...node, createdIn: GROUP_ID });

    // What the machinery made is not machinery. A `Show` created inside the memo the
    // compiler wrapped it in would otherwise fold away with it, and the tag the author
    // wrote would be missing from the graph.
    for (const [id, node] of graph) {
      if (moved.has(id) || node.createdIn === undefined) continue;
      let owner: number | undefined = node.createdIn;
      const seen = new Set<number>();
      while (owner !== undefined && moved.has(owner) && !seen.has(owner)) {
        seen.add(owner);
        owner = graph.get(owner)?.createdIn;
      }
      if (owner !== node.createdIn) shown.set(id, { ...node, createdIn: owner });
    }
    return shown;
  }

  function rebuild(graph: Map<number, RNode>, folded: Set<number>) {
    edgeLayer.remove();
    nodeLayer.remove();
    nodeEls.clear();
    edgeEls.length = 0;
    edgeStaged.clear();
    edgeLayer = el('g', { class: 'fx-edges' });
    nodeLayer = el('g', { class: 'fx-nodes' });

    // A node inside a folded store is drawn as the store: its edges become the store's, so
    // a memo reading `cart.total` still visibly reads something.
    standIn = (id: number): number => {
      let at: number | undefined = id;
      let outermost = id;
      const seen = new Set<number>();
      while (at !== undefined && !seen.has(at)) {
        seen.add(at);
        if (folded.has(at) && at !== id) outermost = at;
        at = graph.get(at)?.createdIn;
      }
      return outermost;
    };

    const visible = new Map<number, RNode>();
    const hiddenCount = new Map<number, number>();
    for (const node of graph.values()) {
      const shown = standIn(node.id);
      if (shown === node.id) visible.set(node.id, node);
      else hiddenCount.set(shown, (hiddenCount.get(shown) ?? 0) + 1);
    }

    /** Read edges after folding, deduplicated — several keys of one store are one edge. */
    const readsOf = (node: RNode): Set<number> => {
      const out = new Set<number>();
      for (const dep of node.deps) {
        const from = standIn(dep);
        if (from !== node.id && visible.has(from)) out.add(from);
      }
      if (node.createdIn !== undefined) {
        const owner = standIn(node.createdIn);
        if (owner !== node.id && visible.has(owner)) out.add(owner);
      }
      return out;
    };

    computeDepths(visible, readsOf);

    const byDepth = new Map<number, RNode[]>();
    let maxDepth = 0;
    for (const node of visible.values()) {
      const d = node.depth ?? 0;
      (byDepth.get(d) ?? byDepth.set(d, []).get(d)!).push(node);
      maxDepth = Math.max(maxDepth, d);
    }
    let maxRows = 0;
    for (const nodes of byDepth.values()) maxRows = Math.max(maxRows, nodes.length);
    // Depth runs along one axis and the nodes at a depth along the other; which is which is
    // the only difference between the two layouts.
    const down = direction === 'vertical';
    const STEP_ACROSS = down ? COL + 24 : ROW;
    const pos = new Map<number, { x: number; y: number }>();
    for (const [d, nodes] of byDepth) {
      const offset = PAD + (maxRows * STEP_ACROSS - nodes.length * STEP_ACROSS) / 2;
      nodes.forEach((node, i) =>
        pos.set(
          node.id,
          down
            ? { x: offset + i * STEP_ACROSS, y: PAD + d * (NH + 46) }
            : { x: PAD + d * COL, y: offset + i * STEP_ACROSS },
        ),
      );
    }

    const curve = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      if (down) {
        const x1 = from.x + NW / 2;
        const y1 = from.y + NH;
        const x2 = to.x + NW / 2;
        const y2 = to.y;
        const my = (y1 + y2) / 2;
        return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
      }
      const x1 = from.x + NW;
      const y1 = from.y + NH / 2;
      const x2 = to.x;
      const y2 = to.y + NH / 2;
      const mx = (x1 + x2) / 2;
      return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
    };
    const addEdge = (a: number, b: number, kind: string, d: string) => {
      const path = el('path', { class: kind, d });
      edgeLayer.appendChild(path);
      edgeEls.push({ a, b, el: path });
    };
    for (const node of visible.values()) {
      const to = pos.get(node.id)!;
      const owner = node.createdIn !== undefined ? standIn(node.createdIn) : undefined;
      for (const dep of readsOf(node)) {
        const from = pos.get(dep)!;
        // The one that created it is drawn as what it is, unless it is also read.
        const own = dep === owner && !node.deps.has(dep);
        addEdge(dep, node.id, own ? 'fx-oedge' : 'fx-edge', curve(from, to));
      }
      // write edges: this node → the signal it sets (reverse direction, dashed)
      for (const w of node.writes) {
        const target = pos.get(standIn(w));
        if (target && standIn(w) !== node.id) addEdge(node.id, standIn(w), 'fx-wedge', curve(to, target));
      }
    }

    for (const node of visible.values()) {
      const p = pos.get(node.id)!;
      // A node a dependency made is drawn back, so what the application itself created reads
      // first. Only ever set when the compiler was told to mark dependencies.
      const from = node.source?.external ? ' n-external' : '';
      const g = el('g', { class: `fx-node ${KIND_CLASS[node.kind]}${from}`, transform: `translate(${p.x} ${p.y})`, 'data-id': node.id });
      g.appendChild(el('rect', { class: 'fx-box', width: NW, height: NH, rx: 12 }));
      const kind = el('text', { class: 'fx-kind', x: 12, y: 20 });
      kind.textContent = KIND_GLYPH[node.kind];
      const label = el('text', { class: 'fx-label', x: 12, y: 38 });
      label.setAttribute('clip-path', `url(#${labelClip})`);
      label.textContent = node.label;
      // Left-anchored and truncated rather than clipped from the right: an end-anchored
      // string is cut at its start, so a store's value showed the tail of a json blob —
      // `unter…`, `"App"}` — instead of what it is.
      const value = el('text', { class: 'fx-value', x: 8 + LABEL_W + 6, y: 38 });
      value.setAttribute('clip-path', `url(#${valueClip})`);
      value.textContent = fit(node.value);
      // The card has room for a dozen characters of a value that can be an object. The rest
      // is here, on hover, rather than nowhere.
      const full = node.detail ?? node.value;
      if (full) value.appendChild(el('title')).textContent = full;
      g.append(kind, label, value);
      // A routed component arrives with its chunk, so it is missing from the graph until the
      // navigation that fetches it. Saying so beats looking like it was never there.
      if (node.lazy) {
        const chunk = el('text', { class: 'fx-lazy', x: 12, y: 52 });
        chunk.textContent = 'lazy';
        chunk.appendChild(el('title')).textContent = 'loaded as its own chunk';
        g.appendChild(chunk);
      }
      // What a plugin wants said about this node. Right-aligned so it does not collide with
      // the lazy mark on the same line.
      const mark = pluginBadge(node);
      if (mark) {
        const badge = el('text', { class: 'fx-plugin', x: NW - 12, y: 52, 'text-anchor': 'end' });
        badge.textContent = fit(mark);
        badge.appendChild(el('title')).textContent = mark;
        g.appendChild(badge);
      }
      const summary = el('title');
      summary.textContent = `${node.kind} ${node.label}${node.lazy ? ' (lazy)' : ''}${full ? ` = ${full}` : ''}${
        placeOf(node)
          ? `\n${placeOf(node)!.file ?? ''}:${placeOf(node)!.line ?? ''}:${placeOf(node)!.column ?? ''}`
          : ''
      }`;
      g.appendChild(summary);

      // Always made, filled per frame. A source can arrive after the card does — the layout
      // signature does not depend on it, so waiting for a rebuild meant it never showed.
      // Empty text draws nothing, so an unmarked node still reads as unmarked.
      const source = el('text', { class: 'fx-source', x: 12, y: 52 });
      source.setAttribute('clip-path', `url(#${sourceClip})`);
      const sourceTitle = el('title');
      source.appendChild(sourceTitle);
      g.appendChild(source);

      // Anything that made other nodes can hide them. A store makes one per key it is read
      // by, which is most of what fills a graph up.
      const inside = hiddenCount.get(node.id) ?? 0;
      const owns = inside > 0 || [...graph.values()].some((n) => n.createdIn === node.id);
      if (owns) {
        const badge = el('text', { class: 'fx-fold', x: NW - 12, y: 20, 'text-anchor': 'end' });
        badge.textContent = inside > 0 ? `▸ ${inside}` : '▾';
        badge.appendChild(el('title')).textContent = inside > 0 ? `show ${inside} inside` : 'fold what is inside';
        badge.addEventListener('click', (event) => {
          event.stopPropagation();
          toggleFold(node.id);
        });
        g.appendChild(badge);
      }

      g.addEventListener('click', () => {
        // A pan that ended on a node is not a click on it.
        if (dragging?.moved) return;
        selected = node.id;
        applySelected();
        options.onSelect?.(node);
      });
      g.addEventListener('dblclick', (event) => {
        if (!options.onReveal) return;
        // The svg's own dblclick resets the zoom, which is not what a double-click on a
        // card is asking for.
        event.stopPropagation();
        options.onReveal(node);
      });
      g.addEventListener('mouseenter', () => hover(graph, node.id));
      g.addEventListener('mouseleave', () => hover(graph, null));
      g.style.cursor = 'pointer';
      nodeLayer.appendChild(g);
      nodeEls.set(node.id, { g, value, source, sourceTitle });
    }

    viewport.append(edgeLayer, nodeLayer);
    const width = down ? PAD * 2 + maxRows * STEP_ACROSS + NW : PAD * 2 + maxDepth * COL + NW;
    const height = down ? PAD * 2 + (maxDepth + 1) * (NH + 46) : PAD * 2 + maxRows * ROW;
    svg.setAttribute('viewBox', `0 0 ${Math.max(width, 400)} ${Math.max(height, 240)}`);
    applySelected();
  }

  let lastGraph: Map<number, RNode> = new Map();
  /**
   * The graph as drawn, including the cards the view invents.
   *
   * A host holds the real graph and cannot resolve a binding card by id, so selecting one
   * left the inspector empty. This is what it should look the selection up in.
   */
  let lastShown: Map<number, RNode> = new Map();

  /**
   * What is folded right now: a store and anything inside it, minus what the viewer opened.
   *
   * Nesting matters — a cart holds items, an item holds its properties. Opening the store
   * shows the items as their own cards, each still folded over its own keys, rather than
   * every signal in the tree at once.
   */
  function foldedIn(graph: Map<number, RNode>): Set<number> {
    const hasChildren = new Set<number>();
    for (const node of graph.values()) if (node.createdIn !== undefined) hasChildren.add(node.createdIn);

    const inStore = (id: number): boolean => {
      const seen = new Set<number>();
      let at = graph.get(id)?.createdIn;
      while (at !== undefined && !seen.has(at)) {
        seen.add(at);
        const up = graph.get(at);
        if (up?.kind === 'store') return true;
        at = up?.createdIn;
      }
      return false;
    };

    const folded = new Set<number>();
    for (const node of graph.values()) {
      if (!hasChildren.has(node.id)) continue;
      const byDefault =
        (node.kind === 'group' || (foldStores && (node.kind === 'store' || inStore(node.id)))) &&
        !opened.has(node.id);
      if (byDefault || closed.has(node.id)) folded.add(node.id);
    }
    return folded;
  }

  function toggleFold(id: number): boolean {
    // The grouped view, not the host's graph: the card standing for the packages only exists
    // in the former, so asking the latter says it is not folded and the toggle does nothing.
    const folded = foldedIn(grouped(lastGraph)).has(id);
    if (folded) {
      opened.add(id);
      closed.delete(id);
    } else {
      closed.add(id);
      opened.delete(id);
    }
    signature = '';
    // What is on screen changed shape, so whatever the view was zoomed into is gone. Back to
    // the whole graph in frame rather than a viewport pointing at nothing.
    scale = 1;
    panX = 0;
    panY = 0;
    applyView();
    return !folded;
  }

  return {
    // Date.now, matching what the reactor stamps on a node — see instrument.ts.
    update(graph, now = Date.now()) {
      lastGraph = graph;
      // Bindings first: a card hung off a signal is not an outsider.
      const shown = grouped(withEdges(onlyKinds(graph)));
      lastShown = shown;
      const folded = foldedIn(shown);
      let sig = `${[...folded].sort().join(',')}|${groupExternal}|${direction}|${kindKey()}|`;
      for (const n of shown.values())
        sig += `${n.id}:${n.kind}:${[...n.deps].sort().join(',')}>${[...n.writes].sort().join(',')}^${n.createdIn ?? ''};`;
      if (sig !== signature) {
        signature = sig;
        rebuild(shown, folded);
        // The elements are new, so what was lit is not.
        if (focused) light(focused);
      }
      stageWave(shown, now);

      for (const node of shown.values()) {
        const eles = nodeEls.get(node.id);
        if (!eles) continue;
        const next = fit(node.value);
        if (eles.value.textContent !== next) eles.value.textContent = next;
        const place = placeOf(node);
        const where = place ? shortSource(place) : '';
        if (eles.source.textContent !== where) {
          eles.source.textContent = where;
          // The card shows the file name; the tooltip has room for where it sits, which for
          // a node the framework made is a path on the machine that ran it.
          eles.sourceTitle.textContent = place
            ? `${place.file ? shortenPath(place.file, options.root) : ''}:${place.line ?? ''}:${place.column ?? ''}`
            : '';
        }
        // Nothing before its turn: a node three steps down the chain sits dark until the
        // change reaches it.
        const age = now - (staged.get(node.id) ?? node.lastPulse);
        eles.g.style.setProperty('--pulse', (age >= 0 && age < FLASH ? 1 - age / FLASH : 0).toFixed(3));
      }

      for (const { el } of edgeEls) {
        const at = edgeStaged.get(el);
        const age = at === undefined ? Infinity : now - at;
        el.style.setProperty('--pulse', (age >= 0 && age < EDGE_FLASH ? 1 - age / EDGE_FLASH : 0).toFixed(3));
      }
    },
    clear() {
      signature = '';
      selected = null;
      focused = null;
      svg.classList.remove('fx-hovering');
      edgeLayer.replaceChildren();
      nodeLayer.replaceChildren();
      nodeEls.clear();
      edgeEls.length = 0;
      staged.clear();
      stagedFor.clear();
      edgeStaged.clear();
      options.onSelect?.(null);
    },
    select(id) {
      selected = id;
      applySelected();
    },
    zoomBy(factor) {
      const box = svg.viewBox?.baseVal;
      zoomAt(factor, { x: (box?.width ?? 400) / 2, y: (box?.height ?? 240) / 2 });
    },
    resetView() {
      scale = 1;
      panX = 0;
      panY = 0;
      applyView();
    },
    toggle: toggleFold,
    setGroupExternal(next) {
      if (groupExternal === next) return;
      groupExternal = next;
      signature = '';
      scale = 1;
      panX = 0;
      panY = 0;
      applyView();
    },
    get groupExternal() {
      return groupExternal;
    },
    setShowBindings(next) {
      if (showBindings === next) return;
      showBindings = next;
      // The topology changed, so the layout is worked out again.
      signature = '';
    },
    get showBindings() {
      return showBindings;
    },
    setKinds(next) {
      const key = next ? [...next].sort().join('+') : '*';
      if (key === kindKey()) return;
      kinds = next ? new Set(next) : null;
      // Fewer nodes is a different graph: it is laid out again rather than hidden in place.
      signature = '';
    },
    get kinds() {
      return kinds;
    },
    get shown() {
      return lastShown;
    },
    focus(ids) {
      // Through the fold, like hovering.
      focused = ids?.length ? new Set(ids.map(standIn)) : null;
      light(focused);
    },
    setDirection(next) {
      if (direction === next) return;
      direction = next;
      signature = '';
      // The drawing is a different shape now, so the viewport starts over.
      scale = 1;
      panX = 0;
      panY = 0;
      applyView();
    },
    get direction() {
      return direction;
    },
  };
}

/**
 * Default theme.
 *
 * Every colour reads a custom property first, so a host that defines them — a page with a
 * light mode, say — restyles the graph without replacing this. The fallbacks are the dark
 * values it always had. The four node hues stay as they are: here colour is the distinction
 * being drawn, not decoration.
 */
export const DEVTOOLS_CSS = `
/* An edge carries a pulse while the change is crossing it, so a propagation reads as one
   thing moving rather than everything lighting at once. */
.fx-edge {
  fill: none;
  stroke: var(--fx-edge, #38415a);
  stroke-width: calc(1.6px + var(--pulse, 0) * 1.7px);
  opacity: calc(.75 + var(--pulse, 0) * .25);
  filter: drop-shadow(0 0 calc(var(--pulse, 0) * 5px) var(--fx-accent, #5eead4));
}
.fx-oedge { fill: none; stroke: var(--fx-own, #64748b); stroke-width: 1.2; stroke-dasharray: 1 4; stroke-linecap: round; opacity: .55; }
.fx-wedge {
  fill: none;
  stroke: var(--fx-write, #fb7185);
  stroke-width: calc(1.4px + var(--pulse, 0) * 1.6px);
  stroke-dasharray: 3 4;
  opacity: calc(.65 + var(--pulse, 0) * .35);
}
.fx-node { color: var(--fx-accent, #5eead4); filter: drop-shadow(0 0 calc(var(--pulse,0) * 13px) var(--glow, #5eead4)); }
.fx-node.n-state { --glow: var(--state, #34d399); }
.fx-node.n-memo { --glow: var(--memo, #a78bfa); }
.fx-node.n-effect { --glow: var(--effect, #fbbf24); }
.fx-node.n-store { --glow: var(--store, #38bdf8); }
.fx-node.n-resource { --glow: var(--fx-write, #fb7185); }
.fx-node.n-component { --glow: var(--component, #f0abfc); }
.fx-node.n-group { --glow: var(--fx-muted, #8a90a2); opacity: .8; }
.fx-node.n-group .fx-box { stroke-dasharray: 4 3; }
/* Neither is a node: dashed and dimmer, so the reactive shape reads first. */
.fx-node.n-control { --glow: var(--control, #7dd3fc); }
.fx-node.n-router { --glow: var(--router, #c4b5fd); }
.fx-node.n-handler { --glow: var(--handler, #fca5a5); }
.fx-node.n-binding { --glow: var(--fx-accent, #5eead4); opacity: .72; }
.fx-node.n-setter { --glow: var(--fx-write, #fb7185); opacity: .72; }
.fx-node.n-binding .fx-box, .fx-node.n-setter .fx-box { stroke-dasharray: 3 3; }
.fx-node.n-external { opacity: .55; }
.fx-node.n-external .fx-box { stroke-dasharray: 3 2; }
.fx-box { fill: var(--fx-node-bg, #131722); stroke: var(--glow, #5eead4); stroke-width: 1.4; stroke-opacity: calc(.5 + var(--pulse,0) * .5); }
.fx-node.selected .fx-box { fill: var(--fx-node-bg-selected, #1a2230); stroke-width: 2.4; }
.fx-kind { fill: var(--glow, #5eead4); font-family: ui-monospace, monospace; font-size: 9.5px; opacity: .85; }
.fx-label { fill: var(--fx-label, #e7e9ee); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; font-weight: 600; }
.fx-value { fill: var(--fx-muted, #8a90a2); font-family: ui-monospace, monospace; font-size: 12px; }
.fx-source { fill: var(--fx-muted, #8a90a2); font-family: ui-monospace, monospace; font-size: 9.5px; opacity: .75; }
.fx-plugin { fill: var(--fx-accent, #5eead4); font-family: ui-monospace, monospace; font-size: 9px; opacity: .9; }
.fx-lazy { fill: var(--fx-router, #7dd3fc); font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: .04em; opacity: .9; }
.fx-fold { fill: var(--glow, #5eead4); font-family: ui-monospace, monospace; font-size: 10px; cursor: pointer; opacity: .8; }
.fx-fold:hover { opacity: 1; }
.fx-node.n-effect .fx-value { fill: var(--effect, #fbbf24); }
.fx-node.n-resource .fx-value { fill: var(--fx-write, #fb7185); }
/* Hovering one node is a question about that node: everything it cannot reach steps back. */
.fx-hovering .fx-node { opacity: .2; transition: opacity .12s ease; }
.fx-hovering .fx-node.hot { opacity: 1; }
.fx-hovering .fx-node.n-external.hot { opacity: .7; }
.fx-hovering .fx-edge, .fx-hovering .fx-oedge, .fx-hovering .fx-wedge { opacity: .08; }
.fx-hovering .fx-edge.hot { opacity: 1; stroke: var(--fx-accent, #5eead4); }
.fx-hovering .fx-oedge.hot { opacity: .8; }
.fx-hovering .fx-wedge.hot { opacity: .9; }
`;
