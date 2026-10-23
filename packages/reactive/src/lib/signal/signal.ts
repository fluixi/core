import { isFunction, isPromise } from '../predicates.js';
import { Observable } from '../observable/observable.js';
// Detection guards + helpers now live in the TC39-owned ./graph/detect.js
// (graph-agnostic). Imported for internal use, re-exported below for the surface.
import {
  __DEV__,
  isSignal,
  isMemo,
  isResource,
  isComponent,
  isSuspense,
  isProvider,
  makeArrayFlat,
} from './graph/detect.js';
export {
  __DEV__,
  isSignal,
  isMemo,
  isResource,
  isComponent,
  isSuspense,
  isProvider,
  makeArrayFlat,
};
// Derived utilities ported onto the TC39 graph: live in ./graph/derived.js.
import { createSelector, createDeferred, createDebounce } from './graph/derived.js';
export { createSelector, createDeferred, createDebounce };
// Reactive children resolver (was the mis-named `childrens`): ./graph/children.js.
import { readChildren } from './graph/children.js';
export { readChildren };
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
export type SignalTuple<T> = [Accessor<T>, Setter<T>];
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
export interface Computation {
  fn: ComputationFn<any> | EffectFn;
  state: number;
  sources: SignalTuple<any>[] | null;
  sourceSlots: number[] | null;
  value?: any;
  owned: Computation[] | null;
  cleanups: Cleanup[] | null;
  owner: RootOwner | null;
  contexts: Map<symbol, unknown> | null;
  /** true = memo/computed: queued in Updates, processed before user effects.
   *  false = effect: processed after Updates, deferrable by transitions. */
  pure: boolean;
  /** true = createComputed: pure=true but runs eagerly (unlike lazy memos). */
  computed?: boolean;
  updatedAt: number | null;
  node?: ReactiveNode;
  accessor?: Accessor<any>;
  renderEffect?: boolean;
  suspense?: SuspenseContextType;
  /** set once dispose() has run, a disposed computation must never re-run. */
  disposed?: boolean;
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
  /** True while the transition fn is executing and effects are being captured. */
  running: boolean;
  /** Effects captured during the transition, to be flushed asynchronously. */
  effects: Computation[];
  resolve?: () => void;
  done?: Promise<void>;
}
interface ErrorBoundary {
  errors: Error[];
  handler: (error: Error) => void;
  reset: () => void;
}
export const $SIGNAL = Symbol.for('signal');
export const $MEMO = Symbol.for('memo');
export const $RESOURCE = Symbol.for('resource');
export const $PROXY = Symbol('fluixi-proxy');
const $NODE = Symbol.for('signal-node');
const CLEAN = 0;
const STALE = 1;
const DIRTY = 2;
// RUNNING is a sentinel state set on a computation just before its fn executes.
// Any propagateDirty() call that fires DURING the fn (e.g. a signal write inside
// a route component's setup code) will override it with DIRTY.  After the fn,
// RUNNING -> CLEAN (nothing re-dirtied it) or DIRTY -> stay DIRTY (needs re-run).
// This correctly distinguishes "was dirty going in" from "re-dirtied during fn."
const RUNNING = 3;
let Owner: RootOwner | null = null;
let Listener: Computation | null = null;
let Updates: Computation[] | null = null;
let Effects: Computation[] | null = null;
let ExecCount = 0;

