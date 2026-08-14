import type { Observable } from '../observable/observable.js';
import {
  $PROXY,
  type Accessor,
  type MemoOptions,
  batch,
  createEffect,
  createMemo,
  createSignal,
  untrack,
} from '@fluixi/reactive/signal';
import type { SetStoreFunction as StoreSetter, DeepReadonly } from './setter.types.js';
import type { ReconcileOptions } from './types.js';

/**
 * Fine-grained reactive store.
 *
 * State stays a plain object/array tree. Every object gets a lazily-grown map of
 * per-key signals (a NodeStore, kept in a WeakMap off the raw target) plus one
 * structural signal for key iteration. Reading a key through the proxy subscribes
 * to that key's signal; the setter writes straight to the raw target and pokes
 * only the keys that actually changed. No snapshots, no diffing. Child objects are
 * proxied on first read and cached, so a given object always yields the same proxy.
 */

type Primitive = string | number | boolean | bigint | symbol | undefined | null;
// The readonly view and what the setter accepts are the same shape by construction —
// two copies of this would drift, and the drift shows up as a snapshot the setter
// refuses for no reason a caller can act on.
type Immutable<T> = DeepReadonly<T> & { __track: T; [key: symbol]: any };

interface StoreOptions<T> {
  name?: string;
  immutable?: boolean;
  equals?: (a: T, b: T) => boolean;
}

interface StoreAccessor<T> extends Accessor<T> {}

export const $RAW = Symbol('store-raw'),
  $NODE = Symbol('store-node'),
  $HAS = Symbol('store-has'),
  $SELF = Symbol('store-self'),
  $TRACK = Symbol('store-track'),
  $NAME = Symbol('store-name'),
  $STORE = Symbol('store-store');

// nodes

type DataNode = { (): any; $(value?: any): void };
type NodeStore = { keys: Map<PropertyKey, DataNode>; all?: DataNode };

const NODES = new WeakMap<object, NodeStore>();
const PROXIES = new WeakMap<object, any>();

function createDataNode(initial?: any): DataNode {
  const [get, set] = createSignal(initial);
  const node = get as any as DataNode;
  node.$ = set as any;
  return node;
}

function nodesOf(target: object): NodeStore {
  let ns = NODES.get(target);
  if (!ns) NODES.set(target, (ns = { keys: new Map() }));
  return ns;
}

function keyNode(ns: NodeStore, key: PropertyKey, seed?: any): DataNode {
  let node = ns.keys.get(key);
  if (!node) ns.keys.set(key, (node = createDataNode(seed)));
  return node;
}

function trackKeys(target: object): void {
  const ns = nodesOf(target);
  (ns.all || (ns.all = createDataNode()))();
}

// The signal setter reads a function argument as an updater, so a function value
// has to be handed over wrapped.
function pokeNode(node: DataNode, value: any): void {
  node.$(typeof value === 'function' ? () => value : value);
}

