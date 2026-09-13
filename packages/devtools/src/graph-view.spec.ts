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
    // With no layout to measure, the floor is what a graph smaller than its panel gets.
    view.zoomBy(1000);
    expect(at()).toContain('scale(8)');
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

describe('what the framework made', () => {
  /** A component the author wrote, and the memo and internals the compiler put round it. */
  const withMachinery = () =>
    new Map<number, RNode>([
      [0, node(0, { label: 'count', authored: true })],
      [1, node(1, { kind: 'component', label: 'App', authored: true })],
      [2, node(2, { kind: 'memo', label: 'm2', authored: false, createdIn: 1 })],
      [3, node(3, { kind: 'memo', label: 'Show.when', authored: false, createdIn: 2 })],
      [4, node(4, { kind: 'control', label: 'Show', authored: false, createdIn: 2 })],
    ]);

  it('keeps the memos it made behind the card, and leaves control flow drawn', () => {
    createGraphView(svg).update(withMachinery());
    expect(labels().sort()).toEqual(['App', 'Show', 'count', 'framework']);
  });

  it('shows them as themselves when grouping is off', () => {
    const view = createGraphView(svg, { groupExternal: false });
    view.update(withMachinery());
    expect(labels().sort()).toEqual(['App', 'Show', 'Show.when', 'count', 'm2']);
  });
});

