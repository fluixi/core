import type { Producer, ReconcileOptions } from './types.js';

function clone<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone) as any;
  const out: any = {};
  for (const key of Object.keys(value as any)) out[key] = clone((value as any)[key]);
  return out;
}

/**
 * Creates a producer function for immutable updates: `set(produce(draft => …))`.
 * The producer mutates a clone; the result replaces the state.
 */
function produce<T>(producer: Producer<T>): (state: T) => T {
  return (state: T) => {
    const draft = clone(state);
    producer(draft);
    return draft;
  };
}

/**
 * Creates a reconciler for `set(reconcile(value))`.
 * @param value - Value to reconcile into state
 */
function reconcile<T>(value: T, _options: ReconcileOptions = {}): (state: T) => T {
  return () => value;
}

export { produce, reconcile };
