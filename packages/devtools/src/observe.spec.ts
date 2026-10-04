// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import {
  createRoot,
  createSignal,
  createMemo,
  createEffect,
  createRenderEffect,
  reportReactiveBinding,
  reportReactiveProps,
} from '@fluixi/reactive/signal';
import { markReactiveSource } from './source.js';
import { observeGraph, type ObservedGraph } from './observe.js';
import { toCommits } from './history.js';

let observed: ObservedGraph | undefined;
afterEach(() => {
  observed?.detach();
  observed = undefined;
});

const byLabel = (o: ObservedGraph, label: string) =>
  [...o.graph.values()].find((n) => n.label === label);

describe('observeGraph', () => {
  it('sees plain primitives, with no instrumented api in sight', () => {
    observed = observeGraph();
    createRoot(() => {
      const [count] = createSignal(1, { name: 'count' });
      createMemo(() => count() * 2, undefined, { name: 'double' });
    });
    observed.sample();

    expect(byLabel(observed, 'count')?.kind).toBe('state');
    expect(byLabel(observed, 'double')?.kind).toBe('memo');
    expect(byLabel(observed, 'double')?.value).toBe('2');
  });

  it('reads dependency edges off the core node', () => {
    observed = observeGraph();
    createRoot(() => {
      const [count] = createSignal(1, { name: 'count' });
      createMemo(() => count() * 2, undefined, { name: 'double' });
    });
    observed.sample();

    const count = byLabel(observed, 'count')!;
    const double = byLabel(observed, 'double')!;
    expect([...double.deps]).toEqual([count.id]);
  });

  it('names a node from a compiler mark when the call site gave none', () => {
    observed = observeGraph();
    createRoot(() => {
      markReactiveSource('src/app.ts', 4, 12, 'total');
      createSignal(0);
    });
    observed.sample();

    const node = byLabel(observed, 'total');
    expect(node?.source).toEqual({ file: 'src/app.ts', line: 4, column: 12 });
  });

  it('pulses a memo when its value moves', () => {
    observed = observeGraph();
    let set!: (n: number) => number;
    createRoot(() => {
      const [count, setCount] = createSignal(1, { name: 'count' });
      set = setCount as (n: number) => number;
      createMemo(() => count() * 2, undefined, { name: 'double' });
    });
    observed.sample();

    set(5);
    expect(observed.sample()).toContain(byLabel(observed, 'double')!.id);
    expect(byLabel(observed, 'double')?.value).toBe('10');
  });

  it('counts effect runs, which is all an effect has to pulse on', () => {
    observed = observeGraph();
    let set!: (n: number) => number;
    createRoot(() => {
      const [count, setCount] = createSignal(0, { name: 'count' });
      set = setCount as (n: number) => number;
      createEffect(() => void count());
    });
    observed.sample();

    const effect = [...observed.graph.values()].find((n) => n.kind === 'effect')!;
    expect(effect.runs).toBe(1);
    set(1);
    expect(observed.sample()).toContain(effect.id);
    expect(effect.runs).toBe(2);
  });

  it('drops the signals of a scope that goes away, not just its effects', () => {
    observed = observeGraph();
    let dispose!: () => void;
    createRoot(() => {
      createSignal(0, { name: 'kept' });
      createRoot((inner) => {
        dispose = inner;
        // What a list rebuilt without a key makes on every update.
        createSignal(1, { name: 'row' });
        createMemo(() => 1, undefined, { name: 'rowLabel' });
      });
    });
    observed.sample();
    expect(byLabel(observed, 'row')).toBeDefined();

    dispose();
    observed.sample();
    expect(byLabel(observed, 'row')).toBeUndefined();
    expect(byLabel(observed, 'rowLabel')).toBeUndefined();
    expect(byLabel(observed, 'kept')).toBeDefined();
  });

  it('drops an effect when it is disposed', () => {
    observed = observeGraph();
    let dispose!: () => void;
    createRoot(() => {
      const [count] = createSignal(0);
      dispose = createEffect(() => void count());
    });
    expect([...observed.graph.values()].some((n) => n.kind === 'effect')).toBe(true);

    dispose();
    expect([...observed.graph.values()].some((n) => n.kind === 'effect')).toBe(false);
  });

  it('ignores render effects, which are one per dom binding', () => {
    observed = observeGraph();
    createRoot(() => {
      const [count] = createSignal(0);
      // What the dom layer makes for every binding it writes.
      createRenderEffect(() => void count());
    });
    expect([...observed.graph.values()].filter((n) => n.kind === 'effect')).toHaveLength(0);
  });

  it('stops reporting after detach', () => {
    const o = observeGraph();
    o.detach();
    createRoot(() => createSignal(0, { name: 'late' }));
    expect(o.graph.size).toBe(0);
  });
});

