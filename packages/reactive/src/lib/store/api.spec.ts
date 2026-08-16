/** `store` is `createStore` as one binding, so the tests check it against that. */
import { describe, it, expect } from 'vitest';
import { createEffect } from '../signal/index.js';
import { createStore } from './store.js';
import { store } from './api.js';

describe('store', () => {
  it('reads a property directly, the way a store should', () => {
    const user = store({ name: 'Ada', role: 'author' });
    expect(user.name).toBe('Ada');

    user.set({ name: 'Grace' });
    expect(user.name).toBe('Grace');
    expect(user.role).toBe('author');
  });

  it('holds the same state createStore does', () => {
    const [state] = createStore({ name: 'Ada' });
    const user = store({ name: 'Ada' });
    expect({ ...user }).toEqual({ ...state });
  });

  it('still tracks per key, not per object', () => {
    // The reason reads fall straight through: the store proxy stays the tracking
    // boundary, so an effect subscribes to the key it read and nothing else.
    const user = store({ name: 'Ada', role: 'author' });
    const names: string[] = [];
    const roles: string[] = [];
    createEffect(() => names.push(user.name));
    createEffect(() => roles.push(user.role));

    user.set({ name: 'Grace' });
    expect(names).toEqual(['Ada', 'Grace']);
    expect(roles).toEqual(['author']);
  });

  it('keeps the array helpers hanging off the setter', () => {
    const list = store({ items: [1, 2] });
    expect(typeof (list.set as unknown as { push?: unknown }).push).toBe('function');
  });

  it('answers `in` for both the state and the setter', () => {
    const user = store({ name: 'Ada' });
    expect('name' in user).toBe(true);
    expect('set' in user).toBe(true);
  });
});
