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
import {
  isObserved,
  reportReactiveDispose,
  reportReactiveMove,
  reportReactiveNode,
  withReactiveOrigin,
} from '../signal/graph/observe.js';
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
// One definition for the read view and the setter's input: two would drift, and the
// drift shows up as a snapshot the setter refuses for no visible reason.
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
type NodeStore = { keys: Map<PropertyKey, DataNode>; all?: DataNode; owner?: StoreOrigin; array?: boolean };
/**
 * What a raw object is, as far as a watcher is concerned: the node that stands for it, and
 * the path that names it. The root is the store; a nested object is the key signal holding
 * it, so `cart.items[0].qty` belongs to `cart.items[0]`, which belongs to `cart.items`.
 */
type StoreOrigin = { store: object; name: string };

const NODES = new WeakMap<object, NodeStore>();
const PROXIES = new WeakMap<object, any>();
const OWNERS = new WeakMap<object, StoreOrigin>();
/** Every tracked object back to the state it belongs to, for deciding what is still in use. */
const ROOTS = new WeakMap<object, object>();

/**
 * Say goodbye to the signals of an object a write replaced.
 *
 * `set('items', [...items, one])` drops the old array but keeps the objects in it, so what
 * is still reachable from the state keeps its nodes and only the rest is let go. Without
 * this a watcher accumulates a card per key of every array a list ever had.
 *
 * Only when something is watching: this walks the state, and nothing else needs it.
 */
function forgetReplaced(dead: unknown, state: object): void {
  if (!isTrackable(dead) || !isObserved()) return;
  const alive = new Set<object>();
  const keep = (value: unknown): void => {
    if (!isTrackable(value) || alive.has(value as object)) return;
    alive.add(value as object);
    for (const child of Object.values(value as object)) keep(child);
  };
  keep(ROOTS.get(state) ?? state);

  const seen = new Set<object>();
  const drop = (value: unknown): void => {
    if (!isTrackable(value)) return;
    const target = value as object;
    if (alive.has(target) || seen.has(target)) return;
    seen.add(target);
    const ns = NODES.get(target);
    if (ns) {
      for (const node of ns.keys.values()) reportReactiveDispose(node);
      if (ns.all) reportReactiveDispose(ns.all);
      NODES.delete(target);
      OWNERS.delete(target);
      PROXIES.delete(target);
    }
    for (const child of Object.values(target)) drop(child);
  };
  drop(dead);
}

const pathOf = (base: string, key: PropertyKey, array?: boolean): string =>
  array ? `${base}[${String(key)}]` : `${base}.${String(key)}`;

function createDataNode(initial?: any, ns?: NodeStore, key?: PropertyKey): DataNode {
  // A key signal is made the first time something reads it, which can be anywhere. Named and
  // attributed to the object it belongs to, so a graph shows it under that object at the
  // line the store was declared rather than wherever it was first read.
  const owner = ns?.owner;
  const label = owner && key !== undefined ? pathOf(owner.name, key, ns?.array) : undefined;
  const [get, set] = withReactiveOrigin(owner?.store, () =>
    createSignal(initial, label ? { name: label } : undefined),
  );
  const node = get as any as DataNode;
  node.$ = set as any;
  return node;
}

function nodesOf(target: object): NodeStore {
  let ns = NODES.get(target);
  if (!ns) NODES.set(target, (ns = { keys: new Map(), owner: OWNERS.get(target), array: Array.isArray(target) }));
  // An object can be reached before the store has claimed it, a write touches it, or it is
  // read through something other than its parent's proxy. Caching "no owner" there would
  // leave every key signal it ever makes unnamed and unattached.
  else if (!ns.owner) ns.owner = OWNERS.get(target);
  return ns;
}

function keyNode(ns: NodeStore, key: PropertyKey, seed?: any): DataNode {
  let node = ns.keys.get(key);
  if (!node) ns.keys.set(key, (node = createDataNode(seed, ns, key)));
  return node;
}

/**
 * Say where an object now sits in the state.
 *
 * A write that replaces a container leaves the objects inside it where they were, holding
 * the same signals, under a new key signal. Re-claiming moves those signals across so they
 * stay attached to the object they describe instead of to the node that used to hold it.
 */
