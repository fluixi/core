/**
 * `store` — `createStore` as one binding instead of a tuple.
 *
 *   const user = store({ name: 'Ada' });
 *   user.name;                    // reads, and tracks that key
 *   user.set({ name: 'Grace' });  // writes
 *
 * It returns the reactive state itself, with `set` on it. That's the difference from
 * `signal`, and it's deliberate: `.get()` exists on a signal because a value has no
 * other way to be read, while a store is an object whose whole point is that property
 * access IS the read. Spelling it `user.get().name` would add a call to look uniform and
 * lose the thing that makes a store worth using.
 *
 * Reads still subscribe per key, so an effect over `user.name` doesn't re-run when
 * `user.role` changes.
 *
 * The one cost: a `set` key in your own state is shadowed by the setter. Reach for
 * `createStore` if you need that name — it is unchanged.
 */
import { createStore } from './store.js';
import type { Immutable, Store, StoreOptions } from './store.js';

/** The reactive state, plus the setter that writes it. */
export type StoreHandle<T> = Immutable<T> & { set: Store<T>['set'] };

export function store<T>(initialState: T, options?: StoreOptions<T>): StoreHandle<T> {
  const [state, set] = createStore(initialState, options);

  // A thin wrapper rather than assigning onto the state: the store proxy is the tracking
  // boundary, and writing a key through it would be a state change. Reads fall through
  // to it untouched, so they subscribe exactly as they did before.
  return new Proxy(state as object, {
    get: (target, key) => (key === 'set' ? set : (target as Record<PropertyKey, unknown>)[key]),
    has: (target, key) => key === 'set' || Reflect.has(target, key),
  }) as StoreHandle<T>;
}
