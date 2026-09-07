// Graph inspector. Lays the graph out left→right by depth (sources left, the effects they feed
// right), draws read edges solid + write edges dashed, and flashes a node when it recomputes.
// Click a node to select it (onSelect), hover one to follow what it touches, drag to pan and
// wheel to zoom. Structure rebuilds on topology change; per frame just updates value text +
// the pulse glow.
import type { RNode, NodeKind } from './instrument.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const COL = 200;
const ROW = 92;
const NW = 132;
/** file.ts:12 — the path's tail only; the full one is for an inspector with room for it. */
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

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
/** Past this the pointer was panning, not clicking. */
const DRAG_SLOP = 4;

const KIND_CLASS: Record<NodeKind, string> = { state: 'n-state', memo: 'n-memo', effect: 'n-effect', store: 'n-store', resource: 'n-resource', component: 'n-component' };
const KIND_GLYPH: Record<NodeKind, string> = { state: '◆ state', memo: 'ƒ memo', effect: '⚡ effect', store: '▤ store', resource: '⟳ resource', component: '◧ component' };

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

export interface GraphViewOptions {
  onSelect?: (node: RNode | null) => void;
  /**
   * Fold a store's key signals into the store card until it is opened. A cart with four
   * items is a dozen signals nobody asked to see, and the store already shows their value.
   * @default true
   */
  collapseStores?: boolean;
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
}

export function createGraphView(svg: SVGSVGElement, options: GraphViewOptions = {}): GraphView {
  let signature = '';
  let selected: number | null = null;
  const nodeEls = new Map<number, { g: SVGGElement; value: SVGTextElement }>();
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
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale * factor));
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

  function hover(graph: Map<number, RNode>, id: number | null) {
    if (id === null) {
      svg.classList.remove('fx-hovering');
      for (const { g } of nodeEls.values()) g.classList.remove('hot');
      for (const { el: path } of edgeEls) path.classList.remove('hot');
      return;
    }
    // Through the fold: a memo reading `cart.items` is reading the card marked `cart`.
    const set = new Set([...related(graph, id)].map(standIn));
    svg.classList.add('fx-hovering');
    for (const [nodeId, { g }] of nodeEls) g.classList.toggle('hot', set.has(nodeId));
    for (const { a, b, el: path } of edgeEls) path.classList.toggle('hot', set.has(a) && set.has(b));
    // Hovering a node that is folded away is hovering the card it is drawn as.
    const shown = standIn(id);
    nodeEls.get(shown)?.g.classList.add('hot');
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
    const pos = new Map<number, { x: number; y: number }>();
    for (const [d, nodes] of byDepth) {
      const top = PAD + (maxRows * ROW - nodes.length * ROW) / 2;
      nodes.forEach((node, i) => pos.set(node.id, { x: PAD + d * COL, y: top + i * ROW }));
    }

    const curve = (from: { x: number; y: number }, to: { x: number; y: number }) => {
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
      const summary = el('title');
      summary.textContent = `${node.kind} ${node.label}${full ? ` = ${full}` : ''}${
        node.source ? `\n${node.source.file ?? ''}:${node.source.line ?? ''}:${node.source.column ?? ''}` : ''
      }`;
      g.appendChild(summary);

      // Only when the compiler marked it: an empty line here would read as missing data.
      if (node.source) {
        const source = el('text', { class: 'fx-source', x: 12, y: 52 });
        source.setAttribute('clip-path', `url(#${sourceClip})`);
        source.textContent = shortSource(node.source);
        source.appendChild(el('title')).textContent =
          `${node.source.file ?? ''}:${node.source.line ?? ''}:${node.source.column ?? ''}`;
        g.appendChild(source);
      }

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
      g.addEventListener('mouseenter', () => hover(graph, node.id));
      g.addEventListener('mouseleave', () => hover(graph, null));
      g.style.cursor = 'pointer';
      nodeLayer.appendChild(g);
      nodeEls.set(node.id, { g, value });
    }

    viewport.append(edgeLayer, nodeLayer);
    svg.setAttribute('viewBox', `0 0 ${Math.max(PAD * 2 + maxDepth * COL + NW, 400)} ${Math.max(PAD * 2 + maxRows * ROW, 240)}`);
    applySelected();
  }

  let lastGraph: Map<number, RNode> = new Map();

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
      const byDefault = foldStores && (node.kind === 'store' || inStore(node.id)) && !opened.has(node.id);
      if (byDefault || closed.has(node.id)) folded.add(node.id);
    }
    return folded;
  }

  function toggleFold(id: number): boolean {
    const folded = foldedIn(lastGraph).has(id);
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
      const folded = foldedIn(graph);
      let sig = `${[...folded].sort().join(',')}|`;
      for (const n of graph.values())
        sig += `${n.id}:${n.kind}:${[...n.deps].sort().join(',')}>${[...n.writes].sort().join(',')}^${n.createdIn ?? ''};`;
      if (sig !== signature) {
        signature = sig;
        rebuild(graph, folded);
      }
      stageWave(graph, now);

      for (const node of graph.values()) {
        const eles = nodeEls.get(node.id);
        if (!eles) continue;
        const next = fit(node.value);
        if (eles.value.textContent !== next) eles.value.textContent = next;
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
.fx-node.n-external { opacity: .55; }
.fx-node.n-external .fx-box { stroke-dasharray: 3 2; }
.fx-box { fill: var(--fx-node-bg, #131722); stroke: var(--glow, #5eead4); stroke-width: 1.4; stroke-opacity: calc(.5 + var(--pulse,0) * .5); }
.fx-node.selected .fx-box { fill: var(--fx-node-bg-selected, #1a2230); stroke-width: 2.4; }
.fx-kind { fill: var(--glow, #5eead4); font-family: ui-monospace, monospace; font-size: 9.5px; opacity: .85; }
.fx-label { fill: var(--fx-label, #e7e9ee); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; font-weight: 600; }
.fx-value { fill: var(--fx-muted, #8a90a2); font-family: ui-monospace, monospace; font-size: 12px; }
.fx-source { fill: var(--fx-muted, #8a90a2); font-family: ui-monospace, monospace; font-size: 9.5px; opacity: .75; }
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