describe('filtering by kind', () => {
  const mix = () =>
    new Map<number, RNode>([
      [0, node(0, { label: 'count', authored: true })],
      [1, node(1, { kind: 'memo', label: 'total', authored: true })],
      [2, node(2, { kind: 'component', label: 'App', authored: true })],
      [3, node(3, { kind: 'control', label: 'Show', createdIn: 2 })],
    ]);

  it('draws every kind until a filter is set', () => {
    const view = createGraphView(svg);
    view.update(mix());
    expect(view.kinds).toBeNull();
    expect(labels()).toHaveLength(4);
  });

  it('draws only the kinds asked for', () => {
    const view = createGraphView(svg, { groupExternal: false });
    view.setKinds(['state', 'memo']);
    view.update(mix());
    expect(labels().sort()).toEqual(['count', 'total']);
  });

  it('goes back to all of them on null', () => {
    const view = createGraphView(svg, { groupExternal: false });
    view.setKinds(['state']);
    view.update(mix());
    expect(labels()).toEqual(['count']);

    view.setKinds(null);
    view.update(mix());
    expect(labels()).toHaveLength(4);
  });

  it('re-points what a hidden node made at the nearest one still drawn', () => {
    // `Show` was made in `App`. With components hidden it has to hang off something that
    // is still there, or it is drawn as a root of its own.
    const graph = new Map<number, RNode>([
      [0, node(0, { kind: 'component', label: 'App', authored: true })],
      [1, node(1, { kind: 'memo', label: 'm1', createdIn: 0 })],
      [2, node(2, { kind: 'control', label: 'Show', createdIn: 1 })],
    ]);
    const view = createGraphView(svg, { groupExternal: false });
    view.setKinds(['component', 'control']);
    view.update(graph);
    expect(labels().sort()).toEqual(['App', 'Show']);
    expect(view.shown.get(2)?.createdIn).toBe(0);
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
    expect(labels().sort()).toEqual(['count', 'framework']);
    expect(svg.querySelector('.fx-fold')?.textContent).toMatch(/^▸ 2/);
  });

  it('opens on toggle, and closes again', () => {
    const view = createGraphView(svg);
    const graph = mixed();
    view.update(graph);
    view.toggle(-1);
    view.update(graph);
    expect(labels().sort()).toEqual(['count', 'framework', 'locale', 'revalidation']);
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

describe('focusing a commit', () => {
  const lit = () => [...svg.querySelectorAll('.fx-node.hot')].length;

  it('holds a set lit, and lets go of it', () => {
    const view = createGraphView(svg, { collapseStores: false });
    view.update(storeGraph());

    view.focus([1, 3]);
    expect(svg.classList.contains('fx-hovering')).toBe(true);
    expect(lit()).toBe(2);

    view.focus(null);
    expect(svg.classList.contains('fx-hovering')).toBe(false);
    expect(lit()).toBe(0);
  });

  it('goes back to the focus when the pointer leaves a node, not to nothing', () => {
    const view = createGraphView(svg, { collapseStores: false });
    view.update(storeGraph());
    view.focus([1, 3]);

    const first = svg.querySelector('.fx-node') as SVGGElement;
    first.dispatchEvent(new MouseEvent('mouseenter'));
    first.dispatchEvent(new MouseEvent('mouseleave'));

    expect(lit()).toBe(2);
  });

  it('keeps the focus across a rebuild', () => {
    const view = createGraphView(svg, { collapseStores: false });
    const graph = storeGraph();
    view.update(graph);
    view.focus([1, 3]);

    // A new node changes the signature, so the elements are rebuilt from scratch.
    graph.set(4, node(4, { label: 'extra' }));
    view.update(graph);

    expect(lit()).toBe(2);
  });
});

describe('the document and the handlers as cards', () => {
  const withDom = () =>
    new Map<number, RNode>([
      [
        0,
        node(0, {
          label: 'count',
          targets: [{ kind: 'content', element: 'span.total' }],
          setAt: [{ file: 'src/App.tsx', line: 14, column: 6 }],
        }),
      ],
      [1, node(1, { kind: 'memo', label: 'double', deps: new Set([0]) })],
    ]);

  it('draws nothing extra until it is turned on', () => {
    const view = createGraphView(svg);
    view.update(withDom());
    expect(labels()).toEqual(['count', 'double']);
  });

  it('draws a card for what a signal reaches, and what sets it', () => {
    const view = createGraphView(svg, { showBindings: true });
    view.update(withDom());
    expect(labels()).toContain('span.total');
    expect(labels()).toContain('set at App.tsx:14');
  });

  it('links them: the binding reads the signal, the setter writes it', () => {
    // One view per svg: two views appending to the same element would count each other's
    // edges, which is what made the first version of this test read 4.
    const drawnIn = (options: Parameters<typeof createGraphView>[1]) => {
      const own = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      createGraphView(own, options).update(withDom());
      return own.querySelectorAll('.fx-edges path').length;
    };

    // double → count, and nothing else.
    expect(drawnIn({})).toBe(1);
    // Plus count → span.total, and set-at → count.
    expect(drawnIn({ showBindings: true })).toBe(3);
  });

  it('turns back off, and the graph is what it was', () => {
    const view = createGraphView(svg, { showBindings: true });
    view.update(withDom());
    view.setShowBindings(false);
    view.update(withDom());
    expect(labels()).toEqual(['count', 'double']);
  });

  it('draws one card per place, however many values write there', () => {
    // A resource's three signals all write the same heading. A card each read as three
    // copies of one binding.
    const target = {
      kind: 'content' as const,
      element: 'h1',
      source: { file: 'src/Home.tsx', line: 13, column: 4 },
    };
    const graph = new Map<number, RNode>([
      [0, node(0, { label: 'value', targets: [target] })],
      [1, node(1, { label: 'error', targets: [target] })],
      [2, node(2, { label: 'state', targets: [target] })],
    ]);
    const view = createGraphView(svg, { showBindings: true, groupExternal: false });
    view.update(graph);

    const cards = [...view.shown.values()].filter((n) => n.kind === 'binding');
    expect(cards).toHaveLength(1);
    expect([...cards[0]!.deps].sort()).toEqual([0, 1, 2]);
  });

  it('keeps two places apart, even with the same element', () => {
    const graph = new Map<number, RNode>([
      [0, node(0, {
        targets: [
          { kind: 'content', element: 'span', source: { file: 'a.tsx', line: 1, column: 0 } },
          { kind: 'content', element: 'span', source: { file: 'a.tsx', line: 9, column: 0 } },
        ],
      })],
    ]);
    const view = createGraphView(svg, { showBindings: true, groupExternal: false });
    view.update(graph);
    expect([...view.shown.values()].filter((n) => n.kind === 'binding')).toHaveLength(2);
  });

  it('keeps a binding card out of the packages group', () => {
    const graph = new Map<number, RNode>([
      [
        0,
        node(0, {
          label: 'locale',
          source: { file: 'node_modules/@fluixi/core/i18n.js', line: 3, column: 1, external: true },
          // The binding was wired up inside the package too, which is what used to sweep it
          // into the group card and detach it from its signal.
          targets: [{ kind: 'content', element: 'p', source: { file: 'node_modules/x.js', line: 1, column: 1, external: true } }],
        }),
      ],
    ]);
    const view = createGraphView(svg, { showBindings: true, groupExternal: true });
    view.update(graph);
    expect(labels()).toContain('p');
  });
});

describe('cards in the propagation', () => {
  it('lights the handler, then the signal, then the dom it reaches', () => {
    const t = 1_000_000;
    const graph = new Map<number, RNode>([
      [
        0,
        node(0, {
          label: 'count',
          lastPulse: t,
          targets: [{ kind: 'attribute', name: 'data-n', element: 'span' }],
          setAt: [{ file: 'src/App.tsx', line: 9, column: 4 }],
        }),
      ],
    ]);
    const view = createGraphView(svg, { showBindings: true });
    view.update(graph, t);

    const lit = (at: number): string[] => {
      view.update(graph, at);
      return [...svg.querySelectorAll('.fx-node')]
        .filter((g) => Number((g as SVGGElement).style.getPropertyValue('--pulse')) > 0)
        .map((g) => g.querySelector('.fx-label')?.textContent ?? '');
    };

    // A card carries the pulse of the signal it hangs off, so it is staged along the wave
    // like any other node. STEP is 110ms.
    expect(lit(t)).toEqual(['set at App.tsx:9']);
    expect(lit(t + 110)).toContain('count');
    expect(lit(t + 220)).toContain('data-n of span');
  });

  it('resolves a card the host has never heard of', () => {
    const graph = new Map<number, RNode>([
      [0, node(0, { label: 'count', targets: [{ kind: 'content', element: 'b' }] })],
    ]);
    const view = createGraphView(svg, { showBindings: true });
    view.update(graph);

    const card = [...view.shown.values()].find((n) => n.kind === 'binding')!;
    // Only in the view: a host looking this up in its own map found nothing, which is why
    // clicking a card left the inspector empty.
    expect(graph.has(card.id)).toBe(false);
    expect(view.shown.get(card.id)?.label).toBe('b');
  });
});

describe('how far the zoom goes', () => {
  const wide = () => {
    // Enough nodes in a chain that the viewBox is much wider than the element.
    const graph = new Map<number, RNode>();
    for (let i = 0; i < 40; i++) {
      graph.set(i, node(i, { label: `n${i}`, deps: i ? new Set([i - 1]) : new Set() }));
    }
    return graph;
  };

  const scaleOf = (): number => {
    const t = (svg.querySelector('.fx-viewport') as SVGGElement).getAttribute('transform') ?? '';
    return Number(/scale\(([\d.]+)\)/.exec(t)?.[1] ?? 1);
  };

  it('goes past the old fixed ceiling when the graph is wider than the panel', () => {
    const view = createGraphView(svg);
    view.update(wide());
    // jsdom reports no layout, so the element width is stubbed to a real panel's.
    svg.getBoundingClientRect = () => ({ width: 600, height: 400 }) as DOMRect;

    for (let i = 0; i < 40; i++) view.zoomBy(1.25);
    // A 40-node chain lays out several thousand units wide; the old fixed 4x landed far
    // short of a card at natural size.
    expect(scaleOf()).toBeGreaterThan(20);
  });

  it('still stops somewhere', () => {
    const view = createGraphView(svg);
    view.update(wide());
    svg.getBoundingClientRect = () => ({ width: 600, height: 400 }) as DOMRect;

    for (let i = 0; i < 200; i++) view.zoomBy(1.25);
    const settled = scaleOf();
    view.zoomBy(1.25);
    expect(scaleOf()).toBe(settled);
  });

  it('keeps a modest ceiling for a graph that already fits', () => {
    const view = createGraphView(svg);
    view.update(new Map([[0, node(0, { label: 'only' })]]));
    svg.getBoundingClientRect = () => ({ width: 1200, height: 800 }) as DOMRect;

    for (let i = 0; i < 40; i++) view.zoomBy(1.25);
    expect(scaleOf()).toBe(8);
  });
});

describe('zooming a graph that is tall rather than wide', () => {
  it('measures the axis that is more shrunk', () => {
    const graph = new Map<number, RNode>();
    for (let i = 0; i < 60; i++) {
      graph.set(i, node(i, { label: `n${i}`, deps: i ? new Set([i - 1]) : new Set() }));
    }
    const view = createGraphView(svg, { direction: 'vertical' });
    view.update(graph);
    // A tall panel: the height is what the fit is limited by, and width alone would have
    // reported nothing worth zooming into.
    svg.getBoundingClientRect = () => ({ width: 900, height: 300 }) as DOMRect;

    for (let i = 0; i < 60; i++) view.zoomBy(1.25);
    const t = (svg.querySelector('.fx-viewport') as SVGGElement).getAttribute('transform') ?? '';
    expect(Number(/scale\(([\d.]+)\)/.exec(t)?.[1] ?? 1)).toBeGreaterThan(20);
  });
});
