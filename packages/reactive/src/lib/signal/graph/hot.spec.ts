import { afterEach, describe, expect, it } from 'vitest';
import { createSignal } from './compat.js';
import { createStore } from '../../store/store.js';
import { setHotState, type HotStateKind } from './hot.js';
import { createResource } from './resource.js';

afterEach(() => setHotState(null));



describe('hot state hook', () => {
  it('lets the hook choose a signal or store start value, then hands back read and reset', () => {
    const taken: Array<[HotStateKind, unknown]> = [];
    const kept: Array<{ read: () => unknown; reset: () => void }> = [];
    setHotState({
      take: (kind, initial) => {
        taken.push([kind, initial]);
        return kind === 'signal' ? 7 : { items: ['kept'] };
      },
      keep: (read, reset) => void kept.push({ read, reset }),
    });
    const [n, setN] = createSignal(0);
    const [state] = createStore({ items: [] as string[] });

    expect(taken).toEqual([['signal', 0], ['store', { items: [] }]]);
    expect(n()).toBe(7);
    expect(state.items).toEqual(['kept']);
    setN(9);
    expect(kept[0]!.read()).toBe(9);
    kept[0]!.reset();
    expect(n()).toBe(0);
    expect(kept[1]!.read()).toEqual({ items: ['kept'] });
  });

  it('does not count a store\'s per-key signals or a resource\'s own', () => {
    const kinds: HotStateKind[] = [];
    setHotState({ take: (kind, initial) => (kinds.push(kind), initial), keep: () => {} });
    const [state] = createStore({ a: 1, b: { c: 2 } });
    void state.a;
    void state.b.c;
    createResource(() => Promise.resolve(1));
    createSignal(0);
    expect(kinds).toEqual(['store', 'signal']);
  });

  it('is not consulted when nothing installed it', () => {
    const [n] = createSignal(3);
    expect(n()).toBe(3);
  });
});
