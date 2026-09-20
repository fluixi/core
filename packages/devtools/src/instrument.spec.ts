import { describe, it, expect } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { componentSource, markComponentSource, markReactiveSource } from './source.js';
import { createReactor } from './instrument.js';

describe('@fluixi/devtools createReactor', () => {
  it('registers a node per signal/memo/effect/store with its label + kind', () => {
    const r = createReactor();
    r.run(({ createSignal, createMemo, createEffect, createStore }) => {
      const [count] = createSignal(1, { name: 'count' });
      createMemo(() => count() * 2, undefined, { name: 'double' });
      createEffect(() => {}, { name: 'log' });
      createStore({ a: 1 }, { name: 'st' });
    });
    const nodes = [...r.graph.values()];
    expect(nodes.map((n) => n.label).sort()).toEqual(['count', 'double', 'log', 'st']);
    expect(nodes.map((n) => n.kind).sort()).toEqual(['effect', 'memo', 'state', 'store']);
  });

  it('records an edge when a memo reads a signal', () => {
    const r = createReactor();
    r.run(({ createSignal, createMemo }) => {
      const [count] = createSignal(1, { name: 'count' });
      const double = createMemo(() => count() * 2, undefined, { name: 'double' });
      double(); // force the memo to run so it records its read
    });
    const count = [...r.graph.values()].find((n) => n.label === 'count')!;
    const double = [...r.graph.values()].find((n) => n.label === 'double')!;
    expect([...double.deps]).toContain(count.id);
  });

  it('re-running disposes + clears the graph', () => {
    const r = createReactor();
    r.run(({ createSignal }) => createSignal(0, { name: 'a' }));
    r.run(({ createSignal }) => createSignal(0, { name: 'b' }));
    expect([...r.graph.values()].map((n) => n.label)).toEqual(['b']);
  });

  it('records a write edge when an effect sets a signal', () => {
    const r = createReactor();
    r.run(({ createSignal, createEffect }) => {
      const [src] = createSignal(1, { name: 'src' });
      const [, setDst] = createSignal(0, { name: 'dst' });
      createEffect(() => setDst(src() * 2), { name: 'sync' });
    });
    const sync = [...r.graph.values()].find((n) => n.label === 'sync')!;
    const dst = [...r.graph.values()].find((n) => n.label === 'dst')!;
    expect([...sync.writes]).toContain(dst.id);
  });

  it('removes a node when its owning scope disposes', () => {
    const r = createReactor();
    let disposeInner = () => {};
    r.run(({ createSignal }) => {
      createSignal(0, { name: 'outer' });
      createRoot((d) => {
        disposeInner = d;
        createSignal(0, { name: 'inner' });
      });
    });
    expect([...r.graph.values()].map((n) => n.label).sort()).toEqual(['inner', 'outer']);
    disposeInner();
    expect([...r.graph.values()].map((n) => n.label)).toEqual(['outer']);
  });
});

describe('@fluixi/devtools source metadata', () => {
  it('keeps the location the compiler marked, and borrows its name', () => {
    const r = createReactor();
    r.run(({ createSignal }) => {
      // What the compiler emits in front of the statement that creates the node.
      markReactiveSource('src/App.ts', 10, 15, 'count');
      createSignal(0);
    });
    const [node] = [...r.graph.values()];
    expect(node.label).toBe('count');
    expect(node.source).toEqual({ file: 'src/App.ts', line: 10, column: 15 });
    r.dispose();
  });

  it('lets an explicit name win over the one read from source', () => {
    const r = createReactor();
    r.run(({ createSignal }) => {
      markReactiveSource('src/App.ts', 1, 1, 'fromSource');
      createSignal(0, { name: 'explicit' });
    });
    expect([...r.graph.values()][0]!.label).toBe('explicit');
    r.dispose();
  });

  it('gives an unmarked node no source at all', () => {
    const r = createReactor();
    r.run(({ createSignal }) => createSignal(0, { name: 'plain' }));
    const [node] = [...r.graph.values()];
    expect(node.source).toBeUndefined();
    expect(node.label).toBe('plain');
    r.dispose();
  });

  it('gives the name to one node, and the location to what the statement built', () => {
    const r = createReactor();
    r.run(({ createSignal }) => {
      markReactiveSource('src/App.ts', 3, 6, 'first');
      createSignal(1);
      createSignal(2);
    });
    const [first, second] = [...r.graph.values()];
    // One statement can make several nodes: createStore makes one per key, and they all
    // came from that line. The name is the declared variable, so only the first takes it.
    expect(first!.source).toEqual({ file: 'src/App.ts', line: 3, column: 6 });
    expect(first!.label).toBe('first');
    expect(second!.source).toEqual({ file: 'src/App.ts', line: 3, column: 6 });
    expect(second!.label).not.toBe('first');
    r.dispose();
  });

  it('holds the location across updates', () => {
    const r = createReactor();
    let set!: (v: number) => unknown;
    r.run(({ createSignal }) => {
      markReactiveSource('src/App.ts', 4, 2, 'count');
      const [, write] = createSignal(0);
      set = write as (v: number) => unknown;
    });
    const [node] = [...r.graph.values()];
    set(10);
    r.sample();
    expect(node.value).toBe('10');
    expect(node.source).toEqual({ file: 'src/App.ts', line: 4, column: 2 });
    r.dispose();
  });

  it('marks a memo and an effect too', () => {
    const r = createReactor();
    r.run(({ createSignal, createMemo, createEffect }) => {
      const [count] = createSignal(1, { name: 'count' });
      markReactiveSource('src/App.ts', 12, 17, 'doubled');
      const doubled = createMemo(() => count() * 2);
      doubled();
      markReactiveSource('src/App.ts', 14, 1);
      createEffect(() => count());
    });
    const byLabel = new Map([...r.graph.values()].map((n) => [n.label, n]));
    expect(byLabel.get('doubled')?.source?.line).toBe(12);
    // No variable name in the source, so the node keeps its positional label.
    const effect = [...r.graph.values()].find((n) => n.kind === 'effect');
    expect(effect?.source).toEqual({ file: 'src/App.ts', line: 14, column: 1 });
    r.dispose();
  });

  it('drops the metadata with the node it belonged to', () => {
    const r = createReactor();
    r.run(({ createSignal }) => {
      markReactiveSource('src/App.ts', 1, 1, 'gone');
      createSignal(0);
    });
    expect(r.graph.size).toBe(1);
    r.dispose();
    expect(r.graph.size).toBe(0);
  });
});

