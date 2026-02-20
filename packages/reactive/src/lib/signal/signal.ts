/**
 * @fileoverview SolidJS-aligned Reactive Signal System
 * @description Complete reactive signal system with proper effect scheduling and dependency tracking
 * @version 4.0.0
 */

import { isFunction } from '@awc/utils/functions';
import { Observable } from '@awc/reactive/observable';
import { deepClone } from '@awc/utils/object';
import { isPromise } from '@awc/utils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EqualityFn<T> = (a: T, b: T) => boolean;
export type EffectFn = () => void | (() => void);
export type ComputationFn<T> = (prev?: T) => T;
export type AsyncFn<T, Args extends any[]> = (...args: Args) => Promise<T>;
export type Cleanup = () => void;
export type DerivedFn<T, U = T> = () => T;

export interface Accessor<T> {
  (): T;
  toObservable?: () => Observable<T>;
  [$NODE]?: ReactiveNode;
  [$SIGNAL]?: boolean;
}

export type Setter<T> = (value: T | ((prev: T) => T)) => void;
export type Signal<T> = [Accessor<T>, Setter<T>];

export interface SignalOptions<T> {
  equals?: false | EqualityFn<T>;
  name?: string;
  internal?: boolean;
}

export interface EffectOptions {
  name?: string;
  onCleanup?: (cleanupFn: Cleanup) => void;
  manual?: boolean;
}

export interface MemoOptions<T> extends SignalOptions<T> {
  initial?: T;
}

export interface RootOwner {
  owned: Computation[] | null;
  cleanups: Cleanup[] | null;
  contexts: Map<symbol, unknown> | null;
  owner: RootOwner | null;
}

interface Computation {
  fn: ComputationFn<any> | EffectFn;
  state: number;
  sources: Signal<any>[] | null;
  sourceSlots: number[] | null;
  value?: any;
  owned: Computation[] | null;
  cleanups: Cleanup[] | null;
  owner: RootOwner | null;
  context: Map<symbol, unknown> | null;
  pure: boolean;
  updatedAt: number | null;
  node?: ReactiveNode;
  accessor?: Accessor<any>; // For memos, the accessor function that others can observe
  renderEffect?: boolean; // True for createRenderEffect computations
  suspense?: SuspenseContextType; // Suspense boundary this computation belongs to
}

export interface ReactiveNode {
  id: string;
  type:
    | 'signal'
    | 'effect'
    | 'memo'
    | 'computed'
    | 'store'
    | 'derived'
    | 'async';
  value: any;
  version: number;
  equals?: EqualityFn<any>;
  name?: string;
  created: number;
  updated: number;
  computation?: Computation;
}

export interface EnhancedSignal<T> {
  readonly get: Accessor<T>;
  readonly set: Setter<T>;
  readonly subscribe: (listener: (value: T) => void) => () => void;
  readonly dispose: () => void;
  readonly toObservable: () => Observable<T>;
  readonly node: ReactiveNode;
}

export interface AsyncSignal<T, Args extends any[]> {
  get: () => T;
  set: (value: T | ((prev: T) => T)) => void;
  loading: () => boolean;
  error: () => Error | null;
  execute: (...args: Args) => Promise<T>;
  reload: (...args: Args) => Promise<T>;
  node: ReactiveNode;
}

export interface SignalWithHistory<T> {
  get: () => T;
  set: (value: T | ((prev: T) => T)) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  history: () => T[];
  currentIndex: () => number;
  node: ReactiveNode;
}

export interface EnhancedTrigger<T> {
  (): T;
  dispose: () => void;
  getLastValue: () => T | undefined;
  forceUpdate: () => void;
  node: ReactiveNode;
}

export interface Trigger {
  (): void;
  subscribe: (fn: () => void) => () => void;
  node: ReactiveNode;
}

export interface LazySignal<T> {
  (): T;
  reset: () => void;
  node: ReactiveNode;
}

// SuspenseState removed — replaced by SuspenseContextType + createContext

export interface SuspenseContextType {
  increment: () => void;
  decrement: () => void;
  inFallback: Accessor<boolean>;
  effects: Computation[];
  resolved: boolean;
}

export interface SuspenseListRegisteredState {
  showContent: Accessor<boolean>;
  showFallback: Accessor<boolean>;
}

export interface SuspenseListContextType {
  register: (inFallback: Accessor<boolean>) => SuspenseListRegisteredState;
}

interface TransitionState {
  pending: boolean;
  startTime: number;
  timeoutMs: number;
  updates: Set<() => void>;
}

interface ErrorBoundary {
  errors: Error[];
  handler: (error: Error) => void;
  reset: () => void;
}

export const $SIGNAL = Symbol.for('signal');
export const $MEMO = Symbol.for('memo');
export const $RESOURCE = Symbol.for('resource');
export const $PROXY = Symbol('kettle-proxy');
const $NODE = Symbol.for('signal-node');
const $COMP = Symbol.for('component-node');
export const __DEV__ = process.env.NODE_ENV !== 'production';

// ============================================================================
// GLOBAL STATE
// ============================================================================

const CLEAN = 0;
const STALE = 1;
const DIRTY = 2;

let Owner: RootOwner | null = null;
let Listener: Computation | null = null;
let Updates: Computation[] | null = null;
let Effects: Computation[] | null = null;
let ExecCount = 0;
let Pending = false;
const MAX_ITERATIONS = 1000000;

const signalObservers = new WeakMap<Signal<any>, Set<Computation>>();

let currentTransition: TransitionState | null = null;
const errorHandlers: ErrorBoundary[] = [];
let Scheduler: ((fn: () => void) => void) | null = null;

const nodeRegistry = new Map<string, WeakRef<ReactiveNode>>();
let nodeIdCounter = 0;

export const sharedConfig = {
  context: null as RootOwner | null,
  owner: null as RootOwner | null,
};

/**
 * Set current reactive owner (for internal use)
 * @internal
 */
export function setOwner(owner: RootOwner | null): void {
  Owner = owner;
  sharedConfig.owner = owner;
  sharedConfig.context = owner;
}

/**
 * Get shared config (for compatibility)
 * @internal
 */
export function getSharedConfig() {
  return sharedConfig;
}
// ============================================================================
// UTILITIES
// ============================================================================

function createNodeId(): string {
  return `node_${++nodeIdCounter}_${Date.now()}`;
}

function registerNode(node: ReactiveNode): void {
  if (__DEV__) {
    nodeRegistry.set(node.id, new WeakRef(node));
  }
}

function unregisterNode(node: ReactiveNode): void {
  if (__DEV__) {
    nodeRegistry.delete(node.id);
  }
}

function createReactiveNode<T>(
  type: ReactiveNode['type'],
  initialValue: T,
  options?: { equals?: EqualityFn<T>; name?: string }
): ReactiveNode {
  const node: ReactiveNode = {
    id: createNodeId(),
    type,
    value: initialValue,
    version: 0,
    equals: options?.equals,
    name: options?.name,
    created: Date.now(),
    updated: Date.now(),
  };
  registerNode(node);
  return node;
}

function defaultEquals<T>(a: T, b: T): boolean {
  return a === b;
}

function handleError(err: Error): void {
  if (typeof console !== 'undefined') {
    console.error('Reactive error:', err);
  }
  throw err;
}

// ============================================================================
// CORE SIGNAL IMPLEMENTATION
// ============================================================================

