// @vitest-environment jsdom
/**
 * Where a frame goes as an application gets bigger. A measurement rather than an assertion,
 * so it is skipped unless FLUIXI_BENCH is set.
 *
 *   FLUIXI_BENCH=1 npx vitest run src/graph-cost.spec.ts
 *
 * Every stage a panel runs per frame, timed separately, over a graph built to look like a
 * real page: components that render a small subtree, each with signals writing into it.
 *
 * `describeAll` and the tree walk the whole graph. `reaches` walks every description for
 * one selected node. None of that was measured above about thirty nodes, which is the size
 * of an example, not of an application.
 */
import { describe, it } from 'vitest';
import { describeAll, withoutElements } from './dom.js';
import { TREE_KINDS, createComponentTree } from './tree.js';
import { createGraphView } from './graph-view.js';
import { createInspector } from './inspector.js';
import { serializeGraph, snapshotToRenderMap } from './wire.js';
import type { RNode } from './instrument.js';

const run = process.env['FLUIXI_BENCH'] ? describe : describe.skip;

/** Elements per component, and signals per component: a card with a few live values. */
const PER_COMPONENT = 6;
const SIGNALS = 3;

interface Built {
  graph: Map<number, RNode>;
  rendered: Map<number, Element[]>;
  writes: Map<number, Element[]>;
}

/**
 * A page of `count` components, each rendering a card and writing into three of its
 * elements. Shaped after the props example rather than a flat list of signals: the cost
 * that matters is the walk over descriptions, and that needs real nesting.
 */
function build(count: number): Built {
  const graph = new Map<number, RNode>();
  const rendered = new Map<number, Element[]>();
  const writes = new Map<number, Element[]>();
  const root = document.createElement('div');
  root.id = 'root';
  document.body.replaceChildren(root);

  const node = (id: number, over: Partial<RNode>): RNode => ({
    id,
    label: `n${id}`,
    kind: 'state',
    deps: new Set(),
    writes: new Set(),
    runs: 1,
    lastPulse: 0,
    ...over,
  });

  graph.set(0, node(0, { kind: 'component', label: 'App' }));
  const shell = document.createElement('main');
  root.append(shell);
  rendered.set(0, [shell]);

  let id = 1;
  for (let c = 0; c < count; c++) {
    const card = document.createElement('section');
    card.className = 'card';
    for (let e = 0; e < PER_COMPONENT; e++) {
      const child = document.createElement('span');
      child.className = `f${e}`;
      card.append(child);
    }
    shell.append(card);

    const component = id++;
    graph.set(
      component,
      node(component, {
        kind: 'component',
        label: `Card${c}`,
        createdIn: 0,
        source: { file: 'src/App.tsx', line: c + 1, column: 4 },
      }),
    );
    rendered.set(component, [card]);

    for (let s = 0; s < SIGNALS; s++) {
      const value = id++;
      graph.set(value, node(value, { label: `v${value}`, createdIn: component, value: '"x"' }));
      writes.set(value, [card.children[s] as Element]);
    }
  }
  return { graph, rendered, writes };
}

const ms = (label: string, fn: () => void, runs = 3): void => {
  fn();
  const started = performance.now();
  for (let i = 0; i < runs; i++) fn();
  const each = (performance.now() - started) / runs;
  console.log(`    ${label.padEnd(26)} ${each.toFixed(2)} ms`);
};

run('what a frame costs as the page grows', () => {
  for (const count of [50, 200, 1000]) {
    it(`${count} components, ${count * (1 + SIGNALS) + 1} nodes`, () => {
      const { graph, rendered, writes } = build(count);
      const roots = (of: number) => rendered.get(of) ?? [];
      const written = (of: number) => writes.get(of) ?? [];
      console.log(`\n  ${count} components, ${graph.size} nodes`);

      let described = describeAll(graph, roots, written, TREE_KINDS);
      ms('describeAll', () => {
        described = describeAll(graph, roots, written, TREE_KINDS);
      });

      const domOf = (of: number) => {
        const found = described.get(of);
        return found?.length ? withoutElements(found) : undefined;
      };
      let snapshot = serializeGraph(graph, Date.now(), { dom: domOf });
      ms('serializeGraph + dom', () => {
        snapshot = serializeGraph(graph, Date.now(), { dom: domOf });
      });
      console.log(`    ${'snapshot bytes'.padEnd(26)} ${JSON.stringify(snapshot).length}`);
      const bare = JSON.stringify(serializeGraph(graph, Date.now())).length;
      console.log(`    ${'  without dom'.padEnd(26)} ${bare}`);
      // What a consumer folding in deltas sends on a frame where nothing moved, which is
      // most of them.
      const idle = JSON.stringify(
        serializeGraph(graph, Date.now(), { ids: [], removed: [], dom: domOf, cursor: 1 }),
      ).length;
      console.log(`    ${'  idle delta'.padEnd(26)} ${idle}`);

      const wire = snapshotToRenderMap(snapshot);
      ms('snapshotToRenderMap', () => snapshotToRenderMap(snapshot));

      const treeHost = document.createElement('div');
      document.body.append(treeHost);
      const tree = createComponentTree(treeHost, { domFor: (of) => wire.get(of)?.dom ?? [] });
      // Rebuilt each time: the panel redraws whenever the shape changes, and the signature
      // check that skips it would measure nothing.
      ms('tree.render', () => {
        tree.render(new Map(wire));
      });

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      document.body.append(svg);
      const view = createGraphView(svg as SVGSVGElement);
      ms('graph.update', () => view.update(wire, Date.now()));

      const inspectorHost = document.createElement('div');
      document.body.append(inspectorHost);
      const inspector = createInspector(inspectorHost);
      // A value in the middle, so `reaches` walks every description before finding it.
      const value = [...wire.values()].find((n) => n.kind === 'state')!;
      ms('inspector.show (a value)', () => {
        inspector.show(wire, value.id);
        inspector.clear();
      });
    });
  }
});
