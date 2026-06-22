import { describe, it, expect } from 'vitest';
import { createEffect, createSignal, createRoot } from './compat.js';
import { createErrorBoundary, provideErrorBoundary } from './error-boundary.js';

describe('error boundary', () => {
  it('catches a thrown error from an effect under the boundary', () => {
    const boundary = createErrorBoundary();
    const [explode, setExplode] = createSignal(false);
    createRoot(() => {
      provideErrorBoundary(boundary, () => {
        createEffect(() => {
          if (explode()) throw new Error('boom');
        });
      });
    });
    expect(boundary.error()).toBeUndefined();
    setExplode(true); // effect re-runs → throws → routed to boundary
    expect((boundary.error() as Error).message).toBe('boom');
  });

  it('reset clears the error and children recover when fixed', () => {
    const boundary = createErrorBoundary();
    const [explode, setExplode] = createSignal(true);
    let ran = 0;
    createRoot(() => {
      provideErrorBoundary(boundary, () => {
        createEffect(() => {
          ran++;
          if (explode()) throw new Error('boom');
        });
      });
    });
    expect((boundary.error() as Error).message).toBe('boom');
    setExplode(false); // fix the cause → effect re-runs cleanly
    boundary.reset();
    expect(boundary.error()).toBeUndefined();
    expect(ran).toBeGreaterThanOrEqual(2);
  });

  it('an error with no boundary above rethrows', () => {
    expect(() => {
      createRoot(() => {
        createEffect(() => {
          throw new Error('unhandled');
        });
      });
    }).toThrow('unhandled');
  });
});
