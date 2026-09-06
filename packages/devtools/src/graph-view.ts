// Graph inspector. Lays the graph out left→right by depth (sources left, the effects they feed
// right), draws read edges solid + write edges dashed, and flashes a node when it recomputes.
// Click a node to select it (onSelect). Structure rebuilds on topology change; per frame just
// updates value text + the pulse glow.
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

const KIND_CLASS: Record<NodeKind, string> = { state: 'n-state', memo: 'n-memo', effect: 'n-effect', store: 'n-store', resource: 'n-resource', component: 'n-component' };
const KIND_GLYPH: Record<NodeKind, string> = { state: '◆ state', memo: 'ƒ memo', effect: '⚡ effect', store: '▤ store', resource: '⟳ resource', component: '◧ component' };

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  return n;
}

// Longest-path depth so every read edge points strictly rightward (the read graph is a DAG).
function computeDepths(graph: Map<number, RNode>): void {
  const memo = new Map<number, number>();
  const depth = (id: number, seen: Set<number>): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const node = graph.get(id);
    let d = 0;
    if (node) for (const dep of node.deps) d = Math.max(d, depth(dep, seen) + 1);
    seen.delete(id);
    memo.set(id, d);
    return d;
  };
  for (const node of graph.values()) node.depth = depth(node.id, new Set());
}

export interface GraphViewOptions {
  onSelect?: (node: RNode | null) => void;
}

export interface GraphView {
  update(graph: Map<number, RNode>, now?: number): void;
  clear(): void;
  select(id: number | null): void;
}

export function createGraphView(svg: SVGSVGElement, options: GraphViewOptions = {}): GraphView {
  let signature = '';
  let selected: number | null = null;
  const nodeEls = new Map<number, { g: SVGGElement; value: SVGTextElement }>();

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

  let edgeLayer = el('g', { class: 'fx-edges' });
  let nodeLayer = el('g', { class: 'fx-nodes' });
  svg.append(defs, edgeLayer, nodeLayer);

  function applySelected() {
    for (const [id, { g }] of nodeEls) g.classList.toggle('selected', id === selected);
  }

  function rebuild(graph: Map<number, RNode>) {
    computeDepths(graph);
    edgeLayer.remove();
    nodeLayer.remove();
    nodeEls.clear();
    edgeLayer = el('g', { class: 'fx-edges' });
    nodeLayer = el('g', { class: 'fx-nodes' });

    const byDepth = new Map<number, RNode[]>();
    let maxDepth = 0;
    for (const node of graph.values()) {
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
    for (const node of graph.values()) {
      const to = pos.get(node.id)!;
      for (const dep of node.deps) {
        const from = pos.get(dep);
        if (from) edgeLayer.appendChild(el('path', { class: 'fx-edge', d: curve(from, to) }));
      }
      // write edges: this node → the signal it sets (reverse direction, dashed)
      for (const w of node.writes) {
        const target = pos.get(w);
        if (target) edgeLayer.appendChild(el('path', { class: 'fx-wedge', d: curve(to, target) }));
      }
    }

    for (const node of graph.values()) {
      const p = pos.get(node.id)!;
      const g = el('g', { class: `fx-node ${KIND_CLASS[node.kind]}`, transform: `translate(${p.x} ${p.y})`, 'data-id': node.id });
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
      g.append(kind, label, value);

      // Only when the compiler marked it: an empty line here would read as missing data.
      if (node.source) {
        const source = el('text', { class: 'fx-source', x: 12, y: 52 });
        source.setAttribute('clip-path', `url(#${sourceClip})`);
        source.textContent = shortSource(node.source);
        source.appendChild(el('title')).textContent =
          `${node.source.file ?? ''}:${node.source.line ?? ''}:${node.source.column ?? ''}`;
        g.appendChild(source);
      }
      g.addEventListener('click', () => {
        selected = node.id;
        applySelected();
        options.onSelect?.(node);
      });
      g.style.cursor = 'pointer';
      nodeLayer.appendChild(g);
      nodeEls.set(node.id, { g, value });
    }

    svg.append(edgeLayer, nodeLayer);
    svg.setAttribute('viewBox', `0 0 ${Math.max(PAD * 2 + maxDepth * COL + NW, 400)} ${Math.max(PAD * 2 + maxRows * ROW, 240)}`);
    applySelected();
  }

  return {
    // Date.now, matching what the reactor stamps on a node — see instrument.ts.
    update(graph, now = Date.now()) {
      let sig = '';
      for (const n of graph.values()) sig += `${n.id}:${n.kind}:${[...n.deps].sort().join(',')}>${[...n.writes].sort().join(',')};`;
      if (sig !== signature) {
        signature = sig;
        rebuild(graph);
      }
      for (const node of graph.values()) {
        const eles = nodeEls.get(node.id);
        if (!eles) continue;
        const next = fit(node.value);
        if (eles.value.textContent !== next) eles.value.textContent = next;
        const age = now - node.lastPulse;
        eles.g.style.setProperty('--pulse', (age < 600 ? 1 - age / 600 : 0).toFixed(3));
      }
    },
    clear() {
      signature = '';
      selected = null;
      edgeLayer.replaceChildren();
      nodeLayer.replaceChildren();
      nodeEls.clear();
      options.onSelect?.(null);
    },
    select(id) {
      selected = id;
      applySelected();
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
.fx-edge { fill: none; stroke: var(--fx-edge, #38415a); stroke-width: 1.6; opacity: .75; }
.fx-wedge { fill: none; stroke: var(--fx-write, #fb7185); stroke-width: 1.4; stroke-dasharray: 3 4; opacity: .65; }
.fx-node { color: var(--fx-accent, #5eead4); filter: drop-shadow(0 0 calc(var(--pulse,0) * 13px) var(--glow, #5eead4)); }
.fx-node.n-state { --glow: var(--state, #34d399); }
.fx-node.n-memo { --glow: var(--memo, #a78bfa); }
.fx-node.n-effect { --glow: var(--effect, #fbbf24); }
.fx-node.n-store { --glow: var(--store, #38bdf8); }
.fx-node.n-resource { --glow: var(--fx-write, #fb7185); }
.fx-node.n-component { --glow: var(--component, #f0abfc); }
.fx-box { fill: var(--fx-node-bg, #131722); stroke: var(--glow, #5eead4); stroke-width: 1.4; stroke-opacity: calc(.5 + var(--pulse,0) * .5); }
.fx-node.selected .fx-box { fill: var(--fx-node-bg-selected, #1a2230); stroke-width: 2.4; }
.fx-kind { fill: var(--glow, #5eead4); font-family: ui-monospace, monospace; font-size: 9.5px; opacity: .85; }
.fx-label { fill: var(--fx-label, #e7e9ee); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; font-weight: 600; }
.fx-value { fill: var(--fx-muted, #8a90a2); font-family: ui-monospace, monospace; font-size: 12px; }
.fx-source { fill: var(--fx-muted, #8a90a2); font-family: ui-monospace, monospace; font-size: 9.5px; opacity: .75; }
.fx-node.n-effect .fx-value { fill: var(--effect, #fbbf24); }
.fx-node.n-resource .fx-value { fill: var(--fx-write, #fb7185); }
`;
