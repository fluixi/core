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
    expect(host.querySelector('.ins-empty')?.textContent).toBe('pick one');
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

  it('names a binding once, with where it is', () => {
    // The binding card is drawn as a node too, so it was listed by label and again by
    // description on the same line.
    const inspector = createInspector(host);
    const target = { kind: 'content' as const, element: 'div#app', source: where };
    inspector.show(
      new Map([
        [0, node(0, { label: 'App', kind: 'component', targets: [target] })],
        [1, node(1, { label: 'div#app', kind: 'binding', deps: new Set([0]) })],
      ]),
      0,
    );
    const feeds = host.querySelector('.ins-rel')?.textContent ?? '';
    expect(feeds.match(/div#app/g)).toHaveLength(1);
    expect(feeds).toContain('div#app (src/App.tsx:12:4)');
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

describe('writing a value from the panel', () => {
  const edited: [number, string][] = [];
  const editable = () =>
    createInspector(host, { onEdit: (id, raw) => (edited.push([id, raw]), true) });
  const cell = () => host.querySelector('.ins-edit') as HTMLElement | null;
  const input = () => host.querySelector('.ins-input') as HTMLInputElement | null;

  beforeEach(() => {
    edited.length = 0;
  });

  it('leaves values alone when the host cannot write', () => {
    createInspector(host).show(new Map([[0, node(0, { value: '1' })]]), 0);
    expect(cell()).toBeNull();
  });

  it('offers a signal for editing', () => {
    editable().show(new Map([[0, node(0, { kind: 'state', value: '1' })]]), 0);
    expect(cell()).not.toBeNull();
  });

  it('refuses a memo, which the next run would overwrite', () => {
    editable().show(new Map([[0, node(0, { kind: 'memo', value: '2' })]]), 0);
    expect(cell()).toBeNull();
  });

  it('takes what was typed on enter', () => {
    editable().show(new Map([[0, node(0, { kind: 'state', value: '1' })]]), 0);
    cell()!.click();
    input()!.value = '42';
    input()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(edited).toEqual([[0, '42']]);
  });

  it('drops it on escape', () => {
    editable().show(new Map([[0, node(0, { kind: 'state', value: '1' })]]), 0);
    cell()!.click();
    input()!.value = '42';
    input()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(edited).toEqual([]);
  });

  it('does not redraw over what is being typed', () => {
    const inspector = editable();
    const graph = new Map([[0, node(0, { kind: 'state', value: '1' })]]);
    inspector.show(graph, 0);
    cell()!.click();
    input()!.value = '7';

    // The application keeps running while the reader types.
    graph.set(0, node(0, { kind: 'state', value: '999', runs: 5 }));
    inspector.show(graph, 0);
    expect(input()?.value).toBe('7');
  });
});

describe('an edit that never finishes', () => {
  it('does not hold the inspector on what it last drew', () => {
    const inspector = createInspector(host, { onEdit: () => true });
    const graph = new Map([[0, node(0, { kind: 'state', value: '1' })]]);
    inspector.show(graph, 0);
    (host.querySelector('.ins-edit') as HTMLElement).click();
    expect(host.querySelector('.ins-input')).not.toBeNull();

    // Whatever took the input away — a redraw elsewhere, a panel closing — the inspector
    // has to come back rather than freeze on the row it was editing.
    host.querySelector('.ins-input')!.remove();
    graph.set(0, node(0, { kind: 'state', value: '99' }));
    inspector.show(graph, 0);
    expect(host.querySelector('.ins-edit')?.textContent).toBe('99');
  });
});

describe('what a component was handed', () => {
  const withProps = () =>
    new Map<number, RNode>([
      [
        3,
        node(3, {
          kind: 'component',
          label: 'Field',
          source: { file: 'src/App.tsx', line: 66, column: 6 },
          props: [
            { name: 'label', value: '"Ada"', at: { line: 66, column: 20 } },
            { name: 'type', value: '"text"', at: { line: 66, column: 33 } },
            { name: 'nowhere', value: '1' },
          ],
        }),
      ],
    ]);

  it('names each prop and what it currently holds', () => {
    const inspector = createInspector(host);
    inspector.show(withProps(), 3);
    const text = host.textContent ?? '';
    expect(text).toContain('label="Ada"');
    expect(text).toContain('type="text"');
  });

  it('takes the file from the tag, since a prop position has none', () => {
    const inspector = createInspector(host, { onReveal: () => {} });
    inspector.show(withProps(), 3);
    const at = [...host.querySelectorAll('.ins-at')].map(
      (b) => `${(b as HTMLElement).dataset.file}:${(b as HTMLElement).dataset.line}:${(b as HTMLElement).dataset.column}`,
    );
    expect(at).toContain('src/App.tsx:66:20');
    expect(at).toContain('src/App.tsx:66:33');
  });

  it('still names a prop the build recorded no position for', () => {
    const inspector = createInspector(host, { onReveal: () => {} });
    inspector.show(withProps(), 3);
    expect(host.textContent).toContain('nowhere=1');
  });
});

describe('inspecting an element', () => {
  /** Counter renders a span the count writes into. */
  const rendered = () =>
    new Map<number, RNode>([
      [
        3,
        node(3, {
          kind: 'component',
          label: 'Counter',
          source: { file: 'src/counter.tsx', line: 4, column: 0 },
        }),
      ],
      [
        4,
        node(4, {
          label: 'count',
          value: '2',
          targets: [
            { kind: 'content', element: 'slot in span.num', source: { file: 'src/counter.tsx', line: 9, column: 12 } },
            { kind: 'content', element: 'slot in small', source: { file: 'src/counter.tsx', line: 11, column: 12 } },
          ],
        }),
      ],
    ]);

  it('names the tag that rendered it and the values writing into it', () => {
    const inspector = createInspector(host);
    inspector.showElement(rendered(), { key: '3:0/1', label: 'span.num', owner: 3, writes: [4] });
    const text = host.textContent ?? '';
    expect(text).toContain('span.num');
    expect(text).toContain('Counter');
    expect(text).toContain('count');
  });

  it('shows the line of the binding into this element, not another one', () => {
    const inspector = createInspector(host, { onReveal: () => {} });
    inspector.showElement(rendered(), { key: '3:0/1', label: 'span.num', owner: 3, writes: [4] });
    const text = host.textContent ?? '';
    // 9 is the span; 11 is the <small> the same signal also writes to.
    expect(text).toContain(':9:12');
    expect(text).not.toContain(':11:12');
  });

  it('says so when nothing writes into it', () => {
    const inspector = createInspector(host);
    inspector.showElement(rendered(), { key: '3:0/0', label: 'nav', owner: 3 });
    expect(host.textContent).toContain('nothing writes here');
  });

  it('prefers where the tag was written over where the framework made it', () => {
    // A lazy route is instantiated inside the framework, so its source is a package line.
    const graph = new Map<number, RNode>([
      [
        5,
        node(5, {
          kind: 'component',
          label: 'About',
          source: { file: '/pkgs/core/src/render/lazy.ts', line: 37, column: 12, external: true },
          declaredAt: { file: 'src/routes/about.tsx', line: 1, column: 15 },
        }),
      ],
    ]);
    const inspector = createInspector(host, { onReveal: () => {} });
    inspector.showElement(graph, { key: '5:0', label: 'section.about', owner: 5 });
    const links = [...host.querySelectorAll('.ins-at')].map((b) => (b as HTMLElement).dataset.file);
    expect(links).toEqual(['src/routes/about.tsx']);
  });

  it('adds the framework line only when asked for it', () => {
    const graph = new Map<number, RNode>([
      [
        5,
        node(5, {
          kind: 'component',
          label: 'About',
          source: { file: '/pkgs/core/src/render/lazy.ts', line: 37, column: 12, external: true },
          declaredAt: { file: 'src/routes/about.tsx', line: 1, column: 15 },
        }),
      ],
    ]);
    const pick = { key: '5:0', label: 'section.about', owner: 5 };
    const files = () =>
      [...host.querySelectorAll('.ins-at')].map((b) => (b as HTMLElement).dataset.file);

    const inspector = createInspector(host, { onReveal: () => {} });
    inspector.showElement(graph, pick);
    expect(files()).toEqual(['src/routes/about.tsx']);

    const box = host.querySelector('.ins-bar input') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    inspector.showElement(graph, pick);
    expect(files()).toEqual(['src/routes/about.tsx', '/pkgs/core/src/render/lazy.ts']);
  });

  it('starts with the framework line when the host asks for it', () => {
    const graph = new Map<number, RNode>([
      [
        5,
        node(5, {
          kind: 'component',
          label: 'About',
          source: { file: '/pkgs/core/src/render/lazy.ts', line: 37, column: 12, external: true },
          declaredAt: { file: 'src/routes/about.tsx', line: 1, column: 15 },
        }),
      ],
    ]);
    const inspector = createInspector(host, { onReveal: () => {}, internals: true });
    inspector.showElement(graph, { key: '5:0', label: 'section.about', owner: 5 });
    expect(host.textContent).toContain('made in');
  });

  it('falls back to the empty state without a pick', () => {
    const inspector = createInspector(host, { empty: 'pick something' });
    inspector.showElement(rendered(), null);
    expect(host.querySelector('.ins-empty')?.textContent).toBe('pick something');
  });
});
