import { describe, expect, it, vi } from 'vitest';
import {
  childOwner,
  computed,
  context,
  effect,
  memo,
  renderEffect,
  root,
  signal,
} from './api.js';
import {
  createChildOwner,
  createContext,
  createRoot,
  getOwner,
  onCleanup,
  runWithOwner,
} from './graph/runtime.js';
import {
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
} from './graph/compat.js';
import { batch, flush, untrack } from './graph/compat.js';
import { useContext } from './graph/runtime.js';

/**
 * The short names are aliases, so what is worth pinning is that they stay aliases: same
 * arity, and the same effect on the graph. A short form that quietly took different
 * arguments would be a second API wearing the first one's name.
 */
describe('the short API mirrors the long one', () => {
  const pairs: Array<[string, unknown, unknown]> = [
    ['signal', signal, createSignal],
    ['memo', memo, createMemo],
    ['effect', effect, createEffect],
    ['root', root, createRoot],
    ['renderEffect', renderEffect, createRenderEffect],
    ['computed', computed, createComputed],
    ['context', context, createContext],
    ['childOwner', childOwner, createChildOwner],
  ];

  for (const [name, short, long] of pairs) {
    it(`${name} takes what its long form takes`, () => {
      expect(typeof short).toBe('function');
      expect((short as () => void).length).toBe((long as () => void).length);
    });
  }

  it('keeps onCleanup, getOwner and runWithOwner under their own names', () => {
    // No `create` to drop, so there is nothing to shorten. Asserted so a later pass
    // does not invent `cleanup` and leave two spellings for one callback.
    expect(typeof onCleanup).toBe('function');
    expect(typeof getOwner).toBe('function');
    expect(typeof runWithOwner).toBe('function');
  });
});

describe('root', () => {
  it('owns what is created inside it and disposes on demand', () => {
    const cleaned = vi.fn();
    let dispose = (): void => {};

    root((d) => {
      dispose = d;
      onCleanup(cleaned);
    });

    expect(cleaned).not.toHaveBeenCalled();
    dispose();
    expect(cleaned).toHaveBeenCalledOnce();
  });

  it('gives the callback an owner to hang effects off', () => {
    let owned: unknown = null;
    const dispose = root((d) => {
      owned = getOwner();
      return d;
    });
    expect(owned).not.toBeNull();
    dispose();
  });
});

describe('computed', () => {
  it('re-runs on a change without producing a value to read', () => {
    const count = signal(0);
    const runs = vi.fn();

    root(() => {
      computed(() => {
        runs();
        return count();
      });
    });

    expect(runs).toHaveBeenCalledOnce();
    count.set(1);
    flush();
    expect(runs).toHaveBeenCalledTimes(2);
  });
});

describe('context', () => {
  it('carries a default until a provider changes it', () => {
    const theme = context('light', 'theme');
    expect(theme.defaultValue).toBe('light');
  });
});

describe('childOwner', () => {
  it('parents a scope without entering it', () => {
    root(() => {
      const parent = getOwner();
      const child = childOwner(parent);
      expect(child).not.toBe(parent);
      // Still the outer owner, making a child is not the same as running in it.
      expect(getOwner()).toBe(parent);
    });
  });
});

describe('renderEffect', () => {
  it('runs immediately and re-runs on a change', () => {
    const count = signal(0);
    const seen: number[] = [];

    const dispose = root(() => renderEffect(() => void seen.push(count())));

    expect(seen).toEqual([0]);
    count.set(1);
    flush();
    expect(seen).toEqual([0, 1]);
    dispose();
  });
});

/**
 * The JSDoc on these functions makes behavioural claims, and a wrong doc costs more than
 * a missing one. Each claim gets a test, so the examples cannot drift from the runtime.
 */
