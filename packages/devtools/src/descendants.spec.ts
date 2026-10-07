/**
 * The index `elementsFor` falls back on: every node a given node created, at any depth.
 * It replaced a walk of every node's chain per tag, which made a sample quadratic; the answer
 * must be the same one, in the same order.
 */
import { describe, expect, it } from 'vitest';
import { descendantsByCreator } from './observe.js';
import type { RNode } from './instrument.js';

const node = (id: number, createdIn?: number): RNode =>
  ({ id, label: `n${id}`, kind: 'state', deps: new Set(), writes: new Set(), runs: 1, lastPulse: 0, createdIn }) as RNode;

/** The walk the index replaced, kept here as the reference. */
function walked(graph: Map<number, RNode>, id: number): number[] {
  const out: number[] = [];
  for (const candidate of graph.values()) {
    const seen = new Set<number>();
    let at = candidate.createdIn;
    while (at !== undefined && !seen.has(at)) {
      if (at === id) {
        out.push(candidate.id);
        break;
      }
      seen.add(at);
      at = graph.get(at)?.createdIn;
    }
  }
  return out;
}

describe('descendantsByCreator', () => {
  it('gives what the walk gave, for every node, in graph order', () => {
    const graph = new Map<number, RNode>();
    // App(0) > Page(1) > [Card(2) > [s3, s4], Card(5) > s6], s7 at the root, 8 under a missing 99.
    for (const [id, parent] of [[0], [1, 0], [2, 1], [3, 2], [4, 2], [5, 1], [6, 5], [7], [8, 99]] as const) {
      graph.set(id, node(id, parent));
    }
    const index = descendantsByCreator(graph);
    for (const id of [...graph.keys(), 99]) expect(index.get(id) ?? []).toEqual(walked(graph, id));
    expect(index.get(1)).toEqual([2, 3, 4, 5, 6]);
  });

  it('stops on a cycle instead of looping', () => {
    const graph = new Map<number, RNode>([
      [1, node(1, 2)],
      [2, node(2, 1)],
    ]);
    const index = descendantsByCreator(graph);
    expect(index.get(1)).toEqual(walked(graph, 1));
    expect(index.get(2)).toEqual(walked(graph, 2));
  });

  it('is linear: a deep page of a few thousand nodes indexes at once', () => {
    const graph = new Map<number, RNode>();
    for (let i = 0; i < 3000; i++) graph.set(i, node(i, i % 50 === 0 ? undefined : i - 1));
    const started = performance.now();
    const index = descendantsByCreator(graph);
    for (const id of graph.keys()) index.get(id);
    expect(performance.now() - started).toBeLessThan(500);
  });
});
