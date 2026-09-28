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
import { markClassSource, markReactiveSource } from './source.js';
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
    // Its signal had no owner to dispose it; it goes with the scope rather than floating.
    expect(byLabel(observed, 'queued')).toBeUndefined();
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

  it('puts a class field signal in its element scope once the scope opens', () => {
    observed = observeGraph();
    const el = document.body.appendChild(document.createElement('fx-field'));
    // What the compiler emits for `#count = signal(0)`: the mark carries the instance.
    markReactiveSource('src/field.ts', 3, 11, 'count', el);
    createSignal(0);
    const scope = openReactiveScope({ kind: 'element', name: '<fx-field>', target: el });
    withReactiveScope(scope, () => createSignal(1, { name: 'step' }));
    observed.sample();

    const element = byLabel(observed, '<fx-field>')!;
    const count = byLabel(observed, 'count')!;
    const step = byLabel(observed, 'step')!;
    expect(count.scope).toBe(element.id);
    expect(count.createdIn).toBe(element.id);
    expect(count.source).toMatchObject({ file: 'src/field.ts', line: 3 });
    // The prop made inside the scope does not claim the field's line.
    expect(step.scope).toBe(element.id);
    expect(step.source).toBeUndefined();
  });

  it('says where an element class is declared and, separately, where its tag is written', () => {
    observed = observeGraph();
    class FxWhere extends HTMLElement {}
    // What the compiler emits in the class's static block.
    markClassSource(FxWhere, 'src/elements/where.ts', 4, 0);
    customElements.define('fx-where-' + Math.random().toString(36).slice(2), FxWhere);
    const el = document.body.appendChild(new FxWhere());
    const scope = openReactiveScope({ kind: 'element', name: '<fx-where>', target: el });
    observed.sample();
    expect(byLabel(observed, '<fx-where>')!.declaredAt).toEqual({ file: 'src/elements/where.ts', line: 4, column: 0 });
    // Nothing has written the tag yet.
    expect(byLabel(observed, '<fx-where>')!.usedAt).toBeUndefined();

    // What the runtime stamps when a template makes or hydrates the element.
    (el as unknown as { __fx_loc: unknown }).__fx_loc = { file: 'src/app.tsx', line: 32, column: 8 };
    observed.sample();
    expect(byLabel(observed, '<fx-where>')!.usedAt).toEqual({ file: 'src/app.tsx', line: 32, column: 8 });
    closeReactiveScope(scope);
  });
});
