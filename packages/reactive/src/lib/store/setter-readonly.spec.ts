/**
 * A store reads deeply readonly, and its setter has to accept that back:
 * `setB(untrackStore(a))` is how state gets seeded or reset, and the setter only
 * copies values out of what it is given.
 *
 * These assert at compile time, each case has to typecheck. The runtime
 * expectations are there so a type cannot pass for the wrong reason.
 */
import { describe, it, expect } from 'vitest';
import { createStore, untrackStore } from './store.js';

interface State {
  title: string;
  tags: string[];
  meta: { author: string; counts: number[] };
}

const initial = (): State => ({ title: 'a', tags: ['x'], meta: { author: 'me', counts: [1] } });

describe('a setter takes what the store gives back', () => {
  it('accepts a whole snapshot of another store', () => {
    const [source] = createStore<State>(initial());
    const [target, setTarget] = createStore<State>({ title: '', tags: [], meta: { author: '', counts: [] } });

    setTarget(untrackStore(source));

    expect(target.title).toBe('a');
    expect(target.meta.author).toBe('me');
  });

  it('accepts a nested branch of a snapshot at a path', () => {
    const [source] = createStore<State>(initial());
    const [target, setTarget] = createStore<State>(initial());

    // The branch is readonly all the way down, arrays included.
    setTarget('meta', untrackStore(source).meta);

    expect(target.meta.counts[0]).toBe(1);
  });

  it('accepts a plain readonly object, not only a store snapshot', () => {
    // The widening is structural, anything deeply readonly works, not just the exact
    // type `untrackStore` returns.
    const frozen: Readonly<{ title: string; tags: readonly string[] }> = { title: 'b', tags: ['y'] };
    const [target, setTarget] = createStore<State>(initial());

    setTarget({ title: frozen.title, tags: [...frozen.tags] });

    expect(target.title).toBe('b');
  });

  it('still takes a mutable value and an updater', () => {
    // Widening the input must not cost the shapes that already worked.
    const [target, setTarget] = createStore<State>(initial());

    setTarget({ title: 'c' });
    setTarget('title', (prev) => prev + '!');

    expect(target.title).toBe('c!');
  });
});