function propagate(observerList: Computation[], propagator: (arg: any) => any) {
  for (let i = 0; i < observerList.length; i++) {
    if (observerList[i].owner && observerList[i].owner?.owned) {
      propagator(observerList[i].owner?.owned);
    }
    propagator(observerList[i]);
  }
}
export function createSignal<T>(
  _value: T,
  options?: SignalOptions<T>
): Signal<T> {
  let value = _value;
  if (typeof value === 'object' && value && $PROXY in (value as any)) {
    delete (value as any)[$PROXY];
  }
  const node = createReactiveNode('signal', value, {
    equals: options?.equals === false ? undefined : options?.equals,
    name: options?.name,
  });

  const s: Signal<T> = [read, write];

  // Initialize observer set for this signal
  signalObservers.set(s, new Set());

  function read(): T {

    const observer = Listener;
    if (observer) {
      if (!observer.sources) {
        observer.sources = [s];
      } else if (observer.sources.indexOf(s) === -1) {
        observer.sources.push(s);
      }

      const observers = signalObservers.get(s);
      if (observers && !observers.has(observer)) {
        observers.add(observer);
      }
    }
    if (options && options.internal) {
      console.log('read signal', {observer, value})
    }
    return value;
  }

  function write(nextValue: T | ((prev: T) => T)): void {
    const v =
      typeof nextValue === 'function'
        ? (nextValue as (prev: T) => T)(value)
        : nextValue;

    // if (typeof v === 'object' && v && $PROXY in (v as any)) {
    //   delete v[$PROXY];
    // }

    const equals = node.equals || defaultEquals;
    if (options?.equals === false || !equals(value, v)) {
      value = v;
      node.value = v;
      node.version++;
      node.updated = Date.now();

      // Notify all observers
      const observers = signalObservers.get(s);
      if (observers && observers.size > 0) {
        const observerList = Array.from(observers);
        // console.log('obs', observerList);
        // Collect all dirty computations recursively
        const toUpdate: Computation[] = [];
        const visited = new Set<Computation>();

        function propagateDirty(comp: Computation): void {
          if (visited.has(comp)) {
            // console.log('no visited');
            return;
          }

          visited.add(comp);

          // Mark as dirty and add to update queue if not already dirty
          const wasDirty = comp.state === DIRTY;
          // console.log('dirty', comp.state === DIRTY);
          comp.state = DIRTY;

          if (!wasDirty) {
            toUpdate.push(comp);
          }

          // If this is a pure computation (memo), propagate to its observers
          if (comp.pure && comp.accessor) {
            const memoObservers = signalObservers.get(comp.accessor as any);
            if (memoObservers) {
              for (const observer of memoObservers) {
                propagateDirty(observer);
              }
            }
          }
        }

        propagate(observerList, propagateDirty);
        // Propagate DIRTY state through the graph
        // for (let i = 0; i < observerList.length; i++) {
        //   if (observerList[i].owned) {
        //   }
        //   propagateDirty(observerList[i]);
        // }

        if (Updates) {
          // In batch mode, collect all updates
          for (const comp of toUpdate) {
            if (Updates.indexOf(comp) === -1) {
              Updates.push(comp);
            }
          }
        } else {
          // Run effects immediately (not memos)
          for (const comp of toUpdate) {
            if (!comp.pure) {
              updateComputation(comp);
            }
          }
        }
      }
      // if (options && options.internal) {
      //   console.log('write signal', {observers, value, node})
      // }
    }
  }

  read.toObservable = () => {
    return new Observable<T>((observer) => {
      let first = true;
      const dispose = createEffect(() => {
        const val = read();
        if (first) {
          first = false;
        } else {
          observer.next(val);
        }
      });
      return dispose;
    });
  };

  Object.defineProperty(read, $SIGNAL, { value: true, enumerable: true });
  Object.defineProperty(read, $NODE, { value: node, enumerable: false });

  return s;
}

// ============================================================================
// EFFECT SYSTEM
// ============================================================================

export function createEffect(
  fn: EffectFn,
  value?: any,
  options?: EffectOptions
): () => void {
  const c: Computation = {
    fn,
    state: DIRTY,
    sources: null,
    sourceSlots: null,
    owned: null,
    cleanups: null,
    owner: Owner,
    context: null,
    pure: false,
    updatedAt: null,
  };

  if (Owner) {
    if (!Owner.owned) Owner.owned = [c];
    else Owner.owned.push(c);
  }

  // Stamp effect with Suspense boundary for queuing
  const SC = _SuspenseContext && useContext(_SuspenseContext);
  if (SC) {
    c.suspense = SC;
  }

  runComputation(c, value);

  return () => {
    dispose(c);
  };
}

function runComputation(c: Computation, value: any): void {
  // Clean up old signal subscriptions
  if (c.sources) {
    for (const source of c.sources) {
      const observers = signalObservers.get(source);
      if (observers) {
        observers.delete(c);
      }
    }
    c.sources = null;
    c.sourceSlots = null;
  }

  // Dispose owned computations from previous run
  if (c.owned) {
    for (let i = 0; i < c.owned.length; i++) {
      dispose(c.owned[i]);
    }
    c.owned = null;
  }

  const prevListener = Listener;
  const prevOwner = Owner;

  Listener = c;
  Owner = c as any;
  ExecCount++;

  // Infinite loop detection
  if (ExecCount > MAX_ITERATIONS) {
    ExecCount = 0;
    throw new Error(
      'Potential infinite loop detected. Exceeded maximum iterations.'
    );
  }

  // console.log('run compu', value, c.fn);

  try {
    const result = c.fn(value);
    // console.log('run compu', result);

    if (typeof result === 'function') {
      if (!c.cleanups) c.cleanups = [result];
      else c.cleanups.push(result);
    }

    // Mark as clean AFTER successful execution
    c.state = CLEAN;
    // if (value) {
    // }
  } catch (err) {
    if (isPromise(err)) {
      // Find Suspense boundary via context
      const ctx = _SuspenseContext && useContext(_SuspenseContext);
      if (ctx) {
        ctx.increment();
        (err as Promise<unknown>).finally(() => ctx.decrement());
        if (c.suspense) ctx.effects.push(c);
      }
      return;
    }
    handleError(err as Error);
  } finally {
    //console.log('disposing owner computation', prevOwner)
    Listener = prevListener;
    Owner = prevOwner;
  }
}

function updateComputation(c: Computation): void {
  if (!c.fn) return;
  if (c.state === CLEAN) return;

  if (c.state === DIRTY || c.state === STALE) {
    // Run cleanups before re-execution
    if (c.cleanups) {
      for (let i = 0; i < c.cleanups.length; i++) {
        c.cleanups[i]();
      }
      c.cleanups = null;
    }

    // Dispose owned computations from previous execution
    if (c.owned) {
      for (let i = 0; i < c.owned.length; i++) {
        dispose(c.owned[i]);
      }
      c.owned = null;
    }

    if (c.renderEffect) {
      runRenderComputation(c);
    } else {
      runComputation(c, c.value);
    }
  }
}

function dispose(c: Computation): void {
  // Remove from signal observers
  if (c.sources) {
    for (const source of c.sources) {
      const observers = signalObservers.get(source);
      if (observers) {
        observers.delete(c);
      }
    }
  }

  if (c.cleanups) {
    for (let i = 0; i < c.cleanups.length; i++) {
      c.cleanups[i]();
    }
  }
  if (c.owned) {
    for (let i = 0; i < c.owned.length; i++) {
      dispose(c.owned[i]);
    }
  }
  if (c.owner && c.owner.owned) {
    const index = c.owner.owned.indexOf(c);
    if (index !== -1) {
      c.owner.owned.splice(index, 1);
    }
  }
}

// ============================================================================
// MEMO SYSTEM
// ============================================================================

