import { describe, it, expect, afterEach } from 'vitest';
import {
  createRoot,
  createSignal,
  createMemo,
  createEffect,
  createRenderEffect,
} from '@fluixi/reactive/signal';
import { markReactiveSource } from './source.js';
import { observeGraph, type ObservedGraph } from './observe.js';

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
