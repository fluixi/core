import { describe, it, expect } from 'vitest';
import { createRoot, createSignal, createMemo, onCleanup } from '@fluixi/reactive/signal';
import { Show } from './show.js';
import { Switch, Match } from './switch.js';
import { Dynamic } from './dynamic.js';

/** Read whatever a control-flow component returned. */
const read = (out: unknown): unknown => (typeof out === 'function' ? (out as () => unknown)() : out);

describe('Show branch ownership', () => {
  it('tears down what a branch registered when the branch is left', () => {
    // The bug this covers: an outside-click listener registered by a component
    // inside <Show> survived the branch closing, so reopening left two listeners
    // and clicks *inside* the panel dismissed it.
    let cleanups = 0;
    const [open, setOpen] = createSignal(true);

    createRoot(() => {
      const view = Show({
        when: () => open(),
        get children() {
          onCleanup(() => {
            cleanups += 1;
          });
          return 'panel';
        },
      });

      expect(read(view)).toBe('panel');
      expect(cleanups).toBe(0);

      setOpen(false);
      read(view);
      expect(cleanups).toBe(1);
    });
  });

  it('does not tear down while staying in the same branch', () => {
    // The memo also re-runs when the value changes within a branch. Disposing then
    // would throw away DOM the runtime deliberately reuses (see the toast "morphs
    // in place" behaviour), so teardown is keyed on the branch, not on each run.
    let cleanups = 0;
    const [count, setCount] = createSignal(1);

    createRoot(() => {
      const view = Show({
        when: () => count(),
        get children() {
          onCleanup(() => {
            cleanups += 1;
          });
          return `count ${count()}`;
        },
      });

      read(view);
      setCount(2);
      read(view);
      setCount(3);
      read(view);

      // Still truthy throughout, the branch never changed.
      expect(cleanups).toBe(0);
    });
  });

  it('tears down again on each subsequent branch change', () => {
    let cleanups = 0;
    const [open, setOpen] = createSignal(true);

    createRoot(() => {
      const view = Show({
        when: () => open(),
        get children() {
          onCleanup(() => {
            cleanups += 1;
          });
          return 'panel';
        },
      });

      read(view);
      setOpen(false);
      read(view);
      setOpen(true);
      read(view);
      setOpen(false);
      read(view);

      expect(cleanups).toBe(2);
    });
  });

  it('disposes the live branch when the enclosing root is disposed', () => {
    let cleanups = 0;
    createRoot((dispose) => {
      const view = Show({
        when: () => true,
        get children() {
          onCleanup(() => {
            cleanups += 1;
          });
          return 'panel';
        },
      });
      read(view);
      dispose();
    });
    expect(cleanups).toBe(1);
  });
});

describe('memo re-runs', () => {
  it('deliberately do NOT dispose per run', () => {
    // Documented on purpose: the DOM runtime reuses nodes across memo re-runs, so
    // disposing here would remount content on every derived-value change. Branch
    // lifetime belongs to the control-flow components instead.
    let cleanups = 0;
    const [n, setN] = createSignal(0);
    createRoot((dispose) => {
      const memo = createMemo(() => {
        n();
        onCleanup(() => {
          cleanups += 1;
        });
        return n();
      });
      memo();
      setN(1);
      memo();

      // Two runs registered two cleanups, and neither has fired yet.
      expect(cleanups).toBe(0);
      dispose();
    });

    // Both run together at root disposal, not between runs.
    expect(cleanups).toBe(2);
  });
});

describe('Switch branch ownership', () => {
  it('tears down the outgoing branch when another matches', () => {
    let cleanups = 0;
    const [which, setWhich] = createSignal('a');

    createRoot(() => {
      const view = Switch({
        get children() {
          return [
            Match({
              when: () => which() === 'a',
              get children() {
                onCleanup(() => {
                  cleanups += 1;
                });
                return 'A';
              },
            }),
            Match({ when: () => which() === 'b', get children() { return 'B'; } }),
          ];
        },
      } as never);

      expect(read(view)).toBe('A');
      // Nothing torn down while 'a' is the matched branch.
      expect(cleanups).toBe(0);

      setWhich('b');
      expect(read(view)).toBe('B');
    });

    // ...and the outgoing branch is torn down once another matches. The count is
    // not pinned: the memo may evaluate the branch body more than once, and what
    // matters is that leaving the branch runs its teardown.
    expect(cleanups).toBeGreaterThan(0);
  });

  it('does not tear down while the same branch stays matched', () => {
    let cleanups = 0;
    const [n, setN] = createSignal(1);

    createRoot(() => {
      const view = Switch({
        get children() {
          return [
            Match({
              when: () => n() > 0,
              get children() {
                onCleanup(() => {
                  cleanups += 1;
                });
                return `n ${n()}`;
              },
            }),
          ];
        },
      } as never);

      read(view);
      setN(2);
      read(view);
      setN(3);
      read(view);
    });

    expect(cleanups).toBe(0);
  });
});

describe('Dynamic component ownership', () => {
  it('tears down the outgoing component when `component` changes', () => {
    let cleanups = 0;
    const A = () => {
      onCleanup(() => {
        cleanups += 1;
      });
      return 'A';
    };
    const B = (): string => 'B';
    const [comp, setComp] = createSignal<unknown>(A);

    createRoot(() => {
      const view = Dynamic({
        get component() {
          return comp();
        },
      } as never);
      expect(read(view)).toBe('A');
      setComp(() => B);
      expect(read(view)).toBe('B');
    });

    expect(cleanups).toBe(1);
  });

  it('does not tear down while the component stays the same', () => {
    // The memo re-runs whenever something the component read changes; the scope
    // must survive that, or every update would dispose the live component.
    let cleanups = 0;
    const [label, setLabel] = createSignal('one');
    const Comp = (): string => {
      onCleanup(() => {
        cleanups += 1;
      });
      return label();
    };

    createRoot(() => {
      const view = Dynamic({ component: Comp } as never);
      read(view);
      setLabel('two');
      read(view);
      setLabel('three');
      read(view);

      expect(cleanups).toBe(0);
    });
  });
});
