/** An effect that throws: what happens to the others, and whether it runs again. */
import { describe, it, expect } from 'vitest';
import { createRoot, createSignal, createEffect, createMemo, batch } from './index.js';

describe('an effect that throws', () => {
  it('does not stop the other effects of the same flush', () => {
    const [n, setN] = createSignal(0);
    const seen: number[] = [];
    const errors: unknown[] = [];
    createRoot(() => {
      createEffect(() => {
        if (n() > 0) throw new Error('boom');
      });
      createEffect(() => seen.push(n()));
    });
    try {
      batch(() => setN(1));
    } catch (error) {
      errors.push(error);
    }
    expect(seen).toEqual([0, 1]);
  });

  it('runs again only when what it read changes', () => {
    const [n, setN] = createSignal(0);
    const [other, setOther] = createSignal(0);
    let runs = 0;
    createRoot(() => {
      const failing = createMemo(() => {
        if (n() > 0) throw new Error('boom');
        return n();
      });
      createEffect(() => {
        runs++;
        failing();
      });
      createEffect(() => other());
    });
    try {
      setN(1);
    } catch {
      // reported once
    }
    const after = runs;
    for (let i = 1; i <= 5; i++) {
      try {
        setOther(i);
      } catch {
        // not expected
      }
    }
    expect(runs).toBe(after);
  });
});
