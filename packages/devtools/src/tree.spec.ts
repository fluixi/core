// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type { RNode } from './instrument.js';
import type { ElementPick } from './tree.js';
import { componentTree, createComponentTree, idsIn, TREE_KINDS, type ComponentTree } from './tree.js';
import { describeAll, type DomNode } from './dom.js';

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

/** App renders a Router, which renders a Counter and an Another. */
const app = () =>
  new Map<number, RNode>([
    [0, node(0, { kind: 'component', label: 'App' })],
    [1, node(1, { kind: 'router', label: 'Router', createdIn: 0 })],
    // The memo the compiler wraps each component in: real, and not something anyone wrote.
    // A watcher always says which; only a graph read from files leaves it open.
    [2, node(2, { kind: 'memo', label: 'm2', createdIn: 1, authored: false })],
    [3, node(3, { kind: 'component', label: 'Counter', createdIn: 2 })],
    [4, node(4, { kind: 'component', label: 'Another', createdIn: 1 })],
    [5, node(5, { kind: 'state', label: 'count', createdIn: 3, authored: true })],
  ]);

describe('the tree the nodes make', () => {
  it('puts each tag under the tag that made it', () => {
    const [root] = componentTree(app());
    expect(root?.label).toBe('App');
    expect(root?.children.map((c) => c.label)).toEqual(['Router']);
    expect(root?.children[0]?.children.map((c) => c.label)).toEqual(['Counter', 'Another']);
  });

  it('lifts through the memo a component is wrapped in', () => {
    // Counter was made inside m2, which was made inside Router.
    const router = componentTree(app())[0]!.children[0]!;
    expect(router.children.map((c) => c.id)).toEqual([3, 4]);
  });

  it('leaves out what is not a tag', () => {
    expect(idsIn(componentTree(app()))).not.toContain(5);
  });

  it('keeps siblings in the order they were made', () => {
    const router = componentTree(app())[0]!.children[0]!;
    expect(router.children.map((c) => c.label)).toEqual(['Counter', 'Another']);
  });

  it('treats a tag with no tagged ancestor as a root', () => {
    const graph = new Map<number, RNode>([
      [0, node(0, { kind: 'memo', label: 'm0' })],
      [1, node(1, { kind: 'component', label: 'Loose', createdIn: 0 })],
    ]);
    expect(componentTree(graph).map((r) => r.label)).toEqual(['Loose']);
  });

  it('survives a cycle in what made what', () => {
    const graph = new Map<number, RNode>([
      [0, node(0, { kind: 'component', label: 'A', createdIn: 1 })],
      [1, node(1, { kind: 'component', label: 'B', createdIn: 0 })],
    ]);
    expect(() => componentTree(graph)).not.toThrow();
  });

  it('leaves the values out until they are asked for', () => {
    expect(idsIn(componentTree(app()))).not.toContain(5);
    expect(idsIn(componentTree(app(), { values: true }))).toContain(5);
  });

  it('puts a value under the tag that declared it', () => {
    const counter = componentTree(app(), { values: true })[0]!.children[0]!.children[0]!;
    expect(counter.label).toBe('Counter');
    expect(counter.children.map((c) => c.label)).toEqual(['count']);
    expect(counter.children[0]?.value).toBe(true);
  });

  it('counts a node that says nothing either way, as a source graph does', () => {
    // Nothing read from the files is the framework's own; there is no mark to go on.
    const graph = app();
    graph.set(7, node(7, { kind: 'resource', label: 'messages', createdIn: 3 }));
    expect(idsIn(componentTree(graph, { values: true }))).toContain(7);
  });

  it('leaves machinery out even with values on', () => {
    // m2 is the memo the compiler wrapped Counter in, which nobody wrote.
    const graph = app();
    graph.set(6, node(6, { kind: 'memo', label: 'm6', createdIn: 3, authored: false }));
    expect(idsIn(componentTree(graph, { values: true }))).not.toContain(6);
  });

  it('keeps what the filter names, and whatever holds it', () => {
    const kept = componentTree(app(), { filter: 'another' });
    expect(kept.map((r) => r.label)).toEqual(['App']);
    expect(kept[0]?.children[0]?.children.map((c) => c.label)).toEqual(['Another']);
  });

  it('keeps everything inside a match, so a hit is openable', () => {
    const kept = componentTree(app(), { filter: 'router' });
    expect(kept[0]!.children[0]!.children.map((c) => c.label)).toEqual(['Counter', 'Another']);
  });

  it('ignores case and surrounding space', () => {
    expect(componentTree(app(), { filter: '  COUNTER ' })[0]?.children[0]?.children).toHaveLength(1);
  });

  it('comes back empty when nothing is named that', () => {
    expect(componentTree(app(), { filter: 'nope' })).toEqual([]);
  });

  it('filters the values too', () => {
    const kept = componentTree(app(), { values: true, filter: 'count' });
    // `Counter` matches by name, and `count` inside it does too.
    expect(idsIn(kept)).toContain(5);
  });

  it('says nothing about a graph with no tags in it', () => {
    expect(componentTree(new Map([[0, node(0)]]))).toEqual([]);
  });
});

