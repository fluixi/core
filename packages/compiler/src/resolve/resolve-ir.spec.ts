import { describe, it, expect } from 'vitest';
import { resolveComponentSources } from './resolve-ir.js';
import { createComponentResolver } from './component-resolver.js';
import type { IRNode, IRComponent } from '../ir/nodes.js';

const component = (name: string, children: IRNode[] = []): IRComponent => ({
  kind: 'component',
  name,
  props: [],
  children,
});

const element = (tag: string, children: IRNode[] = []): IRNode => ({
  kind: 'element',
  tag,
  svg: false,
  props: [],
  children,
  static: false,
});

const rules = createComponentResolver([
  { components: { Button: '@fluixi-ui/button', Link: '@fluixi-ui/link' } },
]);

describe('resolveComponentSources', () => {
  it('annotates a reference a rule supplies', () => {
    const node = component('Button');
    resolveComponentSources(node, { resolver: rules });
    expect(node.source).toEqual({
      module: '@fluixi-ui/button',
      export: 'Button',
      origin: 'rule',
    });
  });

  it('annotates control flow as a builtin, from the right module', () => {
    const show = component('Show');
    const suspense = component('Suspense');
    resolveComponentSources([show, suspense]);
    expect(show.source).toEqual({ module: '@fluixi/dom', export: 'Show', origin: 'builtin' });
    expect(suspense.source).toEqual({
      module: '@fluixi/core',
      export: 'Suspense',
      origin: 'builtin',
    });
  });

  it('lets a rule win over a router builtin', () => {
    const node = component('Link');
    resolveComponentSources(node, { resolver: rules });
    expect(node.source).toEqual({ module: '@fluixi-ui/link', export: 'Link', origin: 'rule' });
  });

  it('keeps control flow even when a rule claims the name', () => {
    const resolver = createComponentResolver([{ components: { Show: '@fluixi-ui/show' } }]);
    const node = component('Show');
    resolveComponentSources(node, { resolver });
    expect(node.source?.module).toBe('@fluixi/dom');
    expect(node.source?.origin).toBe('builtin');
  });

  it('falls back to the router builtin when no rule claims it', () => {
    const node = component('Outlet');
    resolveComponentSources(node, { resolver: rules });
    expect(node.source).toEqual({
      module: '@fluixi/core/router-next',
      export: 'Outlet',
      origin: 'builtin',
    });
  });

  it('honours module overrides', () => {
    const node = component('Outlet');
    resolveComponentSources(node, { modules: { routerModule: '@app/router' } });
    expect(node.source?.module).toBe('@app/router');
  });

  it('leaves a name bound in the file alone', () => {
    const node = component('Button');
    resolveComponentSources(node, { resolver: rules, isBound: (n) => n === 'Button' });
    expect(node.source).toBeUndefined();
  });

  it('reaches components nested under elements and other components', () => {
    const deep = component('Button');
    const root = element('div', [component('Card', [element('span', [deep])])]);
    resolveComponentSources(root, { resolver: rules });
    expect(deep.source?.module).toBe('@fluixi-ui/button');
  });

  it('reports a tag nothing supplies, which would throw at runtime', () => {
    const report = resolveComponentSources(component('CardContent'), { resolver: rules });
    expect(report.unresolved).toEqual(['CardContent']);
    expect(report.resolved.size).toBe(0);
  });

  it('ignores member paths, whose root binding TypeScript already checks', () => {
    const node = component('Ctx.Provider');
    const report = resolveComponentSources(node, { resolver: rules });
    expect(node.source).toBeUndefined();
    expect(report.unresolved).toEqual([]);
  });

  it('reports each resolved name once', () => {
    const report = resolveComponentSources(
      element('div', [component('Button'), component('Button')]),
      { resolver: rules },
    );
    expect([...report.resolved.keys()]).toEqual(['Button']);
  });
});