export function createMemo<T>(
  fn: ComputationFn<T>,
  value?: T,
  options?: MemoOptions<T>
): Accessor<T> {
  const node = createReactiveNode('memo', value as T, {
    equals: options?.equals === false ? undefined : options?.equals,
    name: options?.name,
  });

  const c: Computation = {
    fn,
    state: DIRTY,
    sources: null,
    sourceSlots: null,
    value,
    owned: null,
    cleanups: null,
    owner: Owner,
    context: null,
    pure: true,
    updatedAt: null,
    node,
    accessor: undefined, // Will be set to read function after it's defined
  };

  // console.log('memo Owner', Owner);
  if (Owner) {
    if (!Owner.owned) Owner.owned = [c];
    else Owner.owned.push(c);
  }

  const read: Accessor<T> = () => {
    // Track this memo as a source for parent computation FIRST
    if (Listener && Listener !== c) {
      if (!Listener.sources) {
        Listener.sources = [read as any];
      } else if (Listener.sources.indexOf(read as any) === -1) {
        Listener.sources.push(read as any);
      }

      // Register parent computation as observer of this memo
      const memoAsSignal = read as any;
      if (!signalObservers.has(memoAsSignal)) {
        signalObservers.set(memoAsSignal, new Set());
      }
      const observers = signalObservers.get(memoAsSignal);
      if (observers) {
        observers.add(Listener);
      }
    }

    // Compute if needed AFTER tracking
    if (c.state !== CLEAN) {
      // Clean up old subscriptions
      if (c.sources) {
        for (const source of c.sources) {
          const observers = signalObservers.get(source);
          if (observers) {
            observers.delete(c);
          }
        }
        c.sources = null;
        c.sourceSlots = null;
      }

      const prevListener = Listener;
      const prevOwner = Owner;

      Listener = c;
      Owner = c as any;

      try {
        const nextValue = (c.fn as ComputationFn<T>)(c.value);

        const equals = node.equals || defaultEquals;
        const hasChanged =
          options?.equals === false || !equals(c.value as T, nextValue);

        if (hasChanged) {
          c.value = nextValue;
          node.value = nextValue;
          node.version++;
          node.updated = Date.now();

          // Notify observers of this memo
          const memoAsSignal = read as any;
          const observers = signalObservers.get(memoAsSignal);
          if (observers && observers.size > 0) {
            const observerList = Array.from(observers);

            // Collect all dirty computations recursively
            const toUpdate: Computation[] = [];
            const visited = new Set<Computation>();

            function propagateDirty(comp: Computation): void {
              if (comp === c) return; // Skip self

              if (visited.has(comp)) {
                return;
              }

              visited.add(comp);

              // Mark as dirty and add to update queue if not already dirty
              const wasDirty = comp.state === DIRTY;
              comp.state = DIRTY;

              if (!wasDirty) {
                toUpdate.push(comp);
              }

              // If this is a pure computation (memo), propagate to its observers
              if (comp.pure && comp.accessor) {
                const memoObservers = signalObservers.get(comp.accessor as any);
                if (memoObservers) {
                  for (const observer of memoObservers) {
                    propagateDirty(observer);
                  }
                }
              }
            }

            // Propagate DIRTY state through the graph
            for (let i = 0; i < observerList.length; i++) {
              propagateDirty(observerList[i]);
            }

            if (Updates) {
              // In batch mode, collect all updates
              for (const comp of toUpdate) {
                if (Updates.indexOf(comp) === -1) {
                  Updates.push(comp);
                }
              }
            } else {
              // Run effects immediately (not memos)
              for (const comp of toUpdate) {
                if (!comp.pure) {
                  updateComputation(comp);
                }
              }
            }
          }
        }

        // Mark as clean AFTER successful computation
        c.state = CLEAN;
      } catch (err) {
        if (isPromise(err)) {
          const ctx = _SuspenseContext && useContext(_SuspenseContext);
          if (ctx) {
            ctx.increment();
            (err as Promise<unknown>).finally(() => ctx.decrement());
          }
          return c.value as T;
        }
        handleError(err as Error);
      } finally {
        //console.log('disposing owner memo', prevOwner)
        Listener = prevListener;
        Owner = prevOwner;
      }
    }

    return c.value as T;
  };

  // Store reference to accessor in computation for propagation
  c.accessor = read;

  // Initialize observer set for this memo
  signalObservers.set(read as any, new Set());

  // Initialize memo by computing initial value immediately
  const prevListenerInit = Listener;
  const prevOwnerInit = Owner;
  Listener = c;
  Owner = c as any;
  try {
    const v = (c.fn as ComputationFn<T>)(c.value);
    c.value = v;
    node.value = c.value;
    c.state = CLEAN;
  } catch (err) {
    if (isPromise(err)) {
      const ctx = _SuspenseContext && useContext(_SuspenseContext);
      if (ctx) {
        ctx.increment();
        (err as Promise<unknown>).finally(() => ctx.decrement());
      }
    } else {
      handleError(err as Error);
    }
  } finally {
    //console.log('disposing owner memo 2', prevOwnerInit)
    Listener = prevListenerInit;
    Owner = prevOwnerInit;
  }

  read.toObservable = () => {
    return new Observable<T>((observer) => {
      let first = true;
      const dispose = createEffect(() => {
        const val = read();
        if (first) {
          first = false;
        } else {
          observer.next(val);
        }
      });
      return dispose;
    });
  };

  Object.defineProperty(read, $SIGNAL, { value: true, enumerable: true });
  Object.defineProperty(read, $MEMO, { value: true, enumerable: true });
  Object.defineProperty(read, $NODE, { value: node, enumerable: false });

  return read;
}

// ============================================================================
// BATCHING SYSTEM
// ============================================================================

export function batch<T>(fn: () => T): T {
  if (Updates) return fn();

  Updates = [];
  Effects = [];

  try {
    return fn();
  } finally {
    flushUpdates();
  }
}

function flushUpdates(): void {
  if (Pending) return;
  Pending = true;
  ExecCount = 0;

  try {
    if (Updates) {
      const updates = Updates;
      Updates = null;

      if (updates.length > 0) {
        for (let i = 0; i < updates.length; i++) {
          const comp = updates[i];
          // Only run effects, not memos (memos are lazy and recompute when accessed)
          if (!comp.pure) {
            updateComputation(comp);
          }
        }
      }
    }

    if (Effects) {
      const effects = Effects;
      Effects = null;

      if (effects.length > 0) {
        for (let i = 0; i < effects.length; i++) {
          updateComputation(effects[i]);
        }
      }
    }
  } finally {
    Pending = false;
  }
}

// ============================================================================
// ROOT & OWNERSHIP MANAGEMENT
// ============================================================================

export function createRoot<T>(fn: (dispose: () => void) => T): T {
  const owner: RootOwner = {
    owned: null,
    cleanups: null,
    contexts: null,
    owner: Owner,
  };

  const prevOwner = Owner;
  Owner = owner;

  try {
    return fn(() => {
      if (owner.owned) {
        for (let i = 0; i < owner.owned.length; i++) {
          dispose(owner.owned[i]);
        }
      }
      if (owner.cleanups) {
        for (let i = 0; i < owner.cleanups.length; i++) {
          owner.cleanups[i]();
        }
      }
    });
  } finally {
    //console.log('disposing owner root', prevOwner)
    Owner = prevOwner;
  }
}

export function untrack<T>(fn: () => T): T {
  const prevListener = Listener;
  Listener = null;
  try {
    return fn();
  } finally {
    Listener = prevListener;
  }
}

export function onCleanup(fn: Cleanup): void {
  if (Owner) {
    if (!Owner.cleanups) Owner.cleanups = [fn];
    else Owner.cleanups.push(fn);
  }
}

// ============================================================================
// ADDITIONAL UTILITIES
// ============================================================================

export function createSelector<T, U = T>(
  source: () => T,
  fn: (key: U, value: T) => boolean = (k, v) => (k as any) === (v as any)
): (key: U) => boolean {
  const map = new Map<U, Signal<boolean>>();

  createEffect(() => {
    const value = source();
    for (const [key, signal] of map) {
      const [get, set] = signal;
      const match = fn(key, value);
      if (get() !== match) set(match);
    }
  });

  return (key: U): boolean => {
    let signal = map.get(key);
    if (!signal) {
      const [get, set] = createSignal(false);
      signal = [get, set];
      map.set(key, signal);

      const value = source();
      const match = fn(key, value);
      set(match);
    }
    return signal[0]();
  };
}

export type Resource<T> = Accessor<T | undefined> & {
  state: 'unresolved' | 'pending' | 'ready' | 'refreshing' | 'errored';
  loading: boolean;
  error: any;
  latest: T | undefined;
};

export type ResourceReturn<T> = [
  Resource<T>,
  { mutate: Setter<T | undefined>; refetch: (info?: unknown) => void }
];

/**
 * Fetcher function type
 * @template T - Type of the resource data
 * @template S - Type of the source value
 */
export type ResourceFetcher<T, S> = (
  source: S,
  info: { value: T | undefined; refetching: boolean }
) => T | Promise<T> | null | undefined;

