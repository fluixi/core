/** combineSignals emits once at the start and once per write, not once per source. */
import { describe, it, expect } from 'vitest';
import { createRoot, createSignal, flushSync } from './graph/compat.js';
import { combineSignals } from './utilities.js';

describe('combineSignals', () => {
  it('emits each combined value once', () => {
    const seen: number[][] = [];
    let setA!: (v: number) => void;
    createRoot(() => {
      const [a, set] = createSignal(1);
      const [b] = createSignal(2);
      setA = set;
      combineSignals(a, b).subscribe((values) => seen.push(values as number[]));
    });
    flushSync();
    setA(5);
    flushSync();
    expect(seen).toEqual([
      [1, 2],
      [5, 2],
    ]);
  });
});
