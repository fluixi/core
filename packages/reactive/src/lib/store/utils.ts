import {
  Store,
  type Producer,
  type ReconcileOptions,
} from '@fluixi/reactive/store';

/**
 * Creates a producer function for immutable updates
 * @param producer - Function that mutates a draft
 * @returns Update function for store.set()
 */
function produce<T>(producer: Producer<T>): (state: T) => T {
  return (state: T) => {
    const store = new Store(state, {});
    store.produce(producer);
    return store.unwrap() as T;
  };
}

/**
 * Creates a reconciler function
 * @param value - Value to reconcile
 * @param options - Reconciliation options
 * @returns Update function for store.set()
 */
function reconcile<T>(
  value: T,
  options: ReconcileOptions = {}
): (state: T) => T {
  return (state: T) => {
    const store = new Store(state, {});
    store.reconcile(value, options);
    return store.unwrap();
  };
}

export { produce, reconcile };
