/**
 * What a new `when` value does inside the same branch: plain children stay as they are,
 * function children render again with it.
 */
import { describe, it, expect } from 'vitest';
import { createRoot, createSignal } from '@fluixi/reactive/signal';
import { Show } from './show.js';

const read = (out: unknown): unknown => (typeof out === 'function' ? (out as () => unknown)() : out);

describe('Show with a new value in the same branch', () => {
  it('keeps plain children: route data refetched as a new object does not remount the page', () => {
    let builds = 0;
    const [data, setData] = createSignal<{ name: string } | null>({ name: 'a' });
    createRoot(() => {
      const view = Show({
        when: () => data(),
        get children() {
          builds += 1;
          return { node: builds };
        },
      });
      const first = read(view);
      setData({ name: 'b' });
      expect(read(view)).toBe(first);
      expect(builds).toBe(1);
      setData(null);
      read(view);
      setData({ name: 'c' });
      read(view);
      expect(builds).toBe(2);
    });
  });

  it('renders function children again with the new value', () => {
    const [data, setData] = createSignal<{ name: string } | null>({ name: 'a' });
    createRoot(() => {
      const view = Show({ when: () => data(), children: (value: { name: string }) => value.name });
      expect(read(view)).toBe('a');
      setData({ name: 'b' });
      expect(read(view)).toBe('b');
    });
  });

  it('keeps JavaScript truthiness: 0 shows the fallback', () => {
    const [count, setCount] = createSignal(1);
    createRoot(() => {
      const view = Show({ when: () => count(), fallback: 'none', children: 'some' });
      expect(read(view)).toBe('some');
      setCount(0);
      expect(read(view)).toBe('none');
    });
  });
});
