import { describe, it, expect } from 'vitest';
import { createContext, useContext, provide, createRoot } from './runtime.js';
import { createEffect } from './compat.js';
import { createResource } from './resource.js';
import { createSuspenseBoundary, provideSuspense } from './suspense.js';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('context (on the owner tree)', () => {
  it('useContext reads the nearest provided value, else the default', () => {
    const Ctx = createContext('default');
    expect(useContext(Ctx)).toBe('default'); // no provider
    let inner: string | undefined;
    provide(Ctx, 'provided', () => {
      inner = useContext(Ctx);
    });
    expect(inner).toBe('provided');
    expect(useContext(Ctx)).toBe('default'); // scope restored
  });

  it('nested providers shadow', () => {
    const Ctx = createContext(0);
    const seen: (number | undefined)[] = [];
    provide(Ctx, 1, () => {
      seen.push(useContext(Ctx));
      provide(Ctx, 2, () => seen.push(useContext(Ctx)));
      seen.push(useContext(Ctx));
    });
    expect(seen).toEqual([1, 2, 1]);
  });
});

describe('Suspense boundary', () => {
  it('a suspended resource read flips inFallback until it resolves', async () => {
    const boundary = createSuspenseBoundary();
    const [data] = createResource(() => new Promise<string>((r) => setTimeout(() => r('LOADED'), 5)));

    let value: string | undefined;
    createRoot(() => {
      provideSuspense(boundary, () => {
        // reads data(): throws the pending promise -> reported to the boundary
        createEffect(() => {
          value = data();
        });
      });
    });

    expect(boundary.inFallback()).toBe(true); // pending -> fallback
    expect(value).toBeUndefined();

    await tick(20);
    expect(boundary.inFallback()).toBe(false); // resolved -> content
    expect(value).toBe('LOADED');
  });

  it('counts multiple pending reads and only clears when all resolve', async () => {
    const boundary = createSuspenseBoundary();
    const [a] = createResource(() => new Promise<string>((r) => setTimeout(() => r('A'), 5)));
    const [b] = createResource(() => new Promise<string>((r) => setTimeout(() => r('B'), 25)));

    createRoot(() => {
      provideSuspense(boundary, () => {
        createEffect(() => a());
        createEffect(() => b());
      });
    });

    expect(boundary.inFallback()).toBe(true);
    await tick(12); // a resolved, b still pending
    expect(boundary.inFallback()).toBe(true);
    await tick(25); // b resolved
    expect(boundary.inFallback()).toBe(false);
  });
});