describe('where a node came from', () => {
  it('marks a dependency node as external, and a project node not', () => {
    observed = observeGraph();
    createRoot(() => {
      markReactiveSource('node_modules/@fluixi/dom/dist/runtime.js', 9, 4, 'internal');
      createSignal(0);
      markReactiveSource('src/app.ts', 3, 8, 'mine');
      createSignal(0);
    });
    observed.sample();

    expect(byLabel(observed, 'internal')?.source?.external).toBe(true);
    expect(byLabel(observed, 'mine')?.source?.external).toBeUndefined();
  });

  it('treats an absolute path as a dependency: a project file is named from the root', () => {
    observed = observeGraph();
    createRoot(() => {
      markReactiveSource('/Users/me/libs/fluixi/packages/dom/src/runtime.ts', 1, 1, 'linked');
      createSignal(0);
    });
    observed.sample();
    expect(byLabel(observed, 'linked')?.source?.external).toBe(true);
  });
});

describe('a dependency creating a node for the application', () => {
  it('keeps the call site rather than the wrapper that made the node', () => {
    observed = observeGraph();
    createRoot(() => {
      markReactiveSource('src/app.ts', 5, 16, 'count');
      // What `signal()` inside the framework marks on the way through.
      markReactiveSource('node_modules/@fluixi/reactive/api.js', 32, 8, 'read');
      createSignal(0);
    });
    observed.sample();

    const node = byLabel(observed, 'count');
    expect(node?.source).toMatchObject({ file: 'src/app.ts', line: 5 });
  });

  it('still marks a node the dependency made for itself', () => {
    observed = observeGraph();
    createRoot(() => {
      markReactiveSource('node_modules/@fluixi/core/router.js', 118, 2, 'revalidation');
      createSignal(0);
    });
    observed.sample();
    expect(byLabel(observed, 'revalidation')?.source?.external).toBe(true);
  });
});

describe('what a component is doing in the graph', () => {
  it('records the computation a node was created in', () => {
    observed = observeGraph();
    createRoot(() => {
      const wrapper = createMemo(
        () => {
          createSignal(0, { name: 'inner' });
          return 1;
        },
        undefined,
        { name: 'wrapper' },
      );
      wrapper();
    });
    observed.sample();

    const wrapper = byLabel(observed, 'wrapper')!;
    expect(byLabel(observed, 'inner')?.createdIn).toBe(wrapper.id);
  });

  it('leaves a node created at the top level without one', () => {
    observed = observeGraph();
    createRoot(() => createSignal(0, { name: 'top' }));
    observed.sample();
    expect(byLabel(observed, 'top')?.createdIn).toBeUndefined();
  });
});

describe('a node created inside the framework plumbing', () => {
  it('is attached to the component that caused it, not left loose', () => {
    observed = observeGraph();
    createRoot(() => {
      const owner = createMemo(
        () => {
          // What a component does: a render effect per binding, and rows created inside it.
          createRenderEffect(() => {
            createSignal(0, { name: 'row' });
          });
          return 1;
        },
        undefined,
        { name: 'List' },
      );
      owner();
    });
    observed.sample();

    const list = byLabel(observed, 'List')!;
    expect(byLabel(observed, 'row')?.createdIn).toBe(list.id);
    expect([...observed.graph.values()].some((n) => n.kind === 'effect')).toBe(false);
  });
});

