import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from './compat.js';
import { createDebouncedSignal, createDebouncedResource } from './debounced.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createDebouncedSignal', () => {
  it('settles only after the delay', () => {
    createRoot(() => {
      const [settled, set] = createDebouncedSignal('', 300);
      set('a');
      expect(settled()).toBe('');
      vi.advanceTimersByTime(299);
      expect(settled()).toBe('');
      vi.advanceTimersByTime(1);
      expect(settled()).toBe('a');
    });
  });

  it('exposes the immediate value, so a controlled input never lags', () => {
    createRoot(() => {
      const [settled, set, { immediate }] = createDebouncedSignal('', 300);
      set('ab');
      // This is the whole reason both values exist.
      expect(immediate()).toBe('ab');
      expect(settled()).toBe('');
    });
  });

  it('collapses a burst into one settle', () => {
    createRoot(() => {
      const [settled, set] = createDebouncedSignal('', 300);
      set('a');
      vi.advanceTimersByTime(200);
      set('ab');
      vi.advanceTimersByTime(200);
      set('abc');
      expect(settled()).toBe('');
      vi.advanceTimersByTime(300);
      expect(settled()).toBe('abc');
    });
  });

  it('supports a functional update against the immediate value', () => {
    createRoot(() => {
      const [settled, set] = createDebouncedSignal(1, 100);
      set((n) => n + 1);
      set((n) => n + 1);
      vi.advanceTimersByTime(100);
      expect(settled()).toBe(3);
    });
  });

  it('reports pending while a write is waiting', () => {
    createRoot(() => {
      const [, set, { pending }] = createDebouncedSignal('', 300);
      expect(pending()).toBe(false);
      set('a');
      expect(pending()).toBe(true);
      vi.advanceTimersByTime(300);
      expect(pending()).toBe(false);
    });
  });

  it('flushes on demand: what Enter needs', () => {
    createRoot(() => {
      const [settled, set, { flush, pending }] = createDebouncedSignal('', 300);
      set('go');
      expect(flush()).toBe('go');
      expect(settled()).toBe('go');
      expect(pending()).toBe(false);
    });
  });

  it('cancels a pending write, keeping the last settled value', () => {
    createRoot(() => {
      const [settled, set, { cancel, pending }] = createDebouncedSignal('first', 300);
      set('second');
      cancel();
      vi.advanceTimersByTime(500);
      expect(settled()).toBe('first');
      expect(pending()).toBe(false);
    });
  });

  it('drops a pending write when the scope is disposed', () => {
    let set!: (v: string) => unknown;
    let settled!: () => string;
    const dispose = createRoot((d) => {
      const [s, setter] = createDebouncedSignal('', 300);
      settled = s;
      set = setter;
      return d;
    });

    set('late');
    dispose();
    vi.advanceTimersByTime(500);
    // The write must not land in a torn-down scope.
    expect(settled()).toBe('');
  });
});

describe('createDebouncedResource', () => {
  it('does not fetch an empty query', () => {
    createRoot(() => {
      const fetcher = vi.fn(async (q: string) => `r:${q}`);
      createDebouncedResource('', fetcher);
      vi.advanceTimersByTime(500);
      expect(fetcher).not.toHaveBeenCalled();
    });
  });

  it('fetches once the query settles', async () => {
    await createRoot(async () => {
      const fetcher = vi.fn(async (q: string) => `r:${q}`);
      const [, { setQuery }] = createDebouncedResource('', fetcher);

      setQuery('a');
      setQuery('ab');
      expect(fetcher).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      await Promise.resolve();
      // One call for the settled value, not one per keystroke.
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0]![0]).toBe('ab');
    });
  });

  it('separates "still typing" from "request in flight"', () => {
    createRoot(() => {
      const [resource, { setQuery, pending }] = createDebouncedResource(
        '',
        async (q: string) => `r:${q}`,
      );

      setQuery('a');
      // Typing, but nothing has been asked for yet, conflating these is what makes
      // a search box flicker on every keystroke.
      expect(pending()).toBe(true);
      expect(resource.loading).toBe(false);
    });
  });

  it('honours a custom shouldFetch', () => {
    createRoot(() => {
      const fetcher = vi.fn(async (q: string) => q);
      const [, { setQuery }] = createDebouncedResource('', fetcher, {
        shouldFetch: (q) => typeof q === 'string' && q.length >= 3,
      });

      setQuery('ab');
      vi.advanceTimersByTime(300);
      expect(fetcher).not.toHaveBeenCalled();

      setQuery('abc');
      vi.advanceTimersByTime(300);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });
});