// When true, a signal write eagerly schedules a stale effect reached through a
// Legacy propagateDirty flag. Never enabled anymore. SSR runs on the TC39 graph,
// which schedules its own re-runs, so this is always off (dead branch below).
const _eagerStaleEffects = false;
let Pending = false;
/** Depth of user-initiated batch() calls. Incremented on batch entry, decremented on exit. */
let BatchDepth = 0;
const MAX_ITERATIONS = 1000000;
const signalObservers = new WeakMap<SignalTuple<any>, Set<Computation>>();
/** Active transition: non-null while startTransition's fn is running or effects are deferred. */
let Transition: TransitionState | null = null;
const errorHandlers: ErrorBoundary[] = [];
let Scheduler: ((fn: () => void) => void) | null = null;
const nodeRegistry = new Map<string, WeakRef<ReactiveNode>>();
let nodeIdCounter = 0;
export const sharedConfig = {
  context: null as RootOwner | null,
  owner: null as RootOwner | null,
  routeData: new Map<any, any>(),
  matchedRoute: new Map<any, any>(),
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

// SSR resource injectables moved to the TC39-owned ./graph/ssr-hooks.js
// (graph-agnostic). Imported for the legacy createResource below, re-exported for
// the public surface.
import {
  setResourceTracker,
  trackResourcePromise,
  setServerDataGetter,
  getServerData,
  setResourceIdSource,
  nextResourceId,
  setResourceDataSink,
  reportResourceData,
} from './graph/ssr-hooks.js';
export {
  setResourceTracker,
  trackResourcePromise,
  setServerDataGetter,
  getServerData,
  setResourceIdSource,
  nextResourceId,
  setResourceDataSink,
  reportResourceData,
};

function createNodeId(): string {
  return `node_${++nodeIdCounter}_${Date.now()}`;
}
function registerNode(node: ReactiveNode): void {
  if (__DEV__) nodeRegistry.set(node.id, new WeakRef(node));
}
function unregisterNode(node: ReactiveNode): void {
  if (__DEV__) nodeRegistry.delete(node.id);
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
  if (typeof console !== 'undefined') console.error('Reactive error:', err);
  throw err;
}
// Initialized lazily so it doesn't run before createSignal is defined.
let _transPending: (() => boolean) | null = null;
let _setTransPending: ((v: boolean) => void) | null = null;
function ensureTransPending() {
  if (!_transPending) {
    const [get, set] = createSignal(false);
    _transPending = get;
    _setTransPending = set;
  }
}
/**
 * Central computation scheduling that respects batch mode and active transitions.
 *
 *  - In batch -> always queue in Updates (flushed by flushUpdates).
 *  - In transition (non-pure) -> defer to Transition.effects (flush async).
 *  - Computed (pure=true, computed=true) -> run eagerly.
 *  - Effect (pure=false) -> run eagerly (unless deferred by transition).
 *  - Memo (pure=true, computed=false) -> skip here; lazy, runs on next read.
 */
function scheduleComputation(c: Computation): void {
  if (Updates) {
    if (Updates.indexOf(c) === -1) Updates.push(c);
  } else if (Transition && Transition.running && !c.pure) {
    if (Transition.effects.indexOf(c) === -1) Transition.effects.push(c);
  } else if (!c.pure || c.computed) {
    updateComputation(c);
  } else if (c.pure && !c.computed && c.accessor) {
    // Pure memo outside batch: evaluate now so its equality check gates whether
    // downstream effects are scheduled. If value unchanged, observers not notified.
    // Set Updates=[] so any signal writes during the memo's fn (e.g. setOutlet
    // inside routeStates.fn) are deferred instead of running effects immediately
    // before the DOM structure is ready. Process them via runCascadeAndEffects
    // afterwards, same cascade that batch uses.
    const prevListener = Listener;
    const prevUpdatesM = Updates;
    Listener = null;
    Updates = [];
    (c.accessor as () => unknown)();
    Listener = prevListener;
    const memoDeferred = Updates as Computation[];
    Updates = prevUpdatesM;
    if (memoDeferred.length > 0) {
      const savedU = Updates;
      runCascadeAndEffects(memoDeferred);
      Updates = savedU;
    }
  }
}
function propagate(observerList: Computation[], propagator: (arg: any) => any) {
  for (let i = 0; i < observerList.length; i++) propagator(observerList[i]);
}
export function createSignal<T>(
  _value: T,
  options?: SignalOptions<T>
): SignalTuple<T> {
  let value = _value;
  if (typeof value === 'object' && value && $PROXY in (value as any))
    delete (value as any)[$PROXY];
  const node = createReactiveNode('signal', value, {
    equals: options?.equals === false ? undefined : options?.equals,
    name: options?.name,
  });
  const s: SignalTuple<T> = [read, write];
  signalObservers.set(s, new Set());
  let lastObs;
  function read(): T {
    let observer = Listener;
    if (observer) {
      if (!observer.sources) observer.sources = [s];
      else if (observer.sources.indexOf(s) === -1) observer.sources.push(s);
      const observers = signalObservers.get(s);
      if (observers && !observers.has(observer)) observers.add(observer);
    }
    return value;
  }
  function write(nextValue: T | ((prev: T) => T)): void {
    const v =
      typeof nextValue === 'function'
        ? (nextValue as (prev: T) => T)(value)
        : nextValue;
    const equals = node.equals || defaultEquals;
    if (options?.equals === false || !equals(value, v)) {
      value = v;
      node.value = v;
      node.version++;
      node.updated = Date.now();
      const observers = signalObservers.get(s);
      if (observers && observers.size > 0) {
        const observerList = Array.from(observers);
        const toUpdate: Computation[] = [];
        const visited = new Set<Computation>();
        function propagateDirty(comp: Computation, viaPureMemo = false): void {
          const prevState = comp.state;
          if (prevState === RUNNING && comp === Listener) return;
          if (viaPureMemo && !comp.pure) {
            if (prevState === CLEAN) {
              comp.state = STALE;
              // Eagerly SCHEDULE the stale effect, but only when enabled (server SSR
              // drain). There is no scheduler/read loop on the server to re-run a
              // stranded STALE effect, so the <Suspense> output insert effect wouldn't
              // re-render on the inFallback flip and the resolved children never
              // replaced the fallback in the serialized tree. On the CLIENT this stays
              // OFF: eager scheduling here removes a loop-breaker and can spin a
              // memo and effect cycling off each other forever (froze the storefront after hydration). The
              // client keeps the lazy behavior, the effect re-runs when next read.
              if (_eagerStaleEffects) {
                if (Updates !== null && Updates.indexOf(comp) === -1)
                  Updates.push(comp);
                else toUpdate.push(comp);
              }
            }
            return;
          }
          if (visited.has(comp)) return;
          visited.add(comp);
          comp.state = DIRTY;
          if (prevState === CLEAN || prevState === STALE) toUpdate.push(comp);
          else if (
            !comp.pure &&
            Updates !== null &&
            Updates.indexOf(comp) === -1
          )
            Updates.push(comp);
          if (comp.pure && comp.accessor) {
            const memoObservers = signalObservers.get(comp.accessor as any);
            if (memoObservers)
              propagate(Array.from(memoObservers), (c) =>
                propagateDirty(c, true)
              );
          }
        }
        propagate(observerList, propagateDirty);
        for (const comp of toUpdate) scheduleComputation(comp);
      }
    }
  }
  read.toObservable = () =>
    new Observable<T>((observer) => {
      let first = true;
      const dispose = createEffect(() => {
        const val = read();
        if (first) first = false;
        else observer.next(val);
      });
      return dispose;
    });
  Object.defineProperty(read, $SIGNAL, { value: true, enumerable: true });
  Object.defineProperty(read, $NODE, { value: node, enumerable: false });
  return s;
}
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
    contexts: null,
    pure: false,
    updatedAt: null,
  };
  if (Owner) {
    if (!Owner.owned) Owner.owned = [c];
    else Owner.owned.push(c);
  }
  const SC = _SuspenseContext && useContext(_SuspenseContext);
  if (SC) c.suspense = SC;
  runComputation(c, value);
  return () => dispose(c);
}
function runComputation(c: Computation, value: any): void {
  if (c.sources) {
    for (const source of c.sources) {
      const observers = signalObservers.get(source);
      if (observers) observers.delete(c);
    }
    c.sources = null;
    c.sourceSlots = null;
  }
  if (c.owned) {
    for (let i = 0; i < c.owned.length; i++) dispose(c.owned[i]);
    c.owned = null;
  }
  const prevListener = Listener;
  const prevOwner = Owner;
  Listener = c as any;
  Owner = c as any;
  ExecCount++;
  if (ExecCount > MAX_ITERATIONS) {
    ExecCount = 0;
    Listener = prevListener;
    Owner = prevOwner;
    throw new Error(
      'Potential infinite loop detected. Exceeded maximum iterations.'
    );
  }
  try {
    c.state = RUNNING;
    const result = c.fn(value);
    if (typeof result === 'function') {
      if (!c.cleanups) c.cleanups = [result];
      else c.cleanups.push(result);
    }
    if (c.state === RUNNING) c.state = CLEAN;
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
    Listener = prevListener;
    Owner = prevOwner;
  }
}
function updateComputation(c: Computation): void {
  if (c.disposed || !c.fn || c.state === CLEAN) return;
  if (c.state === DIRTY || c.state === STALE || c.state === RUNNING) {
    if (c.cleanups) {
      for (let i = 0; i < c.cleanups.length; i++) c.cleanups[i]();
      c.cleanups = null;
    }
    if (c.owned) {
      for (let i = 0; i < c.owned.length; i++) dispose(c.owned[i]);
      c.owned = null;
    }
    if (c.renderEffect) runRenderComputation(c);
    else runComputation(c, c.value);
  }
}
function dispose(c: Computation): void {
  // Mark first so a resume triggered during teardown (e.g. a Suspense boundary
  // decrementing as a now-resolved promise settles) can't re-run this node.
  c.disposed = true;
  if (c.sources) {
    for (const source of c.sources) {
      const observers = signalObservers.get(source);
      if (observers) observers.delete(c);
    }
  }
  if (c.cleanups) for (let i = 0; i < c.cleanups.length; i++) c.cleanups[i]();
  if (c.owned) for (let i = 0; i < c.owned.length; i++) dispose(c.owned[i]);
  if (c.owner && c.owner.owned) {
    const index = c.owner.owned.indexOf(c);
    if (index !== -1) c.owner.owned.splice(index, 1);
  }
}
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
    contexts: null,
    pure: true,
    updatedAt: null,
    node,
    accessor: undefined,
  };
  if (Owner) {
    if (!Owner.owned) Owner.owned = [c];
    else Owner.owned.push(c);
  }
  const read: Accessor<T> = () => {
    if (Listener && Listener !== c) {
      if (!Listener.sources) Listener.sources = [read as any];
      else if (Listener.sources.indexOf(read as any) === -1)
        Listener.sources.push(read as any);
      const memoAsSignal = read as any;
      if (!signalObservers.has(memoAsSignal))
        signalObservers.set(memoAsSignal, new Set());
      const observers = signalObservers.get(memoAsSignal);
      if (observers) observers.add(Listener);
    }
    if (c.state !== CLEAN) {
      if (c.sources) {
        for (const source of c.sources) {
          const observers = signalObservers.get(source);
          if (observers) observers.delete(c);
        }
        c.sources = null;
        c.sourceSlots = null;
      }
      if (c.cleanups) {
        for (let i = 0; i < c.cleanups.length; i++) c.cleanups[i]();
        c.cleanups = null;
      }
      if (c.owned) {
        for (let i = 0; i < c.owned.length; i++) dispose(c.owned[i]);
        c.owned = null;
      }
      const prevListener = Listener;
      const prevOwner = Owner;
      Listener = c;
      Owner = c as any;
      c.state = RUNNING;
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
          const memoAsSignal = read as any;
          const observers = signalObservers.get(memoAsSignal);
          if (observers && observers.size > 0) {
            const observerList = Array.from(observers);
            const toUpdate: Computation[] = [];
            const visited = new Set<Computation>();
            // Mirror the signal-write propagateDirty (see createSignal.write), when an
            // observer is itself a pure memo, recurse through it to its observers so
            // they are marked stale too. Without this, a memo M observed by another
            // memo N (e.g. a child route content/outlet memo gating on a parent content
            // memo) updates M but never notifies N's downstream effects, so a deferred
            // <Outlet/> deep in a nested layout never re-renders after its parent
            // settles. viaPureMemo marks downstream non-pure (effects) STALE.
            function propagateDirty(comp: Computation, viaPureMemo = false): void {
              if (comp === c) return;
              const prevState = comp.state;
              if (prevState === RUNNING) return;
              if (viaPureMemo && !comp.pure) {
                if (prevState === CLEAN) {
                  comp.state = STALE;
                  if (Updates !== null && Updates.indexOf(comp) === -1)
                    Updates.push(comp);
                  else toUpdate.push(comp);
                }
                return;
              }
              if (visited.has(comp)) return;
              visited.add(comp);
              comp.state = DIRTY;
              if (prevState === CLEAN || prevState === STALE)
                toUpdate.push(comp);
              else if (
                !comp.pure &&
                Updates !== null &&
                Updates.indexOf(comp) === -1
              )
                Updates.push(comp);
              if (comp.pure && comp.accessor) {
                const memoObservers = signalObservers.get(comp.accessor as any);
                if (memoObservers && memoObservers.size > 0)
                  for (const o of Array.from(memoObservers))
                    propagateDirty(o, true);
              }
            }
            for (let i = 0; i < observerList.length; i++)
              propagateDirty(observerList[i]);
            for (const comp of toUpdate) scheduleComputation(comp);
          }
        }
        if (c.state === RUNNING) c.state = CLEAN;
      } catch (err) {
        if (isPromise(err)) {
          let ctx = _SuspenseContext && useContext(_SuspenseContext);
          if (!ctx && _SuspenseContext) {
            let owner: any = prevOwner;
            while (owner) {
              if (owner.contexts?.has(_SuspenseContext.id)) {
                ctx = owner.contexts.get(_SuspenseContext.id);
                break;
              }
              owner = owner.owner;
            }
          }
          if (ctx) {
            ctx.increment();
            (err as Promise<unknown>).finally(() => (ctx as any).decrement());
          }
          return c.value as T;
        }
        handleError(err as Error);
      } finally {
        Listener = prevListener;
        Owner = prevOwner;
      }
    }
    return c.value as T;
  };
  c.accessor = read;
  signalObservers.set(read as any, new Set());
  read.toObservable = () =>
    new Observable<T>((observer) => {
      let first = true;
      const dispose = createEffect(() => {
        const val = read();
        if (first) first = false;
        else observer.next(val);
      });
      return dispose;
    });
  Object.defineProperty(read, $SIGNAL, { value: true, enumerable: true });
  Object.defineProperty(read, $MEMO, { value: true, enumerable: true });
  Object.defineProperty(read, $NODE, { value: node, enumerable: false });
  return read;
}
/**
 * Cascade-evaluates pure memos from `initial`, transitively following any
 * newly-triggered pure memos, then runs all collected non-pure effects.
 *
 * Pure memos with no downstream observers are skipped (lazy, they'll
 * re-evaluate on next read without side effects).
 */