describe('who wrote a signal', () => {
  it('records the effect that set it', () => {
    observed = observeGraph();
    createRoot(() => {
      const [src] = createSignal(1, { name: 'src' });
      const [, setDst] = createSignal(0, { name: 'dst' });
      createEffect(() => (setDst as (n: number) => number)(src() * 2));
    });
    observed.sample();

    const effect = [...observed.graph.values()].find((n) => n.kind === 'effect')!;
    const dst = byLabel(observed, 'dst')!;
    expect([...effect.writes]).toContain(dst.id);
  });

  it('leaves a write from outside any computation as no edge', () => {
    observed = observeGraph();
    let set!: (n: number) => number;
    createRoot(() => {
      const [, setCount] = createSignal(0, { name: 'count' });
      set = setCount as (n: number) => number;
    });
    // What a click handler does.
    set(1);
    observed.sample();
    expect([...observed.graph.values()].every((n) => n.writes.size === 0)).toBe(true);
  });
});

describe('history', () => {
  it('cuts a commit at each write from outside, and keeps what it caused', () => {
    observed = observeGraph();
    let set!: (n: number) => number;
    createRoot(() => {
      const [count, setCount] = createSignal(0, { name: 'count' });
      createEffect(() => count() * 2);
      set = setCount as (n: number) => number;
    });
    observed.sample();
    observed.takeEvents();

    set(1);
    set(2);
    const events = observed.takeEvents();
    const commits = toCommits(events);

    // Two clicks, two commits, each caused by a write nothing was running for.
    expect(commits).toHaveLength(2);
    expect(commits.every((c) => c.cause !== undefined)).toBe(true);
    const count = byLabel(observed, 'count')!;
    expect(commits[0]?.cause?.id).toBe(count.id);
  });

  it('carries the value on both sides of a write', () => {
    observed = observeGraph();
    let set!: (n: number) => number;
    createRoot(() => {
      const [, setCount] = createSignal(0, { name: 'count' });
      set = setCount as (n: number) => number;
    });
    observed.sample();
    observed.takeEvents();

    set(7);
    const write = observed.takeEvents().find((e) => e.kind === 'write');
    expect(write?.from).toBe('0');
    expect(write?.to).toBe('7');
  });

  it('records nothing when history is off', () => {
    observed = observeGraph({ history: 0 });
    createRoot(() => {
      const [, setCount] = createSignal(0);
      (setCount as (n: number) => number)(1);
    });
    observed.sample();
    expect(observed.takeEvents()).toEqual([]);
  });
});

describe('what a write changed', () => {
  it('names the row an append added, not the whole list', () => {
    observed = observeGraph();
    let add!: (next: unknown[]) => unknown[];
    let read!: () => unknown[];
    createRoot(() => {
      const [todos, setTodos] = createSignal<unknown[]>([{ text: 'a' }], { name: 'todos' });
      read = todos as () => unknown[];
      add = setTodos as (next: unknown[]) => unknown[];
    });
    observed.sample();
    observed.takeEvents();

    add([...read(), { text: 'b' }]);
    const write = observed.takeEvents().find((e) => e.kind === 'write');

    expect(write?.change?.shape).toBe('array');
    expect(write?.change?.entries).toEqual([
      { key: '1', op: 'added', to: '{text: "b"}', toJson: '{"text":"b"}' },
    ]);
    expect(write?.change?.length).toEqual({ from: 1, to: 2 });
  });

  it('keeps the name of a node that was disposed, so the entry is readable', () => {
    observed = observeGraph();
    let drop!: () => void;
    createRoot(() => {
      createRoot((dispose) => {
        createSignal(0, { name: 'row' });
        drop = dispose;
      });
    });
    observed.sample();
    observed.takeEvents();

    drop();
    const gone = observed.takeEvents().find((e) => e.kind === 'disposed');
    // The graph no longer has the node, so without this the timeline says `#3`.
    expect(gone?.label).toBe('row');
  });
});

