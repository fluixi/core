/**
 * Fine-grained reactive store: a plain state tree with per-key signals.
 *
 * Each object carries a lazily-grown map of key signals (kept in a WeakMap off the
 * raw target) plus one iteration signal. The proxy intercepts reads so they
 * subscribe at key granularity; the setter writes straight to the raw target and
 * pokes only the keys that changed. Memos stay lazy, effects run eagerly, and
 * batching coalesces updates.
 */

export {
  createStore,
  createMutableStore,
  createComputedStore,
  createStoreEffect,
  createStoreMemo,
  wrap,
  unwrap,
  getStoreNode,
  isStoreProxy,
  modifiable,
  untrackStore,
  StoreAPI,
  $RAW,
  $NODE,
  $TRACK,
  $NAME,
  $STORE,
  $SELF,
  Store,
  isStore,
  getNode,
} from './store.js';

export type {
  StoreSetter,
  StoreAccessor,
  StoreOptions,
  Immutable,
} from './store.js';

export { produce as produceUtil, reconcile as reconcileUtil } from './utils.js';

export type { ReconcileOptions, Producer } from './types.js';
