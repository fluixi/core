import { describe, it, expect } from 'vitest';
import { State } from './core.js';
import { effect, createRoot, getOwner, onCleanup, flushSync } from './runtime.js';

// An effect whose first run read no signal and left nothing to tear down can never run
// again, so it keeps nothing alive: `() => row.id` on a plain row is the common case.
describe('effects that cannot re-run', () => {
  it('leave nothing on the parent owner', () => {
    createRoot((dispose) => {
      const owner = getOwner()!;
      let runs = 0;
      effect(() => {
        runs++;
      });
      expect(runs).toBe(1);
      expect(owner.cleanups).toBeNull();
      expect(owner.owned).toBeNull();
      dispose();
    });
  });

  it('keep an effect that read a signal, and dispose it with the owner', () => {
    const a = new State(1);
    const seen: number[] = [];
    createRoot((dispose) => {
      effect(() => {
        seen.push(a.get());
      });
      expect(getOwner()!.cleanups).toHaveLength(1);
      a.set(2);
      flushSync();
      dispose();
    });
    a.set(3);
    flushSync();
    expect(seen).toEqual([1, 2]);
  });

  it('keep an effect that registered a cleanup, and run it with the owner', () => {
    const cleaned: string[] = [];
    createRoot((dispose) => {
      effect(() => {
        onCleanup(() => cleaned.push('inner'));
      });
      effect(() => () => cleaned.push('returned'));
      dispose();
    });
    expect(cleaned.sort()).toEqual(['inner', 'returned']);
  });

  it('keep an effect that created a child scope', () => {
    const cleaned: string[] = [];
    createRoot((dispose) => {
      effect(() => {
        effect(() => {
          onCleanup(() => cleaned.push('child'));
        });
      });
      dispose();
    });
    expect(cleaned).toEqual(['child']);
  });
});
