// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type { RNode } from './instrument.js';
import { createInspector } from './inspector.js';

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

let host: HTMLElement;
beforeEach(() => {
  host = document.createElement('div');
  document.body.replaceChildren(host);
});

const graph = () =>
  new Map<number, RNode>([
    [0, node(0, { label: 'count', value: '2', runs: 3, core: { version: 3, state: 0 }, source: { file: 'src/app.tsx', line: 5, column: 16 } })],
    [1, node(1, { kind: 'memo', label: 'double', deps: new Set([0]), value: '4' })],
    [2, node(2, { kind: 'effect', label: 'log', deps: new Set([1]) })],
  ]);

describe('createInspector', () => {
  it('says what a node is, what it reads and what reads it', () => {
    createInspector(host).show(graph(), 1);
    const text = host.innerText || host.textContent || '';
    expect(text).toContain('memo');
    expect(text).toContain('double');
    expect(text).toContain('count');
    expect(text).toContain('log');
  });

  it('shows where a node came from, and nothing when it has no location', () => {
    const inspector = createInspector(host);
    inspector.show(graph(), 0);
    expect(host.querySelector('.ins-source')?.textContent).toContain('src/app.tsx:5:16');

    // A node with nothing at all still says that, rather than showing an empty line.
    inspector.show(graph(), 2);
    expect(host.querySelector('.ins-source')?.textContent).toContain('no source');
  });

  it("names a component's declaration only when it is somewhere else", () => {
    const here = { file: 'src/app.tsx', line: 4, column: 2 };
    const shown = new Map<number, RNode>([
      [0, node(0, { kind: 'component', label: 'App', source: here, declaredAt: { file: 'src/App.tsx', line: 1, column: 0 } })],
      [1, node(1, { kind: 'component', label: 'Row', source: here, declaredAt: here })],
    ]);
    const inspector = createInspector(host);
    inspector.show(shown, 0);
    expect(host.querySelectorAll('.ins-source')).toHaveLength(2);
    inspector.show(shown, 1);
    expect(host.querySelectorAll('.ins-source')).toHaveLength(1);
  });

  it('reads the live value when the node has a reader', () => {
    const live = new Map<number, RNode>([[0, node(0, { label: 'now', value: 'stale', read: () => ({ a: 1 }) })]]);
    createInspector(host).show(live, 0);
    expect(host.querySelector('.ins-val')?.textContent).toBe('{a: 1}');
  });

  it('answers every line, even when the answer is nothing', () => {
    const alone = new Map<number, RNode>([[0, node(0, { label: 'lonely' })]]);
    createInspector(host).show(alone, 0);
    const text = host.textContent ?? '';
    expect(text).toContain('reads');
    expect(text).toContain('nothing');
    expect(text).toContain('feeds');
    expect(text).toContain('no source');
  });

  it('names what a node was made inside', () => {
    const owned = new Map<number, RNode>([
      [0, node(0, { kind: 'component', label: 'App' })],
      [1, node(1, { label: 'count', createdIn: 0 })],
    ]);
    createInspector(host).show(owned, 1);
    expect(host.textContent).toContain('made in');
    expect(host.textContent).toContain('App');
  });

  it('says so when nothing is selected', () => {
    createInspector(host, { empty: 'pick one' }).show(graph(), null);
    expect(host.textContent).toBe('pick one');
  });

  it('leaves the dom alone when nothing it says has changed', () => {
    const inspector = createInspector(host);
    const shown = graph();
    inspector.show(shown, 0);
    const first = host.firstElementChild;
    inspector.show(shown, 0);
    expect(host.firstElementChild).toBe(first);
  });
});

describe('a node whose readers are not drawn', () => {
  it('counts the dom bindings instead of saying nothing reads it', () => {
    const bound = new Map<number, RNode>([[0, node(0, { label: 'text', bindings: 2 })]]);
    createInspector(host).show(bound, 0);
    expect(host.querySelector('.ins-rel')?.textContent).toContain('2 dom bindings');
  });

  it('says what a component made', () => {
    const tree = new Map<number, RNode>([
      [0, node(0, { kind: 'component', label: 'TodoApp' })],
      [1, node(1, { label: 'todos', createdIn: 0 })],
      [2, node(2, { label: 'text', createdIn: 0 })],
    ]);
    createInspector(host).show(tree, 0);
    const text = host.querySelector('.ins-rel')?.textContent ?? '';
    expect(text).toContain('made');
    expect(text).toContain('todos, text');
  });
});