/**
 * Source function or value
 * @template S - Type of the source value
 */
export type ResourceSource<S> =
  | S
  | false
  | null
  | undefined
  | (() => S | false | null | undefined);

export type ResourceState =
  | 'unresolved'
  | 'pending'
  | 'ready'
  | 'refreshing'
  | 'errored';
/**
 * Internal resource state management
 */
interface ResourceStateManager<T> {
  value: T | undefined;
  error: Error | undefined;
  state: ResourceState;
  loading: boolean;
  latest: T | undefined;
}

/**
 * Options for creating a resource
 * @template T - Type of the resource data
 * @template S - Type of the source value
 */
export interface ResourceOptions<T, S = unknown> {
  /**
   * Initial value before the resource loads
   */
  initialValue?: T;

  /**
   * Function to call when the resource loads successfully
   */
  onSuccess?: (data: T) => void;

  /**
   * Function to call when the resource fails
   */
  onError?: (error: Error) => void;

  /**
   * Custom equality check for source value
   */
  equals?: (prev: S, next: S) => boolean;

  /**
   * Name for debugging
   */
  name?: string;

  /**
   * Whether to fetch immediately
   * @default true
   */
  fetchOnMount?: boolean;

  /**
   * Defer fetching until manually triggered
   * @default false
   */
  deferStream?: boolean;

  /**
   * Storage key for caching
   */
  storage?: string;

  /**
   * Cache time in milliseconds
   */
  cacheTime?: number;
}

// export function createResource<T, S>(
//   source: () => S,
//   fetcher: (key: S) => T | Promise<T>
// ) {
//   let value: T | undefined;
//   let error: any;
//   let promise: Promise<T> | null = null;
//   let state: 'unresolved' | 'pending' | 'ready' | 'errored' = 'unresolved';

//   function load() {
//     const key = source();

//     if (key == null || key === false) {
//       state = 'unresolved';
//       return;
//     }

//     if (state === 'pending') return;

//     try {
//       const result = fetcher(key);

//       if (result instanceof Promise) {
//         state = 'pending';
//         promise = result.then(
//           (v) => {
//             value = v;
//             state = 'ready';
//             promise = null;
//           },
//           (e) => {
//             error = e;
//             state = 'errored';
//             promise = null;
//           }
//         );
//       } else {
//         value = result;
//         state = 'ready';
//       }
//     } catch (e) {
//       error = e;
//       state = 'errored';
//     }
//   }

//   load();

//   const read = () => {
//     if (state === 'ready') return value!;
//     if (state === 'errored') throw error;
//     throw promise!;
//   };

//   return [read, { refetch: load }] as const;
// }
//
const cache = new Map();

function fetchCached(key: any) {
  if (!cache.has(key)) {
    cache.set(key, fetch(key));
  }
  return cache.get(key);
}

export function createResource<T, S = true>(
  source: Accessor<S> | S,
  fetcherFn?: (
    k: S,
    info: { value: T | undefined; refetching: unknown }
  ) => T | Promise<T>,
  options: { initialValue?: T; name?: string; storage?: string } = {}
): ResourceReturn<T> {
  let s: Accessor<S> | undefined;
  // if (arguments.length === 2 && typeof fetcher === 'object') {
  //   options = fetcher as any;
  //   fetcher = source as any;
  //   source = true as S;
  // } else if (arguments.length === 1) {
  //   fetcher = source as any;
  //   source = true as S;
  // }

  // let sourceFn: () => S | false | null | undefined;
  let fetcher: ResourceFetcher<T, S>;

  if (typeof fetcherFn === 'function') {
    // Two-argument form: createResource(source, fetcher)
    s =
      typeof source === 'function' ? (source as () => S) : () => source as S;
    fetcher = fetcherFn;
  } else {
    // One-argument form: createResource(fetcher)
    s = () => true as S;
    fetcher = source as ResourceFetcher<T, S>;
    if (fetcherFn && typeof fetcherFn === 'object') {
      // Options passed as second argument
      options = fetcherFn as any;
    }
  }

  const {
    initialValue,
    name,

  } = options;

  const [value, setValue] = createSignal<T | undefined>(options.initialValue, {
    equals: false,
  });
  const [error, setError] = createSignal<any>(undefined, { equals: false });
  const [state, setState] = createSignal<ResourceState>(
    options.initialValue !== undefined ? 'ready' : 'unresolved',
    { equals: false }
  );
  const [promise, setPromise] = createSignal<Promise<T> | undefined>(
    undefined,
    { equals: false }
  );
  const [track, trigger] = createSignal(undefined, { equals: false });

  const saveToCache = (data: T): void => {
    // if (!storage) return;

    try {
      if (data) {
        // console.log('caching', data)
      localStorage.setItem(
        'storage',
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );

      }
    } catch (error) {
      console.error(`Failed to save resource to cache (${name}):`, error);
    }
  };
  createEffect(() => {
    const val = s ? s() : (source as S);
    track(); // Track manual refetch

    if (val === false || val === null || val === undefined) {
      batch(() => {
        setState('unresolved');
        setPromise(undefined);
        setError(undefined);
      });
      return;
    }

    let cancelled = false;
    onCleanup(() => (cancelled = true));

    const currentState = untrack(state);
    const currentValue = untrack(value);

    // Determine if refreshing or new loading
    const isRefreshing =
      currentState === 'ready' || currentState === 'refreshing';

    batch(() => {
      setState(isRefreshing ? 'refreshing' : 'pending');
      setError(undefined);
    });

    try {
      const res = fetcher!(val, {
        value: currentValue,
        refetching: isRefreshing,
      });

      if (isPromise(res)) {
        setPromise(res);
        // Register .then() BEFORE trackPromise so that the resource
        // value is set before trackPromise's .finally() calls
        // setLoading(false). Promise handlers fire in registration order,
        // so this ensures the value is available when Suspense transitions
        // from fallback to content.
        res.then(
          (v) => {
            if (cancelled) return;
            batch(() => {
              setValue(() => v);
              saveToCache(v)
              setState('ready');
              setPromise(undefined);
            });
          },
          (e) => {
            if (cancelled) return;
            batch(() => {
              setError(e);
              setState('errored');
              setPromise(undefined);
            });
          }
        );
        // Self-register with nearest Suspense boundary via context.
        // increment() on fetch start, decrement() on resolve/reject.
        const suspenseCtx = _SuspenseContext && useContext(_SuspenseContext);
        if (suspenseCtx) {
          suspenseCtx.increment();
          res.finally(() => suspenseCtx.decrement());
        }
      } else {
        batch(() => {
          setValue(() => res as T);
          // console.log('caching', res)
          // saveToCache(res)
          setState('ready');
          setPromise(undefined);
        });
      }
    } catch (e) {
      batch(() => {
        setError(e);
        setState('errored');
        setPromise(undefined);
      });
    }
  });

  const resource = (() => {
    const e = error();
    if (e) throw e;
    const s = state();
    // Throw the pending promise for Suspense boundaries
    if (s === 'pending' || s === 'refreshing') {
      const p = promise();
      if (p) throw p;
    }
    return value();
  }) as Resource<T>;

  Object.defineProperty(resource, $RESOURCE, { value: true, enumerable: true });
  Object.defineProperty(resource, $SIGNAL, { value: true, enumerable: true });

  Object.defineProperties(resource, {
    state: { get: state },
    loading: {
      get: () => {
        const s = state();
        return s === 'pending' || s === 'refreshing';
      },
    },
    error: { get: error },
    latest: { get: value },
  });

  return [
    resource,
    {
      mutate: setValue,
      refetch: () => trigger(undefined),
    },
  ];
}

// export function createResource<T, S = true>(
//   source: ResourceSource<S> | ResourceFetcher<T, S>,
//   fetcher?: ResourceFetcher<T, S>,
//   options: ResourceOptions<T, S> = {}
// ): [
//   Resource<T>,
//   { mutate: Setter<T | undefined>; refetch: (info?: unknown) => void }
// ] {
//   // Normalize arguments
//   let sourceFn: () => S | false | null | undefined;
//   let fetcherFn: ResourceFetcher<T, S>;

