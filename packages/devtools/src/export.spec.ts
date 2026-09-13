import { describe, it, expect } from 'vitest';
import type { RNode } from './instrument.js';
import { exportGraph, graphToJson } from './export.js';

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

describe('exportGraph', () => {
  it('names references instead of numbering them', () => {
    const graph = new Map<number, RNode>([
      [0, node(0, { label: 'count' })],
      [1, node(1, { kind: 'memo', label: 'double', deps: new Set([0]) })],
    ]);
    const [, double] = exportGraph(graph).nodes;
    expect(double?.reads).toEqual(['count']);
  });

  it('disambiguates a name two nodes share', () => {
    const graph = new Map<number, RNode>([
      [0, node(0, { label: 'value' })],
      [1, node(1, { label: 'value' })],
      [2, node(2, { kind: 'memo', label: 'sum', deps: new Set([0, 1]) })],
    ]);
    const sum = exportGraph(graph).nodes.find((n) => n.label === 'sum');
    expect(sum?.reads).toEqual(['value#0', 'value#1']);
  });

  it('carries where a value comes from, reaches and is written', () => {
    const graph = new Map<number, RNode>([
      [
        0,
        node(0, {
          label: 'count',
          source: { file: 'src/App.tsx', line: 6, column: 20 },
          targets: [
            { kind: 'content', element: 'span.num', source: { file: 'src/App.tsx', line: 9, column: 25 } },
          ],
          setAt: [{ file: 'src/App.tsx', line: 14, column: 6 }],
        }),
      ],
    ]);
    const [only] = exportGraph(graph).nodes;
    expect(only?.source).toBe('src/App.tsx:6:20');
    expect(only?.updates).toEqual(['span.num — src/App.tsx:9:25']);
    expect(only?.setAt).toEqual(['src/App.tsx:14:6']);
  });

  it('shows both positions when a map could not separate the holes', () => {
    const graph = new Map<number, RNode>([
      [0, node(0, { source: { file: 'a.tsx', line: 7, column: 4, compiled: { line: 23, column: 6 } } })],
    ]);
    expect(exportGraph(graph).nodes[0]?.source).toBe('a.tsx:7:4 (out 23:6)');
  });

  it('says which kind of graph it is', () => {
    const graph = new Map<number, RNode>([[0, node(0)]]);
    expect(exportGraph(graph).from).toBe('running application');
    expect(exportGraph(graph, { fromSource: true }).from).toBe('source');
  });

  it('leaves out what a node does not have', () => {
    const [only] = exportGraph(new Map([[0, node(0)]])).nodes;
    // An export full of nulls is harder to read than one that omits them.
    expect(Object.keys(only!)).toEqual(['id', 'label', 'kind']);
  });

  it('is indented json a reader can follow', () => {
    const text = graphToJson(new Map([[0, node(0, { label: 'count' })]]));
    expect(text).toContain('\n  "nodes": [');
    expect(JSON.parse(text).nodes[0].label).toBe('count');
  });
});