describe('what a signal drives in the document', () => {
  it('names the attribute and the element a binding writes', () => {
    observed = observeGraph();
    const el = document.createElement('div');
    el.className = 'card';

    createRoot(() => {
      const [title] = createSignal('hi', { name: 'title' });
      // What setDynamicAttribute does. Spelled out here so devtools stays independent of the
      // dom package it watches.
      createRenderEffect(() => {
        reportReactiveBinding(el, 'attribute', 'title');
        void title();
      });
    });
    observed.sample();

    expect(byLabel(observed, 'title')?.targets?.[0]).toMatchObject({
      kind: 'attribute',
      name: 'title',
      element: 'div.card',
    });
    // Still counted, for a host that only wants the number.
    expect(byLabel(observed, 'title')?.bindings).toBe(1);
  });

  it('names every place one signal is used, not just the first', () => {
    observed = observeGraph();
    const a = document.createElement('span');
    const b = document.createElement('button');

    createRoot(() => {
      const [count] = createSignal(0, { name: 'count' });
      createRenderEffect(() => {
        reportReactiveBinding(a, 'attribute', 'data-n');
        void count();
      });
      createRenderEffect(() => {
        reportReactiveBinding(b, 'attribute', 'aria-label');
        void count();
      });
    });
    observed.sample();

    const targets = byLabel(observed, 'count')?.targets ?? [];
    expect(targets).toHaveLength(2);
    expect(targets.map((t) => `${t.name} of ${t.element}`).sort()).toEqual([
      'aria-label of button',
      'data-n of span',
    ]);
  });

  it('leaves targets off a signal the document does not read', () => {
    observed = observeGraph();
    createRoot(() => createSignal(0, { name: 'quiet' }));
    observed.sample();
    expect(byLabel(observed, 'quiet')?.targets).toBeUndefined();
  });
});

describe('where a binding and a setter live', () => {
  it('keeps the line that wired a binding up', () => {
    observed = observeGraph();
    const el = document.createElement('div');
    createRoot(() => {
      const [title] = createSignal('hi', { name: 'title' });
      createRenderEffect(() => {
        reportReactiveBinding(el, 'attribute', 'title');
        void title();
      });
    });
    observed.sample();

    // The effect's first run is scheduled, so the frame is captured when it is created , 
    // by the time it runs, the code that asked for it has left the stack.
    //
    // The file cannot be asserted: this spec lives under packages/devtools, which callSite
    // classifies as framework, so it falls back to a package frame. That the fallback is
    // reached at all is the thing being pinned: without capture at creation there is no
    // location of any kind. Which frame gets picked is callsite.spec's business.
    const target = byLabel(observed, 'title')?.targets?.[0];
    expect(target?.source).toBeDefined();
    expect(typeof target?.source?.line).toBe('number');
    expect(target?.source?.file).toBeTruthy();
  });

  it('records where a signal is set from outside any computation', () => {
    observed = observeGraph();
    let set!: (n: number) => number;
    createRoot(() => {
      const [, setCount] = createSignal(0, { name: 'count' });
      set = setCount as (n: number) => number;
    });
    observed.sample();

    set(1);
    const node = byLabel(observed, 'count')!;
    expect(node.setAt).toHaveLength(1);
    expect(typeof node.setAt?.[0]?.line).toBe('number');
  });

  it('counts one place once, however often it is called', () => {
    observed = observeGraph();
    let set!: (n: number) => number;
    createRoot(() => {
      const [, setCount] = createSignal(0, { name: 'count' });
      set = setCount as (n: number) => number;
    });
    observed.sample();

    for (let i = 1; i <= 20; i++) set(i);
    expect(byLabel(observed, 'count')?.setAt).toHaveLength(1);
  });

  it('says nothing about a write a computation made — that is already an edge', () => {
    observed = observeGraph();
    createRoot(() => {
      const [src] = createSignal(1, { name: 'src' });
      const [, setDst] = createSignal(0, { name: 'dst' });
      createEffect(() => (setDst as (n: number) => number)(src() * 2));
    });
    observed.sample();
    expect(byLabel(observed, 'dst')?.setAt).toBeUndefined();
  });

  it('costs nothing when the host does not want it', () => {
    observed = observeGraph({ bindingSources: false });
    let set!: (n: number) => number;
    createRoot(() => {
      const [, setCount] = createSignal(0, { name: 'count' });
      set = setCount as (n: number) => number;
    });
    observed.sample();
    set(1);
    expect(byLabel(observed, 'count')?.setAt).toBeUndefined();
  });
});