//   if (typeof fetcher === 'function') {
//     // Two-argument form: createResource(source, fetcher)
//     sourceFn =
//       typeof source === 'function' ? (source as () => S) : () => source as S;
//     fetcherFn = fetcher;
//   } else {
//     // One-argument form: createResource(fetcher)
//     sourceFn = () => true as S;
//     fetcherFn = source as ResourceFetcher<T, S>;
//     if (fetcher) {
//       // Options passed as second argument
//       options = fetcher as any;
//     }
//   }

//   const {
//     initialValue,
//     onSuccess,
//     onError,
//     name,
//     fetchOnMount = true,
//     deferStream = false,
//     storage,
//     cacheTime,
//   } = options;

//   // State management
//   const [state, setState] = createSignal<ResourceStateManager<T>>({
//     value: initialValue,
//     error: undefined,
//     state: 'unresolved',
//     loading: false,
//     latest: initialValue,
//   });

//   // Track current request
//   let currentRequest: Promise<T> | null = null;
//   let abortController: AbortController | null = null;
//   let cacheTimestamp: number | null = null;

//   /**
//    * Loads data from cache if available
//    */
//   const loadFromCache = (): T | undefined => {
//     if (!storage) return undefined;

//     try {
//       const cached = localStorage.getItem(storage);
//       if (!cached) return undefined;

//       const { data, timestamp } = JSON.parse(cached);

//       if (cacheTime && Date.now() - timestamp > cacheTime) {
//         // Cache expired
//         localStorage.removeItem(storage);
//         return undefined;
//       }

//       cacheTimestamp = timestamp;
//       return data;
//     } catch (error) {
//       console.error(`Failed to load resource from cache (${name}):`, error);
//       return undefined;
//     }
//   };

//   /**
//    * Saves data to cache
//    */
//   const saveToCache = (data: T): void => {
//     if (!storage) return;

//     try {
//       localStorage.setItem(
//         storage,
//         JSON.stringify({
//           data,
//           timestamp: Date.now(),
//         })
//       );
//     } catch (error) {
//       console.error(`Failed to save resource to cache (${name}):`, error);
//     }
//   };

//   /**
//    * Fetches the resource data
//    */
//   const fetch = async (sourceValue: S, isRefetch = false): Promise<void> => {
//     // Cancel previous request
//     if (abortController) {
//       abortController.abort();
//     }

//     abortController = new AbortController();

//     const currentState = state();
//     const info = {
//       value: currentState.value,
//       refetching: isRefetch || currentState.state === 'refreshing',
//     };

//     setState({
//       ...currentState,
//       state: currentState.value !== undefined ? 'refreshing' : 'pending',
//       loading: true,
//       error: undefined,
//     });

//     // console.log('fetcher', fetcherFn);
//     try {
//       const result = isPromise(fetcherFn)
//         ? fetcherFn
//         : fetcherFn(sourceValue, info);

//       // Handle synchronous result
//       if (result instanceof Promise) {
//         currentRequest = result;
//         const data = await result;

//         // Check if this request is still current
//         if (currentRequest === result) {
//           setState({
//             value: data,
//             error: undefined,
//             state: 'ready',
//             loading: false,
//             latest: data,
//           });

//           saveToCache(data);

//           if (onSuccess) {
//             onSuccess(data);
//           }

//           currentRequest = null;
//         }
//       } else if (result !== null && result !== undefined) {
//         setState({
//           value: result,
//           error: undefined,
//           state: 'ready',
//           loading: false,
//           latest: result,
//         });

//         saveToCache(result);

//         if (onSuccess) {
//           onSuccess(result);
//         }

//         currentRequest = null;
//       }
//     } catch (error) {
//       const err = error instanceof Error ? error : new Error(String(error));

//       // Only update if this is still the current request
//       if (abortController?.signal.aborted) {
//         return;
//       }

//       setState({
//         ...state(),
//         error: err,
//         state: 'errored',
//         loading: false,
//       });

//       if (onError) {
//         onError(err);
//       }

//       currentRequest = null;

//       console.error(`Resource fetch failed (${name}):`, err);
//     } finally {
//       abortController = null;
//     }
//   };

//   /**
//    * Refetches the resource
//    */
//   const refetch = (info?: unknown): void => {
//     const sourceValue = sourceFn();

//     if (
//       sourceValue === false ||
//       sourceValue === null ||
//       sourceValue === undefined
//     ) {
//       return;
//     }

//     fetch(sourceValue, true);
//   };

//   /**
//    * Mutates the resource value without refetching
//    */
//   const mutate: Setter<T | undefined> = (value) => {
//     const currentState = state();
//     const newValue =
//       typeof value === 'function'
//         ? (value as (prev: T | undefined) => T | undefined)(currentState.value)
//         : value;

//     setState({
//       ...currentState,
//       value: newValue,
//       latest: newValue !== undefined ? newValue : currentState.latest,
//     });

//     if (newValue !== undefined) {
//       saveToCache(newValue);
//     }
//   };

//   // Try to load from cache first
//   if (storage) {
//     const cached = loadFromCache();
//     if (cached !== undefined) {
//       setState({
//         value: cached,
//         error: undefined,
//         state: 'ready',
//         loading: false,
//         latest: cached,
//       });
//     }
//   }

//   // Set up reactive fetching
//   if (!deferStream) {
//     createEffect(() => {
//       const sourceValue = sourceFn();

//       if (
//         sourceValue === false ||
//         sourceValue === null ||
//         sourceValue === undefined
//       ) {
//         return;
//       }

//       if (fetchOnMount || state().state !== 'unresolved') {
//         fetch(sourceValue);
//       }
//     });
//   }

//   // Cleanup on unmount
//   // onUnmount(() => {
//   //   if (abortController) {
//   //     abortController.abort();
//   //   }
//   // });

//   // Create resource accessor
//   const resource = (() => state().value) as Resource<T>;

//   Object.defineProperties(resource, {
//     state: {
//       get: () => state().state,
//     },
//     loading: {
//       get: () => state().loading,
//     },
//     error: {
//       get: () => state().error,
//     },
//     latest: {
//       get: () => state().latest,
//     },
//     refetch: {
//       value: refetch,
//     },
//     mutate: {
//       value: mutate,
//     },
//   });

//   return [resource, { mutate, refetch }];
// }
export function createDeferred<T>(
  source: Accessor<T>,
  options?: { timeoutMs?: number; equals?: false | EqualityFn<T> }
): Accessor<T> {
  const [delayed, setDelayed] = createSignal(source(), options);
  createEffect(() => {
    const v = source();
    if (options?.timeoutMs) {
      setTimeout(() => setDelayed(() => v), options.timeoutMs);
    } else {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => setDelayed(() => v));
      } else {
        Promise.resolve().then(() => setDelayed(() => v));
      }
    }
  });
  return delayed;
}

export function getOwner(): RootOwner | null {
  return Owner;
}

export function runWithOwner<T>(owner: RootOwner | null, fn: () => T): T {
  const prevOwner = Owner;
  Owner = owner;
  try {
    return fn();
  } finally {
    //console.log('disposing owner run', prevOwner)
    Owner = prevOwner;
  }
}

export function createContext<T>(defaultValue?: T): {
  Provider: (props: { value: T; children: any }) => any;
  defaultValue: T | undefined;
  id: symbol;
} {
  const id = Symbol('context');
  const Provider = createProvider(id)
  return {
    id,
    Provider,
    defaultValue,
  };
}

/**
 * Resolve children values for Provider — flatten arrays, call thunks,
 * but preserve signals/memos for reactive tracking.
 */
function resolveProviderChildren(val: any): any {
  if (val == null || typeof val === 'boolean') return null;
  if (Array.isArray(val)) {
    const result: any[] = [];
    for (const item of val) {
      const resolved = resolveProviderChildren(item);
      if (Array.isArray(resolved)) {
        for (const r of resolved) if (r != null) result.push(r);
      } else if (resolved != null) {
        result.push(resolved);
      }
    }
    return result;
  }
  if (typeof val === 'function' && !isSignal(val)) {
    let v = val();
    while (typeof v === 'function' && !isSignal(v)) {
      v = v();
    }
    if (Array.isArray(v)) return resolveProviderChildren(v);
    return v;
  }
  return val;
}

