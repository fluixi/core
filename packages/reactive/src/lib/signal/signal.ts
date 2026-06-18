/**
 * @fileoverview Fine-grained reactive signal system
 * @description Reactive primitives for signals, effects, memos, resources,
 * scheduling, ownership, and dependency tracking.
 *
 * Inspired by:
 * - S.js by Adam Haile (https://github.com/adamhaile/S)
 * - SolidJS by Ryan Carniato (https://github.com/solidjs/solid)
 *
 * This implementation was independently designed and written by
 * Ibrahima Touré.
 *
 * Copyright (c) 2026 Ibrahima Touré
 * Licensed under MIT.
 */
import { isFunction } from '@fluixi/utils/functions';
import { Observable } from '@fluixi/reactive/observable';
import { deepClone } from '@fluixi/utils/object';
import { isPromise } from '@fluixi/utils';
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
export interface Computation {
  fn: ComputationFn<any> | EffectFn;
  state: number;
  sources: Signal<any>[] | null;
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
  /** set once dispose() has run — a disposed computation must never re-run. */
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
export const $PROXY = Symbol('kettle-proxy');
const $NODE = Symbol.for('signal-node');
const $COMP = Symbol.for('component-node');
export const __DEV__ = process.env.NODE_ENV !== 'production';
const CLEAN = 0;
const STALE = 1;
const DIRTY = 2;
// RUNNING is a sentinel state set on a computation just before its fn executes.
// Any propagateDirty() call that fires DURING the fn (e.g. a signal write inside
// a route component's setup code) will override it with DIRTY.  After the fn,
// RUNNING → CLEAN (nothing re-dirtied it) or DIRTY → stay DIRTY (needs re-run).
// This correctly distinguishes "was dirty going in" from "re-dirtied during fn."
const RUNNING = 3;
let Owner: RootOwner | null = null;
let Listener: Computation | null = null;
let Updates: Computation[] | null = null;
let Effects: Computation[] | null = null;
let ExecCount = 0;
let Pending = false;
/** Depth of user-initiated batch() calls. Incremented on batch entry, decremented on exit. */
let BatchDepth = 0;
const MAX_ITERATIONS = 1000000;
const signalObservers = new WeakMap<Signal<any>, Set<Computation>>();
/** Active transition — non-null while startTransition's fn is running or effects are deferred. */
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

// ── SSR injectables ─────────────────────────────────────────────────────────
// The server (@fluixi/server via @fluixi/dom) injects these so async SSR can
// await in-flight resource fetches and seed resources from server-serialized
// data on the client. Both are no-ops when unset → zero client/runtime impact.
let _resourceTracker: ((p: Promise<any>) => void) | null = null;
/** Register a sink that receives every resource fetch promise (server: collect & await). */
export function setResourceTracker(fn: ((p: Promise<any>) => void) | null): void {
  _resourceTracker = fn;
}
/** @internal — resources report their fetch promise here. */
export function trackResourcePromise(p: Promise<any>): void {
  if (_resourceTracker) _resourceTracker(p);
}

let _serverDataGetter: ((id: string) => { value: any } | undefined) | null = null;
/** Inject server-serialized resource data (client hydration: seed without refetch). */
export function setServerDataGetter(fn: ((id: string) => { value: any } | undefined) | null): void {
  _serverDataGetter = fn;
}
/** @internal — resources look up seeded data by their SSR id. */
export function getServerData(id: string): { value: any } | undefined {
  return _serverDataGetter ? _serverDataGetter(id) : undefined;
}

let _resourceIdSource: (() => string) | null = null;
/** Inject a stable per-resource id source (server render order / hydration order). */
export function setResourceIdSource(fn: (() => string) | null): void {
  _resourceIdSource = fn;
}
/** @internal — a resource asks for its SSR id at creation; undefined on a plain client. */
export function nextResourceId(): string | undefined {
  return _resourceIdSource ? _resourceIdSource() : undefined;
}

let _resourceDataSink: ((id: string, value: any) => void) | null = null;
/** Inject a sink for resolved resource values (server: collect for serialization). */
export function setResourceDataSink(fn: ((id: string, value: any) => void) | null): void {
  _resourceDataSink = fn;
}
/** @internal — a resource reports its resolved value here. */
export function reportResourceData(id: string, value: any): void {
  if (_resourceDataSink) _resourceDataSink(id, value);
}

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
 *  - In batch    → always queue in Updates (flushed by flushUpdates).
 *  - In transition (non-pure) → defer to Transition.effects (flush async).
 *  - Computed (pure=true, computed=true) → run eagerly.
 *  - Effect (pure=false) → run eagerly (unless deferred by transition).
 *  - Memo (pure=true, computed=false) → skip here; lazy, runs on next read.
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
    //
    // Set Updates=[] so any signal writes during the memo's fn (e.g. setOutlet
    // inside routeStates.fn) are deferred instead of running effects immediately
    // before the DOM structure is ready. Process them via runCascadeAndEffects
    // afterwards — same cascade that batch uses.
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
): Signal<T> {
  let value = _value;
  if (typeof value === 'object' && value && $PROXY in (value as any))
    delete (value as any)[$PROXY];
  const node = createReactiveNode('signal', value, {
    equals: options?.equals === false ? undefined : options?.equals,
    name: options?.name,
  });
  const s: Signal<T> = [read, write];
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
            // Mark the downstream effect STALE *and schedule it* — mirroring the
            // memo-recompute propagateDirty below. Marking STALE without scheduling
            // left the effect stranded: a later memo recompute would skip it (only
            // schedules when prevState === CLEAN, but it's now STALE), so it never
            // re-ran. Surfaced as a <Suspense> output insert effect (downstream of
            // inFallback via the pure output memo) not re-rendering when inFallback
            // flips false during async SSR — the resolved children never replaced the
            // fallback in the serialized tree.
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
            // Mirror the signal-write propagateDirty (see createSignal.write): when an
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
 * Pure memos with no downstream observers are skipped (lazy — they'll
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
  const __ssrId = nextResourceId();
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
    // No localStorage on the server (SSR) — skip silently.
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
    // Seeded from server data during hydration — value is already set, skip the
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
            console.log('resource failed', e);
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
      console.log('resource exception', e);
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
export function createDeferred<T>(
  source: Accessor<T>,
  options?: { timeoutMs?: number; equals?: false | EqualityFn<T> }
): Accessor<T> {
  const [delayed, setDelayed] = createSignal(source(), options);
  createEffect(() => {
    const v = source();
    if (options?.timeoutMs)
      setTimeout(() => setDelayed(() => v), options.timeoutMs);
    else if (typeof requestIdleCallback === 'function')
      requestIdleCallback(() => setDelayed(() => v));
    else Promise.resolve().then(() => setDelayed(() => v));
  });
  return delayed;
}
/**
 * createDebounce — wraps any function with debounce behaviour, RxJS-style.
 *
 * The returned function delays invoking `fn` until `delay` ms have elapsed
 * since the last call. Pending timers are automatically cancelled when the
 * owning component is disposed (via `onCleanup`).
 */
export function createDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: Parameters<T>): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      if (args.length > 0) {
        let element = args[args.length - 1];
        if (typeof element === 'object' && element && !element.tagName && element.target && element.target.tagName) {
          element = element.target;
        }
          if (
            element &&
            typeof element === 'object' &&
            element.tagName &&
            (element.tagName.toLowerCase() === 'input' ||
              element.tagName.toLowerCase() === 'textarea')
          )
            element.focus();
      }
      fn(...args);
    }, delay);
  };
  onCleanup(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
  return debounced as unknown as T;
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
export function childrens(fn: any) {
  const children = createMemo(fn);
  const memo = __DEV__
    ? createMemo(() => resolveProviderChildren(children()), undefined, {
        name: 'children',
      })
    : createMemo(() => resolveProviderChildren(children()));
  return memo;
}
export function makeArrayFlat(values: any[]) {
  if (!Array.isArray(values)) return values;
  if (values.length === 2 && values[1] === ' ') {
    if (Array.isArray(values[0])) return makeArrayFlat(values[0]);
    if (typeof values[0] === 'function') return values[0];
    return values[0];
  }
  if (values.length === 1 && typeof values[0] === 'function') return values[0];
  return values;
}
/**
 * Resolve children values for Provider — flatten arrays, call thunks,
 * but preserve signals/memos for reactive tracking.
 */
export function isChildren(value: any) {
  if (typeof value === 'function' && value[$NODE]?.name !== 'children')
    return value[$NODE];
  return undefined;
}
export function getSignalNode(value: any) {
  if (isSignal(value) && value[$NODE]) return value[$NODE];
  return undefined;
}
export function isComponent(value: any) {
  return (
    typeof value === 'function' &&
    value[Symbol.for('kettle-component')] === true
  );
}
export function isSuspense(value: any) {
  return (
    typeof value === 'function' && value[Symbol.for('kettle-suspense')] === true
  );
}
export function isProvider(value: any) {
  return (
    typeof value === 'function' && value[Symbol.for('kettle-provider')] === true
  );
}
const _KETTLE_COMPONENT_SYM = Symbol.for('kettle-component');
function resolveProviderChildren(children: any): any {
  if (typeof children === 'function' && !children.length) {
    const result = children();
    if (isSignal(result)) return result;
    return resolveProviderChildren(result);
  }
  if (Array.isArray(children)) {
    const results: any[] = [];
    for (let i = 0; i < children.length; i++) {
      const result = resolveProviderChildren(children[i]);
      Array.isArray(result)
        ? results.push.apply(results, result)
        : results.push(result);
    }
    return results;
  }
  return children as any;
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
        return childrens(() => props.children);
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
export function createEnhancedSignal<T>(
  initialValue: T,
  options: SignalOptions<T> = {}
): EnhancedSignal<T> {
  const [get, set] = createSignal(initialValue, options);
  const node = get[$NODE]!;
  const subscriptions = new Set<(value: T) => void>();
  const subscribe = (listener: (value: T) => void): (() => void) => {
    subscriptions.add(listener);
    return () => subscriptions.delete(listener);
  };
  const dispose = (): void => {
    subscriptions.clear();
    unregisterNode(node);
  };
  const toObservable = (): Observable<T> =>
    new Observable<T>((observer) => {
      const unsubscribe = subscribe((value) => observer.next(value));
      return () => unsubscribe();
    });
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
  return { get, set: enhancedSet, subscribe, dispose, toObservable, node };
}
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
  return { get, set, loading, error, execute, reload: execute, node };
}
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
    if (currentIndex < history.length - 1) history.splice(currentIndex + 1);
    history.push(finalValue);
    if (history.length > maxHistory) history.shift();
    else currentIndex++;
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
  const enhancedTrigger = ((): T => trigger()) as EnhancedTrigger<T>;
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
export function createThrottledSignal<T>(
  signal: EnhancedSignal<T>,
  delay: number
): EnhancedSignal<T> {
  const throttled = createEnhancedSignal(signal.get());
  let timeout: any;
  let lastValue: T;
  signal.subscribe((value) => {
    lastValue = value;
    if (!timeout)
      timeout = setTimeout(() => {
        throttled.set(lastValue);
        timeout = null;
      }, delay);
  });
  return {
    node: throttled.node,
    get: throttled.get,
    set: signal.set,
    subscribe: throttled.subscribe,
    dispose: () => {
      clearTimeout(timeout);
      throttled.dispose();
    },
    toObservable: throttled.toObservable,
  };
}
export function createDebouncedSignal<T>(
  signal: EnhancedSignal<T>,
  delay: number
): EnhancedSignal<T> {
  const debounced = createEnhancedSignal(signal.get());
  let timeout: any;
  signal.subscribe((value) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => debounced.set(value), delay);
  });
  return {
    node: debounced.node,
    get: debounced.get,
    set: signal.set,
    subscribe: debounced.subscribe,
    dispose: () => {
      clearTimeout(timeout);
      debounced.dispose();
    },
    toObservable: debounced.toObservable,
  };
}
export function signalToObservable<T>(
  signal: Accessor<T> | EnhancedSignal<T>
): Observable<T> {
  const getter = typeof signal === 'function' ? signal : signal.get;
  if (!isFunction(signal) && (signal as any).toObservable)
    return (signal as any).toObservable();
  return new Observable<T>((observer) => {
    let first = true;
    const dispose = createEffect(() => {
      const value = getter();
      if (!first) observer.next(value);
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
    next: (value) => signal.set(value),
    error: (error) => console.error('Observable error:', error),
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
/**
 * startTransition — defer non-critical effect updates.
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
 * useTransition — reactive hook version of startTransition.
 * Returns `[isPending, start]`
 */
export function useTransition(): [
  () => boolean,
  (fn: () => void) => Promise<void>
] {
  ensureTransPending();
  return [_transPending!, startTransition];
}
export function enableDevMode(): void {}
export function getRegisteredNodes(): ReactiveNode[] {
  if (!__DEV__) return [];
  const nodes: ReactiveNode[] = [];
  for (const ref of nodeRegistry.values()) {
    const node = ref.deref();
    if (node) nodes.push(node);
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
  return { total: nodes.length, byType };
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
        if (comp.owned) collectOwner(comp as any, level + 1);
      }
    }
  }
  if (Owner) collectOwner(Owner);
  return graph;
}
export function isSignal<T extends any>(value: any): value is Accessor<T> {
  return (
    typeof value === 'function' && (value as Accessor<any>)[$SIGNAL] === true
  );
}
export function isMemo<T>(value: any): value is Accessor<T> {
  return typeof value === 'function' && value[$MEMO] === true;
}
export function isResource<T>(value: any): value is Resource<T> {
  return typeof value === 'function' && value[$RESOURCE] === true;
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
export function createReaction(
  onInvalidate: () => void
): (fn: () => void) => void {
  let trackingComp: Computation | null = null;
  return (fn: () => void) => {
    if (trackingComp) dispose(trackingComp);
    trackingComp = {
      fn: onInvalidate,
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
      if (!Owner.owned) Owner.owned = [trackingComp];
      else Owner.owned.push(trackingComp);
    }
    const prevListener = Listener;
    Listener = trackingComp;
    try {
      fn();
      trackingComp.state = CLEAN;
    } finally {
      Listener = prevListener;
    }
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
    // here was left dirty and never notified its own downstream effects — e.g. a
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
 * createComputed — synchronous pre-render computation.
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
export function isSuspended(): boolean {
  const ctx = _SuspenseContext && useContext(_SuspenseContext);
  return ctx ? ctx.inFallback() : false;
}
export function setScheduler(scheduler: (fn: () => void) => void): void {
  Scheduler = scheduler;
}
export function scheduleMicrotask(fn: () => void): void {
  if (Scheduler) Scheduler(fn);
  else if (typeof queueMicrotask === 'function') queueMicrotask(fn);
  else Promise.resolve().then(fn);
}
export function trackPromise<T>(promise: Promise<T>): Promise<T> {
  const ctx = _SuspenseContext && useContext(_SuspenseContext);
  if (!ctx) return promise;
  ctx.increment();
  promise.finally(() => ctx.decrement());
  return promise;
}
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
    Owner = prevOwner;
  }
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
