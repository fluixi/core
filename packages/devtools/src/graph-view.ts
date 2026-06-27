// Graph inspector. Lays the graph out left→right by depth (sources left, the effects they feed
// right), draws read edges solid + write edges dashed, and flashes a node when it recomputes.
// Click a node to select it (onSelect). Structure rebuilds on topology change; per frame just
// updates value text + the pulse glow.
import type { RNode, NodeKind } from './instrument.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const COL = 200;
const ROW = 92;
const NW = 132;
const NH = 56;
const PAD = 48;

const KIND_CLASS: Record<NodeKind, string> = { state: 'n-state', memo: 'n-memo', effect: 'n-effect', store: 'n-store', resource: 'n-resource' };
const KIND_GLYPH: Record<NodeKind, string> = { state: '◆ state', memo: 'ƒ memo', effect: '⚡ effect', store: '▤ store', resource: '⟳ resource' };

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
  let edgeLayer = el('g', { class: 'fx-edges' });
  let nodeLayer = el('g', { class: 'fx-nodes' });
  svg.append(edgeLayer, nodeLayer);

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
      label.textContent = node.label;
      const value = el('text', { class: 'fx-value', x: NW - 12, y: 38, 'text-anchor': 'end' });
      value.textContent = node.value ?? '';
      g.append(kind, label, value);
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
    update(graph, now = performance.now()) {
      let sig = '';
      for (const n of graph.values()) sig += `${n.id}:${n.kind}:${[...n.deps].sort().join(',')}>${[...n.writes].sort().join(',')};`;
      if (sig !== signature) {
        signature = sig;
        rebuild(graph);
      }
      for (const node of graph.values()) {
        const eles = nodeEls.get(node.id);
        if (!eles) continue;
        if (node.value !== undefined && eles.value.textContent !== node.value) eles.value.textContent = node.value;
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

// default theme; override the fx-* classes to restyle
export const DEVTOOLS_CSS = `
.fx-edge { fill: none; stroke: #38415a; stroke-width: 1.6; opacity: .75; }
.fx-wedge { fill: none; stroke: #fb7185; stroke-width: 1.4; stroke-dasharray: 3 4; opacity: .65; }
.fx-node { color: #5eead4; filter: drop-shadow(0 0 calc(var(--pulse,0) * 13px) var(--glow, #5eead4)); }
.fx-node.n-state { --glow: #34d399; }
.fx-node.n-memo { --glow: #a78bfa; }
.fx-node.n-effect { --glow: #fbbf24; }
.fx-node.n-store { --glow: #38bdf8; }
.fx-node.n-resource { --glow: #fb7185; }
.fx-box { fill: #131722; stroke: var(--glow, #5eead4); stroke-width: 1.4; stroke-opacity: calc(.5 + var(--pulse,0) * .5); }
.fx-node.selected .fx-box { fill: #1a2230; stroke-width: 2.4; }
.fx-kind { fill: var(--glow, #5eead4); font-family: ui-monospace, monospace; font-size: 9.5px; opacity: .85; }
.fx-label { fill: #e7e9ee; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; font-weight: 600; }
.fx-value { fill: #8a90a2; font-family: ui-monospace, monospace; font-size: 12px; }
.fx-node.n-effect .fx-value { fill: #fbbf24; }
.fx-node.n-resource .fx-value { fill: #fb7185; }
`;