export function createProvider<T>(id: symbol) {
  return (props: { value: T; children: any }) => {
    // Create an owner node with the context value. This node becomes
    // an ancestor for all child computations created inside runWithOwner,
    // so useContext walks up to it and finds the context.
    const ctxOwner: RootOwner = {
      owner: Owner,
      owned: null,
      cleanups: null,
      contexts: new Map(),
    };
    ctxOwner.contexts!.set(id, props.value);
    if (Owner) {
      if (!Owner.owned) Owner.owned = [];
      Owner.owned.push(ctxOwner as any);
    }
    // Also set on current Owner for lookups outside runWithOwner scope
    if (Owner) {
      if (!(Owner as any).contexts) (Owner as any).contexts = new Map();
      (Owner as any).contexts.set(id, props.value);
    }
    // Evaluate children under ctxOwner so all computations (effects, memos,
    // resources) created by children have ctxOwner in their owner chain.
    // Only call children() once — do NOT use resolveProviderChildren which
    // deep-resolves and triggers lazy component stack overflows.
    const children = props.children;
    if (typeof children === 'function' && !isSignal(children)) {
      return runWithOwner(ctxOwner, () => untrack(() => children()));
    }
    return children;
  };
}

export function useContext<T>(context: {
  id: symbol;
  defaultValue?: T;
}): T | undefined {
  let owner = Owner;
  while (owner) {
    if (owner.contexts && owner.contexts.has(context.id)) {
      return owner.contexts.get(context.id) as T;
    }
    owner = owner.owner;
  }
  if (!context) {
    return
  };
  return context.defaultValue;
}

export function flush(): Promise<void> {
  return new Promise((resolve) => {
    queueMicrotask(() => {
      flushUpdates();
      resolve();
    });
  });
}

// ============================================================================
// ENHANCED SIGNAL
// ============================================================================

export function createEnhancedSignal<T>(
  initialValue: T,
  options: SignalOptions<T> = {}
): EnhancedSignal<T> {
  const [get, set] = createSignal(initialValue, options);
  const node = get[$NODE]!;

  const subscriptions = new Set<(value: T) => void>();

  const subscribe = (listener: (value: T) => void): (() => void) => {
    subscriptions.add(listener);
    return () => {
      subscriptions.delete(listener);
    };
  };

  const dispose = (): void => {
    subscriptions.clear();
    unregisterNode(node);
  };

  const toObservable = (): Observable<T> => {
    return new Observable<T>((observer) => {
      const unsubscribe = subscribe((value) => {
        observer.next(value);
      });
      return () => unsubscribe();
    });
  };

  const enhancedSet: Setter<T> = (value) => {
    set(value);
    const newValue = get();
    for (const listener of subscriptions) {
      try {
        listener(newValue);
      } catch (error) {
        console.error('Subscription error:', error);
      }
    }
  };

  return {
    get,
    set: enhancedSet,
    subscribe,
    dispose,
    toObservable,
    node,
  };
}

// ============================================================================
// ASYNC SIGNAL
// ============================================================================

export function createAsyncSignal<T, Args extends any[] = []>(
  initialValue: T,
  asyncFn: AsyncFn<T, Args>,
  options: SignalOptions<T> = {}
): AsyncSignal<T, Args> {
  const [get, set] = createSignal<T>(initialValue, options);
  const [loading, setLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<Error | null>(null);

  const node = get[$NODE]!;
  node.type = 'async';

  const execute = async (...args: Args): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      if (isPromise(asyncFn)) {
        const result = await asyncFn;
        set(result);
        return result;
      } else {
        const result = await asyncFn(...args);
        set(result);
        return result;
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  };

  return {
    get,
    set,
    loading,
    error,
    execute,
    reload: execute,
    node,
  };
}

// ============================================================================
// SIGNAL WITH HISTORY
// ============================================================================

export function createSignalWithHistory<T>(
  initialValue: T,
  options: { maxHistory?: number } = {}
): SignalWithHistory<T> {
  const { maxHistory = 50 } = options;
  const [get, set] = createSignal<T>(initialValue);
  const history: T[] = [initialValue];
  let currentIndex = 0;

  const node = get[$NODE]!;

  const enhancedSet: Setter<T> = (newValue) => {
    const oldValue = get();
    const finalValue =
      typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(oldValue)
        : newValue;

    if (currentIndex < history.length - 1) {
      history.splice(currentIndex + 1);
    }

    history.push(finalValue);

    if (history.length > maxHistory) {
      history.shift();
    } else {
      currentIndex++;
    }

    set(finalValue);
  };

  const undo = (): boolean => {
    if (currentIndex > 0) {
      currentIndex--;
      set(history[currentIndex]);
      return true;
    }
    return false;
  };

  const redo = (): boolean => {
    if (currentIndex < history.length - 1) {
      currentIndex++;
      set(history[currentIndex]);
      return true;
    }
    return false;
  };

  return {
    get,
    set: enhancedSet,
    undo,
    redo,
    canUndo: (): boolean => currentIndex > 0,
    canRedo: (): boolean => currentIndex < history.length - 1,
    history: (): T[] => [...history],
    currentIndex: (): number => currentIndex,
    node,
  };
}

// ============================================================================
// TRIGGER
// ============================================================================

export function createTrigger(): Trigger {
  const [get, set] = createSignal(0);
  const node = get[$NODE]!;

  const trigger = (): void => {
    get();
  };

  trigger.subscribe = (fn: () => void): (() => void) => {
    set((n) => (n as number) + 1);
    return createEffect(() => {
      get();
      fn();
    });
  };

  trigger.node = node;

  return trigger;
}

// ============================================================================
// DERIVED TRIGGER
// ============================================================================

export function createDerivedTrigger<T>(
  fn: DerivedFn<T>,
  options: {
    equals?: EqualityFn<T>;
    name?: string;
    fireImmediately?: boolean;
  } = {}
): EnhancedTrigger<T> {
  const { equals, name, fireImmediately = false } = options;

  const node = createReactiveNode('derived', undefined as T, { equals, name });

  const [trigger, setTrigger] = createSignal<T>(undefined as T, {
    equals,
    name,
  });

  let lastValue: T | undefined;
  let isComputing = false;
  let isInitialized = false;

  const triggerEffect = createEffect(() => {
    if (isComputing) return;

    isComputing = true;
    const newValue = fn();
    isComputing = false;

    const eq = equals || defaultEquals;
    if (!isInitialized || !eq(lastValue as T, newValue) || fireImmediately) {
      isInitialized = true;
      lastValue = newValue;
      setTrigger(newValue);
    }
  });

  const enhancedTrigger = ((): T => {
    return trigger();
  }) as EnhancedTrigger<T>;

  enhancedTrigger.dispose = triggerEffect;
  enhancedTrigger.getLastValue = (): T | undefined => lastValue;
  enhancedTrigger.forceUpdate = (): void => {
    const newValue = fn();
    lastValue = newValue;
    setTrigger(newValue);
  };
  enhancedTrigger.node = node;

  return enhancedTrigger;
}

// ============================================================================
// LAZY SIGNAL
// ============================================================================

export function createLazySignal<T>(
  fn: () => T,
  options: SignalOptions<T> = {}
): LazySignal<T> {
  const { equals, name } = options;
  let computed = false;
  let value: T;
  let error: Error | undefined;

  const [get, set] = createSignal<T>(undefined as T, { equals, name });
  const node = get[$NODE]!;

  const lazyGet = (): T => {
    if (!computed) {
      computed = true;
      try {
        value = fn();
        set(value);
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        throw error;
      }
    }

    if (error) throw error;
    return get();
  };

  lazyGet.reset = (): void => {
    computed = false;
    value = undefined as T;
    error = undefined;
    set(undefined as T);
  };
  lazyGet.node = node;

  return lazyGet;
}

// ============================================================================
// THROTTLE & DEBOUNCE
// ============================================================================

export function createThrottledSignal<T>(
  signal: EnhancedSignal<T>,
  delay: number
): EnhancedSignal<T> {
  const [get, set] = createSignal(signal.get());
  let timeout: any;
  let lastValue: T;

  signal.subscribe((value) => {
    lastValue = value;

    if (!timeout) {
      timeout = setTimeout(() => {
        set(lastValue);
        timeout = null;
      }, delay);
    }
  });

  return {
    node: get[$NODE]!,
    get,
    set: signal.set,
    subscribe: (listener) => signal.subscribe(listener),
    dispose: signal.dispose,
    toObservable: () => get.toObservable!(),
  };
}

export function createDebouncedSignal<T>(
  signal: EnhancedSignal<T>,
  delay: number
): EnhancedSignal<T> {
  const [get, set] = createSignal(signal.get());
  let timeout: any;

  signal.subscribe((value) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      set(value);
    }, delay);
  });

  return {
    node: get[$NODE]!,
    get,
    set: signal.set,
    subscribe: (listener) => signal.subscribe(listener),
    dispose: signal.dispose,
    toObservable: () => get.toObservable!(),
  };
}

