// @vitest-environment jsdom
/**
 * Scopes: what a custom element, an app module or a service reports about itself, and how
 * the graph shows it. Driven through the real runtime, as a package would call it.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  createRoot,
  createSignal,
  createMemo,
  openReactiveScope,
  withReactiveScope,
  closeReactiveScope,
} from '@fluixi/reactive/signal';
import { observeGraph, type ObservedGraph } from './observe.js';
import { serializeGraph, snapshotToRenderMap } from './wire.js';

let observed: ObservedGraph | undefined;
afterEach(() => {
  observed?.detach();
  observed = undefined;
  document.body.innerHTML = '';
});

const byLabel = (o: ObservedGraph, label: string) => [...o.graph.values()].find((n) => n.label === label);

describe('scopes in the graph', () => {
  it('draws a module, the service inside it, and the service signals as theirs', () => {
    observed = observeGraph();
    const module = openReactiveScope({ kind: 'module', name: 'AuthModule' });
    withReactiveScope(module, () => {
      const service = openReactiveScope({ kind: 'service', name: 'AuthService', detail: 'AuthServiceToken' });
      withReactiveScope(service, () =>
        createRoot(() => {
          const [user] = createSignal<string | null>('ada', { name: 'user' });
          createMemo(() => user() !== null, undefined, { name: 'isSignedIn' });
        }),
      );
    });
    observed.sample();

    const mod = byLabel(observed, 'AuthModule')!;
    const svc = byLabel(observed, 'AuthService')!;
    const user = byLabel(observed, 'user')!;
    const signedIn = byLabel(observed, 'isSignedIn')!;
    expect([mod.kind, svc.kind, user.kind, signedIn.kind]).toEqual(['module', 'service', 'state', 'memo']);
    expect(svc.value).toBe('AuthServiceToken');
    expect(svc.scope).toBe(mod.id);
    expect(svc.createdIn).toBe(mod.id);
    expect(user.scope).toBe(svc.id);
    expect(user.createdIn).toBe(svc.id);
    expect(signedIn.scope).toBe(svc.id);
  });

  it('keeps nesting inside a scope, and points highlighting at the element', () => {
    observed = observeGraph();
    const el = document.body.appendChild(document.createElement('fx-counter'));
    const scope = openReactiveScope({ kind: 'element', name: '<fx-counter>', target: el });
    withReactiveScope(scope, () =>
      createRoot(() => {
        const [step] = createSignal(1, { name: 'step' });
        createMemo(() => {
          createSignal(0, { name: 'inner' });
          return step();
        }, undefined, { name: 'render' });
      }),
    );
    observed.sample();

    const node = byLabel(observed, '<fx-counter>')!;
    expect(node.kind).toBe('custom-element');
    expect(byLabel(observed, 'step')!.createdIn).toBe(node.id);
    // Made by a node already inside the scope: stays under that one.
    expect(byLabel(observed, 'inner')!.createdIn).toBe(byLabel(observed, 'render')!.id);
    expect(byLabel(observed, 'inner')!.scope).toBe(node.id);
    expect(observed.elementsFor(node.id)).toEqual([el]);
  });

  it('removes the scope when it ends, and carries it over the wire', () => {
    observed = observeGraph();
    const scope = openReactiveScope({ kind: 'service', name: 'Mailer' });
    withReactiveScope(scope, () => createRoot(() => createSignal(0, { name: 'queued' })));
    observed.sample();

    const wire = snapshotToRenderMap(serializeGraph(observed.graph));
    const queued = [...wire.values()].find((n) => n.label === 'queued')!;
    expect(wire.get(queued.scope!)?.kind).toBe('service');

    closeReactiveScope(scope);
    expect(byLabel(observed, 'Mailer')).toBeUndefined();
  });

  it('gives no source for a scope opened from a bundler virtual module', async () => {
    const callsite = await import('./callsite.js');
    observed = observeGraph();
    // As the generated app config calls collectApp: the only frame is the virtual module.
    const spy = vi.spyOn(callsite, 'currentCallSite').mockReturnValue({
      location: { file: '/@id/__x00__virtual:fluixi-app', line: 3, column: 1 },
      external: false,
    });
    openReactiveScope({ kind: 'module', name: 'app' });
    spy.mockRestore();
    const mod = byLabel(observed, 'app')!;
    expect(mod.usedAt).toBeUndefined();
    expect(mod.source).toBeUndefined();
  });
});
