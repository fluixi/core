// @vitest-environment jsdom
//
// A provider stamps its value on the owner chain and a reader walks up for it, so the graph
// makes no edge between them. These go through the real context, not a stub of it.
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  createRoot,
  createMemo,
  createContext,
  useContext,
  observeReactiveNodes,
} from '@fluixi/reactive/signal';
import { observeGraph, type ObservedGraph } from '../observe.js';
import { registerDevtoolsPlugin, pluginRows, pluginBadge } from '../plugin.js';
import { contextPlugin, NAME } from './context.js';

let watching: ObservedGraph | undefined;
afterEach(() => {
  watching?.detach();
  watching = undefined;
});
beforeEach(() => registerDevtoolsPlugin(contextPlugin));

const named = (graph: ObservedGraph, label: string) =>
  [...graph.graph.values()].find((n) => n.label === label);

describe('the context plugin', () => {
  it('gives a context a node of its own, under whoever provided it', () => {
    const graph = (watching = observeGraph({ observe: observeReactiveNodes as never }));
    const theme = createContext('light');
    createRoot(() => {
      createMemo(() => {
        theme.Provider({ value: 'dark', children: null });
        return 1;
      }, undefined, { name: 'Shell' })();
    });
    graph.sample();

    // Unnamed contexts are said by where they came from, so seven of them are not seven
    // cards all reading `context`.
    const node = named(graph, 'Shell context');
    expect(node?.kind).toBe('context');
    expect(node?.value).toBe('"dark"');
    expect(named(graph, 'Shell')).toBeDefined();
    expect(node?.createdIn).toBe(named(graph, 'Shell')!.id);
  });

  it('says which component provides and which reads', () => {
    const graph = (watching = observeGraph({ observe: observeReactiveNodes as never }));
    const theme = createContext('light');
    createRoot(() => {
      createMemo(() => {
        theme.Provider({ value: 'dark', children: null });
        return 1;
      }, undefined, { name: 'Shell' })();
      createMemo(() => {
        useContext(theme);
        return 1;
      }, undefined, { name: 'Button' })();
    });
    graph.sample();

    expect(pluginRows(named(graph, 'Shell')!, graph.graph)).toEqual([
      { label: 'provides context', value: '"dark"' },
    ]);
    expect(pluginRows(named(graph, 'Button')!, graph.graph)[0]!.label).toBe('reads context');
    expect(pluginBadge(named(graph, 'Shell')!)).toBe('provides context');
    expect(pluginBadge(named(graph, 'Button')!)).toBe('reads context');
  });

  it('keeps the name a context was given', () => {
    const graph = (watching = observeGraph({ observe: observeReactiveNodes as never }));
    const theme = createContext('light', 'theme');
    createRoot(() => {
      createMemo(() => {
        theme.Provider({ value: 'dark', children: null });
        return 1;
      }, undefined, { name: 'Shell' })();
    });
    graph.sample();
    expect(named(graph, 'theme')?.kind).toBe('context');
  });

  it('calls a component that provides a context a provider', () => {
    const graph = (watching = observeGraph({ observe: observeReactiveNodes as never }));
    const theme = createContext('light', 'theme');
    // What createComponent stamps, which is what makes a memo a component to a watcher.
    const tag = (name: string, body: () => void) => {
      const out = { $name: name };
      return createMemo(() => {
        body();
        return out;
      })();
    };
    createRoot(() => {
      tag('Shell', () => theme.Provider({ value: 'dark', children: null }));
      tag('Button', () => useContext(theme));
    });
    graph.sample();
    expect(named(graph, 'Shell')?.kind).toBe('provider');
    // Reading one does not make you one.
    expect(named(graph, 'Button')?.kind).toBe('component');
  });

  it('leaves a kind the framework already knows alone', () => {
    const graph = (watching = observeGraph({ observe: observeReactiveNodes as never }));
    const theme = createContext('light', 'theme');
    createRoot(() => {
      const out = { $name: 'Router' };
      createMemo(() => {
        theme.Provider({ value: 'dark', children: null });
        return out;
      })();
    });
    graph.sample();
    // A Router that provides a context is still a Router.
    expect(named(graph, 'Router')?.kind).toBe('router');
  });

  it('makes one node however many components read the same context', () => {
    const graph = (watching = observeGraph({ observe: observeReactiveNodes as never }));
    const theme = createContext('light');
    createRoot(() => {
      for (const name of ['A', 'B', 'C']) {
        createMemo(() => {
          useContext(theme);
          return 1;
        }, undefined, { name })();
      }
    });
    graph.sample();
    expect([...graph.graph.values()].filter((n) => n.kind === 'context')).toHaveLength(1);
  });

  /**
   * Driven straight, because a stack taken inside a test file is an absolute path and so
   * counts as external, which is exactly the thing under test.
   */
  it('folds a context the framework made, and keeps one the project wrote', () => {
    const added: { label: string; authored?: boolean }[] = [];
    const ctx = {
      onDirective: () => {},
      onContext: (fn: (r: unknown) => void) => {
        fn({ owner: 1, id: Symbol('router'), name: 'router', kind: 'provide',
             at: { file: '/pkgs/core/router.ts', line: 1, column: 1, external: true } });
        fn({ owner: 2, id: Symbol('theme'), name: 'theme', kind: 'provide',
             at: { file: 'src/App.tsx', line: 7, column: 19 } });
      },
      annotate: () => {},
      annotation: () => undefined,
      annotateElement: () => {},
      elementAnnotation: () => undefined,
      retype: () => {},
      add: (node: { label: string; authored?: boolean }) => {
        added.push(node);
        return added.length;
      },
    };
    contextPlugin.collect!(ctx as never);
    expect(added.map((n) => [n.label, n.authored])).toEqual([
      ['router', false],
      ['theme', true],
    ]);
  });

  it('says nothing about a component that touches no context', () => {
    const graph = (watching = observeGraph({ observe: observeReactiveNodes as never }));
    createRoot(() => {
      createMemo(() => 1, undefined, { name: 'Plain' })();
    });
    graph.sample();
    expect(pluginRows(named(graph, 'Plain')!, graph.graph)).toEqual([]);
    expect(pluginBadge(named(graph, 'Plain')!)).toBeUndefined();
  });
});
