import { describe, it, expect } from 'vitest';
import type { RNode } from './instrument.js';
import { serializeGraph, snapshotToRenderMap, applySnapshot } from './wire.js';

const node = (id: number, over: Partial<RNode> = {}): RNode => ({
  id,
  label: `n${id}`,
  kind: 'memo',
  deps: new Set(),
  writes: new Set(),
  runs: 0,
  lastPulse: 0,
  ...over,
});

const graphOf = (...nodes: RNode[]) => new Map(nodes.map((n) => [n.id, n]));

describe('serializeGraph', () => {
  it('survives the round trip with everything a renderer reads', () => {
    const graph = graphOf(
      node(0, { kind: 'state', label: 'count', value: '1', core: { version: 3, state: 0 } }),
      node(1, {
        label: 'double',
        deps: new Set([0]),
        value: '2',
        runs: 4,
        lastPulse: 1700,
        core: { version: 2, state: 2 },
      }),
    );

    const back = snapshotToRenderMap(serializeGraph(graph, 1234));
    expect(back.get(1)).toMatchObject({
      label: 'double',
      kind: 'memo',
      value: '2',
      runs: 4,
      lastPulse: 1700,
      core: { version: 2, state: 2 },
    });
    expect([...back.get(1)!.deps]).toEqual([0]);
    expect(back.get(0)?.core?.state).toBe(0);
  });

  it('carries the fields a copy of this codec kept losing', () => {
    const graph = graphOf(
      node(0, {
        kind: 'component',
        label: 'App',
        source: { file: 'src/main.tsx', line: 4, column: 23 },
        declaredAt: { file: 'src/app.tsx', line: 4, column: 7 },
      }),
    );

    const back = snapshotToRenderMap(serializeGraph(graph));
    expect(back.get(0)).toMatchObject({
      kind: 'component',
      source: { file: 'src/main.tsx', line: 4, column: 23 },
      declaredAt: { file: 'src/app.tsx', line: 4, column: 7 },
    });
  });

  it('is json, which is the whole point of it', () => {
    const graph = graphOf(node(0, { deps: new Set([1]), core: { version: 1, state: 1 } }), node(1));
    const wire = serializeGraph(graph);
    expect(snapshotToRenderMap(JSON.parse(JSON.stringify(wire))).get(0)?.deps).toEqual(new Set([1]));
  });

  it('sends only what moved when asked for a delta', () => {
    const graph = graphOf(node(0), node(1), node(2));
    const delta = serializeGraph(graph, 1, { ids: [1], removed: [7] });
    expect(delta.partial).toBe(true);
    expect(delta.nodes.map((n) => n.id)).toEqual([1]);
    expect(delta.removed).toEqual([7]);
  });

  it('folds a delta into what is already on screen', () => {
    const screen = snapshotToRenderMap(serializeGraph(graphOf(node(0), node(1), node(2))));
    const producer = graphOf(node(1, { value: 'moved' }));

    applySnapshot(screen, serializeGraph(producer, 2, { ids: [1], removed: [2] }));

    expect([...screen.keys()]).toEqual([0, 1]);
    expect(screen.get(1)?.value).toBe('moved');
  });

  it('replaces the graph on a full snapshot', () => {
    const screen = snapshotToRenderMap(serializeGraph(graphOf(node(0), node(1))));
    const next = applySnapshot(screen, serializeGraph(graphOf(node(5))));
    expect([...next.keys()]).toEqual([5]);
  });
});
