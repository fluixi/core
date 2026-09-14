// @vitest-environment jsdom
//
// A plugin has a half in the page and a half in a panel, with json between them. These go
// through both, because the seam is where the mistakes are.
import { describe, it, expect, afterEach } from 'vitest';
import {
  createRoot,
  createSignal,
  createMemo,
  observeReactiveNodes,
  reportReactiveDirective,
} from '@fluixi/reactive/signal';
import { observeGraph } from './observe.js';
import { serializeGraph, snapshotToRenderMap } from './wire.js';
import { registerDevtoolsPlugin, pluginRows, pluginBadge, devtoolsPlugins } from './plugin.js';
import { directivesPlugin, NAME } from './plugins/directives.js';

let watching: { detach(): void } | undefined;
afterEach(() => {
  watching?.detach();
  watching = undefined;
});

const watch = () => (watching = observeGraph({ observe: observeReactiveNodes as never }));

describe('a devtools plugin', () => {
  it('is registered once however often its module is evaluated', () => {
    registerDevtoolsPlugin(directivesPlugin);
    registerDevtoolsPlugin(directivesPlugin);
    expect(devtoolsPlugins().filter((p) => p.name === NAME)).toHaveLength(1);
  });

  it('sees a use: directive and puts it on the node that applied it', () => {
    registerDevtoolsPlugin(directivesPlugin);
    const graph = watch();
    const el = document.createElement('div');
    function tooltip() {}

    createRoot(() => {
      // A component is a memo whose body builds the element, which is where a directive is
      // applied, so the report lands on that memo.
      createMemo(() => {
        reportReactiveDirective(el, 'use', tooltip.name);
        return 1;
      }, undefined, { name: 'Anchor' })();
    });
    graph.sample();

    const carrying = [...graph.graph.values()].filter((n) => n.extra?.[NAME]);
    expect(carrying.length).toBeGreaterThan(0);
    expect(carrying[0]!.extra![NAME]).toEqual([
      { kind: 'use', name: 'tooltip', element: 'div' },
    ]);
  });

  it('records a directive once however often the effect re-runs', () => {
    registerDevtoolsPlugin(directivesPlugin);
    const graph = watch();
    const el = document.createElement('div');
    function tooltip() {}
    createRoot(() => {
      createMemo(() => {
        reportReactiveDirective(el, 'use', tooltip.name);
        reportReactiveDirective(el, 'use', tooltip.name);
        return 1;
      }, undefined, { name: 'Anchor' })();
    });
    graph.sample();
    const carrying = [...graph.graph.values()].find((n) => n.extra?.[NAME]);
    expect(carrying!.extra![NAME]).toHaveLength(1);
  });

  it('carries what it attached over the wire and reads it in a panel', () => {
    registerDevtoolsPlugin(directivesPlugin);
    const graph = watch();
    const el = document.createElement('div');
    function autofocus() {}
    createRoot(() => {
      createMemo(() => {
        reportReactiveDirective(el, 'use', autofocus.name);
        return 1;
      }, undefined, { name: 'Anchor' })();
    });
    graph.sample();

    const wire = snapshotToRenderMap(serializeGraph(graph.graph));
    const node = [...wire.values()].find((n) => n.extra?.[NAME])!;
    expect(pluginRows(node, wire)).toEqual([
      { label: 'use:autofocus', value: 'div' },
    ]);
    expect(pluginBadge(node)).toBe('use:autofocus');
  });

  it('names the variable a ref is held in, from the compiler mark', () => {
    registerDevtoolsPlugin(directivesPlugin);
    const graph = watch();
    const el = document.createElement('div');
    const box = { current: null as Element | null };
    // What the compiled output does: the marker is installed by the observer.
    const mark = (globalThis as Record<string, unknown>)['__fx_hole'] as
      | ((v: unknown, l: number, c: number, n?: string) => unknown)
      | undefined;
    const marked = mark ? mark(box, 12, 9, 'boxRef') : box;

    createRoot(() => {
      createMemo(() => {
        reportReactiveDirective(el, 'ref', 'ref', marked);
        return 1;
      }, undefined, { name: 'Panel' })();
    });
    graph.sample();

    const node = [...graph.graph.values()].find((n) => n.extra?.[NAME])!;
    const notes = node.extra![NAME] as { kind: string; name: string; at?: { line?: number } }[];
    expect(notes[0]!.kind).toBe('ref');
    expect(notes[0]!.name).toBe('boxRef');
    expect(notes[0]!.at?.line).toBe(12);
    expect(pluginRows(node, graph.graph)[0]!.label).toBe('ref boxRef');
  });

  it('says nothing about a node no plugin touched', () => {
    registerDevtoolsPlugin(directivesPlugin);
    const graph = watch();
    createRoot(() => createSignal(0, { name: 'plain' }));
    graph.sample();
    const node = [...graph.graph.values()].find((n) => n.label === 'plain')!;
    expect(pluginRows(node, graph.graph)).toEqual([]);
    expect(pluginBadge(node)).toBeUndefined();
  });
});
