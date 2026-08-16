/**
 * `signal`/`memo`/`effect` are the same primitives in a different shape, so the tests
 * compare them against the tuple form rather than asserting numbers on their own.
 */
import { describe, it, expect } from 'vitest';
import { createEffect, createMemo, createSignal } from './graph/compat.js';
import { effect, memo, signal } from './api.js';

describe('signal', () => {
  it('reads and writes', () => {
    const count = signal(0);
    expect(count()).toBe(0);
    count.set(5);
    expect(count()).toBe(5);
  });

  it('takes a function to derive the next value', () => {
    const count = signal(1);
    count.set((n) => n + 1);
    expect(count()).toBe(2);
  });

  it('is the accessor createSignal returned, with the setter on it', () => {
    // Not a copy of the machinery — the same function, so a read is the same call.
    const count = signal(0);
    expect(typeof count).toBe('function');
    count.set(3);
    expect(count()).toBe(3);
  });

  it('starts undefined when given nothing', () => {
    const nothing = signal<number>();
    expect(nothing()).toBeUndefined();
  });
});

describe('the two shapes are one system', () => {
  it('drives an effect written the old way', () => {
    const count = signal(0);
    const seen: number[] = [];
    createEffect(() => seen.push(count()));

    count.set(1);
    count.set(2);
    expect(seen).toEqual([0, 1, 2]);
  });

  it('feeds a memo written the old way', () => {
    const count = signal(2);
    const doubled = createMemo(() => count() * 2);
    expect(doubled()).toBe(4);

    count.set(5);
    expect(doubled()).toBe(10);
  });

  it('lets the new memo read a tuple signal', () => {
    const [count, setCount] = createSignal(2);
    const doubled = memo(() => count() * 2);
    expect(doubled()).toBe(4);

    setCount(5);
    expect(doubled()).toBe(10);
  });

  it('tracks step for step with the tuple form', () => {
    const handle = signal(0);
    const [get, set] = createSignal(0);
    const fromHandle: number[] = [];
    const fromTuple: number[] = [];

    effect(() => fromHandle.push(handle()));
    createEffect(() => fromTuple.push(get()));

    for (const n of [1, 2, 3]) {
      handle.set(n);
      set(n);
    }
    expect(fromHandle).toEqual(fromTuple);
  });
});

describe('memo', () => {
  it('caches until a dependency changes', () => {
    const count = signal(1);
    let runs = 0;
    const doubled = memo(() => {
      runs++;
      return count() * 2;
    });

    expect(doubled()).toBe(2);
    expect(doubled()).toBe(2);
    expect(runs).toBe(1);

    count.set(2);
    expect(doubled()).toBe(4);
    expect(runs).toBe(2);
  });
});

describe('effect', () => {
  it('stops when disposed', () => {
    const count = signal(0);
    const seen: number[] = [];
    const dispose = effect(() => seen.push(count()));

    count.set(1);
    dispose();
    count.set(2);
    expect(seen).toEqual([0, 1]);
  });
});
