// Graph inspector. Lays the graph out left→right by depth (sources left, the effects they feed
// right) and flashes a node when it recomputes. Rebuild structure only on topology change (cheap
// signature check); per frame just update value text + the pulse glow.
import type { RNode, NodeKind } from './reactor.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const COL = 200; // horizontal gap between depth columns
const ROW = 92; // vertical gap between nodes in a column
const NW = 132; // node width
const NH = 56; // node height
const PAD = 48;

const KIND_CLASS: Record<NodeKind, string> = { state: 'n-state', memo: 'n-memo', effect: 'n-effect' };
const KIND_GLYPH: Record<NodeKind, string> = { state: '◆ state', memo: 'ƒ memo', effect: '⚡ effect' };

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  return n;
}

/** Longest-path depth so every edge points strictly rightward (graph is a DAG). */
function computeDepths(graph: Map<number, RNode>): void {
  const memo = new Map<number, number>();
  const depth = (id: number, seen: Set<number>): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return 0; // defensive against cycles
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

export function createGraphView(svg: SVGSVGElement) {
  let signature = '';
  const nodeEls = new Map<number, { g: SVGGElement; value: SVGTextElement; box: SVGRectElement }>();
  let edgeLayer = el('g', { class: 'edges' });
  let nodeLayer = el('g', { class: 'nodes' });
  svg.append(edgeLayer, nodeLayer);

  function rebuild(graph: Map<number, RNode>) {
    computeDepths(graph);
    edgeLayer.remove();
    nodeLayer.remove();
    nodeEls.clear();
    edgeLayer = el('g', { class: 'edges' });
    nodeLayer = el('g', { class: 'nodes' });

    // Column layout: bucket by depth, distribute vertically.
    const byDepth = new Map<number, RNode[]>();
    let maxDepth = 0;
    for (const node of graph.values()) {
      const d = node.depth ?? 0;
      (byDepth.get(d) ?? byDepth.set(d, []).get(d)!).push(node);
      maxDepth = Math.max(maxDepth, d);
    }
    const pos = new Map<number, { x: number; y: number }>();
    let maxRows = 0;
    for (const [d, nodes] of byDepth) maxRows = Math.max(maxRows, nodes.length);
    for (const [d, nodes] of byDepth) {
      const colH = nodes.length * ROW;
      const top = PAD + (maxRows * ROW - colH) / 2;
      nodes.forEach((node, i) => pos.set(node.id, { x: PAD + d * COL, y: top + i * ROW }));
    }

    // Edges first (under nodes).
    for (const node of graph.values()) {
      const to = pos.get(node.id)!;
      for (const dep of node.deps) {
        const from = pos.get(dep);
        if (!from) continue;
        const x1 = from.x + NW;
        const y1 = from.y + NH / 2;
        const x2 = to.x;
        const y2 = to.y + NH / 2;
        const mx = (x1 + x2) / 2;
        const path = el('path', {
          class: 'edge',
          d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`,
          'data-from': dep,
          'data-to': node.id,
        });
        edgeLayer.appendChild(path);
      }
    }

    // Nodes.
    for (const node of graph.values()) {
      const p = pos.get(node.id)!;
      const g = el('g', { class: `node ${KIND_CLASS[node.kind]}`, transform: `translate(${p.x} ${p.y})`, 'data-id': node.id });
      const box = el('rect', { class: 'node-box', width: NW, height: NH, rx: 12 });
      const kind = el('text', { class: 'node-kind', x: 12, y: 20 });
      kind.textContent = KIND_GLYPH[node.kind];
      const label = el('text', { class: 'node-label', x: 12, y: 38 });
      label.textContent = node.label;
      const value = el('text', { class: 'node-value', x: NW - 12, y: 38, 'text-anchor': 'end' });
      value.textContent = node.value ?? '';
      g.append(box, kind, label, value);
      nodeLayer.appendChild(g);
      nodeEls.set(node.id, { g, value, box });
    }

    svg.append(edgeLayer, nodeLayer);
    const width = PAD * 2 + maxDepth * COL + NW;
    const height = PAD * 2 + maxRows * ROW;
    svg.setAttribute('viewBox', `0 0 ${Math.max(width, 400)} ${Math.max(height, 240)}`);
  }

  return {
    update(graph: Map<number, RNode>, now: number) {
      // Signature = topology (ids + kinds + edges). Rebuild only when it changes.
      let sig = '';
      for (const n of graph.values()) sig += `${n.id}:${n.kind}:${[...n.deps].sort().join(',')};`;
      if (sig !== signature) {
        signature = sig;
        rebuild(graph);
      }
      // Per-frame: refresh values + pulse glow.
      for (const node of graph.values()) {
        const eles = nodeEls.get(node.id);
        if (!eles) continue;
        if (node.value !== undefined && eles.value.textContent !== node.value) eles.value.textContent = node.value;
        const age = now - node.lastPulse;
        const intensity = age < 600 ? 1 - age / 600 : 0;
        eles.g.style.setProperty('--pulse', intensity.toFixed(3));
      }
    },
    clear() {
      signature = '';
      edgeLayer.replaceChildren();
      nodeLayer.replaceChildren();
      nodeEls.clear();
    },
  };
}
