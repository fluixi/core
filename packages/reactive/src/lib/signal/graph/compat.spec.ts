import { describe, it, expect, vi } from 'vitest';
import {
  createSignal,
  createMemo,
  createEffect,
  createComputed,
  createRoot,
  onCleanup,
  batch,
  untrack,
  on,
} from './compat.js';

// These mirror the legacy core semantics: tuple signals, lazy memos, and effects
// that flush synchronously on a write (no microtask), proving compat is a drop-in.

describe('compat: createSignal', () => {
  it('tuple get/set + functional updater + equality', () => {
    const [count, setCount] = createSignal(0);
    expect(count()).toBe(0);
    expect(setCount(1)).toBe(1); // setter returns the new value
    expect(count()).toBe(1);
    setCount((n) => n + 1); // functional updater
    expect(count()).toBe(2);
  });
});

describe('compat: createMemo', () => {
  it('lazy + memoized; recomputes only on real change', () => {
    const runs = vi.fn();
    const [a, setA] = createSignal(2);
    const doubled = createMemo(() => {
      runs();
      return a() * 2;
    });
    expect(runs).toHaveBeenCalledTimes(0); // lazy
    expect(doubled()).toBe(4);
    expect(doubled()).toBe(4);
    expect(runs).toHaveBeenCalledTimes(1);
    setA(5);
    expect(doubled()).toBe(10);
    expect(runs).toHaveBeenCalledTimes(2);
  });

  it('memo receives prev value', () => {
    const [a, setA] = createSignal(1);
    const acc = createMemo<number>((prev) => (prev ?? 0) + a(), 0);
    expect(acc()).toBe(1);
    setA(2);
    expect(acc()).toBe(3); // 1 + 2
  });
});

describe('compat: createEffect (synchronous flush on write, legacy semantics)', () => {
  it('runs immediately, then synchronously on each dep change', () => {
    const [a, setA] = createSignal(1);
    const seen: number[] = [];
    createEffect(() => seen.push(a()));
    expect(seen).toEqual([1]);
    setA(2); // legacy: effect runs synchronously, no flush/await
    expect(seen).toEqual([1, 2]);
  });

  it('cleanup via onCleanup runs before re-run and on dispose', () => {
    const [a, setA] = createSignal(0);
    const log: string[] = [];
    const dispose = createRoot((d) => {
      createEffect(() => {
        const v = a();
        onCleanup(() => log.push(`clean ${v}`));
        log.push(`run ${v}`);
      });
      return d;
    });
    expect(log).toEqual(['run 0']);
    setA(1);
    expect(log).toEqual(['run 0', 'clean 0', 'run 1']);
    dispose();
    expect(log).toEqual(['run 0', 'clean 0', 'run 1', 'clean 1']);
    setA(2); // disposed
    expect(log).toEqual(['run 0', 'clean 0', 'run 1', 'clean 1']);
  });

  it('diamond: dependent effect runs once per batched change', () => {
    const [a, setA] = createSignal(1);
    const b = createMemo(() => a() + 1);
    const c = createMemo(() => a() + 10);
    const run = vi.fn();
    createEffect(() => {
      b();
      c();
      run();
    });
    expect(run).toHaveBeenCalledTimes(1);
    setA(2);
    expect(run).toHaveBeenCalledTimes(2); // once, not twice
  });
});

describe('compat: createComputed (eager)', () => {
  it('runs immediately and re-runs eagerly on dep change', () => {
    const [a, setA] = createSignal(1);
    const [mirror, setMirror] = createSignal(0);
    createComputed(() => setMirror(a() * 10)); // eager derivation with a side effect
    expect(mirror()).toBe(10); // ran immediately
    setA(3);
    expect(mirror()).toBe(30); // re-ran eagerly (synchronously)
  });
});

describe('compat: batch / untrack / on', () => {
  it('batch coalesces writes into a single synchronous effect run', () => {
    const [a, setA] = createSignal(1);
    const [b, setB] = createSignal(10);
    const run = vi.fn();
    createEffect(() => {
      a();
      b();
      run();
    });
    expect(run).toHaveBeenCalledTimes(1);
    batch(() => {
      setA(2);
      setB(20);
    });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('untrack does not subscribe', () => {
    const [a, setA] = createSignal(1);
    const [b, setB] = createSignal(100);
    const seen: number[] = [];
    createEffect(() => seen.push(a() + untrack(() => b())));
    expect(seen).toEqual([101]);
    setB(200); // untracked -> no run
    expect(seen).toEqual([101]);
    setA(2);
    expect(seen).toEqual([101, 202]);
  });

  it('on() with defer skips the first run, then fires on dep change', () => {
    const [a, setA] = createSignal('x');
    const seen: string[] = [];
    createEffect(on(a, (v) => seen.push(v), { defer: true }));
    expect(seen).toEqual([]); // deferred
    setA('y');
    expect(seen).toEqual(['y']);
  });
});

describe('compat: createRoot', () => {
  it('disposal tears down nested effects', () => {
    const [a, setA] = createSignal(1);
    const seen: number[] = [];
    let dispose!: () => void;
    createRoot((d) => {
      dispose = d;
      createEffect(() => seen.push(a()));
    });
    expect(seen).toEqual([1]);
    setA(2);
    expect(seen).toEqual([1, 2]);
    dispose();
    setA(3);
    expect(seen).toEqual([1, 2]);
  });
});

// Regression: the DOM runtime detects reactivity via marker symbols ($SIGNAL via
// isSignal, $RESOURCE via isResource). insert()/control-flow treat a non-signal
// function as a component -> cache & FREEZE it after first render. The TC39 compat
// layer once dropped these markers (memos had only $MEMO; resources had none),
// which froze For/Switch/Index/Dynamic and resource reads after the first paint.
// Keep them tagged to match the legacy core.
describe('compat: reactive detection markers (legacy parity)', () => {
  const $SIGNAL = Symbol.for('signal');
  const $RESOURCE = Symbol.for('resource');

  it('createSignal and createMemo accessors are tagged $SIGNAL', () => {
    createRoot((d) => {
      const [a] = createSignal(1);
      const m = createMemo(() => a() + 1);
      expect((a as any)[$SIGNAL]).toBe(true);
      expect((m as any)[$SIGNAL]).toBe(true); // memos have to be isSignal-detectable
      d();
    });
  });

  it('createResource accessor is tagged $RESOURCE and $SIGNAL', async () => {
    const { createResource } = await import('./resource.js');
    createRoot((d) => {
      const [r] = createResource(async () => 1);
      expect((r as any)[$RESOURCE]).toBe(true); // isResource() (Show .loading gate)
      expect((r as any)[$SIGNAL]).toBe(true);   // isSignal() (insert reads reactively)
      d();
    });
  });
});