function runCascadeAndEffects(initial: Computation[]): void {
  const cascadeQueue: Computation[] = [];
  const effectsToRun: Computation[] = [];
  for (const comp of initial) {
    if (comp.pure && !comp.computed && comp.accessor) {
      if (cascadeQueue.indexOf(comp) === -1) cascadeQueue.push(comp);
    } else if (
      (comp.computed || !comp.pure) &&
      effectsToRun.indexOf(comp) === -1
    )
      effectsToRun.push(comp);
  }
  Updates = [];
  let ci = 0;
  while (ci < cascadeQueue.length) {
    const comp = cascadeQueue[ci++];
    const observers = signalObservers.get(comp.accessor as any);
    if (observers && observers.size > 0) {
      const prevListener = Listener;
      Listener = null;
      (comp.accessor as () => unknown)();
      Listener = prevListener;
    }
    const fresh = (Updates as Computation[]).splice(0);
    for (const c of fresh) {
      if (c.pure && !c.computed && c.accessor) {
        if (cascadeQueue.indexOf(c) === -1) cascadeQueue.push(c);
      } else if ((c.computed || !c.pure) && effectsToRun.indexOf(c) === -1)
        effectsToRun.push(c);
    }
  }
  Updates = null;
  for (const comp of effectsToRun)
    if (comp.computed || !comp.pure) updateComputation(comp);
}
export function batch<T>(fn: () => T): T {
  if (Updates && BatchDepth > 0) return fn();
  if (Updates && BatchDepth === 0) {
    const prev = Updates;
    const nested: Computation[] = [];
    Updates = nested;
    BatchDepth++;
    let result: T;
    try {
      result = fn();
    } finally {
      BatchDepth--;
      Updates = prev;
    }
    const savedUpdates = Updates;
    runCascadeAndEffects(nested);
    Updates = savedUpdates;
    return result!;
  }
  BatchDepth++;
  Updates = [];
  Effects = [];
  try {
    return fn();
  } finally {
    BatchDepth--;
    flushUpdates();
  }
}
function flushUpdates(): void {
  if (Pending) return;
  Pending = true;
  ExecCount = 0;
  try {
    while (Updates && Updates.length > 0) {
      const updates = Updates;
      Updates = null;
      runCascadeAndEffects(updates);
    }
    Updates = null;
    if (Effects) {
      const effects = Effects;
      Effects = null;
      for (let i = 0; i < effects.length; i++) updateComputation(effects[i]);
    }
  } finally {
    Pending = false;
  }
}
export function createRoot<T>(fn: (dispose: () => void) => T): T {
  const owner: RootOwner = {
    owned: null,
    cleanups: null,
    contexts: null,
    owner: Owner,
  };
  const prevListener = Listener;
  Listener = null;
  const prevOwner = Owner;
  Owner = owner;
  try {
    return fn(() => {
      if (owner.owned)
        for (let i = 0; i < owner.owned.length; i++) dispose(owner.owned[i]);
      if (owner.cleanups)
        for (let i = 0; i < owner.cleanups.length; i++) owner.cleanups[i]();
    });
  } finally {
    Owner = prevOwner;
    Listener = prevListener;
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
export type ResourceFetcher<T, S> = (
  source: S,
  info: { value: T | undefined; refetching: boolean }
) => T | Promise<T> | null | undefined;
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
interface ResourceStateManager<T> {
  value: T | undefined;
  error: Error | undefined;
  state: ResourceState;
  loading: boolean;
  latest: T | undefined;
}
export interface ResourceOptions<T, S = unknown> {
  initialValue?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  equals?: (prev: S, next: S) => boolean;
  name?: string;
  fetchOnMount?: boolean;
  deferStream?: boolean;
  storage?: string;
  cacheTime?: number;
  /**
   * Whether this resource's value is carried from server to client in
   * `__FX_DATA__`. `false` opts out and, importantly, does not consume an id:
   * ids are positions in a per-render sequence that both sides count
   * independently, so a resource present on one side only shifts every id after
   * it. See the note in graph/resource.ts.
   */
  transport?: boolean;
}
const cache = new Map();
function fetchCached(key: any) {
  if (!cache.has(key)) cache.set(key, fetch(key));
  return cache.get(key);
}
export function createResource<T>(
  fetcher: ResourceFetcher<T, true>,
  options?: ResourceOptions<T, true>
): ResourceReturn<T>;
export function createResource<T, S>(
  source: ResourceSource<S>,
  fetcher: ResourceFetcher<T, S>,
  options?: ResourceOptions<T, S>
): ResourceReturn<T>;
export function createResource<T, S = true>(
  source: ResourceSource<S> | ResourceFetcher<T, S>,
  fetcherFn?: ResourceFetcher<T, S> | ResourceOptions<T, S>,
  options: ResourceOptions<T, S> = {}
): ResourceReturn<T> {
  let s: Accessor<S> | undefined;
  let fetcher: ResourceFetcher<T, S>;
  if (typeof fetcherFn === 'function') {
    s = typeof source === 'function' ? (source as () => S) : () => source as S;
    fetcher = fetcherFn;
  } else {
    s = () => true as S;
    fetcher = source as ResourceFetcher<T, S>;
    if (fetcherFn && typeof fetcherFn === 'object') options = fetcherFn as any;
  }
  const { initialValue, name } = options;
  // SSR data transport: a stable per-render id; on the client, seed from the
  // server-serialized value so hydration doesn't refetch (and doesn't flash).
  const __ssrId = options.transport === false ? undefined : nextResourceId();
  const __seed = __ssrId !== undefined ? getServerData(__ssrId) : undefined;
  let skipFirstFetch = __seed !== undefined;
  const [value, setValue] = createSignal<T | undefined>(
    __seed !== undefined ? (__seed.value as T) : options.initialValue,
    { equals: false },
  );
  const [error, setError] = createSignal<any>(undefined, { equals: false });
  const [state, setState] = createSignal<ResourceState>(
    __seed !== undefined || options.initialValue !== undefined ? 'ready' : 'unresolved',
    { equals: false }
  );
  const [promise, setPromise] = createSignal<Promise<T> | undefined>(
    undefined,
    { equals: false }
  );
  const [track, trigger] = createSignal(undefined, { equals: false });
  const UNSET = Symbol();
  let prevKey: S | typeof UNSET = UNSET;
  let manualRefetch = false;
  const saveToCache = (data: T): void => {
    // No localStorage on the server (SSR): skip silently.
    if (typeof localStorage === 'undefined') return;
    try {
      if (data)
        localStorage.setItem(
          'storage',
          JSON.stringify({ data, timestamp: Date.now() })
        );
    } catch (error) {
      console.error(`Failed to save resource to cache (${name}):`, error);
    }
  };
  const dispose = createEffect(() => {
    const val = s ? s() : (source as S);
    track();
    if (val === false || val === null || val === undefined) {
      prevKey = UNSET;
      batch(() => {
        setState('unresolved');
        setPromise(undefined);
        setError(undefined);
      });
      return;
    }
    const isManual = manualRefetch;
    manualRefetch = false;
    if (prevKey !== UNSET && (val as any) === prevKey && !isManual) return;
    prevKey = val;
    // Seeded from server data during hydration: value is already set, skip the
    // first fetch (still tracked the source above, so later refetches work).
    if (skipFirstFetch) {
      skipFirstFetch = false;
      return;
    }
    let cancelled = false;
    onCleanup(() => (cancelled = true));
    const currentState = untrack(state);
    const currentValue = untrack(value);
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
        trackResourcePromise(res); // server async SSR: collect & await
        res
          .then(
            (v) => {
              if (cancelled) return;
              if (__ssrId !== undefined) reportResourceData(__ssrId, v); // server: collect for serialization
              batch(() => {
                setValue(() => v);
                saveToCache(v);
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
          )
          .catch((e) => {
            if (cancelled) return;
            batch(() => {
              setError(e);
              setState('errored');
              setPromise(undefined);
            });
          });
        const suspenseCtx = _SuspenseContext && useContext(_SuspenseContext);
        if (suspenseCtx) {
          suspenseCtx.increment();
          res.finally(() => suspenseCtx.decrement());
        }
      } else {
        if (cancelled) return;
        batch(() => {
          setValue(() => res as T);
          setState('ready');
          setPromise(undefined);
        });
      }
    } catch (e) {
      if (cancelled) return;
      batch(() => {
        setError(e);
        setState('errored');
        setPromise(undefined);
      });
    }
  });
  onCleanup(dispose);
  const loading = () => {
    const s = state();
    return s === 'pending' || s === 'refreshing';
  };
  const resource = (() => {
    const e = error();
    if (e) throw e;
    if (loading()) {
      const p = promise();
      if (p) throw p;
    }
    return value();
  }) as Resource<T>;
  Object.defineProperty(resource, $RESOURCE, { value: true, enumerable: true });
  Object.defineProperty(resource, $SIGNAL, { value: true, enumerable: true });
  Object.defineProperties(resource, {
    state: { get: state },
    loading: { get: () => loading() },
    error: { get: error },
    latest: { get: value },
  });
  return [
    resource,
    {
      mutate: setValue,
      refetch: () => {
        manualRefetch = true;
        trigger(undefined);
      },
    },
  ];
}
export function getOwner(): RootOwner | null {
  return Owner;
}
export function runWithOwner<T>(owner: RootOwner | null, fn: () => T): T {
  const prevOwner = Owner;
  const prevListener = Listener;
  Owner = owner;
  Listener = null;
  try {
    return fn();
  } finally {
    Owner = prevOwner;
    Listener = prevListener;
  }
}
export function createContext<T>(defaultValue?: T): {
  Provider: (props: { value: T; children: any; debug?: boolean }) => any;
  defaultValue: T | undefined;
  id: symbol;
} {
  const id = Symbol('context');
  const Provider = createProvider(id);
  return { id, Provider, defaultValue };
}
export function createProvider<T>(id: symbol) {
  return (props: { value: T; children: any; debug?: boolean }) => {
    let _node: any = Owner;
    while (_node) {
      if (!_node.contexts) _node.contexts = new Map();
      if (!_node.contexts.has(id)) _node.contexts.set(id, props.value);
      _node = _node.owner;
    }
    let provider: any;
    createRenderEffect(() => {
      provider = untrack(() => {
        const owner = Owner;
        if (owner) {
          if (!owner.contexts) owner.contexts = new Map();
          owner.contexts.set(id, props.value);
        }
        return readChildren(() => props.children);
      });
    });
    return provider;
  };
}
export function useContext<T>(context: {
  id: symbol;
  defaultValue?: T;
}): T | undefined {
  let owner = Owner;
  while (owner) {
    if (owner.contexts && owner.contexts.has(context.id))
      return owner.contexts.get(context.id) as T;
    owner = owner.owner;
  }
  if (!context) return;
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
/**
 * startTransition: defer non-critical effect updates.
 *
 * Runs `fn` synchronously, capturing all non-pure effects that would fire as
 * a result into a deferred queue. Pure computations (memos, createComputed)
 * update immediately so signal values are consistent. The deferred effects are
 * then flushed asynchronously (next microtask), keeping the current UI
 * responsive while the new state is prepared.
 */
export function startTransition(fn: () => void): Promise<void> {
  if (Transition && Transition.running) {
    fn();
    return Transition.done!;
  }
  ensureTransPending();
  let resolve!: () => void;
  const done = new Promise<void>((res) => (resolve = res));
  const t: TransitionState = { running: true, effects: [], resolve, done };
  Transition = t;
  try {
    fn();
  } finally {
    t.running = false;
  }
  if (!t.effects.length) {
    Transition = null;
    resolve();
    return done;
  }
  _setTransPending!(true);
  Promise.resolve().then(() => {
    const effects = t.effects.splice(0);
    Transition = null;
    _setTransPending!(false);
    if (effects.length)
      batch(() => {
        for (const e of effects) {
          e.state = DIRTY;
          updateComputation(e);
        }
      });
    resolve();
  });
  return done;
}
/**
 * useTransition: reactive hook version of startTransition.
 * Returns `[isPending, start]`
 */
export function useTransition(): [
  () => boolean,
  (fn: () => void) => Promise<void>
] {
  ensureTransPending();
  return [_transPending!, startTransition];
}
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
/**
 * createRenderEffect - runs synchronously during rendering.
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
    contexts: null,
    pure: false,
    updatedAt: null,
    renderEffect: true,
  };
  if (Owner) {
    if (!Owner.owned) Owner.owned = [c];
    else Owner.owned.push(c);
  }
  const SC = _SuspenseContext && useContext(_SuspenseContext);
  if (SC) c.suspense = SC;
  runRenderComputation(c);
  return () => dispose(c);
}
function runRenderComputation(c: Computation): void {
  if (c.sources) {
    for (const source of c.sources) {
      const observers = signalObservers.get(source);
      if (observers) observers.delete(c);
    }
    c.sources = null;
    c.sourceSlots = null;
  }
  if (c.cleanups) {
    for (let i = 0; i < c.cleanups.length; i++) c.cleanups[i]();
    c.cleanups = null;
  }
  if (c.owned) {
    for (let i = 0; i < c.owned.length; i++) dispose(c.owned[i]);
    c.owned = null;
  }
  const prevListener = Listener;
  const prevOwner = Owner;
  const prevUpdates = Updates;
  Listener = c;
  Owner = c as any;
  if (Updates === null) Updates = [];
  c.state = RUNNING;
  try {
    const result = (c.fn as (prev: any) => any)(c.value);
    if (typeof result === 'function') {
      if (!c.cleanups) c.cleanups = [];
      c.cleanups.push(result);
    }
    c.value = result;
    if (c.state === RUNNING) c.state = CLEAN;
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
    Listener = prevListener;
    Owner = prevOwner;
    const deferred = Updates;
    Updates = prevUpdates;
    // Flush computations scheduled during this render effect via the full cascade,
    // which re-evaluates PURE MEMOS (and propagates to their observers) as well as
    // running effects. The old loop processed only effects, so a pure memo scheduled
    // here was left dirty and never notified its own downstream effects: e.g. a
    // child route content/outlet memo that settled while a parent layout rendered
    // would never re-render the child (deeply nested <Outlet/> stayed empty).
    if (deferred !== prevUpdates && deferred && deferred.length > 0) {
      const saved = Updates;
      runCascadeAndEffects(deferred);
      Updates = saved;
    }
  }
}
/**
 * createComputed: synchronous pre-render computation.
 */
export function createComputed<T>(
  fn: ComputationFn<T>,
  value?: T,
  options?: EffectOptions
): void {
  const c: Computation = {
    fn,
    state: DIRTY,
    sources: null,
    sourceSlots: null,
    value,
    owned: null,
    cleanups: null,
    owner: Owner,
    contexts: null,
    pure: true,
    computed: true,
    updatedAt: null,
  };
  if (Owner) {
    if (!Owner.owned) Owner.owned = [c];
    else Owner.owned.push(c);
  }
  if (Transition && Transition.running) {
    if (!Updates) Updates = [];
    if (Updates.indexOf(c) === -1) Updates.push(c);
  } else if (Updates) {
    if (Updates.indexOf(c) === -1) Updates.push(c);
  } else runComputation(c, value);
}
let _SuspenseContext: Context<SuspenseContextType | undefined>;
export function getSuspenseContext(): Context<SuspenseContextType | undefined> {
  return (
    _SuspenseContext ||
    (_SuspenseContext = createContext<SuspenseContextType | undefined>())
  );
}
let _SuspenseListContext: Context<SuspenseListContextType | undefined>;
export function getSuspenseListContext(): Context<
  SuspenseListContextType | undefined
> {
  return (
    _SuspenseListContext ||
    (_SuspenseListContext = createContext<
      SuspenseListContextType | undefined
    >())
  );
}
export function resumeEffects(effects: Computation[]): void {
  if (!effects.length) return;
  const queued = effects.slice();
  effects.length = 0;
  for (const c of queued) {
    c.state = DIRTY;
    updateComputation(c);
  }
}
export function onResolve(fn: () => void): void {
  const ctx = _SuspenseContext && useContext(_SuspenseContext);
  if (ctx && ctx.inFallback())
    createEffect(() => {
      if (!ctx.inFallback()) fn();
    });
  else fn();
}
export function setScheduler(scheduler: (fn: () => void) => void): void {
  Scheduler = scheduler;
}
export function trackPromise<T>(promise: Promise<T>): Promise<T> {
  const ctx = _SuspenseContext && useContext(_SuspenseContext);
  if (!ctx) return promise;
  ctx.increment();
  promise.finally(() => ctx.decrement());
  return promise;
}
export type Context<T> = {
  Provider: (props: { value: T; children: any; debug?: boolean }) => any;
  defaultValue: T | undefined;
  id: symbol;
};
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
  startTransition,
  useTransition,
  isSignal,
  on,
  createRenderEffect,
  getSuspenseContext,
  getSuspenseListContext,
  resumeEffects,
  onResolve,
  setScheduler,
  trackPromise,
};