function isTrackable(value: any): boolean {
  if (value == null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return true;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function box<T>(value: T): T {
  if (!isTrackable(value)) return value;
  const existing = PROXIES.get(value as any);
  if (existing) return existing;
  const proxy = new Proxy(value as any, handler);
  PROXIES.set(value as any, proxy);
  return proxy;
}

const handler: ProxyHandler<any> = {
  get(target, key, receiver) {
    if (key === $RAW) return target;
    if (key === $NODE) return target;
    if (key === $PROXY) return receiver;
    if (key === $HAS) return (k: PropertyKey) => k in target;
    if (key === '__proxy') return true;
    if (key === $TRACK || key === $SELF) {
      trackKeys(target);
      return receiver;
    }

    const value = target[key];

    // Prototype methods (array iterators/mutators and the like) go back untouched
    // so they run with the proxy as `this` and their element reads track per key.
    if (
      typeof value === 'function' &&
      !Object.prototype.hasOwnProperty.call(target, key)
    ) {
      return value;
    }

    const desc = Object.getOwnPropertyDescriptor(target, key);
    if (desc && desc.get) return desc.get.call(receiver);

    const current = keyNode(nodesOf(target), key, value)();
    return isTrackable(current) ? box(current) : current;
  },

  set() {
    // The proxy is read-only; writes come in through the setter.
    return true;
  },

  deleteProperty(target, key) {
    if (key in target) writeKey(target, key, undefined);
    return true;
  },

  has(target, key) {
    if (
      key === $RAW ||
      key === $PROXY ||
      key === $NODE ||
      key === $HAS ||
      key === $SELF ||
      key === $TRACK
    )
      return true;
    keyNode(nodesOf(target), key, target[key])();
    return key in target;
  },

  ownKeys(target) {
    trackKeys(target);
    return Reflect.ownKeys(target);
  },

  getOwnPropertyDescriptor(target, key) {
    return Reflect.getOwnPropertyDescriptor(target, key);
  },
};

// writes

// Writes one key on a raw node and pokes what changed: the key's own signal, the
// array length signal when the length moved, and the iteration signal.
function writeKey(state: any, key: PropertyKey, value: any): void {
  const prev = state[key];
  if (prev === value && (value !== undefined || key in state)) return;

  const isArray = Array.isArray(state);
  const len = isArray ? state.length : 0;

  if (value === undefined) delete state[key];
  else state[key] = value;

  const ns = nodesOf(state);
  const node = ns.keys.get(key);
  if (node) pokeNode(node, value);

  if (isArray && state.length !== len) {
    const lengthNode = ns.keys.get('length');
    if (lengthNode) pokeNode(lengthNode, state.length);
  }
  if (ns.all) ns.all.$(undefined);
}

function nextValue(value: any, prev: any): any {
  return typeof value === 'function' ? value(prev) : value;
}

// Per-key merge of a partial object; recurses into plain objects, replaces the rest.
function mergeInto(state: any, value: any): void {
  for (const key of Object.keys(value)) {
    const next = value[key];
    const prev = state[key];
    if (
      next &&
      typeof next === 'object' &&
      !Array.isArray(next) &&
      prev &&
      typeof prev === 'object' &&
      !Array.isArray(prev)
    ) {
      mergeInto(prev, next);
    } else {
      writeKey(state, key, next);
    }
  }
}

// "a.b[0].c" -> ["a","b","0","c"], "[*].done" -> ["*","done"], "[0][1]" -> ["0","1"].
function parsePath(path: string): string[] {
  const out: string[] = [];
  const normalized = path.replace(/\[([^\]]*)\]/g, '.$1');
  for (const part of normalized.split('.')) if (part.length) out.push(part);
  return out;
}

function applyAt(current: any, segs: string[], value: any): void {
  const last = segs.length - 1;

  for (let i = 0; i < last; i++) {
    const seg = segs[i];
    if (seg === '*') {
      const rest = segs.slice(i + 1);
      if (Array.isArray(current))
        for (let idx = 0; idx < current.length; idx++)
          applyAt(current[idx], rest, value);
      return;
    }
    let next = current[seg];
    if (next == null || typeof next !== 'object') {
      next = /^\d+$/.test(segs[i + 1]) ? [] : {};
      writeKey(current, seg, next);
    }
    current = next;
  }

  const term = segs[last];
  if (term === '*') {
    if (Array.isArray(current))
      for (let idx = 0; idx < current.length; idx++)
        writeKey(current, idx, nextValue(value, current[idx]));
    return;
  }
  writeKey(current, term, nextValue(value, current[term]));
}

function applyPath(root: any, path: string, value: any): void {
  applyAt(root, parsePath(path), value);
}

/**
 * Runs the setter overloads against the raw root:
 *   set(state => newState)        whole-state updater, merged back
 *   set(partialObject)            per-key merge
 *   set([[path, valOrFn], ...])   batch of path updates
 *   set(path, ['seg', ...], val)  path plus extra segments
 *   set(path, val | updater)      the common form (dotted, [n], [*])
 */
function applySet(root: any, args: any[]): void {
  const first = args[0];

  if (typeof first === 'function' && args.length === 1) {
    const next = first(root);
    if (next && next !== root) mergeInto(root, next);
    return;
  }
  if (Array.isArray(first) && args.length === 1) {
    for (const entry of first)
      if (Array.isArray(entry)) applyPath(root, entry[0], entry[1]);
    return;
  }
  if (
    first &&
    typeof first === 'object' &&
    !Array.isArray(first) &&
    args.length === 1
  ) {
    mergeInto(root, first);
    return;
  }
  if (Array.isArray(args[1]) && args.length >= 3) {
    applyPath(root, `${first}.${args[1].join('.')}`, args[2]);
    return;
  }
  applyPath(root, String(first), args[1]);
}

function clone<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone) as any;
  const out: any = {};
  for (const key of Object.keys(value as any)) out[key] = clone((value as any)[key]);
  return out;
}

