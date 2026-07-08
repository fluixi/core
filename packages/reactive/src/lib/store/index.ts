/**
 * SolidJS-style reactive store: a proxy tree with per-property signals.
 *
 * StoreNode holds a tree of nodes, each with its own signals; proxy handlers
 * intercept access so reads subscribe at property granularity. Updates diff the
 * old and new state and trigger only the signals that changed — fired before the
 * data mutates so equality checks compare correctly. Memos are lazy, effects run
 * eagerly, and batching coalesces updates.
 */

export {
  createStore,
  createMutableStore,
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