// ============================================================================
// OBSERVABLES
// ============================================================================

export function signalToObservable<T>(
  signal: Accessor<T> | EnhancedSignal<T>
): Observable<T> {
  const getter = typeof signal === 'function' ? signal : signal.get;

  if (!isFunction(signal) && (signal as any).toObservable) {
    return (signal as any).toObservable();
  }

  return new Observable<T>((observer) => {
    let first = true;
    const dispose = createEffect(() => {
      const value = getter();
      if (!first) {
        observer.next(value);
      }
      first = false;
    });
    return () => dispose();
  });
}

export function observableToSignal<T>(
  observable: Observable<T>,
  initialValue: T,
  options?: SignalOptions<T>
): EnhancedSignal<T> {
  const signal = createEnhancedSignal(initialValue, options);

  const subscription = observable.subscribe({
    next: (value) => {
      signal.set(value);
    },
    error: (error) => {
      console.error('Observable error:', error);
    },
    complete: () => {
      (signal as any)._complete = true;
    },
  });

  const originalDispose = signal.dispose;
  (signal as any).dispose = () => {
    subscription.unsubscribe();
    originalDispose.call(signal);
  };

  return signal;
}

export function fromObservable<T>(
  observable: Observable<T>,
  initialValue: T,
  options?: SignalOptions<T>
): EnhancedSignal<T> {
  return observableToSignal(observable, initialValue, options);
}

// ============================================================================
// TRANSITIONS
// ============================================================================

// export function startTransition(fn: () => void): void {
//   batch(fn);
// }
/**
 * Start a transition for lower-priority updates
 * Similar to SolidJS's startTransition
 * Updates within transitions are queued and processed with lower priority
 */
export function startTransition(fn: () => void): Promise<void> {
  return new Promise((resolve) => {
    const transition: TransitionState = {
      pending: true,
      startTime: Date.now(),
      timeoutMs: 5000,
      updates: new Set(),
    };

    const prevTransition = currentTransition;
    currentTransition = transition;

    try {
      // Run function - all effects/computations created here get TRANSITION priority
      fn();
    } finally {
      currentTransition = prevTransition;
    }

    // Queue transition updates to run after current work
    batch(() => {
      transition.pending = false;
      // Execute all transition updates
      transition.updates.forEach((update) => update());
      transition.updates.clear();
      resolve();
    });
  });
}

// export function useTransition(): [() => boolean, (fn: () => void) => void] {
//   const [pending, setPending] = createSignal(false);
//   return [
//     pending,
//     (fn: () => void) => {
//       setPending(true);
//       batch(() => {
//         fn();
//         setPending(false);
//       });
//     },
//   ];
// }

export function useTransition(): [
  () => boolean,
  (fn: () => void | Promise<void>) => Promise<void>
] {
  const [isPending, setIsPending] = createSignal(false);

  const start = async (fn: () => Promise<void> | void) => {
    setIsPending(true);
    return startTransition(fn).finally(() => setIsPending(false));
  };

  return [isPending, start];
}

// ============================================================================
// DEVELOPMENT & DEBUGGING
// ============================================================================

export function enableDevMode(): void {
  // Development mode enabled
}

export function getRegisteredNodes(): ReactiveNode[] {
  if (!__DEV__) return [];

  const nodes: ReactiveNode[] = [];
  for (const ref of nodeRegistry.values()) {
    const node = ref.deref();
    if (node) {
      nodes.push(node);
    }
  }
  return nodes;
}

export function getNodeStats(): {
  total: number;
  byType: Record<string, number>;
} {
  const nodes = getRegisteredNodes();
  const byType: Record<string, number> = {};

  nodes.forEach((node) => {
    byType[node.type] = (byType[node.type] || 0) + 1;
  });

  return {
    total: nodes.length,
    byType,
  };
}

export function getReactiveGraph(): any {
  const graph: any = { roots: [], computations: [] };

  function collectOwner(owner: RootOwner, level = 0) {
    if (owner.owned) {
      for (const comp of owner.owned) {
        graph.computations.push({
          level,
          pure: comp.pure,
          state: comp.state,
          sourcesCount: comp.sources?.length ?? 0,
        });
        if (comp.owned) {
          collectOwner(comp as any, level + 1);
        }
      }
    }
  }

  if (Owner) {
    collectOwner(Owner);
  }

  return graph;
}

export function isSignal<T>(value: any): value is Accessor<T> {
  return typeof value === 'function' && value[$SIGNAL] === true;
}
export function isMemo<T>(value: any): value is Accessor<T> {
  return typeof value === 'function' && value[$MEMO] === true;
}
export function isResource<T>(value: any): value is Resource<T> {
  return typeof value === 'function' && value[$RESOURCE] === true;
}

// ============================================================================
// ADDITIONAL UTILITIES
// ============================================================================

export function on<T extends readonly unknown[], U>(
  deps: () => [...T],
  fn: (values: [...T], prev?: U) => U,
  options?: { defer?: boolean }
): (prev?: U) => U {
  const defer = options?.defer ?? false;
  let isFirst = true;

  return (prev?: U) => {
    const values = deps();

    if (defer && isFirst) {
      isFirst = false;
      return prev as U;
    }

    return untrack(() => fn(values, prev));
  };
}

export function createReaction(
  onInvalidate: () => void
): (fn: () => void) => void {
  let trackingComp: Computation | null = null;

  return (fn: () => void) => {
    if (trackingComp) {
      dispose(trackingComp);
    }

    trackingComp = {
      fn: onInvalidate,
      state: DIRTY,
      sources: null,
      sourceSlots: null,
      owned: null,
      cleanups: null,
      owner: Owner,
      context: null,
      pure: false,
      updatedAt: null,
    };

    if (Owner) {
      if (!Owner.owned) Owner.owned = [trackingComp];
      else Owner.owned.push(trackingComp);
    }

    const prevListener = Listener;
    Listener = trackingComp;

    try {
      fn();
      // Mark as CLEAN after initial tracking so it can be marked DIRTY on signal changes
      trackingComp.state = CLEAN;
    } finally {
      Listener = prevListener;
    }
  };
}

/**
 * createRenderEffect - runs synchronously during rendering.
 *
 * Unlike createEffect which is conceptually deferred (post-render),
 * createRenderEffect runs immediately and tracks its return value
 * as the "previous" value passed to the next execution, matching
 * SolidJS semantics: fn(prev) => next.
 */
export function createRenderEffect<T>(
  fn: (prev: T) => T,
  value?: T,
  options?: EffectOptions
): () => void {
  const c: Computation = {
    fn: fn as any,
    state: DIRTY,
    sources: null,
    sourceSlots: null,
    value,
    owned: null,
    cleanups: null,
    owner: Owner,
    context: null,
    pure: false,
    updatedAt: null,
    renderEffect: true,
  };

  if (Owner) {
    if (!Owner.owned) Owner.owned = [c];
    else Owner.owned.push(c);
  }

  // Stamp render effect with Suspense boundary for queuing
  const SC = _SuspenseContext && useContext(_SuspenseContext);
  if (SC) {
    c.suspense = SC;
  }

  // Run immediately and synchronously (render-phase effect)
  runRenderComputation(c);

  return () => {
    dispose(c);
  };
}