// Walks the raw tree along a path without tracking.
function rawAt(root: any, path: string): any {
  let cur = root;
  for (const seg of parsePath(path)) {
    if (cur == null) return undefined;
    cur = cur[seg];
  }
  return cur;
}

// store

// Thin holder around the raw root and its proxy.
class Store<T> {
  private root: T;
  set!: StoreSetter<T>;

  constructor(
    initialState: T,
    private options: StoreOptions<T> = { immutable: true }
  ) {
    this.root = initialState;
    this.set = ((...args: any[]) =>
      batch(() => applySet(this.root as any, args))) as StoreSetter<T>;
  }

  get state(): Immutable<T> {
    return box(this.root) as Immutable<T>;
  }

  get proxy(): Immutable<T> {
    return box(this.root) as Immutable<T>;
  }

  get accessor(): Accessor<T> {
    return (() => box(this.root)) as Accessor<T>;
  }

  unwrap(): T {
    return this.root;
  }

  getNode(key: PropertyKey): any {
    return this.root && (this.root as any)[key];
  }

  // Tracked read at a path. Empty path returns the whole (unwrapped) state.
  get(path?: string): any {
    if (path == null || path === '') return unwrap(this.state);
    let cur: any = this.state;
    for (const seg of parsePath(path)) {
      if (cur == null) return undefined;
      cur = cur[seg];
    }
    return unwrap(cur);
  }

  select<U>(selector: (state: Immutable<T>) => U): () => U {
    return createMemo(() => selector(this.state));
  }

  subscribe(listener: (state: Immutable<T>) => void): () => void {
    return createEffect(() => listener(this.state));
  }

  watch<U>(
    selector: (state: Immutable<T>) => U,
    effect: (value: U, prev: U | undefined) => void
  ): () => void {
    let prev: U | undefined;
    return createEffect(() => {
      const cur = selector(this.state);
      if (!Object.is(cur, prev)) {
        effect(cur, prev);
        prev = cur;
      }
    });
  }

  // Reactive accessor for a top-level key.
  reactive(key: string): Accessor<any> {
    return createMemo(() => (this.state as any)[key]);
  }

  produce(producer: (draft: T) => void): void {
    this.set(((prev: T) => {
      const draft = clone(prev);
      producer(draft);
      return draft;
    }) as any);
  }

  reconcile(value: T | Partial<T>, _options: ReconcileOptions = {}): void {
    this.set(value as any);
  }

  push(path: string, ...items: any[]): void {
    const arr = rawAt(this.root, path) as any[];
    this.set(path as any, arr.concat(items) as any);
  }

  pop(path: string): any {
    const arr = (rawAt(this.root, path) as any[]).slice();
    const item = arr.pop();
    this.set(path as any, arr as any);
    return item;
  }

  shift(path: string): any {
    const arr = (rawAt(this.root, path) as any[]).slice();
    const item = arr.shift();
    this.set(path as any, arr as any);
    return item;
  }

  splice(path: string, start: number, deleteCount: number, ...items: any[]): any[] {
    const arr = (rawAt(this.root, path) as any[]).slice();
    const removed = arr.splice(start, deleteCount, ...items);
    this.set(path as any, arr as any);
    return removed;
  }

  insert(path: string, index: number, value: any): void {
    const arr = (rawAt(this.root, path) as any[]).slice();
    arr.splice(index, 0, value);
    this.set(path as any, arr as any);
  }

