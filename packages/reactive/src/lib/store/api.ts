/**
 * `store`: `createStore` as one binding instead of a tuple.
 *
 *   const user = store({ name: 'Ada' });
 *   user.name;                    // reads, and tracks that key
 *   user.set({ name: 'Grace' });  // writes
 *
 * It returns the reactive state itself with `set` on it, which is where it parts from
 * `signal`. A signal needs `.get()` because a value has no other way to be read. A
 * store is an object, and property access is already the read, so `user.get().name`
 * would add a call for the sake of looking uniform and lose the thing that makes a
 * store worth using.
 *
 * Reads still subscribe per key, so an effect over `user.name` does not re-run when
 * `user.role` changes.
 *
 * The one cost: a `set` key in your own state is shadowed by the setter. Reach for
 * `createStore` when you need that name, which is unchanged.
 */
import { createStore } from './store.js';
import type { Immutable, Store, StoreOptions } from './store.js';

/** The reactive state, plus the setter that writes it. */
export type StoreHandle<T> = Immutable<T> & { set: Store<T>['set'] };

/**
 * A reactive store you read by property access and write with `.set()`.
 *
 * Tracking is per key and lazy: a signal is created for a key the first time something
 * reads it, so an effect reading one field is untouched by a write to another. Nested
 * objects and arrays are proxied on access, to whatever depth is reached.
 *
 * `options.equals` compares whole states, not individual keys, and `options.name` is
 * what a devtools panel labels the store with.
 *
 * @example An object argument patches the keys it names and leaves the rest:
 * ```ts
 * const user = store({ name: 'Ada', role: 'admin' });
 *
 * effect(() => console.log(user.name));   // subscribes to `name` only
 * user.set({ role: 'owner' });           // the effect does not re-run
 * user.set({ name: 'Grace' });           // now it does
 * ```
 *
 * @example A dot path writes deep without rebuilding the tree above it. Array indices
 * are segments like any other:
 * ```ts
 * const state = store({ todos: [{ done: false }] });
 * state.set('todos.0.done', true);
 * state.set('todos.0.done', (done) => !done);   // or derive from the current value
 * ```
 *
 * @example A `set` key of your own is unreachable through this form, because the setter
 * occupies the name. `createStore` hands back a tuple and has no such collision:
 * ```ts
 * const [config, setConfig] = createStore({ set: 'a value' });
 * ```
 */
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
