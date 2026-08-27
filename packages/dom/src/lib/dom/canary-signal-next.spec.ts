// @vitest-environment jsdom
/**
 * Canary: prove the TC39 core drives real DOM with fine-grained updates — the core
 * claim of the migration. Imports the public `@fluixi/reactive/signal` entry, which
 * IS that core, with no integration bridge, exercising the globalThis-singleton
 * graph end to end.
 *
 * This read `@fluixi/reactive/signal-next` until that subpath was removed for having
 * no export `./signal` did not already have.
 */
import { describe, it, expect } from 'vitest';
import {
  createSignal,
  createMemo,
  createEffect,
  createRoot,
  createResource,
  createSuspenseBoundary,
  provideSuspense,
} from '@fluixi/reactive/signal';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('canary — signal-next drives DOM', () => {
  it('a signal updates a text node fine-grained (no re-render)', () => {
    const host = document.createElement('div');
    const [count, setCount] = createSignal(0);
    createRoot(() => {
      createEffect(() => {
        host.textContent = String(count());
      });
    });
    expect(host.textContent).toBe('0');
    setCount(5); // synchronous, fine-grained DOM update
    expect(host.textContent).toBe('5');
  });

  it('only the affected node updates (fine-grained, not whole-tree)', () => {
    const a = document.createElement('span');
    const b = document.createElement('span');
    const [x, setX] = createSignal('x0');
    const [y, setY] = createSignal('y0');
    let aRuns = 0;
    let bRuns = 0;
    createRoot(() => {
      createEffect(() => {
        aRuns++;
        a.textContent = x();
      });
      createEffect(() => {
        bRuns++;
        b.textContent = y();
      });
    });
    expect([a.textContent, b.textContent]).toEqual(['x0', 'y0']);
    const aBefore = aRuns;
    const bBefore = bRuns;
    setX('x1'); // only a's effect should re-run
    expect(a.textContent).toBe('x1');
    expect(b.textContent).toBe('y0');
    expect(aRuns).toBe(aBefore + 1);
    expect(bRuns).toBe(bBefore); // b untouched — fine-grained
  });

  it('a memo chain drives derived DOM', () => {
    const host = document.createElement('div');
    const [n, setN] = createSignal(2);
    const doubled = createMemo(() => n() * 2);
    createRoot(() => createEffect(() => (host.textContent = `=${doubled()}`)));
    expect(host.textContent).toBe('=4');
    setN(10);
    expect(host.textContent).toBe('=20');
  });

  it('a Suspense + resource drives DOM: fallback → content', async () => {
    const host = document.createElement('div');
    const boundary = createSuspenseBoundary();
    const [data] = createResource(() => new Promise<string>((r) => setTimeout(() => r('LOADED'), 5)));

    createRoot(() => {
      // boundary state → DOM
      createEffect(() => {
        host.textContent = boundary.inFallback() ? 'loading…' : '';
      });
      provideSuspense(boundary, () => {
        createEffect(() => {
          const v = data(); // suspends while pending → boundary flips
          if (!boundary.inFallback()) host.textContent = v ?? '';
        });
      });
    });

    expect(host.textContent).toBe('loading…');
    await tick(20);
    expect(host.textContent).toBe('LOADED');
  });
});