describe('putting a stack location back in the author\'s file', () => {
  it('translates a binding site through the host\'s map', () => {
    observed = observeGraph({
      // What a host with the source maps does: compiled position in, original out.
      mapSource: () => ({ file: 'src/App.tsx', line: 12, column: 6 }),
    });
    const el = document.createElement('div');
    createRoot(() => {
      const [title] = createSignal('hi', { name: 'title' });
      createRenderEffect(() => {
        reportReactiveBinding(el, 'attribute', 'title');
        void title();
      });
    });
    observed.sample();
    const source = byLabel(observed, 'title')?.targets?.[0]?.source;
    expect(source).toMatchObject({ file: 'src/App.tsx', line: 12 });
    // And the compiled position it came from, which is the only thing that separates two
    // bindings a template map cannot tell apart.
    expect(typeof source?.compiled?.line).toBe('number');
    expect(source?.compiled?.line).not.toBe(12);
  });

  it('keeps the compiled position when the map cannot place it', () => {
    observed = observeGraph({ mapSource: () => undefined });
    let set!: (n: number) => number;
    createRoot(() => {
      const [, setCount] = createSignal(0, { name: 'count' });
      set = setCount as (n: number) => number;
    });
    observed.sample();
    set(1);
    // A mapper that found nothing must not turn a usable location into none at all.
    expect(byLabel(observed, 'count')?.setAt?.[0]?.file).toBeTruthy();
  });

  it('survives a mapper that throws', () => {
    observed = observeGraph({
      mapSource: () => {
        throw new Error('bad map');
      },
    });
    let set!: (n: number) => number;
    createRoot(() => {
      const [, setCount] = createSignal(0, { name: 'count' });
      set = setCount as (n: number) => number;
    });
    observed.sample();
    expect(() => set(1)).not.toThrow();
    expect(byLabel(observed, 'count')?.setAt).toHaveLength(1);
  });
});

/**
 * A panel showing where a node is on the page needs the element, and the graph deliberately
 * describes elements rather than holding them. These are held weakly instead.
 */
describe('where a node reaches the page', () => {
  /** What the runtime does to a component's return value. */
  const asComponent = (element: Element, name: string): Element => {
    (element as unknown as { $name: string }).$name = name;
    return element;
  };

  it('gives a tag the element it returned, not one nearby', () => {
    const own = document.createElement('section');
    const other = document.createElement('b');
    document.body.append(own, other);

    observed = observeGraph();
    createRoot(() => {
      const [value] = createSignal(1);
      // The memo a component is wrapped in, holding what the component returned.
      // Unnamed, like the wrapper the compiler emits: it takes the component's name.
      createMemo(() => asComponent(own, 'Panel'));
      // A binding somewhere else entirely.
      createRenderEffect(() => {
        reportReactiveBinding(other, 'content');
        return value();
      });
    });
    observed.sample();
    observed.sample();

    const panel = byLabel(observed, 'Panel');
    expect(panel?.kind).toBe('component');
    expect(observed.elementsFor(panel!.id)).toEqual([own]);
  });

  it('says nothing for a node that reaches nowhere', () => {
    observed = observeGraph();
    createRoot(() => createSignal(0, { name: 'quiet' }));
    observed.sample();
    expect(observed.elementsFor(byLabel(observed, 'quiet')!.id)).toEqual([]);
  });

  it('leaves out an element that has left the document', () => {
    const own = document.createElement('section');
    document.body.append(own);
    observed = observeGraph();
    createRoot(() => createMemo(() => asComponent(own, 'Gone')));
    observed.sample();
    observed.sample();
    const id = byLabel(observed, 'Gone')!.id;
    expect(observed.elementsFor(id)).toEqual([own]);

    own.remove();
    expect(observed.elementsFor(id)).toEqual([]);
  });

  it('answers which node a pointer landed on, walking up from where it hit', () => {
    const box = document.createElement('div');
    const inner = document.createElement('em');
    box.append(inner);
    document.body.append(box);

    observed = observeGraph();
    createRoot(() => {
      const [value] = createSignal('x', { name: 'label' });
      createRenderEffect(() => {
        reportReactiveBinding(box, 'content');
        return value();
      });
    });
    observed.sample();

    const id = byLabel(observed, 'label')!.id;
    expect(observed.nodeAt(box)).toBe(id);
    // Nothing is bound to the em, so the answer is whatever contains it.
    expect(observed.nodeAt(inner)).toBe(id);
    expect(observed.nodeAt(document.body)).toBeUndefined();
  });
});