describe('@fluixi/devtools component nodes', () => {
  it('shows the memo wrapping a component as the component itself', () => {
    const r = createReactor();
    markComponentSource('Counter', 'src/Counter.tsx', 3, 0);
    r.run(({ createMemo }) => {
      // What `createComponent` leaves behind: the component's name on what it returned.
      const rendered = { nodeType: 1, nodeName: 'DIV', tagName: 'DIV', $name: 'Counter' };
      const wrapper = createMemo(() => rendered);
      wrapper();
    });
    r.sample();
    const [node] = [...r.graph.values()];
    expect(node!.kind).toBe('component');
    expect(node!.label).toBe('Counter');
    expect(node!.value).toBe('<div>');
    // Nothing marked the creation site here, so the declaration stands in for it.
    expect(node!.declaredAt).toEqual({ file: 'src/Counter.tsx', line: 3, column: 0 });
    expect(node!.source).toEqual({ file: 'src/Counter.tsx', line: 3, column: 0 });
    r.dispose();
  });

  it('keeps the creation site and the declaration apart', () => {
    const r = createReactor();
    markComponentSource('Panel', 'src/Panel.tsx', 2, 0);
    r.run(({ createMemo }) => {
      // What the compiler emits at the tag: the site the wrapper memo is made at.
      markReactiveSource('src/App.tsx', 9, 6, 'Panel');
      const wrapper = createMemo(() => ({ nodeType: 1, nodeName: 'DIV', tagName: 'DIV', $name: 'Panel' }));
      wrapper();
    });
    r.sample();
    const [node] = [...r.graph.values()];
    expect(node!.source).toEqual({ file: 'src/App.tsx', line: 9, column: 6 });
    expect(node!.declaredAt).toEqual({ file: 'src/Panel.tsx', line: 2, column: 0 });
    r.dispose();
  });

  it('leaves a memo that is not a component alone', () => {
    const r = createReactor();
    r.run(({ createMemo }) => {
      const m = createMemo(() => 41 + 1, undefined, { name: 'answer' });
      m();
    });
    r.sample();
    const [node] = [...r.graph.values()];
    expect(node!.kind).toBe('memo');
    expect(node!.label).toBe('answer');
    r.dispose();
  });

  it('reports no location for two components sharing a name', () => {
    markComponentSource('Twin', 'src/a.tsx', 1, 0);
    markComponentSource('Twin', 'src/b.tsx', 9, 0);
    expect(componentSource('Twin')).toBeUndefined();
  });

  it('pulses an effect when it re-runs, since it has no value to compare', () => {
    const r = createReactor();
    let set!: (v: number) => unknown;
    r.run(({ createSignal, createEffect }) => {
      const [count, write] = createSignal(0);
      set = write as (v: number) => unknown;
      createEffect(() => count(), { name: 'watcher' });
    });
    r.sample();
    const effect = [...r.graph.values()].find((n) => n.kind === 'effect')!;
    const before = effect.lastPulse;
    set(1);
    const changed = r.sample();
    expect(changed).toContain(effect.id);
    expect(effect.lastPulse).toBeGreaterThan(before);
    r.dispose();
  });
});
