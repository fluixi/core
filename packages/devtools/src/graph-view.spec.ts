// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type { RNode } from './instrument.js';
import { createGraphView } from './graph-view.js';

const node = (id: number, over: Partial<RNode> = {}): RNode => ({
  id,
  label: `n${id}`,
  kind: 'state',
  deps: new Set(),
  writes: new Set(),
  runs: 0,
  lastPulse: 0,
  ...over,
});

/** A cart store with two key signals inside it, and a memo reading one of them. */
const storeGraph = () =>
  new Map<number, RNode>([
    [0, node(0, { kind: 'store', label: 'cart' })],
    [1, node(1, { label: 'cart.items', createdIn: 0 })],
    [2, node(2, { label: 'cart.total', createdIn: 0 })],
    [3, node(3, { kind: 'memo', label: 'total', deps: new Set([1]) })],
  ]);

let svg: SVGSVGElement;
beforeEach(() => {
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  document.body.replaceChildren(svg);
});

const labels = () => [...svg.querySelectorAll('.fx-label')].map((n) => n.textContent);
const edges = () => svg.querySelectorAll('.fx-edges path').length;

describe('folding a store', () => {
  it('shows the store and not the signals it made', () => {
    const view = createGraphView(svg);
    view.update(storeGraph());
    expect(labels()).toEqual(['cart', 'total']);
  });

  it('says how many are inside', () => {
    createGraphView(svg).update(storeGraph());
    // The badge carries its own tooltip, so match the head of it.
    expect(svg.querySelector('.fx-fold')?.textContent).toMatch(/^▸ 2/);
  });

  it('draws an edge to the store for what a hidden signal fed', () => {
    createGraphView(svg).update(storeGraph());
    // `total` reads cart.items, which is folded away — so it reads the store.
    expect(edges()).toBe(1);
  });

  it('opens on toggle and shows them again', () => {
    const view = createGraphView(svg);
    const graph = storeGraph();
    view.update(graph);
    view.toggle(0);
    view.update(graph);
    expect(labels().sort()).toEqual(['cart', 'cart.items', 'cart.total', 'total']);
  });

  it('leaves stores open when the host asks for that', () => {
    const view = createGraphView(svg, { collapseStores: false });
    view.update(storeGraph());
    expect(labels()).toHaveLength(4);
  });

  it('does not fold anything that is not a store', () => {
    const view = createGraphView(svg);
    view.update(
      new Map<number, RNode>([
        [0, node(0, { kind: 'component', label: 'App' })],
        [1, node(1, { label: 'count', createdIn: 0 })],
      ]),
    );
    expect(labels().sort()).toEqual(['App', 'count']);
  });
});

describe('hovering a node', () => {
  it('picks out what it reaches and steps the rest back', () => {
    const view = createGraphView(svg, { collapseStores: false });
    view.update(
      new Map<number, RNode>([
        [0, node(0, { label: 'count' })],
        [1, node(1, { kind: 'memo', label: 'double', deps: new Set([0]) })],
        [2, node(2, { label: 'unrelated' })],
      ]),
    );
    const [first] = [...svg.querySelectorAll<SVGGElement>('.fx-node')];
    first!.dispatchEvent(new MouseEvent('mouseenter'));

    expect(svg.classList.contains('fx-hovering')).toBe(true);
    const hot = [...svg.querySelectorAll('.fx-node.hot .fx-label')].map((n) => n.textContent);
    expect(hot.sort()).toEqual(['count', 'double']);

    first!.dispatchEvent(new MouseEvent('mouseleave'));
    expect(svg.classList.contains('fx-hovering')).toBe(false);
  });

  it('follows where values go, not everything a component owns', () => {
    const view = createGraphView(svg, { collapseStores: false });
    view.update(
      new Map<number, RNode>([
        [0, node(0, { kind: 'component', label: 'App' })],
        [1, node(1, { label: 'count', createdIn: 0 })],
        [2, node(2, { kind: 'memo', label: 'double', deps: new Set([1]), createdIn: 0 })],
        [3, node(3, { label: 'name', createdIn: 0 })],
        [4, node(4, { kind: 'memo', label: 'greeting', deps: new Set([3]), createdIn: 0 })],
      ]),
    );
    const byLabel = (text: string) =>
      [...svg.querySelectorAll<SVGGElement>('.fx-node')].find(
        (g) => g.querySelector('.fx-label')?.textContent === text,
      )!;

    byLabel('count').dispatchEvent(new MouseEvent('mouseenter'));
    const hot = [...svg.querySelectorAll('.fx-node.hot .fx-label')].map((n) => n.textContent).sort();
    // Its memo and the component it lives in — not the other half of the same component.
    expect(hot).toEqual(['App', 'count', 'double']);
  });

  it('selects on click, since a click is not a pan', () => {
    let picked: RNode | null = null;
    const view = createGraphView(svg, { onSelect: (n) => (picked = n) });
    view.update(storeGraph());
    const [first] = [...svg.querySelectorAll<SVGGElement>('.fx-node')];
    first!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picked && (picked as RNode).label).toBe('cart');
  });
});