describe('a card the view invented', () => {
  it('does not claim a version or a run count it does not have', () => {
    const graph = new Map<number, RNode>([
      [0, node(0, { label: 'count' })],
      [1, node(1, { kind: 'binding', label: 'text in span', deps: new Set([0]) })],
    ]);
    createInspector(host).show(graph, 1);
    expect(host.querySelector('.ins-meta')?.textContent).toBe('not a node');
    expect(host.querySelector('.ins-kind')?.textContent).toBe('binding');
  });

  it('still says what it reads, which is the whole point of selecting it', () => {
    const graph = new Map<number, RNode>([
      [0, node(0, { label: 'count' })],
      [1, node(1, { kind: 'binding', label: 'text in span', deps: new Set([0]) })],
    ]);
    createInspector(host).show(graph, 1);
    expect(host.querySelector('.ins-rel')?.textContent).toContain('count');
  });
});

describe('a location that came through a source map', () => {
  it('shows the compiled position too, since originals collide', () => {
    const graph = new Map<number, RNode>([
      [
        0,
        node(0, {
          label: 'count',
          targets: [
            {
              kind: 'attribute',
              name: 'title',
              element: 'b',
              // What a template hole maps to: the line the template opens at.
              source: { file: 'src/App.tsx', line: 7, column: 4, compiled: { line: 23, column: 6 } },
            },
          ],
        }),
      ],
    ]);
    createInspector(host).show(graph, 0);
    const text = host.querySelector('.ins-rel')?.textContent ?? '';
    expect(text).toContain('src/App.tsx:7:4');
    expect(text).toContain('out 23:6');
  });

  it('says it once when the two agree', () => {
    const graph = new Map<number, RNode>([
      [
        0,
        node(0, {
          label: 'count',
          source: { file: 'src/App.tsx', line: 3, column: 8, compiled: { line: 3, column: 8 } },
        }),
      ],
    ]);
    createInspector(host).show(graph, 0);
    expect(host.querySelector('.ins-source')?.textContent).not.toContain('out');
  });

  it('names where a signal is set from outside', () => {
    const graph = new Map<number, RNode>([
      [0, node(0, { label: 'count', setAt: [{ file: 'src/App.tsx', line: 14, column: 6 }] })],
    ]);
    createInspector(host).show(graph, 0);
    expect(host.querySelector('.ins-rel')?.textContent).toContain('set at src/App.tsx:14:6');
  });
});

describe('opening a location', () => {
  const where = { file: 'src/App.tsx', line: 12, column: 4 };
  const opened: unknown[] = [];
  const withReveal = () =>
    createInspector(host, { onReveal: (location) => opened.push(location) });

  beforeEach(() => {
    opened.length = 0;
  });

  it('leaves locations as plain text when the host cannot open them', () => {
    const inspector = createInspector(host);
    inspector.show(new Map([[0, node(0, { source: where })]]), 0);
    expect(host.querySelector('.ins-at')).toBeNull();
    expect(host.textContent).toContain('src/App.tsx:12:4');
  });

  it('reports the position of the one that was clicked', () => {
    withReveal().show(new Map([[0, node(0, { source: where })]]), 0);
    (host.querySelector('.ins-at') as HTMLElement).click();
    expect(opened).toEqual([where]);
  });

  it('offers each location a node has, separately', () => {
    withReveal().show(
      new Map([
        [
          0,
          node(0, {
            kind: 'component',
            source: where,
            declaredAt: { file: 'src/Row.tsx', line: 3, column: 0 },
            usedAt: { file: 'src/main.tsx', line: 7, column: 2 },
          }),
        ],
      ]),
      0,
    );
    const files = [...host.querySelectorAll('.ins-at')].map((b) => (b as HTMLElement).dataset.file);
    expect(files).toEqual(['src/App.tsx', 'src/Row.tsx', 'src/main.tsx']);
  });

  it('offers where a value reaches the document', () => {
    withReveal().show(
      new Map([
        [
          0,
          node(0, {
            targets: [{ kind: 'attribute', name: 'class', element: 'div.box', source: where }],
          }),
        ],
      ]),
      0,
    );
    const button = host.querySelector('.ins-at') as HTMLElement;
    expect(button).not.toBeNull();
    button.click();
    expect(opened).toEqual([where]);
    // The element it writes to is still described beside it.
    expect(host.textContent).toContain('class of div.box');
  });

  it('offers each place a signal is set from', () => {
    withReveal().show(
      new Map([[0, node(0, { setAt: [where, { file: 'src/other.ts', line: 9, column: 1 }] })]]),
      0,
    );
    expect(host.querySelectorAll('.ins-at')).toHaveLength(2);
  });

  it('says nothing for a location with no file to open', () => {
    withReveal().show(new Map([[0, node(0, { source: { line: 3 } })]]), 0);
    expect(host.querySelector('.ins-at')).toBeNull();
  });

  it('leaves a label that looks like markup alone', () => {
    withReveal().show(
      new Map([[0, node(0, { label: '<img src=x>', source: where })]]),
      0,
    );
    expect(host.querySelector('img')).toBeNull();
  });
});
