import { describe, expect, it, vi } from 'vitest';
import { createEffect, createSignal as liveSignal, flush } from './graph/compat.js';
import { createRoot } from './graph/runtime.js';
import { createSignal as archiveSignal } from './signal.js';

/**
 * The two graphs do not subscribe to each other, and this is where that is written
 * down.
 *
 * `signal.ts` tracks its current consumer in a module-level `Listener`. Everything on
 * the default entry tracks through `G.consumer` on the shared graph state. A read on
 * one side inside a computation from the other therefore registers nothing, and the
 * reader never re-runs.
 *
 * `cached-resource.ts` was the one published subpath this bit: a cached resource's
 * signals lived over there, so `createEffect(() => data())` subscribed to nothing and
 * a binding kept whatever it first rendered. It is on the live graph now, and
 * `cached-resource-live-graph.spec.ts` holds that down.
 *
 * What remains here is the hazard itself, asserted so the next module built on the
 * archive is a deliberate choice rather than a surprise. Retiring `signal.ts` should
 * delete this file.
 */
describe('the archive graph and the live graph are separate', () => {
  it('a live effect does not re-run when an archive signal is written', () => {
    const [read, write] = archiveSignal(0);
    const runs = vi.fn();

    const dispose = createRoot((d) => {
      createEffect(() => {
        runs();
        read();
      });
      return d;
    });

    expect(runs).toHaveBeenCalledTimes(1);
    write(1);
    flush();

    // Still one. The read registered no dependency, because the archive checks its
    // own `Listener` and the live effect set `G.consumer`.
    expect(runs).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('the same effect re-runs for a live signal, so the effect itself is fine', () => {
    const [read, write] = liveSignal(0);
    const runs = vi.fn();

    const dispose = createRoot((d) => {
      createEffect(() => {
        runs();
        read();
      });
      return d;
    });

    write(1);
    flush();
    expect(runs).toHaveBeenCalledTimes(2);
    dispose();
  });
});