  removeAt(path: string, index: number): any[] {
    const arr = (rawAt(this.root, path) as any[]).slice();
    const removed = arr.splice(index, 1);
    this.set(path as any, arr as any);
    return removed;
  }

  toObservable(): Observable<T> {
    const [get] = createSignal(this.state);
    return (get as any).toObservable();
  }

  dispose(): void {}
}

// The path/array/derivation helpers, attached to the returned setter (as the old
// API exposed them). Kept off the proxy since the proxy is read-only.
const SETTER_METHODS = [
  'get',
  'select',
  'watch',
  'subscribe',
  'produce',
  'reconcile',
  'push',
  'pop',
  'shift',
  'splice',
  'insert',
  'removeAt',
  'unwrap',
  'toObservable',
] as const;

function attachStoreMethods(target: any, store: Store<any>): void {
  for (const name of SETTER_METHODS) target[name] = (store as any)[name].bind(store);
  target.$ = store.reactive.bind(store);
}

// public api

function createStore<T>(
  initialState: T,
  options: StoreOptions<T> = { immutable: true }
): [Immutable<T>, Store<T>['set']] {
  const store = new Store(initialState, options);
  attachStoreMethods(store.set, store);
  return [store.proxy as Immutable<T>, store.set];
}

function createMutableStore<T>(
  initialState: T,
  options: Omit<StoreOptions<T>, 'immutable'> = {}
): Store<T> {
  return new Store(initialState, { ...options, immutable: false });
}

/** A store whose state is derived from a reactive function. */
function createComputedStore<T>(
  fn: () => T,
  options: StoreOptions<T> = {}
): Store<T> {
  const store = new Store(fn(), options);
  createEffect(() => store.set(fn() as any));
  return store;
}

/** Runs an effect over a slice of store state. */
function createStoreEffect<T, U>(
  state: Immutable<T>,
  selector: (state: Immutable<T>) => U,
  effect: (value: U) => void | (() => void)
): () => void {
  return createEffect(() => effect(selector(state)));
}

/** Memoises a slice of store state. */
function createStoreMemo<T, U>(
  store: Immutable<T>,
  selector: (state: Immutable<T>) => U,
  options?: MemoOptions<U>
): () => U {
  return createMemo(() => selector(store), undefined, options);
}

/** Wraps a value as an accessor carrying the store helper methods. */
function wrap<U extends object>(
  value: U,
  options: StoreOptions<U> = {}
): Accessor<U> {
  const store = new Store(value, options);
  const accessor = (() => store.proxy) as any;
  attachStoreMethods(accessor, store);
  return accessor;
}

function unwrap<T>(item: T): T {
  if (item == null || typeof item !== 'object') return item;
  const raw = (item as any)[$RAW];
  return raw !== undefined ? raw : item;
}

function untrackStore<T>(store: T): T {
  return untrack(() => unwrap(store));
}

type StoreWrap<T> = Store<T> | StoreAccessor<T> | (() => T);

export function isStore<T>(store: StoreWrap<T>): store is StoreAccessor<T> {
  return isStoreProxy(store);
}

export function getNode<T>(store: StoreWrap<T>): Accessor<T> | null {
  return isStoreProxy(store) ? ((store as any)[$NODE] as Accessor<T>) : null;
}

export function getStoreNode<T>(store: any): T | null {
  if (store && typeof store === 'object' && $NODE in store)
    return store[$NODE] as T;
  return null;
}

export function isStoreProxy(value: any): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    ($PROXY in value || (value as any).__proxy === true)
  );
}

export function modifiable<T extends object>(value: T): T {
  return value;
}

export const StoreAPI = Object.freeze({
  createStore,
  createMutableStore,
  batch,
  unwrap,
  untrackStore,
});

export {
  createStore,
  createMutableStore,
  createComputedStore,
  createStoreEffect,
  createStoreMemo,
  wrap,
  unwrap,
  untrackStore,
  Store,
};

export type { StoreOptions, StoreSetter, Immutable, StoreAccessor };
