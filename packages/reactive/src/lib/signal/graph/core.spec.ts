import { describe, it, expect, vi } from 'vitest';
import { Signal } from './index.js';

describe('graph core: Signal.State and Computed', () => {
  it('state get/set with equality gating', () => {
    const s = new Signal.State(1);
    expect(s.get()).toBe(1);
    s.set(2);
    expect(s.get()).toBe(2);
    s.set(2); // no change -> no version bump (equality)
    expect(s.get()).toBe(2);
  });

  it('computed is lazy and memoized (recomputes only when read AND a dep changed)', () => {
    const runs = vi.fn();
    const a = new Signal.State(2);
    const doubled = new Signal.Computed(() => {
      runs();
      return a.get() * 2;
    });
    expect(runs).toHaveBeenCalledTimes(0); // lazy: not run until read
    expect(doubled.get()).toBe(4);
    expect(doubled.get()).toBe(4); // cached
    expect(runs).toHaveBeenCalledTimes(1);
    a.set(5);
    expect(runs).toHaveBeenCalledTimes(1); // still lazy after write
    expect(doubled.get()).toBe(10);
    expect(runs).toHaveBeenCalledTimes(2);
  });

  it('equality-gated computed does not propagate when its value is unchanged', () => {
    const downstream = vi.fn();
    const a = new Signal.State(4);
    const isEven = new Signal.Computed(() => a.get() % 2 === 0);
    const label = new Signal.Computed(() => {
      downstream();
      return isEven.get() ? 'even' : 'odd';
    });
    expect(label.get()).toBe('even');
    expect(downstream).toHaveBeenCalledTimes(1);
    a.set(6); // still even, so isEven stays true and label must not recompute
    expect(label.get()).toBe('even');
    expect(downstream).toHaveBeenCalledTimes(1);
    a.set(7); // now odd -> isEven flips -> label recomputes
    expect(label.get()).toBe('odd');
    expect(downstream).toHaveBeenCalledTimes(2);
  });

  it('diamond: a shared source recomputes the sink exactly once (glitch-free)', () => {
    const sink = vi.fn();
    const a = new Signal.State(1);
    const b = new Signal.Computed(() => a.get() + 1);
    const c = new Signal.Computed(() => a.get() + 10);
    const d = new Signal.Computed(() => {
      sink();
      return b.get() + c.get();
    });
    expect(d.get()).toBe(13);
    expect(sink).toHaveBeenCalledTimes(1);
    a.set(2);
    expect(d.get()).toBe(15);
    expect(sink).toHaveBeenCalledTimes(2); // once, not twice
  });

  it('dynamic dependencies: unread branch stops triggering recomputes', () => {
    const runs = vi.fn();
    const cond = new Signal.State(true);
    const x = new Signal.State('x');
    const y = new Signal.State('y');
    const out = new Signal.Computed(() => {
      runs();
      return cond.get() ? x.get() : y.get();
    });
    expect(out.get()).toBe('x');
    expect(runs).toHaveBeenCalledTimes(1);
    y.set('y2'); // y not currently a dep -> no recompute
    expect(out.get()).toBe('x');
    expect(runs).toHaveBeenCalledTimes(1);
    cond.set(false); // now depends on y, not x
    expect(out.get()).toBe('y2');
    x.set('x2'); // x no longer a dep
    expect(out.get()).toBe('y2');
    expect(runs).toHaveBeenCalledTimes(2);
  });

  it('untrack reads without subscribing', () => {
    const runs = vi.fn();
    const a = new Signal.State(1);
    const b = new Signal.State(100);
    const sum = new Signal.Computed(() => {
      runs();
      return a.get() + Signal.subtle.untrack(() => b.get());
    });
    expect(sum.get()).toBe(101);
    b.set(200); // untracked -> no recompute
    expect(sum.get()).toBe(101);
    expect(runs).toHaveBeenCalledTimes(1);
    a.set(2);
    expect(sum.get()).toBe(202); // picks up b's latest on next real recompute
    expect(runs).toHaveBeenCalledTimes(2);
  });

  it('computed caches and rethrows errors, recovers when inputs change', () => {
    const a = new Signal.State(0);
    const c = new Signal.Computed(() => {
      if (a.get() === 0) throw new Error('boom');
      return a.get();
    });
    expect(() => c.get()).toThrow('boom');
    expect(() => c.get()).toThrow('boom'); // cached error
    a.set(5);
    expect(c.get()).toBe(5);
  });
});

describe('graph core: Watcher', () => {
  it('notifies (edge-triggered) when a watched computed goes dirty, re-arms after getPending+read', () => {
    const a = new Signal.State(1);
    const doubled = new Signal.Computed(() => a.get() * 2);
    const notify = vi.fn();
    const w = new Signal.subtle.Watcher(notify);
    doubled.get(); // settle to CLEAN so the next change is an edge
    w.watch(doubled);

    a.set(2);
    expect(notify).toHaveBeenCalledTimes(1);
    a.set(3); // already pending -> no second notify (edge-triggered)
    expect(notify).toHaveBeenCalledTimes(1);

    const pending = w.getPending();
    expect(pending).toContain(doubled);
    expect(doubled.get()).toBe(6); // re-read settles it

    a.set(4); // re-armed -> notifies again
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('the notify callback is purely a signal: getPending drives the work', () => {
    const a = new Signal.State('a');
    const c = new Signal.Computed(() => a.get().toUpperCase());
    let runs = 0;
    const w = new Signal.subtle.Watcher(() => {
      // Drain pending, then read. The real runtime does not read inside this callback.
      for (const _ of w.getPending()) runs++;
    });
    c.get();
    w.watch(c);
    a.set('b');
    expect(runs).toBe(1);
  });
});
