// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createRoot, createSignal, flush, observeReactiveNodes } from '@fluixi/reactive/signal';
import { createComponent } from './integration.js';
import { createNativeElement, insert, render } from './runtime.js';
import { createHotModule } from './hot.js';

/** A fake `import.meta.hot`: the data survives between runs of the "module", as Vite's does. */
function fakeHot() {
  const reasons: string[] = [];
  return { data: {} as Record<string, unknown>, invalidate: (message?: string) => void reasons.push(message ?? ''), reasons };
}

const text = (s: string) => () => {
  const p = createNativeElement('p');
  insert(p, s);
  return p;
};

describe('component hot reload', () => {
  it('shows a watcher one node for a hot component, not one per layer of the proxy', () => {
    const Card = createHotModule(fakeHot(), 'shown.tsx').component('Card', text('card'));
    const shown: string[] = [];
    const stop = observeReactiveNodes({
      created(report) {
        if (report.kind === 'memo' && !report.internal) shown.push(report.kind);
      },
    } as never);
    try {
      const host = document.createElement('div');
      createRoot(() => render(() => createComponent(Card as never, {}), host));
      expect(host.textContent).toBe('card');
    } finally {
      stop();
    }
    // The component's own memo. The proxy's, and the one `createComponent` made for the proxy,
    // each drew a second and third `Card`.
    expect(shown).toHaveLength(1);
  });

  it('swaps a component in place; the parent and a sibling keep their state', () => {
    const hot = fakeHot();
    const Card = createHotModule(hot, 'card.tsx').component('Card', text('old'));

    const [count, setCount] = createSignal(0);
    let parentRuns = 0;
    const host = document.createElement('div');
    createRoot(() =>
      render(() => {
        parentRuns++;
        const main = createNativeElement('main');
        const sibling = createNativeElement('span');
        insert(sibling, () => String(count()));
        insert(main, [createComponent(Card as never, {}), sibling]);
        return main;
      }, host),
    );
    setCount(5);
    flush();
    expect(host.textContent).toBe('old5');

    // The module runs again with new code: the same proxy comes back.
    const next = createHotModule(hot, 'card.tsx');
    const again = next.component('Card', text('new'));
    next.done();
    flush();
    expect(again).toBe(Card);
    expect(host.textContent).toBe('new5');
    expect(parentRuns).toBe(1);
    expect(hot.reasons).toEqual([]);
  });

  it('does not re-render a component for the signals its body reads', () => {
    const hot = fakeHot();
    const [n, setN] = createSignal(1);
    let runs = 0;
    const Counter = createHotModule(hot, 'c.tsx').component('Counter', () => {
      runs++;
      const p = createNativeElement('p');
      insert(p, () => String(n()));
      n();
      return p;
    });
    const host = document.createElement('div');
    createRoot(() => render(() => createComponent(Counter as never, {}), host));
    setN(2);
    flush();
    expect(host.textContent).toBe('2');
    expect(runs).toBe(1);
  });

  it('keeps compound parts on the proxy', () => {
    const Tabs = Object.assign(() => null, { List: () => null });
    const proxy = createHotModule(fakeHot(), 't.tsx').component('Tabs', Tabs) as unknown as { List: unknown };
    expect(proxy.List).toBe(Tabs.List);
  });

  it('reloads the page when an update brings a capitalised export that is not a component', () => {
    const hot = fakeHot();
    createHotModule(hot, 'theme.tsx').component('Theme', () => null);
    const next = createHotModule(hot, 'theme.tsx');
    next.component('Theme', { not: 'a component' });
    next.done();
    expect(hot.reasons[0]).toContain('Theme is not a component');
  });

  it('calls the router when a route data loader changes', () => {
    const hot = fakeHot();
    let reloads = 0;
    (globalThis as Record<symbol, unknown>)[Symbol.for('fluixi.hot.reloadRouteData')] = () => reloads++;
    const load = createHotModule(hot, 'route.tsx').data('routeData', () => 'old');
    const next = createHotModule(hot, 'route.tsx');
    next.data('routeData', () => 'new');
    next.done();
    expect(reloads).toBe(1);
    expect((load as () => string)()).toBe('new');
  });
});