describe('the viewport', () => {
  it('zooms within its limits and comes back', () => {
    const view = createGraphView(svg);
    view.update(storeGraph());
    const at = () => svg.querySelector('.fx-viewport')?.getAttribute('transform') ?? '';

    view.zoomBy(2);
    expect(at()).toContain('scale(2)');
    view.zoomBy(100);
    expect(at()).toContain('scale(4)');
    view.resetView();
    expect(at()).toContain('scale(1)');
  });
});

describe('hovering with a store folded', () => {
  it('lights the store when what feeds the hovered node is inside it', () => {
    const view = createGraphView(svg);
    view.update(storeGraph());
    const memo = [...svg.querySelectorAll<SVGGElement>('.fx-node')].find(
      (g) => g.querySelector('.fx-label')?.textContent === 'total',
    )!;

    memo.dispatchEvent(new MouseEvent('mouseenter'));
    const hot = [...svg.querySelectorAll('.fx-node.hot .fx-label')].map((n) => n.textContent).sort();
    expect(hot).toEqual(['cart', 'total']);
  });
});

/** cart → items → item 0 → its properties, which is what a store of a list looks like. */
const nestedStore = () =>
  new Map<number, RNode>([
    [0, node(0, { kind: 'store', label: 'cart' })],
    [1, node(1, { label: 'cart.items', createdIn: 0 })],
    [2, node(2, { label: 'cart.items[0]', createdIn: 1 })],
    [3, node(3, { label: 'cart.items[0].qty', createdIn: 2 })],
    [4, node(4, { label: 'cart.items[0].price', createdIn: 2 })],
    [5, node(5, { label: 'cart.items[1]', createdIn: 1 })],
    [6, node(6, { label: 'cart.items[1].qty', createdIn: 5 })],
  ]);

describe('opening a store one level at a time', () => {
  it('starts as one card holding everything', () => {
    const view = createGraphView(svg);
    view.update(nestedStore());
    expect(labels()).toEqual(['cart']);
    expect(svg.querySelector('.fx-fold')?.textContent).toMatch(/^▸ 6/);
  });

  it('shows the objects inside, still folded over their own keys', () => {
    const view = createGraphView(svg);
    const graph = nestedStore();
    view.update(graph);
    view.toggle(0);
    view.update(graph);
    expect(labels().sort()).toEqual(['cart', 'cart.items']);

    view.toggle(1);
    view.update(graph);
    expect(labels().sort()).toEqual(['cart', 'cart.items', 'cart.items[0]', 'cart.items[1]']);
  });

  it('opens one object without opening its neighbour', () => {
    const view = createGraphView(svg);
    const graph = nestedStore();
    view.update(graph);
    for (const id of [0, 1, 2]) {
      view.toggle(id);
      view.update(graph);
    }
    expect(labels().sort()).toEqual([
      'cart',
      'cart.items',
      'cart.items[0]',
      'cart.items[0].price',
      'cart.items[0].qty',
      'cart.items[1]',
    ]);
  });

  it('puts the view back where everything fits when the shape changes', () => {
    const view = createGraphView(svg);
    view.update(nestedStore());
    view.zoomBy(3);
    view.toggle(0);
    expect(svg.querySelector('.fx-viewport')?.getAttribute('transform')).toContain('scale(1)');
  });
});

