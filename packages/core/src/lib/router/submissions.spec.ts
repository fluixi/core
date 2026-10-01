/** `useSubmissions`: one entry per call, so concurrent calls do not overwrite each other. */
import { describe, it, expect } from 'vitest';
import { action, useSubmission, useSubmissions } from './data.js';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('useSubmissions', () => {
  it('tracks each call; a success leaves the list, a failure stays until cleared', async () => {
    const calls: ReturnType<typeof deferred<string>>[] = [];
    const move = action((deal: string) => {
      const d = deferred<string>();
      calls.push(d);
      return d.promise.then(() => deal);
    }, 'spec.move');
    const list = useSubmissions(move);
    const latest = useSubmission(move);

    const first = move('a');
    const second = move('b').catch(() => undefined);
    expect(list().map((s) => [s.input, s.pending])).toEqual([['a', true], ['b', true]]);

    calls[0].resolve('ok');
    await first;
    expect(list().map((s) => s.input)).toEqual(['b']);

    calls[1].reject(new Error('refused'));
    await second;
    await tick();
    expect(list().map((s) => [s.input, s.pending, (s.error as Error)?.message])).toEqual([['b', false, 'refused']]);
    expect(latest()?.input).toBe('b');

    list()[0].clear();
    expect(list()).toEqual([]);
  });

  it('retry replaces the failed entry with a new call', async () => {
    let fail = true;
    const save = action(async (v: string) => {
      if (fail) throw new Error('no');
      return v;
    }, 'spec.save');
    const list = useSubmissions(save);

    await save('x').catch(() => undefined);
    expect(list().map((s) => s.pending)).toEqual([false]);

    fail = false;
    await list()[0].retry();
    expect(list()).toEqual([]);
  });
});
