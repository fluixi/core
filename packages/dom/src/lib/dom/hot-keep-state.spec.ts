// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, createSignal, flush, onCleanup } from '@fluixi/reactive/signal';
import { createStore } from '@fluixi/reactive/store';
import { createComponent } from './integration.js';
import { createNativeElement, insert, render } from './runtime.js';
import { createHotModule } from './hot.js';

function fakeHot() {
  return { data: {} as Record<string, unknown>, invalidate: () => {} };
}

const KEEP = { keepState: true };

/** A counter whose setter the test can reach, rendering `label:count`. */
function counter(label: string, writers: Array<(n: number) => void>, extra = 0) {
  return () => {
    const [n, setN] = createSignal(0);
    for (let i = 0; i < extra; i++) createSignal(i);
    writers.push(setN);
    const p = createNativeElement('p');
    insert(p, () => `${label}:${n()}`);
    return p;
  };
}

/** As compiled JSX does: the component's value goes into a container built once. */
function mount(view: () => unknown): HTMLElement {
  const host = document.createElement('div');
  createRoot(() =>
    render(() => {
      const main = createNativeElement('div');
      insert(main, view());
      return main;
    }, host),
  );
  return host;
}

const swap = (hot: ReturnType<typeof fakeHot>, id: string, name: string, impl: unknown, options = KEEP) => {
  const next = createHotModule(hot, id, options);
  next.component(name, impl);
  next.done();
  flush();
};

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__FLUIXI_DEVTOOLS_HOOK__;
});

describe('hot reload keeping state', () => {
  it('keeps the edited component signals, matched by creation order', () => {
    const hot = fakeHot();
    const writers: Array<(n: number) => void> = [];
    const Counter = createHotModule(hot, 'counter.tsx', KEEP).component('Counter', counter('old', writers));
    const host = mount(() => createComponent(Counter as never, {}));
    writers[0]!(3);
    flush();
    expect(host.textContent).toBe('old:3');

    swap(hot, 'counter.tsx', 'Counter', counter('new', writers));
    expect(host.textContent).toBe('new:3');
  });

  it('starts fresh when the new code creates a different number of signals', async () => {
    const hot = fakeHot();
    const writers: Array<(n: number) => void> = [];
    const Counter = createHotModule(hot, 'count2.tsx', KEEP).component('Counter', counter('old', writers));
    const host = mount(() => createComponent(Counter as never, {}));
    writers[0]!(3);
    flush();

    swap(hot, 'count2.tsx', 'Counter', counter('new', writers, 1));
    await Promise.resolve();
    flush();
    expect(host.textContent).toBe('new:0');
  });

  it('keeps a child state by its position under the rebuilt parent', () => {
    const childHot = fakeHot();
    const parentHot = fakeHot();
    const writers: Array<(n: number) => void> = [];
    const Child = createHotModule(childHot, 'child.tsx', KEEP).component('Child', counter('child', writers));
    const parent = (label: string) => () => {
      const main = createNativeElement('main');
      insert(main, [label, createComponent(Child as never, {})]);
      return main;
    };
    const Parent = createHotModule(parentHot, 'parent.tsx', KEEP).component('Parent', parent('a'));
    const host = mount(() => createComponent(Parent as never, {}));
    writers[0]!(7);
    flush();
    expect(host.textContent).toBe('achild:7');

    swap(parentHot, 'parent.tsx', 'Parent', parent('b'));
    expect(host.textContent).toBe('bchild:7');
  });

  it('gives nothing to a different component standing at the same position', () => {
    const hot = fakeHot();
    const writers: Array<(n: number) => void> = [];
    const One = createHotModule(fakeHot(), 'one.tsx', KEEP).component('One', counter('one', writers));
    const Two = createHotModule(fakeHot(), 'two.tsx', KEEP).component('Two', counter('two', writers));
    const pick = (Inner: unknown) => () => createComponent(Inner as never, {});
    const Parent = createHotModule(hot, 'pick.tsx', KEEP).component('Parent', pick(One));
    const host = mount(() => createComponent(Parent as never, {}));
    writers[0]!(4);
    flush();

    swap(hot, 'pick.tsx', 'Parent', pick(Two));
    expect(host.textContent).toBe('two:0');
  });

  it('resets without keepState, and with // @refresh reset in the module', () => {
    const hot = fakeHot();
    const writers: Array<(n: number) => void> = [];
    const Counter = createHotModule(hot, 'plain.tsx').component('Counter', counter('old', writers));
    const host = mount(() => createComponent(Counter as never, {}));
    writers[0]!(3);
    flush();

    swap(hot, 'plain.tsx', 'Counter', counter('new', writers), {});
    expect(host.textContent).toBe('new:0');
  });

  it('keeps a store as a copy of its state', () => {
    const hot = fakeHot();
    let set!: (fn: (s: { items: string[] }) => { items: string[] }) => void;
    let seen: { items: string[] } | null = null;
    const list = (label: string) => () => {
      const [state, setState] = createStore({ items: [] as string[] });
      set = setState as never;
      const p = createNativeElement('p');
      insert(p, () => `${label}:${state.items.join(',')}`);
      seen ??= state;
      return p;
    };
    const List = createHotModule(hot, 'list.tsx', KEEP).component('List', list('old'));
    const host = mount(() => createComponent(List as never, {}));
    set((s) => ({ items: [...s.items, 'a'] }));
    flush();

    swap(hot, 'list.tsx', 'List', list('new'));
    expect(host.textContent).toBe('new:a');
    set((s) => ({ items: [...s.items, 'b'] }));
    flush();
    expect(host.textContent).toBe('new:a,b');
    expect(seen!.items).toEqual(['a']);
  });

  it('disposes the old build before the new one, so its cleanups run', () => {
    const hot = fakeHot();
    const log: string[] = [];
    const withCleanup = (label: string) => () => {
      onCleanup(() => log.push(`${label} gone`));
      return createNativeElement('p');
    };
    const Card = createHotModule(hot, 'clean.tsx').component('Card', withCleanup('old'));
    mount(() => createComponent(Card as never, {}));
    swap(hot, 'clean.tsx', 'Card', withCleanup('new'), {});
    expect(log).toEqual(['old gone']);
  });

  it('names the swap in the devtools before it runs and outlines what it rebuilt', () => {
    const calls: string[] = [];
    const flashed: Element[][] = [];
    (globalThis as Record<string, unknown>).__FLUIXI_DEVTOOLS_HOOK__ = {
      mark: (label: string) => calls.push(`mark ${label}`),
      flash: (elements: Element[], label: string) => {
        calls.push(`flash ${label}`);
        flashed.push(elements);
      },
    };
    const hot = fakeHot();
    const writers: Array<(n: number) => void> = [];
    const Counter = createHotModule(hot, 'src/card.tsx').component('Card', () => {
      calls.push('build');
      return counter('x', writers)();
    });
    const host = mount(() => createComponent(Counter as never, {}));
    calls.length = 0;

    swap(hot, 'src/card.tsx', 'Card', () => {
      calls.push('build');
      return counter('y', writers)();
    }, {});
    expect(calls).toEqual(['mark hot update: Card (src/card.tsx)', 'build', 'flash hot update: Card (src/card.tsx)']);
    expect(flashed[0]).toEqual([host.querySelector('p')]);
  });
});
