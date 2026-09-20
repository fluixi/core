import { describe, expect, it } from 'vitest';
import { createRoot, createEffect } from '../signal/index.js';
import { store } from './api.js';
import { unwrap } from './store.js';

/**
 * Every step form the setter typings offer, run against the setter.
 *
 * These exist because the typings and the runtime had drifted apart for anything deeper
 * than one key. `set('items', 0, 'done', true)` typechecked and wrote the number `0`
 * over `items`, destroying the array. Nothing caught it: the overloads say one thing,
 * `applySet` read `args[1]` as the value and ignored the rest.
 */

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

const seed = (): { todos: Todo[]; user: { name: string; address: { city: string } } } => ({
  todos: [
    { id: 1, title: 'one', done: false },
    { id: 2, title: 'two', done: false },
    { id: 3, title: 'three', done: false },
  ],
  user: { name: 'Ada', address: { city: 'London' } },
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('a step per argument', () => {
  it('writes one field of one array element', () => {
    const s = store(seed());
    s.set('todos', 0, 'done', true);

    // The regression: `todos` stayed an array and only the named field moved.
    expect(Array.isArray(unwrap(s).todos)).toBe(true);
    expect(s.todos).toHaveLength(3);
    expect(s.todos[0].done).toBe(true);
    expect(s.todos[1].done).toBe(false);
  });

  it('writes a nested object field', () => {
    const s = store(seed());
    s.set('user', 'address', 'city', 'Paris');
    expect(s.user.address.city).toBe('Paris');
    expect(s.user.name).toBe('Ada');
  });

  it('accepts an updater at the leaf', () => {
    const s = store(seed());
    s.set('todos', 1, 'title', (prev: string) => prev.toUpperCase());
    expect(s.todos[1].title).toBe('TWO');
  });

  it('replaces a whole array element', () => {
    const s = store(seed());
    s.set('todos', 2, { id: 3, title: 'third', done: true });
    expect(s.todos[2]).toMatchObject({ title: 'third', done: true });
    expect(s.todos).toHaveLength(3);
  });

  it('treats a dotted step as the steps it spells out', () => {
    const s = store(seed());
    s.set('user.address', 'city', 'Berlin');
    expect(s.user.address.city).toBe('Berlin');
  });

  it('still reads two arguments as key and value', () => {
    const s = store(seed());
    s.set('todos', []);
    expect(s.todos).toEqual([]);
  });
});

describe('selectors between the path and the value', () => {
  it('several indices at once', () => {
    const s = store(seed());
    s.set('todos', [0, 2], 'done', true);
    expect(s.todos.map((t) => t.done)).toEqual([true, false, true]);
  });

  it('a range', () => {
    const s = store(seed());
    s.set('todos', { from: 1, to: 2 }, 'done', true);
    expect(s.todos.map((t) => t.done)).toEqual([false, true, true]);
  });

  it('a range with a stride', () => {
    const s = store(seed());
    s.set('todos', { from: 0, to: 2, by: 2 }, 'done', true);
    expect(s.todos.map((t) => t.done)).toEqual([true, false, true]);
  });

  it('a predicate', () => {
    const s = store(seed());
    s.set('todos', (t: Todo) => t.id !== 2, 'done', true);
    expect(s.todos.map((t) => t.done)).toEqual([true, false, true]);
  });

  it('a predicate that matches nothing writes nothing', () => {
    const s = store(seed());
    s.set('todos', (t: Todo) => t.id === 99, 'done', true);
    expect(s.todos.map((t) => t.done)).toEqual([false, false, false]);
  });

  it('a wildcard reaches every element', () => {
    const s = store(seed());
    s.set('todos', '*', 'done', true);
    expect(s.todos.every((t) => t.done)).toBe(true);
  });

  it('a range clamps to what the array actually has', () => {
    const s = store(seed());
    s.set('todos', { from: 1, to: 99 }, 'done', true);
    expect(s.todos.map((t) => t.done)).toEqual([false, true, true]);
    expect(s.todos).toHaveLength(3);
  });
});

describe('missing containers are created on the way down', () => {
  it('makes an object for a named step', () => {
    const s = store<{ settings?: { theme?: { mode?: string } } }>({});
    s.set('settings', 'theme', 'mode', 'dark');
    expect(s.settings!.theme!.mode).toBe('dark');
  });

  it('makes an array when the next step is an index', () => {
    const s = store<{ rows?: string[] }>({});
    s.set('rows', 0, 'first');
    expect(Array.isArray(unwrap(s).rows)).toBe(true);
    expect(s.rows![0]).toBe('first');
  });
});

describe('the write is fine grained', () => {
  it('only the touched element notifies', async () => {
    const s = store(seed());
    const first: boolean[] = [];
    const second: boolean[] = [];

    const dispose = createRoot((d) => {
      createEffect(() => void first.push(s.todos[0].done));
      createEffect(() => void second.push(s.todos[1].done));
      return d;
    });
    await settle();
    expect(first).toEqual([false]);
    expect(second).toEqual([false]);

    s.set('todos', 0, 'done', true);
    await settle();

    expect(first).toEqual([false, true]);
    // The neighbour was never written, so its reader did not run again.
    expect(second).toEqual([false]);
    dispose();
  });

  it('a list reader survives a field write, because the array is not replaced', async () => {
    const s = store(seed());
    const lengths: number[] = [];
    const dispose = createRoot((d) => {
      createEffect(() => void lengths.push(s.todos.length));
      return d;
    });
    await settle();

    s.set('todos', 1, 'done', true);
    await settle();

    expect(lengths).toEqual([3]);
    expect(s.todos).toHaveLength(3);
    dispose();
  });
});