function runRenderComputation(c: Computation): void {
  // Clean up old signal subscriptions
  if (c.sources) {
    for (const source of c.sources) {
      const observers = signalObservers.get(source);
      if (observers) {
        observers.delete(c);
      }
    }
    c.sources = null;
    c.sourceSlots = null;
  }

  // Run and clear cleanups from previous run
  if (c.cleanups) {
    for (let i = 0; i < c.cleanups.length; i++) {
      c.cleanups[i]();
    }
    c.cleanups = null;
  }

  // Dispose owned computations from previous run
  if (c.owned) {
    for (let i = 0; i < c.owned.length; i++) {
      dispose(c.owned[i]);
    }
    c.owned = null;
  }

  const prevListener = Listener;
  const prevOwner = Owner;

  Listener = c;
  Owner = c as any;

  try {
    // Pass previous value to fn, store result as next previous value
    const result = (c.fn as (prev: any) => any)(c.value);
    // If fn returns a function, register it as a cleanup
    if (typeof result === 'function') {
      if (!c.cleanups) c.cleanups = [];
      c.cleanups.push(result);
    }
    c.value = result;
    c.state = CLEAN;
  } catch (err) {
    if (isPromise(err)) {
      const ctx = _SuspenseContext && useContext(_SuspenseContext);
      if (ctx) {
        ctx.increment();
        (err as Promise<unknown>).finally(() => ctx.decrement());
        if (c.suspense) ctx.effects.push(c);
      }
      return;
    }
    handleError(err as Error);
  } finally {
    //console.log('disposing owner render computation', prevOwner)
    Listener = prevListener;
    Owner = prevOwner;
  }
}

export function createComputed<T>(
  fn: ComputationFn<T>,
  value?: T,
  options?: MemoOptions<T>
): Accessor<T> {
  return createMemo(fn, value, options);
}

// ============================================================================
// SUSPENSE API — SolidJS-aligned context-based architecture
// ============================================================================

// Lazy-init like SolidJS to avoid module initialization order issues
let _SuspenseContext: Context<SuspenseContextType | undefined>;

/**
 * Get the SuspenseContext (lazy-initialized).
 * Suspense components provide this via Provider; resources find it via useContext.
 */
export function getSuspenseContext(): Context<SuspenseContextType | undefined> {
  return _SuspenseContext || (_SuspenseContext = createContext<SuspenseContextType | undefined>());
}

let _SuspenseListContext: Context<SuspenseListContextType | undefined>;

/**
 * Get the SuspenseListContext (lazy-initialized).
 * SuspenseList provides this; child Suspense boundaries register with it.
 */
export function getSuspenseListContext(): Context<SuspenseListContextType | undefined> {
  return _SuspenseListContext || (_SuspenseListContext = createContext<SuspenseListContextType | undefined>());
}

/**
 * Resume suspended effects after async resolution.
 * Queued effects are run immediately (marked dirty + updated).
 */
export function resumeEffects(effects: Computation[]): void {
  if (!effects.length) return;
  const queued = effects.slice();
  effects.length = 0;
  for (const c of queued) {
    c.state = DIRTY;
    updateComputation(c);
  }
}

/**
 * Register a callback to run when suspense resolves.
 * If not inside a suspense boundary, runs immediately.
 */
export function onResolve(fn: () => void): void {
  const ctx = _SuspenseContext && useContext(_SuspenseContext);
  if (ctx && ctx.inFallback()) {
    // Queue until resolved — check periodically via effect
    createEffect(() => {
      if (!ctx.inFallback()) {
        fn();
      }
    });
  } else {
    fn();
  }
}

/**
 * Check if currently inside a suspended Suspense boundary.
 */
export function isSuspended(): boolean {
  const ctx = _SuspenseContext && useContext(_SuspenseContext);
  return ctx ? ctx.inFallback() : false;
}

/**
 * Set a custom scheduler for effects
 */
export function setScheduler(scheduler: (fn: () => void) => void): void {
  Scheduler = scheduler;
}

/**
 * Schedule a microtask
 */
export function scheduleMicrotask(fn: () => void): void {
  if (Scheduler) {
    Scheduler(fn);
  } else if (typeof queueMicrotask === 'function') {
    queueMicrotask(fn);
  } else {
    Promise.resolve().then(fn);
  }
}


/**
 * Track a promise in the nearest Suspense boundary.
 * Uses useContext to find the SuspenseContext — works regardless of
 * whether called during runSuspense or lazily from an effect.
 */
export function trackPromise<T>(promise: Promise<T>): Promise<T> {
  const ctx = _SuspenseContext && useContext(_SuspenseContext);
  if (!ctx) return promise;
  ctx.increment();
  promise.finally(() => ctx.decrement());
  return promise;
}

/**
 * Find memory leaks by checking for nodes with no observers
 */
// export function findPotentialLeaks(): ReactiveNode[] {
//   return getRegisteredNodes().filter(
//     (node) =>
//       !node.disposed && node.observers.size === 0 && node.type !== 'store' // Stores might have no direct observers
//   );
// }

/**
 * Error handling - similar to SolidJS's catchError
 */
export function catchException<T>(
  fn: () => T,
  handler: (error: Error) => T
): T {
  const boundary: ErrorBoundary = {
    errors: [],
    handler: (error: Error) => {
      boundary.errors.push(error);
    },
    reset: () => {
      boundary.errors = [];
    },
  };

  errorHandlers.push(boundary);

  try {
    const result = fn();

    // Check if any errors were caught during execution
    // This handles errors from effects that ran synchronously
    if (boundary.errors.length > 0) {
      errorHandlers.pop();
      return handler(boundary.errors[0]);
    }

    errorHandlers.pop();
    return result;
  } catch (error) {
    errorHandlers.pop();
    boundary.handler(error as Error);
    return handler(error as Error);
  }
}

export function devComponent<P, V>(Comp: (props?: P) => V, props?: P): V {
  const c = {
    fn: () => Comp(props),
    state: 0,
    sources: null,
    sourceSlots: null,
    owned: null,
    cleanups: null,
    owner: Owner,
    context: null,
    contexts: null,
    pure: true,
    updatedAt: null,
    value: undefined,
  } as unknown as Computation;

  if (Owner) {
    if (!Owner.owned) Owner.owned = [c];
    else Owner.owned.push(c);
  }

  const prevOwner = Owner;
  Owner = c as unknown as RootOwner;
  try {
    return untrack(() => {
      Object.assign(Comp, { [$COMP]: true });
      return Comp(props);
    });
  } finally {
    //console.log('disposing owner dev comp', prevOwner)
    Owner = prevOwner;
  }
}

export type Context<T> = {
  Provider: (props: { value: T; children: any }) => any;
  defaultValue: T | undefined;
  id: symbol;
};
// export type Context<T> = ReturnType<typeof useContext<T>>;

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createSignal,
  createEffect,
  createMemo,
  createComputed,
  createRoot,
  createSelector,
  createResource,
  batch,
  untrack,
  onCleanup,
  getOwner,
  runWithOwner,
  createContext,
  useContext,
  flush,
  createEnhancedSignal,
  createAsyncSignal,
  createSignalWithHistory,
  createTrigger,
  createDerivedTrigger,
  createLazySignal,
  createThrottledSignal,
  createDebouncedSignal,
  signalToObservable,
  observableToSignal,
  fromObservable,
  startTransition,
  useTransition,
  enableDevMode,
  getRegisteredNodes,
  getNodeStats,
  getReactiveGraph,
  isSignal,
  on,
  createReaction,
  createRenderEffect,
  getSuspenseContext,
  getSuspenseListContext,
  resumeEffects,
  onResolve,
  isSuspended,
  setScheduler,
  scheduleMicrotask,
  trackPromise,
};
