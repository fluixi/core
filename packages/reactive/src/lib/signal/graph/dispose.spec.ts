import { describe, it, expect } from 'vitest';
import { State, Computed, hasSinks } from './core.js';
import { effect, createRoot, flushSync } from './runtime.js';
import { createSignal, createMemo, createRenderEffect } from './compat.js';
import { keyArray } from '../list.js';

// Disposal must unlink a computation from the signals it read. Without that,
// a long-lived signal keeps every disposed row's graph reachable through its
// observers set, which is where a cleared list used to stay in memory.
describe('disposal unlinks computations', () => {
  it('a disposed effect leaves its sources with no sink for it', () => {
    const a = new State(1);
    const seen: number[] = [];
    const dispose = effect(() => { seen.push(a.get()); });
    expect(seen).toEqual([1]);
    expect(hasSinks(a)).toBe(true);

    dispose();
    expect(hasSinks(a)).toBe(false);
    a.set(2);
    flushSync();
    expect(seen).toEqual([1]);
  });

  it('a computed disposed directly stops reacting but keeps its last value', () => {
    const a = new State(3);
    const c = new Computed(() => a.get() + 1);
    expect(c.get()).toBe(4);
    c.dispose();
    expect(hasSinks(a)).toBe(false);
    a.set(10);
    expect(c.get()).toBe(4);
  });

  it('a memo goes when its owner does, and reading it after changes nothing', () => {
    const count = new State(2);
    let read!: () => number;
    let disposeRoot!: () => void;
    createRoot((dispose) => {
      disposeRoot = dispose;
      const doubled = createMemo(() => count.get() * 2);
      read = doubled;
      expect(doubled()).toBe(4);
    });
    expect(hasSinks(count)).toBe(true);

    disposeRoot();
    expect(hasSinks(count)).toBe(false);
    expect(read()).toBe(4); // last value, from a dead memo
    count.set(5);
    expect(read()).toBe(4); // never recomputes, never resubscribes
  });

  it('a list cleared under a long-lived signal leaves no row computations behind', () => {
    const shared = new State('x');
    const rowRefs: WeakRef<object>[] = [];
    let setItems!: (rows: { id: number }[]) => void;
    let readOut!: () => unknown;

    createRoot(() => {
      const rows = Array.from({ length: 50 }, (_, i) => ({ id: i }));
      for (const row of rows) rowRefs.push(new WeakRef(row));
      const [items, setList] = createSignal<{ id: number }[]>(rows);
      setItems = setList;
      const out = keyArray(items, (row) => row.id, (item) => {
        createRenderEffect(() => {
          shared.get();
          item();
        });
        return item;
      });
      readOut = out;
      out();
    });
    expect(shared.observers?.size).toBe(50);

    setItems([]);
    readOut(); // the list reconciles: every row is disposed
    // The shared signal outlives the list (a selected row, a prefix every
    // label reads). No row computation may stay subscribed to it.
    expect(shared.observers?.size ?? 0).toBe(0);

    shared.set('y');
    flushSync();

    const gc = (globalThis as any).gc as (() => void) | undefined;
    if (gc) {
      gc();
      expect(rowRefs.every((ref) => ref.deref() === undefined)).toBe(true);
    }
  });

  it('disposing a root from inside a flush leaves the queue settled', () => {
    const [s, setS] = createSignal(0);
    const seen: string[] = [];
    let disposeSecond!: () => void;
    createRoot(() => {
      effect(() => {
        if (s() === 1) disposeSecond();
        seen.push('first');
      });
      createRoot((dispose) => {
        disposeSecond = dispose;
        effect(() => {
          s();
          seen.push('second');
        });
      });
    });
    seen.length = 0;
    setS(1);
    flushSync();
    expect(seen).toEqual(['first']);
  });
});