describe('the documented behaviour is the actual behaviour', () => {
  it('signal: a bare function argument is read as an updater and called', () => {
    const callback = (): string => 'ran';
    const holder = signal<unknown>(null);

    holder.set(callback as never);
    expect(holder()).toBe('ran'); // called, not stored

    holder.set(() => callback);
    expect(holder()).toBe(callback); // wrapped, so stored
  });

  it('memo: lazy, and does not run until read', () => {
    const source = signal(1);
    const runs = vi.fn(() => source());
    const derived = memo(runs);

    expect(runs).not.toHaveBeenCalled();
    expect(derived()).toBe(1);
    expect(runs).toHaveBeenCalledOnce();
    derived();
    expect(runs).toHaveBeenCalledOnce(); // cached
  });

  it('effect: carries a returned function forward as prev, and does not treat it as teardown', () => {
    const source = signal(0);
    const disposer = vi.fn();
    const seen: unknown[] = [];

    const stop = root(() =>
      effect((prev) => {
        seen.push(prev);
        void source();
        return disposer;
      }),
    );

    source.set(1);
    flush();

    // The second run received the first run's return value, which is the claim the
    // JSDoc makes about why onCleanup is the teardown path.
    expect(seen[0]).toBeUndefined();
    expect(seen[1]).toBe(disposer);
    expect(disposer).not.toHaveBeenCalled();
    stop();
  });

  it('effect: onCleanup runs before the next execution and again on disposal', () => {
    const source = signal(0);
    const cleaned = vi.fn();

    const stop = root(() =>
      effect(() => {
        void source();
        onCleanup(cleaned);
      }),
    );

    expect(cleaned).not.toHaveBeenCalled();
    source.set(1);
    flush();
    expect(cleaned).toHaveBeenCalledTimes(1); // before the re-run
    stop();
    expect(cleaned).toHaveBeenCalledTimes(2); // and on disposal
  });

  it('effect and renderEffect share their timing: both eager, both in the writing task', () => {
    const source = signal(0);
    const viaRender: number[] = [];
    const viaEffect: number[] = [];

    const stop = root(() => {
      const a = renderEffect(() => void viaRender.push(source()));
      const b = effect(() => void viaEffect.push(source()));
      return () => {
        a();
        b();
      };
    });

    source.set(1);
    // No flush: the write already ran both. The names imply two phases; the graph has
    // one, and this is the assertion that keeps the JSDoc honest about it.
    expect(viaRender).toEqual([0, 1]);
    expect(viaEffect).toEqual([0, 1]);
    stop();
  });

  it('batch coalesces writes into one run', () => {
    const a = signal(0);
    const b = signal(0);
    const runs = vi.fn();

    const stop = root(() => effect(() => {
      runs();
      void a();
      void b();
    }));

    expect(runs).toHaveBeenCalledTimes(1);
    batch(() => {
      a.set(1);
      b.set(1);
    });
    expect(runs).toHaveBeenCalledTimes(2);
    stop();
  });

  it('untrack reads without subscribing, so an effect does not re-enter itself', () => {
    const source = signal(0);
    const runs = vi.fn();

    const stop = root(() => effect(() => {
      runs();
      untrack(() => source());
    }));

    expect(runs).toHaveBeenCalledOnce();
    source.set(1);
    flush();
    expect(runs).toHaveBeenCalledOnce();
    stop();
  });

  it('context: useContext reads the default with no provider above it', () => {
    const Theme = context<'light' | 'dark'>('light', 'theme');
    root(() => {
      expect(useContext(Theme)).toBe('light');
    });
  });

  it('context: a Provider supplies the value to everything below it', () => {
    const Theme = context<'light' | 'dark'>('light', 'theme');
    let seen: string | undefined;

    root(() => {
      // `children` as a getter, which is what the compiler emits: the Provider reads it
      // while its own owner is current, and that read is what captures the scope.
      Theme.Provider({
        value: 'dark',
        get children() {
          seen = useContext(Theme);
          return null;
        },
      });
    });

    expect(seen).toBe('dark');
  });

  it('root: disposal is recursive into a nested root', () => {
    const inner = vi.fn();
    let dispose = (): void => {};

    root((d) => {
      dispose = d;
      root(() => onCleanup(inner));
    });

    dispose();
    expect(inner).toHaveBeenCalledOnce();
  });
});
