// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type { RNode } from './instrument.js';
import { componentTree, createComponentTree, idsIn, type ComponentTree } from './tree.js';

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
    tree = createComponentTree(host, { domFor: (id) => (id === 3 ? [dom] : []) });
    tree.render(app());
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
    tree = createComponentTree(host, { domFor: (id) => (id === 3 ? [counterDom()] : []) });
    tree.render(app());
    const twist = host.querySelector('[data-twist="3:0"]') as HTMLElement;
    twist.click();
    tree.render(app());
    expect(labels()).not.toContain('<button />');
    expect(labels()).toContain('<div.row>');
  });

  it('hands the element itself to a hover, with no node id', () => {
    const dom = counterDom();
    tree = createComponentTree(host, {
      domFor: (id) => (id === 3 ? [dom] : []),
      onHover: (id, element) => hovered.push(element),
    });
    tree.render(app());
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
    tree = createComponentTree(host, { domFor: (id) => dom[id] ?? [] });
    tree.render(
      new Map<number, RNode>([
        [0, { id: 0, label: 'App', kind: 'component', deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        [3, { id: 3, label: 'Counter', kind: 'component', createdIn: 0, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        [4, { id: 4, label: 'Another', kind: 'component', createdIn: 0, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
      ]),
    );
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
    // `count` renders into the span, `double` into the small — not in a list after them.
    const row = counterDom();
    const span = row.querySelector('span')!;
    const small = row.querySelector('small')!;
    const dom: Record<number, Element[]> = { 3: [row], 10: [span], 11: [small] };
    tree = createComponentTree(host, { values: true, domFor: (id) => dom[id] ?? [] });
    tree.render(
      new Map<number, RNode>([
        [3, { id: 3, label: 'Counter', kind: 'component', deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        [10, { id: 10, label: 'count', kind: 'state', createdIn: 3, authored: true, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        [11, { id: 11, label: 'double', kind: 'memo', createdIn: 3, authored: true, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
      ]),
    );
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
    tree = createComponentTree(host, { values: true, domFor: (id) => dom[id] ?? [] });
    tree.render(
      new Map<number, RNode>([
        [3, { id: 3, label: 'Counter', kind: 'component', deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        [10, { id: 10, label: 'quiet', kind: 'state', createdIn: 3, authored: true, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
      ]),
    );
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
    tree = createComponentTree(host, { values: true, domFor: (id) => dom[id] ?? [] });
    tree.render(
      new Map<RNode['id'], RNode>([
        [0, { id: 0, label: 'App', kind: 'component', deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        // No createdIn: declared at the top of another module.
        [9, { id: 9, label: 'total', kind: 'memo', authored: true, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
      ]),
    );
    expect(labels()).toEqual(['<App>', '<div.card>', '<h3>', 'total']);
  });

  it('leaves a module-scope value at the top when it renders nowhere', () => {
    const dom: Record<number, Element[]> = {};
    tree = createComponentTree(host, { values: true, domFor: (id) => dom[id] ?? [] });
    tree.render(
      new Map<RNode['id'], RNode>([
        [9, { id: 9, label: 'total', kind: 'memo', authored: true, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
      ]),
    );
    expect(labels()).toEqual(['total']);
  });

  it('keeps a child whose element is somewhere else, like a portal', () => {
    const own = document.createElement('div');
    const away = document.createElement('aside');
    const dom: Record<number, Element[]> = { 0: [own], 3: [away] };
    tree = createComponentTree(host, { domFor: (id) => dom[id] ?? [] });
    tree.render(
      new Map<number, RNode>([
        [0, { id: 0, label: 'App', kind: 'component', deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
        [3, { id: 3, label: 'Away', kind: 'component', createdIn: 0, deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0 }],
      ]),
    );
    expect(labels()).toEqual(['<App>', '<div />', '<Away>', '<aside />']);
  });

  it('selects nothing for an element row, which is not a node', () => {
    const picked: number[] = [];
    tree = createComponentTree(host, {
      domFor: (id) => (id === 3 ? [counterDom()] : []),
      onSelect: (id) => picked.push(id),
    });
    tree.render(app());
    const row = [...host.querySelectorAll('.fx-tree-row')].find(
      (r) => r.textContent?.includes('small'),
    )!;
    (row as HTMLElement).click();
    expect(picked).toEqual([]);
  });
});