describe('drawing it', () => {
  let host: HTMLElement;
  let tree: ComponentTree;
  const picked: number[] = [];

  const rows = () => [...host.querySelectorAll('.fx-tree-row')] as HTMLElement[];
  const labels = () => rows().map((r) => r.querySelector('.fx-tree-tag')?.textContent ?? '');

  beforeEach(() => {
    host = document.createElement('div');
    document.body.replaceChildren(host);
    picked.length = 0;
    tree = createComponentTree(host, { onSelect: (id) => picked.push(id) });
  });

  it('lists the values when the box is ticked, without angle brackets', () => {
    tree.render(app());
    const box = host.querySelector('.fx-tree-bar input') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    tree.render(app());
    expect(labels()).toContain('count');
    expect(labels()).not.toContain('<count />');
  });

  it('narrows as the reader types, and says so when nothing matches', () => {
    tree.render(app());
    const search = host.querySelector('.fx-tree-search') as HTMLInputElement;
    search.value = 'another';
    search.dispatchEvent(new Event('input'));
    tree.render(app());
    expect(labels()).toEqual(['<App>', '<Router>', '<Another />']);

    search.value = 'nope';
    search.dispatchEvent(new Event('input'));
    tree.render(app());
    expect(host.querySelector('.fx-tree-empty')?.textContent).toContain('nope');
  });

  it('writes a tag per node, closed ones self-closing', () => {
    tree.render(app());
    expect(labels()).toEqual(['<App>', '<Router>', '<Counter />', '<Another />']);
  });

  it('shuts a subtree when its twist is clicked, and says how many are inside', () => {
    tree.render(app());
    (host.querySelector('[data-twist="1"]') as HTMLElement).click();
    tree.render(app());
    expect(labels()).toEqual(['<App>', '<Router>']);
    expect(host.querySelector('.fx-tree-count')?.textContent).toBe('2');
  });

  it('opens it again', () => {
    tree.render(app());
    const twist = () => host.querySelector('[data-twist="1"]') as HTMLElement;
    twist().click();
    tree.render(app());
    twist().click();
    tree.render(app());
    expect(labels()).toHaveLength(4);
  });

  it('stays shut while the graph keeps arriving', () => {
    tree.render(app());
    (host.querySelector('[data-twist="1"]') as HTMLElement).click();
    tree.render(app());
    tree.render(app());
    tree.render(app());
    expect(labels()).toEqual(['<App>', '<Router>']);
  });

  it('reports the row that was clicked, not the twist', () => {
    tree.render(app());
    rows()[2]!.click();
    expect(picked).toEqual([3]);

    (host.querySelector('[data-twist="1"]') as HTMLElement).click();
    expect(picked).toEqual([3]);
  });

  it('marks the selected row', () => {
    tree.render(app(), 3);
    expect(rows().filter((r) => r.classList.contains('on')).map((r) => r.dataset.id)).toEqual(['3']);
  });

  it('says so when nothing has rendered', () => {
    tree.render(new Map());
    expect(host.querySelector('.fx-tree-empty')).not.toBeNull();
  });

  it('lets go of the host when destroyed', () => {
    tree.render(app());
    tree.destroy();
    expect(host.innerHTML).toBe('');
  });
});

