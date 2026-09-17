import { describe, expect, it, vi } from 'vitest';
import { createEffect, createSignal, flush } from './graph/compat.js';
import { createRoot } from './graph/runtime.js';
import {
  clearAllCachedResources,
  createCachedResource,
} from './cached-resource.js';

/**
 * A cached resource has to be readable from the default entry, which is the thing it
 * could not do while it was built on `./signal.js`. Reading one inside an effect from
 * `graph/compat.js` subscribed to nothing, so the effect never saw the fetch resolve
 * and a binding kept rendering the loading state.
 *
 * These are the assertions the port exists to satisfy, so they are about the wiring
 * rather than about caching. `cache.spec.ts` covers TTL behaviour.
 */
const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('a cached resource on the live graph', () => {
  it('re-runs a live effect when the fetch resolves', async () => {
    clearAllCachedResources();
    const runs = vi.fn();
    let latest: string | undefined;

    const dispose = createRoot((d) => {
      const [data] = createCachedResource(async () => 'loaded', { name: 'wiring-1' });
      createEffect(() => {
        runs();
        latest = data.latest as string | undefined;
      });
      return d;
    });

    expect(runs).toHaveBeenCalledTimes(1);
    expect(latest).toBeUndefined();

    await settled();
    flush();

    // The effect saw the resolution, which is what the archive graph could not deliver.
    expect(runs.mock.calls.length).toBeGreaterThan(1);
    expect(latest).toBe('loaded');
    dispose();
  });

  it('re-fetches when a live source signal changes', async () => {
    clearAllCachedResources();
    const [id, setId] = createSignal('a');
    const seen: string[] = [];

    const dispose = createRoot((d) => {
      const [data] = createCachedResource(
        () => id(),
        async (key: string) => `value-${key}`,
        { name: 'wiring-2' },
      );
      createEffect(() => {
        const v = data.latest as string | undefined;
        if (v) seen.push(v);
      });
      return d;
    });

    await settled();
    flush();
    expect(seen).toContain('value-a');

    setId('b');
    flush();
    await settled();
    flush();

    // The source is a live signal, so the resource's own effect tracked it.
    expect(seen).toContain('value-b');
    dispose();
  });

  it('reports loading through the live graph', async () => {
    clearAllCachedResources();
    const states: boolean[] = [];

    const dispose = createRoot((d) => {
      const [data] = createCachedResource(async () => 1, { name: 'wiring-3' });
      createEffect(() => states.push(data.loading));
      return d;
    });

    await settled();
    flush();

    expect(states[0]).toBe(true);
    expect(states[states.length - 1]).toBe(false);
    dispose();
  });
});