describe('showing a change travelling', () => {
  /** count → double → an effect, the shape every propagation has. */
  const chain = (pulse: number) =>
    new Map<number, RNode>([
      [0, node(0, { label: 'count', lastPulse: pulse })],
      [1, node(1, { kind: 'memo', label: 'double', deps: new Set([0]), lastPulse: pulse })],
      [2, node(2, { kind: 'effect', label: 'log', deps: new Set([1]), lastPulse: pulse })],
    ]);

  const pulseOf = (label: string) =>
    Number(
      [...svg.querySelectorAll<SVGGElement>('.fx-node')]
        .find((g) => g.querySelector('.fx-label')?.textContent === label)!
        .style.getPropertyValue('--pulse'),
    );

  it('lights the source first and the rest in turn', () => {
    const view = createGraphView(svg);
    const graph = chain(1000);
    view.update(graph, 1000);

    // The write is at its brightest; what it feeds has not been reached yet.
    expect(pulseOf('count')).toBeGreaterThan(0.9);
    expect(pulseOf('double')).toBe(0);
    expect(pulseOf('log')).toBe(0);

    view.update(graph, 1120);
    expect(pulseOf('double')).toBeGreaterThan(0);
    expect(pulseOf('log')).toBe(0);

    view.update(graph, 1240);
    expect(pulseOf('log')).toBeGreaterThan(0);
    // By now the one that started it has faded further than the one it fed.
    expect(pulseOf('count')).toBeLessThan(pulseOf('double'));
  });

  it('lights the edge between two steps while the change is on it', () => {
    const view = createGraphView(svg);
    const graph = chain(2000);
    view.update(graph, 2000);
    const edge = svg.querySelector<SVGPathElement>('.fx-edges path')!;

    view.update(graph, 2040);
    expect(Number(edge.style.getPropertyValue('--pulse'))).toBeGreaterThan(0);
    view.update(graph, 2600);
    expect(Number(edge.style.getPropertyValue('--pulse'))).toBe(0);
  });

  it('stages a change once, not on every frame', () => {
    const view = createGraphView(svg);
    const graph = chain(3000);
    view.update(graph, 3000);
    view.update(graph, 3300);
    // Same lastPulse: the wave keeps fading rather than restarting.
    expect(pulseOf('count')).toBeLessThan(0.6);
  });
});

describe('laying the graph out the other way', () => {
  const chainGraph = () =>
    new Map<number, RNode>([
      [0, node(0, { label: 'count' })],
      [1, node(1, { kind: 'memo', label: 'double', deps: new Set([0]) })],
    ]);

  const positionOf = (label: string) => {
    const g = [...svg.querySelectorAll<SVGGElement>('.fx-node')].find(
      (el) => el.querySelector('.fx-label')?.textContent === label,
    )!;
    const [x, y] = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute('transform')!)!.slice(1).map(Number);
    return { x, y };
  };

  it('puts what depends on what to the right, by default', () => {
    createGraphView(svg).update(chainGraph());
    expect(positionOf('double').x).toBeGreaterThan(positionOf('count').x);
    expect(positionOf('double').y).toBe(positionOf('count').y);
  });

  it('puts it below when asked for vertical', () => {
    createGraphView(svg, { direction: 'vertical' }).update(chainGraph());
    expect(positionOf('double').y).toBeGreaterThan(positionOf('count').y);
    expect(positionOf('double').x).toBe(positionOf('count').x);
  });

  it('switches at runtime, and says which way it is', () => {
    const view = createGraphView(svg);
    const graph = chainGraph();
    view.update(graph);
    expect(view.direction).toBe('horizontal');

    view.setDirection('vertical');
    view.update(graph);
    expect(view.direction).toBe('vertical');
    expect(positionOf('double').y).toBeGreaterThan(positionOf('count').y);
  });
});

describe('what the packages made', () => {
  const mixed = () =>
    new Map<number, RNode>([
      [0, node(0, { label: 'count', source: { file: 'src/app.tsx', line: 5 } })],
      [1, node(1, { label: 'revalidation', source: { file: 'core/router.ts', line: 47, external: true } })],
      [2, node(2, { label: 'locale', source: { file: 'core/i18n.ts', line: 111, external: true } })],
    ]);

  it('puts them behind one card by default', () => {
    createGraphView(svg).update(mixed());
    expect(labels().sort()).toEqual(['count', 'packages']);
    expect(svg.querySelector('.fx-fold')?.textContent).toMatch(/^▸ 2/);
  });

  it('opens on toggle, and closes again', () => {
    const view = createGraphView(svg);
    const graph = mixed();
    view.update(graph);
    view.toggle(-1);
    view.update(graph);
    expect(labels().sort()).toEqual(['count', 'locale', 'packages', 'revalidation']);
  });

  it('shows them as themselves when the host turns grouping off', () => {
    const view = createGraphView(svg, { groupExternal: false });
    view.update(mixed());
    expect(labels().sort()).toEqual(['count', 'locale', 'revalidation']);
  });

  it('switches at runtime', () => {
    const view = createGraphView(svg);
    const graph = mixed();
    view.update(graph);
    expect(view.groupExternal).toBe(true);

    view.setGroupExternal(false);
    view.update(graph);
    expect(view.groupExternal).toBe(false);
    expect(labels()).toHaveLength(3);
  });

  it('leaves a node a dependency made inside the application alone', () => {
    const view = createGraphView(svg);
    view.update(
      new Map<number, RNode>([
        [0, node(0, { kind: 'component', label: 'App' })],
        [1, node(1, { label: 'inside', createdIn: 0, source: { file: 'core/i18n.ts', line: 3, external: true } })],
      ]),
    );
    expect(labels().sort()).toEqual(['App', 'inside']);
  });
});