/**
 * `Router` and `Suspense` are not named by the runtime, the compiler's mark on the tag is
 * the only thing that says what they are. Read as plain memos they were listed as values.
 */
describe('a builtin tag the runtime does not name', () => {
  it('takes its kind from the mark the compiler left on the tag', () => {
    observed = observeGraph();
    createRoot(() => {
      markReactiveSource('src/app.tsx', 35, 9, 'Router');
      createMemo(() => 'routes');
      markReactiveSource('src/app.tsx', 18, 8, 'Suspense');
      createMemo(() => 'children');
    });
    observed.sample();
    expect(byLabel(observed, 'Router')?.kind).toBe('router');
    expect(byLabel(observed, 'Suspense')?.kind).toBe('control');
  });

  it('leaves a value the author happened to name that way alone', () => {
    observed = observeGraph();
    createRoot(() => {
      markReactiveSource('src/app.tsx', 3, 8, 'Show');
      createSignal(0);
    });
    observed.sample();
    // A signal is not a tag, whatever it is called.
    expect(byLabel(observed, 'Show')?.kind).toBe('state');
  });

  it('reads each prop once, however often it samples', () => {
    observed = observeGraph();
    let built = 0;
    let titleReads = 0;
    const [title, setTitle] = createSignal('One');
    createRoot(() => {
      createMemo(
        () => {
          reportReactiveProps({
            get title() {
              titleReads++;
              return title();
            },
            // What the compiler writes for JSX in a prop: a fresh memo on every read.
            get fallback() {
              built++;
              return () => 'built';
            },
          });
          return { $name: 'Card' };
        },
        undefined,
        { name: 'Card' },
      )();
    });
    observed.sample();
    observed.sample();
    setTitle('Two');
    observed.sample();
    const card = [...observed.graph.values()].find((n) => n.kind === 'component');
    // Any getter may reach one that builds, so none is read again: values are as handed.
    expect({ built, titleReads }).toEqual({ built: 1, titleReads: 1 });
    expect(card?.props?.map((p) => p.name)).toEqual(['title', 'fallback']);
    expect(card?.props?.find((p) => p.name === 'title')?.value).toContain('One');
  });

  it('leaves nothing running from what a prop built when it was read', () => {
    observed = observeGraph();
    const [tick, setTick] = createSignal(0);
    let runs = 0;
    createRoot(() => {
      createMemo(
        () => {
          reportReactiveProps({
            // `Show`'s fallback: markup with effects of its own, built by the read.
            get fallback() {
              createEffect(() => {
                tick();
                runs++;
              });
              return 'built';
            },
          });
          return { $name: 'Card' };
        },
        undefined,
        { name: 'Card' },
      )();
    });
    observed.sample();
    const afterRead = runs;
    setTick(1);
    setTick(2);
    expect(runs).toBe(afterRead);
  });
});
