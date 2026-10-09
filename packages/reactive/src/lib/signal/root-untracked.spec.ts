/**
 * A root is its own scope: what runs in it is not tracked by the computation that created it.
 * A custom element rendering during hydration runs in a root inside the memo that builds its
 * parent's children; its reads subscribed that memo, and a later write rebuilt the children.
 */
import { describe, it, expect } from 'vitest';
import { createMemo, createRoot, createSignal, createEffect } from './index.js';

describe('createRoot inside a computation', () => {
  it('does not subscribe the computation to what the root reads', () => {
    const [read, setRead] = createSignal('a');
    let runs = 0;
    const outer = createMemo(() => {
      runs++;
      createRoot(() => read());
      return runs;
    });
    expect(outer()).toBe(1);
    setRead('b');
    expect(outer()).toBe(1);
  });

  it('still tracks inside computations the root creates', async () => {
    const [read, setRead] = createSignal('a');
    const seen: string[] = [];
    createRoot(() => {
      const memo = createMemo(() => createRoot(() => createEffect(() => void seen.push(read()))));
      memo();
    });
    await Promise.resolve();
    setRead('b');
    await Promise.resolve();
    expect(seen).toEqual(['a', 'b']);
  });
});
