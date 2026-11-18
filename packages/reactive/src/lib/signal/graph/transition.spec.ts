/**
 * startTransition: a resource it makes load again keeps its current value (no suspend) until
 * the new one is there, and useTransition's isPending is true meanwhile.
 */
import { describe, it, expect } from 'vitest';
import { createRoot, createSignal, createResource, startTransition, useTransition, flush } from './signal-next.js';

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe('transitions', () => {
  it('keeps the current value while the next loads, and reports pending', async () => {
    const loads = new Map<number, ReturnType<typeof deferred<string>>>();
    let read!: () => string | undefined;
    let setId!: (n: number) => void;
    let isPending!: () => boolean;
    createRoot(() => {
      const [id, set] = createSignal(1);
      setId = set;
      const [data] = createResource(id, (n) => {
        const d = deferred<string>();
        loads.set(n, d);
        return d.promise;
      });
      read = data;
      [isPending] = useTransition();
    });
    await flush();
    loads.get(1)!.resolve('one');
    await Promise.resolve();
    await Promise.resolve();
    expect(read()).toBe('one');

    const done = startTransition(() => setId(2));
    expect(isPending()).toBe(true);
    // Not a suspend: the page keeps showing what it had.
    expect(read()).toBe('one');

    loads.get(2)!.resolve('two');
    await done;
    expect(read()).toBe('two');
    expect(isPending()).toBe(false);

    // Outside a transition the same reload suspends, as before.
    setId(3);
    await flush();
    expect(() => read()).toThrow();
  });
});
