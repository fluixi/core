import { describe, expect, it } from 'vitest';
import { createRoot, effect, flush } from '@fluixi/reactive/signal';
import { createStore } from './store.js';

/**
 * A store whose root is an array used to ignore a whole-value write.
 *
 * `set([...])` collided with the batch-of-paths overload, which takes a lone array of
 * `[path, value]` pairs. `set([])` iterated nothing and `set([9, 8])` found no pairs,
 * so both returned having done nothing. Keyed arrays were never affected, because
 * `set('items', [...])` takes the path branch.
 */
describe('a store whose root is an array', () => {
  it('clears on set([])', () => {
    const [state, set] = createStore([1, 2, 3]) as unknown as [number[], any];
    set([]);
    expect(state.length).toBe(0);
    expect([...state]).toEqual([]);
  });

  it('shrinks on a shorter array', () => {
    const [state, set] = createStore([1, 2, 3, 4]) as unknown as [number[], any];
    set([9, 8]);
    expect([...state]).toEqual([9, 8]);
    expect(state.length).toBe(2);
  });

  it('grows on a longer array', () => {
    const [state, set] = createStore([1]) as unknown as [number[], any];
    set([1, 2, 3]);
    expect([...state]).toEqual([1, 2, 3]);
  });

  it('still treats a list of pairs as a batch of path writes', () => {
    const [state, set] = createStore({ a: 0, b: 0 }) as unknown as [{ a: number; b: number }, any];
    set([
      ['a', 1],
      ['b', 2],
    ]);
    expect(state.a).toBe(1);
    expect(state.b).toBe(2);
  });

  it('refuses an array that is neither a batch nor a replacement', () => {
    const [, set] = createStore({ a: 0 }) as unknown as [unknown, any];
    // Previously this did nothing at all, which is the failure mode the fix exists for.
    expect(() => set([1, 2])).toThrow(/batch of \[path, value\]/);
  });

  it('takes an empty array against an object root as no updates', () => {
    const [state, set] = createStore({ a: 1 }) as unknown as [{ a: number }, any];
    expect(() => set([])).not.toThrow();
    expect(state.a).toBe(1);
  });

  it('notifies a reader of a removed index', () => {
    const [state, set] = createStore([1, 2, 3]) as unknown as [number[], any];
    const seen: unknown[] = [];

    const dispose = createRoot((d) => {
      effect(() => seen.push(state[2]));
      return d;
    });

    set([1]);
    flush();

    // The index went away, so anything reading it has to hear about it. Truncating
    // `length` alone would leave this effect on the old value.
    expect(seen[seen.length - 1]).toBeUndefined();
    dispose();
  });

  it('notifies a length reader', () => {
    const [state, set] = createStore([1, 2, 3]) as unknown as [number[], any];
    const lengths: number[] = [];

    const dispose = createRoot((d) => {
      effect(() => lengths.push(state.length));
      return d;
    });

    set([]);
    flush();
    expect(lengths[lengths.length - 1]).toBe(0);
    dispose();
  });
});

describe('replace and clear', () => {
  it('replace swaps a root array', () => {
    const [state, set] = createStore([1, 2, 3]) as unknown as [number[], any];
    set.replace(['a', 'b']);
    expect([...state]).toEqual(['a', 'b']);
  });

  it('replace swaps an array at a path, where a patch would merge', () => {
    const [state, set] = createStore({ items: [1, 2, 3] }) as unknown as [{ items: number[] }, any];
    set.replace('items', [9]);
    expect([...state.items]).toEqual([9]);
  });

  it('clear empties the root array', () => {
    const [state, set] = createStore([1, 2]) as unknown as [number[], any];
    set.clear();
    expect(state.length).toBe(0);
  });

  it('clear empties an array at a path', () => {
    const [state, set] = createStore({ todos: [1, 2] }) as unknown as [{ todos: number[] }, any];
    set.clear('todos');
    expect(state.todos.length).toBe(0);
  });

  it('clear strips an object of its keys', () => {
    const [state, set] = createStore({ nested: { a: 1, b: 2 } }) as unknown as [
      { nested: Record<string, number> },
      any,
    ];
    set.clear('nested');
    expect(Object.keys(state.nested)).toEqual([]);
  });

  it('a reader of a cleared key is notified', () => {
    const [state, set] = createStore({ nested: { a: 1 } }) as unknown as [
      { nested: Record<string, number | undefined> },
      any,
    ];
    const seen: unknown[] = [];
    const dispose = createRoot((d) => {
      effect(() => seen.push(state.nested.a));
      return d;
    });

    set.clear('nested');
    flush();
    expect(seen[seen.length - 1]).toBeUndefined();
    dispose();
  });

  it('keyed arrays were never broken, and still are not', () => {
    const [state, set] = createStore({ items: [1, 2, 3] }) as unknown as [{ items: number[] }, any];
    set('items', []);
    expect(state.items.length).toBe(0);
  });
});

describe('the setter methods are typed, not only attached', () => {
  it('exposes the array helpers on the setter', () => {
    const [, set] = createStore({ items: [1, 2] }) as unknown as [unknown, any];
    for (const name of ['push', 'pop', 'splice', 'insert', 'removeAt', 'replace', 'clear']) {
      expect(typeof set[name], name).toBe('function');
    }
  });

  it('push and removeAt still work through a path', () => {
    const [state, set] = createStore({ items: [1] }) as unknown as [{ items: number[] }, any];
    set.push('items', 2);
    expect([...state.items]).toEqual([1, 2]);
    set.removeAt('items', 0);
    expect([...state.items]).toEqual([2]);
  });
});
