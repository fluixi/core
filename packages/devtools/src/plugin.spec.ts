// @vitest-environment jsdom
//
// A plugin has a half in the page and a half in a panel, with json between them. These go
// through both, because the seam is where the mistakes are.
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  createRoot,
  createMemo,
  observeReactiveNodes,
  reportReactiveDirective,
} from '@fluixi/reactive/signal';
import { observeGraph, type ObservedGraph } from './observe.js';
import { serializeGraph, snapshotToRenderMap } from './wire.js';
import {
  registerDevtoolsPlugin,
  pluginElementRows,
  pluginElementBadge,
  devtoolsPlugins,
} from './plugin.js';
import { directivesPlugin, NAME } from './plugins/directives.js';
import { createComponentTree } from './tree.js';
import { createInspector } from './inspector.js';
import type { RNode } from './instrument.js';

let watching: ObservedGraph | undefined;
afterEach(() => {
  watching?.detach();
  watching = undefined;
});
beforeEach(() => registerDevtoolsPlugin(directivesPlugin));

/**
 * A component rendering one element, which is the shape that matters: a directive is applied
 * to an element, and only a tag that returned one gets a description a panel can draw.
 */
function rendered(el: Element, apply: () => void): { graph: ObservedGraph; tag: number } {
  // On the page: a description only covers elements still connected to it.
  document.body.replaceChildren(el);
  const graph = (watching = observeGraph({ observe: observeReactiveNodes as never }));
  createRoot(() => {
    createMemo(() => {
      apply();
      // What createComponent stamps, and what makes the memo a component to a watcher.
      (el as unknown as Record<string, string>)['$name'] = 'Field';
      return el;
    })();
  });
  graph.sample();
  const tag = [...graph.graph.values()].find((n) => n.label === 'Field')!.id;
  return { graph, tag };
}

describe('a devtools plugin', () => {
  it('is registered once however often its module is evaluated', () => {
    registerDevtoolsPlugin(directivesPlugin);
    expect(devtoolsPlugins().filter((p) => p.name === NAME)).toHaveLength(1);
  });

  it('puts a use: directive on the element it was applied to', () => {
    const el = document.createElement('input');
    function autofocus() {}
    const { graph, tag } = rendered(el, () =>
      reportReactiveDirective(el, 'use', autofocus.name),
    );

    expect(graph.domFor(tag)[0]!.extra?.[NAME]).toEqual([
      { kind: 'use', name: 'autofocus', element: 'input' },
    ]);
  });

  it('records a directive once however often the effect re-runs', () => {
    const el = document.createElement('input');
    const { graph, tag } = rendered(el, () => {
      reportReactiveDirective(el, 'use', 'autofocus');
      reportReactiveDirective(el, 'use', 'autofocus');
    });
    expect(graph.domFor(tag)[0]!.extra?.[NAME]).toHaveLength(1);
  });

  it('keeps the position the compiler marked on a ref', () => {
    const el = document.createElement('input');
    const box = { current: null as Element | null };
    const mark = (globalThis as Record<string, unknown>)['__fx_hole'] as
      | ((v: unknown, l: number, c: number, n?: string) => unknown)
      | undefined;

    // The runtime resolves the name from the mark; this is about the position surviving.
    const { graph, tag } = rendered(el, () =>
      reportReactiveDirective(el, 'ref', 'boxRef', mark ? mark(box, 12, 9, 'boxRef') : box),
    );

    const notes = graph.domFor(tag)[0]!.extra?.[NAME] as {
      kind: string;
      name: string;
      at?: { line?: number };
    }[];
    expect(notes[0]!.kind).toBe('ref');
    expect(notes[0]!.name).toBe('boxRef');
    expect(notes[0]!.at?.line).toBe(12);
  });

  it('carries what it attached over the wire', () => {
    const el = document.createElement('input');
    const { graph, tag } = rendered(el, () => reportReactiveDirective(el, 'use', 'autofocus'));
    const snapshot = serializeGraph(graph.graph, Date.now(), { dom: (id) => graph.domFor(id) });
    const wire = snapshotToRenderMap(snapshot);
    const extra = wire.get(tag)!.dom![0]!.extra;
    expect(pluginElementRows(extra)).toEqual([{ label: 'use:autofocus', value: 'input' }]);
    expect(pluginElementBadge(extra)).toBe('use:autofocus');
  });

  it('says nothing about an element no plugin touched', () => {
    const el = document.createElement('input');
    const { graph, tag } = rendered(el, () => {});
    expect(graph.domFor(tag)[0]!.extra).toBeUndefined();
    expect(pluginElementRows(undefined)).toEqual([]);
    expect(pluginElementBadge(undefined)).toBeUndefined();
  });
});

/** The badge is only worth anything if something draws it. */
describe('a plugin badge reaches the panels', () => {
  const marked = (): Map<number, RNode> =>
    new Map<number, RNode>([
      [
        1,
        {
          id: 1,
          label: 'Field',
          kind: 'component',
          deps: new Set(),
          writes: new Set(),
          runs: 1,
          lastPulse: 0,
          source: { file: 'src/App.ts', line: 70, column: 4 },
          dom: [
            {
              label: 'input',
              children: [],
              extra: { [NAME]: [{ kind: 'ref', name: 'boxRef', element: 'input', at: { line: 76, column: 23 } }] },
            },
          ],
        },
      ],
    ]);

  it('shows on the element row in the tree', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const graph = marked();
    createComponentTree(host, { domFor: (id) => graph.get(id)?.dom ?? [] }).render(graph);
    const row = [...host.querySelectorAll('.fx-tree-row')].find((r) =>
      r.textContent?.includes('input'),
    )!;
    expect(row.querySelector('.fx-tree-plugin')?.textContent).toBe('ref');
  });

  it('shows in the inspector for that element, with the line it was written on', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const graph = marked();
    createInspector(host, { onReveal: () => {} }).showElement(graph, {
      key: '1:0',
      label: 'input',
      owner: 1,
      extra: graph.get(1)!.dom![0]!.extra,
    });
    expect(host.textContent).toContain('ref boxRef');
    const link = [...host.querySelectorAll('.ins-at')].find(
      (b) => (b as HTMLElement).dataset.line === '76',
    );
    expect(link).toBeDefined();
  });
});
