import { describe, it, expect, vi } from 'vitest';
import { State, Computed } from './core.js';
import {
  effect,
  batch,
  flushSync,
  createRoot,
  onCleanup,
  getOwner,
  runWithOwner,
} from './runtime.js';

describe('runtime: effect', () => {
  it('runs once immediately, re-runs when a dep changes', () => {
    const a = new State(1);
    const seen: number[] = [];
    effect(() => seen.push(a.get()));
    expect(seen).toEqual([1]); // synchronous first run
    a.set(2);
    flushSync();
    expect(seen).toEqual([1, 2]);
    a.set(2); // equal → no run
    flushSync();
    expect(seen).toEqual([1, 2]);
  });

  it('tracks through a Computed', () => {
    const a = new State(2);
    const doubled = new Computed(() => a.get() * 2);
    const seen: number[] = [];
    effect(() => seen.push(doubled.get()));
    expect(seen).toEqual([4]);
    a.set(5);
    flushSync();
    expect(seen).toEqual([4, 10]);
  });

  it('runs cleanup before each re-run and on dispose', () => {
    const a = new State(0);
    const log: string[] = [];
    const dispose = effect(() => {
      const v = a.get();
      log.push(`run ${v}`);
      return () => log.push(`cleanup ${v}`);
    });
    expect(log).toEqual(['run 0']);
    a.set(1);
    flushSync();
    expect(log).toEqual(['run 0', 'cleanup 0', 'run 1']);
    dispose();
    expect(log).toEqual(['run 0', 'cleanup 0', 'run 1', 'cleanup 1']);
    a.set(2); // disposed → nothing
    flushSync();
    expect(log).toEqual(['run 0', 'cleanup 0', 'run 1', 'cleanup 1']);
  });

  it('onCleanup inside an effect fires on re-run', () => {
    const a = new State('x');
    const log: string[] = [];
    effect(() => {
      const v = a.get();
      onCleanup(() => log.push(`clean ${v}`));
      log.push(`run ${v}`);
    });
    a.set('y');
    flushSync();
    expect(log).toEqual(['run x', 'clean x', 'run y']);
  });

  it('async microtask scheduling (no manual flush)', async () => {
    const a = new State(1);
    const seen: number[] = [];
    effect(() => seen.push(a.get()));
    a.set(2);
    expect(seen).toEqual([1]); // not yet — scheduled
    await Promise.resolve();
    expect(seen).toEqual([1, 2]);
  });
});

describe('runtime: batch', () => {
  it('coalesces multiple writes into a single effect run', () => {
    const a = new State(1);
    const b = new State(10);
    const run = vi.fn();
    effect(() => {
      a.get();
      b.get();
      run();
    });
    expect(run).toHaveBeenCalledTimes(1);
    batch(() => {
      a.set(2);
      b.set(20);
    });
    expect(run).toHaveBeenCalledTimes(2); // once, after the batch — not twice
  });
});

describe('runtime: ownership', () => {
  it('createRoot disposal tears down nested effects', () => {
    const a = new State(1);
    const seen: number[] = [];
    let dispose!: () => void;
    createRoot((d) => {
      dispose = d;
      effect(() => seen.push(a.get()));
    });
    expect(seen).toEqual([1]);
    a.set(2);
    flushSync();
    expect(seen).toEqual([1, 2]);
    dispose(); // disposes the root → its effect
    a.set(3);
    flushSync();
    expect(seen).toEqual([1, 2]); // effect gone
  });

  it('getOwner / runWithOwner thread the current owner', () => {
    let captured: unknown;
    createRoot(() => {
      captured = getOwner();
      expect(captured).not.toBeNull();
    });
    // outside any root
    expect(getOwner()).toBeNull();
    let ran = false;
    runWithOwner(captured as never, () => {
      expect(getOwner()).toBe(captured);
      ran = true;
    });
    expect(ran).toBe(true);
  });
});