describe('the dom a tag rendered', () => {
  /**
   * The real description, built from what each node rendered. Going through describeAll
   * keeps these honest about the shape a host actually receives.
   */
  const domOf = (rendered: Record<number, Element[]>, graph: Map<number, RNode>) => {
    const all = describeAll(graph, (of) => rendered[of] ?? [], (of) => rendered[of] ?? [], TREE_KINDS);
    return (id: number) => all.get(id) ?? [];
  };

  let host: HTMLElement;
  let tree: ComponentTree;
  const hovered: (Element | undefined)[] = [];

  /** Counter renders a row of four: two buttons, a span and a small. */
  const counterDom = (): HTMLElement => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML =
      '<button>-</button><span class="num">0</span><button>+</button><small>double: 0</small>';
    return row;
  };

  const labels = () =>
    [...host.querySelectorAll('.fx-tree-tag')].map((t) => t.textContent ?? '');

  beforeEach(() => {
    host = document.createElement('div');
    document.body.replaceChildren(host);
    hovered.length = 0;
  });

  it('lists the elements under the tag that rendered them', () => {
    const dom = counterDom();
    const graph = app();
    tree = createComponentTree(host, { domFor: domOf({ 3: [dom] }, graph) });
    tree.render(graph);
    expect(labels()).toEqual([
      '<App>',
      '<Router>',
      '<Counter>',
      '<div.row>',
      '<button />',
      '<span.num />',
      '<button />',
      '<small />',
      '<Another />',
    ]);
  });

  it('draws tags only when the host cannot reach the page', () => {
    tree = createComponentTree(host);
    tree.render(app());
    expect(labels().some((l) => l.includes('div'))).toBe(false);
  });

  it('collapses an element subtree like any other', () => {
    const graph = app();
    tree = createComponentTree(host, { domFor: domOf({ 3: [counterDom()] }, graph) });
    tree.render(graph);
    const twist = host.querySelector('[data-twist="3:0"]') as HTMLElement;
    twist.click();
    tree.render(app());
    expect(labels()).not.toContain('<button />');
    expect(labels()).toContain('<div.row>');
  });

  it('hands the element itself to a hover, with no node id', () => {
    const dom = counterDom();
    const graph = app();
    tree = createComponentTree(host, {
      domFor: domOf({ 3: [dom] }, graph),
      onHover: (id, element) => hovered.push(element),
    });
    tree.render(graph);
    const row = [...host.querySelectorAll('.fx-tree-row')].find(
      (r) => r.textContent?.includes('span.num'),
    )!;
    row.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    expect(hovered[0]).toBe(dom.querySelector('span'));
  });

  it('puts a child component where its element sits, not beside the dom', () => {
    // App renders a card holding both counters; the counters are inside it, not next to it.
    const card = document.createElement('div');
    card.className = 'card';
    const first = counterDom();
    const second = counterDom();
    card.append(first, second);

    const dom: Record<number, Element[]> = { 0: [card], 3: [first], 4: [second] };
    const graph =
      new Map<number, RNode>([
        [0, { id: 0, label: 'App', kind: 'component', deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        [3, { id: 3, label: 'Counter', kind: 'component', createdIn: 0, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        [4, { id: 4, label: 'Another', kind: 'component', createdIn: 0, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
      ]);
    tree = createComponentTree(host, { domFor: domOf(dom, graph) });
    tree.render(graph);
    expect(labels()).toEqual([
      '<App>',
      '<div.card>',
      '<Counter>',
      '<div.row>',
      '<button />',
      '<span.num />',
      '<button />',
      '<small />',
      '<Another>',
      '<div.row>',
      '<button />',
      '<span.num />',
      '<button />',
      '<small />',
    ]);
  });

  it('lists a value inside the element it writes into', () => {
    // `count` renders into the span and `double` into the small, not in a list after them.
    const row = counterDom();
    const span = row.querySelector('span')!;
    const small = row.querySelector('small')!;
    const dom: Record<number, Element[]> = { 3: [row], 10: [span], 11: [small] };
    const graph =
      new Map<number, RNode>([
        [3, { id: 3, label: 'Counter', kind: 'component', deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        [10, { id: 10, label: 'count', kind: 'state', createdIn: 3, authored: true, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        [11, { id: 11, label: 'double', kind: 'memo', createdIn: 3, authored: true, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
      ]);
    tree = createComponentTree(host, { values: true, domFor: domOf(dom, graph) });
    tree.render(graph);
    expect(labels()).toEqual([
      '<Counter>',
      '<div.row>',
      '<button />',
      '<span.num>',
      'count',
      '<button />',
      '<small>',
      'double',
    ]);
  });

  it('keeps a value that writes nowhere the dom shows, rather than losing it', () => {
    const row = counterDom();
    const dom: Record<number, Element[]> = { 3: [row] };
    const graph =
      new Map<number, RNode>([
        [3, { id: 3, label: 'Counter', kind: 'component', deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        [10, { id: 10, label: 'quiet', kind: 'state', createdIn: 3, authored: true, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
      ]);
    tree = createComponentTree(host, { values: true, domFor: domOf(dom, graph) });
    tree.render(graph);
    expect(labels()).toContain('quiet');
  });

  it('brings a module-scope value inside the tag that renders it', () => {
    // A store shared between files belongs to no component. It still writes into a heading
    // inside App, and that is where it is worth reading.
    const card = document.createElement('div');
    card.className = 'card';
    const heading = document.createElement('h3');
    card.append(heading);

    const dom: Record<number, Element[]> = { 0: [card], 9: [heading] };
    const graph =
      new Map<RNode['id'], RNode>([
        [0, { id: 0, label: 'App', kind: 'component', deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        // No createdIn: declared at the top of another module.
        [9, { id: 9, label: 'total', kind: 'memo', authored: true, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
      ]);
    tree = createComponentTree(host, { values: true, domFor: domOf(dom, graph) });
    tree.render(graph);
    expect(labels()).toEqual(['<App>', '<div.card>', '<h3>', 'total']);
  });

  it('leaves a module-scope value at the top when it renders nowhere', () => {
    const dom: Record<number, Element[]> = {};
    const graph =
      new Map<RNode['id'], RNode>([
        [9, { id: 9, label: 'total', kind: 'memo', authored: true, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
      ]);
    tree = createComponentTree(host, { values: true, domFor: domOf(dom, graph) });
    tree.render(graph);
    expect(labels()).toEqual(['total']);
  });

  it('keeps a child whose element is somewhere else, like a portal', () => {
    const own = document.createElement('div');
    const away = document.createElement('aside');
    const dom: Record<number, Element[]> = { 0: [own], 3: [away] };
    const graph =
      new Map<number, RNode>([
        [0, { id: 0, label: 'App', kind: 'component', deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        [3, { id: 3, label: 'Away', kind: 'component', createdIn: 0, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
      ]);
    tree = createComponentTree(host, { domFor: domOf(dom, graph) });
    tree.render(graph);
    expect(labels()).toEqual(['<App>', '<div />', '<Away>', '<aside />']);
  });

  it('selects nothing for an element row, which is not a node', () => {
    const picked: number[] = [];
    const graph = app();
    tree = createComponentTree(host, {
      domFor: domOf({ 3: [counterDom()] }, graph),
      onSelect: (id) => picked.push(id),
    });
    tree.render(graph);
    const row = [...host.querySelectorAll('.fx-tree-row')].find(
      (r) => r.textContent?.includes('small'),
    )!;
    (row as HTMLElement).click();
    expect(picked).toEqual([]);
  });

  it('hands an element row to onPick, naming the tag it belongs to', () => {
    const picks: ElementPick[] = [];
    const graph = app();
    tree = createComponentTree(host, {
      domFor: domOf({ 3: [counterDom()] }, graph),
      onPick: (pick) => picks.push(pick),
    });
    tree.render(graph);
    const row = [...host.querySelectorAll('.fx-tree-row')].find(
      (r) => r.textContent?.includes('span.num'),
    )! as HTMLElement;
    row.click();
    expect(picks).toHaveLength(1);
    expect(picks[0]!.label).toBe('span.num');
    // Counter rendered it, so that is where its source is.
    expect(picks[0]!.owner).toBe(3);
    expect(row.classList.contains('on')).toBe(true);
  });
});

/**
 * The shape a routed app makes: a layout renders the page frame, and a boundary inside it
 * renders no element of its own, since the routed content lands in the layout's <main>. Modelled
 * on the start example, where this put Suspense next to the layout instead of in it.
 */
describe('a tag that renders no element of its own', () => {
  const shell = () => {
    const root = document.createElement('div');
    root.id = 'root';
    root.innerHTML = '<div class="app"><nav></nav><main><section class="home"></section></main></div>';
    document.body.replaceChildren(root);
    return {
      root,
      app: root.querySelector('.app') as Element,
      main: root.querySelector('main') as Element,
    };
  };

  const routed = () =>
    new Map<number, RNode>([
      [0, node(0, { kind: 'component', label: 'App' })],
      [1, node(1, { kind: 'router', label: 'Router', createdIn: 0 })],
      [2, node(2, { kind: 'component', label: 'RootLayout', createdIn: 1 })],
      [3, node(3, { kind: 'control', label: 'Suspense', createdIn: 2 })],
    ]);

  let host: HTMLElement;
  const labels = () => [...host.querySelectorAll('.fx-tree-tag')].map((t) => t.textContent ?? '');

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
  });

  it('sits inside the element its content goes into', () => {
    const el = shell();
    const graph = routed();
    const all = describeAll(
      graph,
      (of) => (of === 2 ? [el.app] : []),
      // App and Router both write through the element the app was mounted into.
      (of) => (of === 3 ? [el.main] : of === 1 || of === 0 ? [el.root] : []),
      TREE_KINDS,
    );
    const tree = createComponentTree(host, { domFor: (id) => all.get(id) ?? [] });
    tree.render(graph);

    const rows = labels();
    // The mount container is above the root tag, Suspense is inside <main> rather than
    // beside the layout, and nothing the layout rendered is lost.
    expect(rows).toEqual([
      '<div#root>',
      '<App>',
      '<Router>',
      '<RootLayout>',
      '<div.app>',
      '<nav />',
      '<main>',
      '<Suspense />',
      '<section.home />',
    ]);
  });

  it('marks a tag that came down as its own chunk', () => {
    const graph = routed();
    graph.set(4, node(4, { kind: 'component', label: 'Home', createdIn: 3, lazy: true }));
    const tree = createComponentTree(host, {});
    tree.render(graph);
    const marks = [...host.querySelectorAll('.fx-tree-lazy')];
    expect(marks).toHaveLength(1);
    const row = marks[0]!.closest('.fx-tree-row')!;
    expect(row.querySelector('.fx-tree-tag')!.textContent).toBe('<Home />');
  });

  it('draws a component once per place that names it', () => {
    // A graph read from source has one node per declaration, so two <Badge/> point at it.
    const graph = new Map<number, RNode>([
      [0, node(0, { kind: 'component', label: 'App' })],
      [1, node(1, { kind: 'component', label: 'Badge', createdIn: 0 })],
    ]);
    const dom: Record<number, DomNode[]> = {
      0: [
        {
          label: 'main.app',
          children: [
            { label: 'span.badge', owner: 1, children: [] },
            { label: 'span.badge', owner: 1, children: [] },
          ],
        },
      ],
      1: [{ label: 'span.badge', children: [] }],
    };
    const tree = createComponentTree(host, { domFor: (id) => dom[id] ?? [] });
    tree.render(graph);
    const tags = [...host.querySelectorAll('.fx-tree-tag')].map((t) => t.textContent);
    expect(tags.filter((t) => t === '<Badge>')).toHaveLength(2);
    // Two rows, two keys, so folding one leaves the other alone.
    const keys = [...host.querySelectorAll('.fx-tree-row')].map((r) => (r as HTMLElement).dataset.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('still drops a subtree reached a second way', () => {
    // A running graph gives each use its own node, so one owner named once is one subtree.
    const graph = new Map<number, RNode>([
      [0, node(0, { kind: 'component', label: 'App' })],
      [1, node(1, { kind: 'component', label: 'Page', createdIn: 0 })],
    ]);
    const dom: Record<number, DomNode[]> = {
      0: [{ label: 'main', children: [{ label: 'section', owner: 1, children: [] }] }],
      1: [{ label: 'section', children: [{ label: 'h1', children: [] }] }],
    };
    const tree = createComponentTree(host, { domFor: (id) => dom[id] ?? [] });
    tree.render(graph);
    const tags = [...host.querySelectorAll('.fx-tree-tag')].map((t) => t.textContent);
    expect(tags.filter((t) => t === '<section>')).toHaveLength(1);
    expect(tags.filter((t) => t === '<h1 />')).toHaveLength(1);
  });

  it('does not cut the tree at the element it writes into', () => {
    const el = shell();
    const graph = routed();
    const all = describeAll(
      graph,
      (of) => (of === 2 ? [el.app] : []),
      (of) => (of === 3 ? [el.main] : []),
      TREE_KINDS,
    );
    // main keeps its children rather than becoming a stub handed to Suspense.
    const layout = all.get(2)!;
    const main = layout[0]!.children.find((c) => c.label === 'main')!;
    expect(main.children.map((c) => c.label)).toEqual(['section.home']);
    expect(main.inside).toEqual([3]);
  });
});

/**
 * A keyed list rebuilds a row rather than mutating it, so the replacement carries a higher id
 * than every row that did not change. Sorting siblings by id put it last, and the pulse that
 * belonged to the first item flashed at the bottom of the list.
 */
describe('a rebuilt row keeps its place', () => {
  const rowNode = (id: number, order?: number): RNode => ({
    id,
    label: 'TodoItem',
    kind: 'component',
    deps: new Set(),
    writes: new Set(),
    runs: 1,
    lastPulse: 0,
    ...(order === undefined ? {} : { order }),
  });

  it('sorts by where the element sits, not by when the node was made', () => {
    // The second row is untouched at id 19; the first was rebuilt and came back as id 21.
    const graph = new Map<number, RNode>([
      [19, rowNode(19, 2)],
      [21, rowNode(21, 1)],
    ]);
    expect(componentTree(graph).map((n) => n.id)).toEqual([21, 19]);
  });

  it('leaves a tag that rendered nothing exactly where it was', () => {
    // `left` is a memo between two rows. Reordering the rows must not move it, which is what
    // sorting the whole band by `order` did.
    const graph = new Map<number, RNode>([
      [13, { ...rowNode(13), label: 'left', kind: 'memo' }],
      [19, rowNode(19, 2)],
      [21, rowNode(21, 1)],
    ]);
    const rows = componentTree(graph, { values: true });
    expect(rows.map((n) => n.label)).toEqual(['left', 'TodoItem', 'TodoItem']);
    expect(rows.map((n) => n.id)).toEqual([13, 21, 19]);
  });

  it('keeps creation order when nothing rendered', () => {
    const graph = new Map<number, RNode>([
      [7, rowNode(7)],
      [3, rowNode(3)],
    ]);
    expect(componentTree(graph).map((n) => n.id)).toEqual([3, 7]);
  });
});

/**
 * Ticking `values` only marked the drawing stale. Nothing calls render on an idle page, so
 * the box appeared dead until something in the app happened to move.
 */
describe('the values checkbox', () => {
  const graph = new Map<number, RNode>([
    [0, { id: 0, label: 'App', kind: 'component', deps: new Set(), writes: new Set(), runs: 1, lastPulse: 0, authored: true }],
    [1, { id: 1, label: 'todos', kind: 'state', deps: new Set(), writes: new Set(), runs: 1, lastPulse: 0, authored: true, createdIn: 0 }],
    [2, { id: 2, label: 'mapArray', kind: 'memo', deps: new Set(), writes: new Set(), runs: 1, lastPulse: 0, authored: false, createdIn: 0 }],
  ]);

  it('redraws as soon as it is ticked', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const tree = createComponentTree(host, {});
    tree.render(graph);
    expect(host.textContent).not.toContain('todos');

    const box = host.querySelector('.fx-tree-bar input') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    // No second render call: the tick is what used to supply it, and an idle page has none.
    expect(host.textContent).toContain('todos');
    host.remove();
  });

  it('leaves out what the framework made', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const tree = createComponentTree(host, { values: true });
    tree.render(graph);
    expect(host.textContent).toContain('todos');
    expect(host.textContent).not.toContain('mapArray');
    host.remove();
  });
});

/**
 * A value a nested tag reads writes nowhere the owning tag's description reaches, so it never
 * nests beside an element. Appending it left `todos` alone at the bottom of `App`, well away
 * from the `For` that reads it.
 */
describe('a value the dom cannot place', () => {
  it('reads above the markup, not after it', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const el = document.createElement('div');
    el.className = 'card';
    document.body.append(el);

    const graph = new Map<number, RNode>([
      [0, { id: 0, label: 'App', kind: 'component', deps: new Set(), writes: new Set(), runs: 1, lastPulse: 0, authored: true }],
      [1, { id: 1, label: 'todos', kind: 'state', deps: new Set(), writes: new Set(), runs: 1, lastPulse: 0, authored: true, createdIn: 0 }],
    ]);

    const tree = createComponentTree(host, {
      values: true,
      domFor: (id) => (id === 0 ? [{ label: 'div.card', children: [], element: el }] : []),
    });
    tree.render(graph);

    const rows = [...host.querySelectorAll('.fx-tree-row')].map((r) => r.textContent!.trim());
    expect(rows[0]).toContain('App');
    expect(rows[1]).toContain('todos');
    host.remove();
    el.remove();
  });
});
