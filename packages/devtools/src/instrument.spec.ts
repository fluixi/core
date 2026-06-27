import { describe, it, expect } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { createReactor } from './instrument.js';

describe('@fluixi/devtools createReactor', () => {
  it('registers a node per signal/memo/effect/store with its label + kind', () => {
    const r = createReactor();
    r.run(({ createSignal, createMemo, createEffect, createStore }) => {
      const [count] = createSignal(1, { name: 'count' });
      createMemo(() => count() * 2, { name: 'double' });
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
      const double = createMemo(() => count() * 2, { name: 'double' });
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