function claim(target: object, holder: DataNode, name: string, parent: object): void {
  const was = OWNERS.get(target);
  if (was && was.store === holder && was.name === name) return;
  const owner: StoreOrigin = { store: holder, name };
  OWNERS.set(target, owner);
  ROOTS.set(target, ROOTS.get(parent) ?? parent);

  // It may already have a node store, from an earlier read or an earlier position.
  const ns = NODES.get(target);
  if (!ns) return;
  ns.owner = owner;
  if (!isObserved()) return;
  for (const [key, node] of ns.keys) reportReactiveMove(node, holder, pathOf(name, key, ns.array));
  if (ns.all) reportReactiveMove(ns.all, holder, pathOf(name, '*', ns.array));
}

function trackKeys(target: object): void {
  const ns = nodesOf(target);
  // Which keys exist, as opposed to what any one of them holds. It has no value of its own,
  // so a graph would otherwise show an unexplained empty node the first time a list is
  // iterated, which is exactly when one appears.
  (ns.all || (ns.all = createDataNode(undefined, ns, '*')))();
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

    const ns = nodesOf(target);
    const holder = keyNode(ns, key, value);
    const current = holder();
    if (!isTrackable(current)) return current;
    // A nested object hangs off the signal that holds it, not off the store, so a cart with
    // three items reads as three objects rather than as a dozen loose keys.
    if (ns.owner) claim(current as object, holder, pathOf(ns.owner.name, key, ns.array), target);
    return box(current);
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
/**
 * The raw form of a value on its way into the state.
 *
 * `set({ items: [...cart.items, one] })` spreads proxies back in, and a store that holds its
 * own proxies tracks each of them twice: a second node store per object, a proxy wrapping a
 * proxy, and a graph with two signals for every key.
 */
function rawValue(value: any, seen = new Set<any>()): any {
  if (value == null || typeof value !== 'object') return value;
  const raw = value[$RAW] ?? value;
  if (seen.has(raw) || !isTrackable(raw)) return raw;
  seen.add(raw);
  let changed = false;
  const swap = (v: any) => {
    const next = rawValue(v, seen);
    if (next !== v) changed = true;
    return next;
  };
  if (Array.isArray(raw)) {
    const out = raw.map(swap);
    return changed ? out : raw;
  }
  const out: any = {};
  for (const k of Object.keys(raw)) out[k] = swap(raw[k]);
  return changed ? out : raw;
}

function writeKey(state: any, key: PropertyKey, rawInput: any): void {
  const value = rawValue(rawInput);
  const prev = state[key];
  if (prev === value && (value !== undefined || key in state)) return;

  const isArray = Array.isArray(state);
  const len = isArray ? state.length : 0;

  if (value === undefined) delete state[key];
  else state[key] = value;

  const ns = nodesOf(state);
  const node = ns.keys.get(key);
  if (node) pokeNode(node, value);
  forgetReplaced(prev, state);

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
 * Whether a lone array argument is a batch of `[path, value]` pairs.
 *
 * The batch form and a replacement array are the same shape at the call site, so the
 * entries decide. Every one has to be a pair with a string path; anything else is a
 * value. An empty array is not a batch, which is what made `set([])` on an array root
 * do nothing at all.
 */
function isPathBatch(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((e) => Array.isArray(e) && e.length >= 2 && typeof e[0] === 'string')
  );
}

/**
 * Replace an array's contents in place, keeping its identity.
 *
 * The tail is written away before the length moves, so an index that had a signal is
 * told it is gone. Assigning `length` alone truncates without notifying anyone, which
 * leaves a stale read behind on every removed index.
 */
function replaceArray(target: any[], next: readonly any[]): void {
  // Keys are strings everywhere else, because every other path reaches writeKey through
  // parsePath. A numeric key here would miss the node the proxy registered under '2'.
  for (let i = target.length - 1; i >= next.length; i--) writeKey(target, String(i), undefined);
  if (target.length !== next.length) writeKey(target, 'length', next.length);
  for (let i = 0; i < next.length; i++) writeKey(target, String(i), next[i]);
}

/**
 * Runs the setter overloads against the raw root:
 *   set(state => newState)        whole-state updater, merged back
 *   set(partialObject)            per-key merge
 *   set([[path, valOrFn], ...])   batch of path updates
 *   set(path, ...steps, val)      a step per argument: key, index, [indices],
 *                                 { from, to, by }, a predicate, or '*'
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
    if (isPathBatch(first)) {
      for (const entry of first) applyPath(root, entry[0], entry[1]);
      return;
    }
    // Not a batch, so it is a value. Against an array root that is a replacement.
    if (Array.isArray(root)) {
      replaceArray(root, first);
      return;
    }
    // An empty array asks for no updates, which is harmless either way.
    if (first.length === 0) return;
    throw new TypeError(
      '[fluixi] set() was given an array that is neither a batch of [path, value] ' +
        'pairs nor a replacement for an array root. Name the path you meant, as in ' +
        "set('items', [...]).",
    );
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
  // Three or more arguments: every one but the last selects a step, the last is the
  // value. This used to read `args[1]` as the value and ignore the rest, so
  // `set('items', 0, 'done', true)` wrote the number 0 over `items` — accepted by the
  // typings, and silent.
  if (args.length >= 3) {
    setDeep(root, args.slice(0, -1), args[args.length - 1]);
    return;
  }
  applyPath(root, String(first), args[1]);
}

/**
 * Which keys a selector names at this level.
 *
 * The typings offer four shapes for the steps between a path and a value, and each one
 * resolves here rather than at a call site:
 *   'name' | 2        a single key, dotted paths expanded by the caller
 *   [0, 2]            several indices of an array
 *   { from, to, by }  a range of indices
 *   (item, i) => bool a predicate over an array
 *   '*'               every key
 */
function selectKeys(current: any, selector: any): Array<string | number> {
  if (typeof selector === 'function') {
    if (!Array.isArray(current)) return [];
    const keys: number[] = [];
    for (let i = 0; i < current.length; i++) if (selector(current[i], i)) keys.push(i);
    return keys;
  }

  if (Array.isArray(selector)) {
    // Against an array these are indices. Against anything else there is nothing to
    // index, so they are path segments — the form this function used to be given.
    return Array.isArray(current) ? selector.map(Number) : selector.map(String);
  }

  if (
    selector &&
    typeof selector === 'object' &&
    ('from' in selector || 'to' in selector || 'by' in selector)
  ) {
    if (!Array.isArray(current)) return [];
    const by = selector.by ?? 1;
    const from = selector.from ?? 0;
    const to = selector.to ?? current.length - 1;
    const keys: number[] = [];
    for (let i = from; i <= to; i += by) if (i >= 0 && i < current.length) keys.push(i);
    return keys;
  }

  if (selector === '*') {
    return Array.isArray(current)
      ? current.map((_, i) => i)
      : Object.keys(current ?? {});
  }

  return [selector as string | number];
}

/**
 * Walk the selectors, writing the value at every leaf they reach.
 *
 * A string step is expanded first, so `set('a.b', 'c', v)` and `set('a', 'b', 'c', v)`
 * land in the same place. Missing containers are created on the way down, as an array
 * when the next step looks like an index.
 */
function setDeep(current: any, selectors: any[], value: any): void {
  if (current == null) return;

  // Expand a dotted or bracketed string into its own steps before selecting.
  const [head, ...rest] = selectors;
  if (typeof head === 'string') {
    const parts = parsePath(head);
    if (parts.length > 1) {
      setDeep(current, [...parts, ...rest], value);
      return;
    }
  }

  const keys = selectKeys(current, head);

  if (rest.length === 0) {
    for (const key of keys) writeKey(current, key, nextValue(value, current[key]));
    return;
  }

  for (const key of keys) {
    let next = current[key];
    if (next == null || typeof next !== 'object') {
      const lookahead = rest[0];
      next = typeof lookahead === 'number' || /^\d+$/.test(String(lookahead)) ? [] : {};
      writeKey(current, key, next);
    }
    setDeep(next, rest, value);
  }
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
    if (initialState && typeof initialState === 'object') {
      OWNERS.set(initialState as object, { store: this, name: (options as { name?: string }).name ?? 'store' });
      ROOTS.set(initialState as object, initialState as object);
    }
    // One node for the store itself, so the line that declared it is in the graph even
    // though its key signals are not made until something reads them.
    reportReactiveNode({
      kind: 'store',
      node: this,
      handle: () => this.root,
      name: (options as { name?: string }).name,
    });
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

  /**
   * Swap a whole value, rather than merging into it.
   *
   * `set(partial)` merges per key, which is what you want for an object and never what
   * you want for an array. This replaces: `replace(value)` at the root, or
   * `replace(path, value)` further down.
   *
   * @example
   * ```ts
   * const [items, set] = createStore([1, 2, 3]);
   * set.replace([]);            // now empty
   * set.replace(['a', 'b']);    // now two entries
   * ```
   */
  replace(pathOrValue: any, maybeValue?: any): void {
    if (arguments.length >= 2) {
      const target = rawAt(this.root, String(pathOrValue));
      const next = maybeValue;
      if (Array.isArray(target) && Array.isArray(next)) {
        replaceArray(target, next);
        return;
      }
      this.set(pathOrValue as any, next as any);
      return;
    }
    const root: any = this.root;
    if (Array.isArray(root) && Array.isArray(pathOrValue)) {
      replaceArray(root, pathOrValue);
      return;
    }
    this.set(pathOrValue as any);
  }

  /**
   * Empty an array, at the root or at a path.
   *
   * @example
   * ```ts
   * set.clear();          // the root array
   * set.clear('todos');   // a nested one
   * ```
   */
  clear(path?: string): void {
    const target = path === undefined ? (this.root as any) : rawAt(this.root, path);
    if (Array.isArray(target)) {
      replaceArray(target, []);
      return;
    }
    if (target && typeof target === 'object') {
      for (const key of Object.keys(target)) writeKey(target, key, undefined);
    }
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
  'replace',
  'clear',
  'unwrap',
  'toObservable',
] as const;

function attachStoreMethods(target: any, store: Store<any>): void {
  for (const name of SETTER_METHODS) target[name] = (store as any)[name].bind(store);
  target.$ = store.reactive.bind(store);
}

// public api

/**
 * A fine-grained reactive store: a plain object tree that tracks reads per key.
 *
 * Returns the state and its setter as a tuple. The state is a proxy, so reading a
 * property subscribes the current computation to that property alone, and a write
 * elsewhere in the tree does not disturb it. Signals are created lazily, one per key
 * that something actually reads, so the cost follows what the app looks at rather than
 * the size of the state.
 *
 * The state is immutable from the outside by default, assigning to it does nothing, and
 * `set` is the way in. That is what makes the tracking trustworthy, since every change
 * goes through a path the store can see.
 *
 * `store()` wraps this as a single binding for the common case. Prefer it unless the
 * state has a `set` key of its own, which the single-binding form cannot express.
 *
 * @example
 * ```ts
 * const [state, setState] = createStore({ user: { name: 'Ada' }, count: 0 });
 *
 * effect(() => console.log(state.user.name));   // tracks user.name only
 * setState('count', 1);                         // the effect does not re-run
 * setState('user.name', 'Grace');               // now it does
 * ```
 *
 * @example A patch merges the keys it names; a dot path reaches through arrays:
 * ```ts
 * setState({ count: 5 });                       // user is untouched
 * setState('todos.0.done', true);
 * setState('count', (n) => n + 1);              // or derive from the current value
 * ```
 */
function createStore<T>(
  initialState: T,
  options: StoreOptions<T> = { immutable: true }
): [Immutable<T>, Store<T>['set']] {
  const store = new Store(initialState, options);
  attachStoreMethods(store.set, store);
  return [store.proxy as Immutable<T>, store.set];
}

/**
 * A store you assign to directly, without a setter.
 *
 * The same per-key tracking as `createStore`, with the immutability dropped, so
 * `state.count = 1` is a tracked write. Reach for it when the state is local to one
 * component and the indirection of a setter buys nothing. The cost is that a change
 * can come from anywhere holding the object.
 *
 * @example
 * ```ts
 * const state = createMutableStore({ count: 0 });
 * effect(() => console.log(state.count));
 * state.count = 1;   // the effect re-runs
 * ```
 */
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
