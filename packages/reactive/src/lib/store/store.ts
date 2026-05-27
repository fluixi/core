import {
  type IValueOfKey,
  // type SetterParamsType,
  type SelectorFor,
  type Flatten,
  applyDiff,
  deepClone,
  diffObjectDetailed,
  set,
  get,
  setValueAtPath,
  getPaths,
  deepMerge,
  DiffResult,
  reconcile,
} from '@awc/utils/object';
import { deepEqual } from '@awc/utils/compare';
import { isFunction } from '@awc/utils/functions';
import { Observable } from '@awc/reactive/observable';
import {
  $PROXY,
  $SIGNAL,
  type Accessor,
  type MemoOptions,
  Signal,
  batch,
  createEffect,
  createMemo,
  createSignal,
  untrack,
} from '@awc/reactive/signal';
import { Producer, ReconcileOptions } from './types.js';
import type { SetStoreFunction as StoreSetter } from './setter.types.js';
type PathValue<T, P extends string = never> = Immutable<T> | IValueOfKey<T, P>;
/**
 * Primitive value types that can be stored
 */
type Primitive = string | number | boolean | bigint | symbol | undefined | null;
type File = any;
type FileList = any;

/**
 * Browser native object types that are treated as immutable
 */
type BrowserNativeObject = Date | FileList | File | Blob | RegExp;

/**
 * Immutable primitive types
 */
type ImmutablePrimitive = Primitive | BrowserNativeObject;

/**
 * Deeply immutable type transformation
 */
type _Immutable<T> = T extends ImmutablePrimitive
  ? T
  : T extends Array<infer U>
  ? ImmutableArray<U>
  : T extends Map<infer K, infer V>
  ? ImmutableMap<K, V>
  : T extends Set<infer M>
  ? ImmutableSet<M>
  : T extends Promise<infer N>
  ? Promise<_Immutable<N>>
  : ImmutableObject<T>;

type Immutable<T> = _Immutable<T> & { __track: T; [key: symbol]: any };

type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };


// interface StoreSetter1<T> extends SetterParamsType<T> {
//   // <
//   //   V extends Callback<T> | T
//   //   // | Callback<A<T>> | A<T>
//   //   // | (T extends Primitive ? ParamUpdateValue<T> : never)
//   // >(
//   //   value: V
//   // ): any;
//   // push: <P extends SelectorFor<T>>(
//   //   path: P,
//   //   ...items: IValueOfKey<T, P>[]
//   // ) => void;
//   // pop: <P extends SelectorFor<T>>(
//   //   path?: P
//   // ) => P extends never ? Flatten<T> : Flatten<IValueOfKey<T, P>> | undefined;
//   // shift: <P extends SelectorFor<T>>(
//   //   path?: P
//   // ) => P extends never ? Flatten<T> : Flatten<IValueOfKey<T, P>> | undefined;
//   // insert: <P extends SelectorFor<T>>(
//   //   path: P,
//   //   index: number,
//   //   value: Flatten<IValueOfKey<T, P>>
//   // ) => void;
//   // splice: <P extends SelectorFor<T>>(
//   //   path: P,
//   //   start: number,
//   //   deleteCount: number,
//   //   ...items: IValueOfKey<T, P>[]
//   // ) => Flatten<IValueOfKey<T, P>>[];
//   // removeAt: <P extends SelectorFor<T>>(
//   //   path: P,
//   //   index: number
//   // ) => Flatten<IValueOfKey<T, P>>[];
//   // $: <P extends SelectorFor<T>>(
//   //   key?: P
//   // ) => P extends SelectorFor<T>
//   //   ? Immutable<Accessor<IValueOfKey<T, P> | null>>
//   //   : Immutable<Accessor<T | null>>;
//   // move: (from: number, to: number) => void;
//   // remove: (index: number) => void;
//   // removeWhere: (filterFn: (item: T[0], index: number) => boolean) => void;
//   // unshift: (...items: T[0][]) => void;
//   // reverse: () => void;
//   // sort: (compareFn?: (a: T[0], b: T[0]) => number) => void;
// }



interface StoreSetter2<T>{
  (...args: any[]):any
}

interface StoreAccessor<T> extends Accessor<T> {}
/**
 * Store options configuration
 */
interface StoreOptions<T> {
  /** Store name for debugging */
  name?: string;
  /** Enable immutable mode (default: false) */
  immutable?: boolean;
  /** Custom equality function */
  equals?: (a: T, b: T) => boolean;
}

export const $RAW = Symbol('store-raw'),
  $NODE = Symbol('store-node'),
  $HAS = Symbol('store-has'),
  $SELF = Symbol('store-self'),
  // $PROXY = Symbol('store-proxy'),
  $TRACK = Symbol('store-track'),
  $NAME = Symbol('store-name'),
  $STORE = Symbol('store-store');

/**
 * Store node for fine-grained reactivity
 */
class StoreNode<T> {
  // private signal: Accessor<T>;
  // private setSignal: (value: T | ((prev: T) => T)) => void;
  public children = new Map<string | number | symbol, StoreNode<any>>();
  public signals = new Map<PropertyKey, DataNode>();
  // stable proxy
  proxy: T;
  // array structure signal
  // public array?: DataNode;
  public SELF?: DataNode;
  private proxies = new WeakMap<object, any>();
  private parent: StoreNode<any> | null = null;
  private enable_proxy_update = false;
  private maxChildren = 100; // LRU cache size
  private propSignals = new Map<PropertyKey, Accessor<any>>();
  private propSetters = new Map<PropertyKey, (v: any) => void>();
  public value: T;

  getPropSignal(key: PropertyKey, _value?: any) {
    let signal = this.propSignals.get(key);
    let setter = this.propSetters.get(key);
    let value = _value;
    if (!signal || !setter) {
      if (!value && this.value) {
        if (typeof this.value === 'object') {
          if (key in this.value) {
            value = (this.value as any)[key];
          }
        }
      }
      [signal, setter] = createSignal(value, {
        name: this.options.name
          ? `${this.options.name}${this.path}.${String(key)}`
          : undefined,
      });

      this.propSignals.set(key, signal);
      this.propSetters.set(key, setter);
      // if (typeof key === 'string' && key.length > 0) {
      //   Object.defineProperty(this.proxy as any, `$${key}`, {
      //     enumerable: true,
      //     configurable: true,
      //     writable: true,
      //     value: signal,
      //   });
      // }
    }

    return [signal, setter] as const;
  }

  /**
   * Creates a new store node
   * @param value - Initial value
   * @param path - Node path for debugging
   * @param parent - Parent node
   * @param options - Store options
   */
  constructor(
    _value: T,
    private path: string = '',
    parent: StoreNode<any> | null = null,
    private options: StoreOptions<any> = { immutable: true }
  ) {
    const value = deepClone(_value);
    // this.parent = parent;
    // const [track, trigger] = this.getPropSignal(path, value as any);
    // this.value = track();
    // this.createProxy(value);
    this.value = value;
    this.parent = parent;

    if (Array.isArray(value)) {
      this.SELF = createDataNode(value.length);
    } else {
      this.SELF = createDataNode();
    }
    // this.value = this.getDataNode(path, value)();
    this.value = untrack(() => this.getDataNode(path, value)())

    this.proxy = this.createProxy(value);
  }
  trackSelf() {
    const track = this.getDataNode(this.path, this.value)();
    console.log('[Track Self]', track, this.SELF);
    if(Array.isArray(track)){
        return track[0];
    }
    return track;
  }

  toObservable(): Observable<T> {
    const [signal] = this.getPropSignal(this.path);
    // return this.signal.toObservable();
    return signal.toObservable!();
  }

  get() {
    // Only track identity when accessed directly
    const value = this.value;

    if (this.value && typeof value === 'object') {
      // return this.getProxy(true);
      return (this.value as any)[$RAW];
    }

    return value;
  }
  /**
   * Gets the raw underlying value without proxies
   * @returns Raw value
   */
  getRaw(): T {
    // return deepClone(this.value);
    return (this.proxy as any)[$RAW];
    // return deepClone(this.value, [$RAW]);
  }

  /**
   * Sets the node value and triggers updates
   * @param newValue - New value or update function
   */
  set(newValue: T | ((prev: T) => T), signal = true): void {
    if (typeof newValue === 'function') {
      newValue = (newValue as (prev: T) => T)(this.value);
    }

    this.updateValue(newValue as T, signal);
  }

  private updateValue(newValue: T, signal = true): void {
    const oldValue = this.value;
    if (deepEqual(oldValue, newValue)) return;

    this.value = newValue;

    if (signal) {
      // Trigger the property signal on the parent node
      // Extract the last key from the path to use as the property key
      if (this.parent && this.path) {
        const pathParts = this.path.split('.');
        const propertyKey = pathParts[pathParts.length - 1];

        // Get the data node (signal) for this property from the parent
        const dataNode = this.parent.signals.get(propertyKey);
        if (dataNode) {
          dataNode.$(newValue);
        }
      } else if (!this.parent && !this.path) {
        // Root node - trigger all direct property signals
        for (const [key, dataNode] of this.signals.entries()) {
          if (typeof key === 'string' || typeof key === 'number') {
            const value = (newValue as any)[key];
            if (value !== undefined) {
              dataNode.$(value);
            }
          }
        }
      }

      // Only trigger parent signals for arrays to maintain fine-grained reactivity
      if (this.parent && Array.isArray(this.parent.value)) {
        const [, parentSetter] = this.parent.getPropSignal(this.parent.path);
        parentSetter(this.parent.value);

        // Trigger iterator signal for array methods
        const [, iteratorSetter] = this.parent.getPropSignal(Symbol.iterator);
        iteratorSetter(this.parent.value);
      }
    }

    this.children.clear();
    // this.createProxy(newValue);
  }

  /**
   * Creates a proxy for object values
   * @param value - Value to proxy
   */
  private createProxy(value: T): any {
    if (value && typeof value === 'object') {
      const proxy = new Proxy(value, this.createHandler());
      Object.defineProperty(proxy, $PROXY, {
        enumerable: true,
        configurable: true,
        writable: true,
        value: Symbol.for('store-proxy'),
      });
      this.proxies.set(value, proxy);
      return proxy;
    }
    return value;
  }

  addNode(prop: string, node: StoreNode<any>): void {
    this.children.set(prop, node);
  }

  private reactiveFns = new Map<Accessor<any>, Accessor<any>>();
  /**
   * Creates proxy handler for reactive access
   * @returns Proxy handler configuration
   */
  private createHandler(): ProxyHandler<any> {
    const node = this;

    return {
      get(target, key, receiver) {
        if(key === '__proxy') return true;
        // if(key === '__track') {
        //   return node.SELF?.()};
        // console.log('get', { key, target, receiver, isSelf: key === $SELF });
        // ---- Solid internals ----
        // if (key === '__track') return node.node;
        // if (key === '$') return node.track.bind(node);
        if (typeof key === 'string' && key.startsWith('$')) {
          // const accessor = node.getPropSignal(key.replace('$', ''))[0];
          // // Object.defineProperty(accessor, $SIGNAL, {
          // //   value: true,
          // //   enumerable: true,
          // // });
          // console.log('get', { key, target, receiver, accessor });
          // return accessor;
          const res = (target as any)[key.replace('$', '')];
          const result = () => res;
          if (!node.reactiveFns.has(result as Accessor<any>)) {
            node.reactiveFns.set(
              result as Accessor<any>,
              result as Accessor<any>
            );
          }
          const accessor = node.reactiveFns.get(result as Accessor<any>);
          Object.defineProperty(accessor, $SIGNAL, {
            value: true,
            enumerable: true,
          });
          return accessor;
          // const [s] = createSignal((target as any)[key.replace('$', '')]);
          // return s;
        }
        if (key === $RAW) return target;
        if (key === $NODE) return node;
        if (key === $HAS) return (k: PropertyKey) => k in target;
        if (key === $SELF) {
          node.SELF?.();
          // console.log('tracking self');
          // node.trackSelf();
          return receiver;
        }
        
        // ---- array structure tracking ----
        // Only subscribe to SELF for array targets. For plain objects, SELF
        // fires on every setState (see mergeState), which would cause effects
        // reading any property to re-run whenever any key is written.
        if (Array.isArray(target)) node.SELF?.();

        // ---- property tracking ----
        node.getDataNode(key, target[key])()
        // const tracked = node.value
        if(key==='__track'){
          console.log('is tracking', target);
          if(Array.isArray(target)){
            return node.trackSelf();
          }
        }

        
        const value = target[key];
        // if(Array.isArray(target)) {
        //   console.log('store map', target, key, value);
        // }

        // ---- array mutators ----
        if (Array.isArray(target) && typeof value === 'function') {
          // True mutators: fire signals after mutation so reactive dependents update.
          if (
            key === 'push' ||
            key === 'pop' ||
            key === 'shift' ||
            key === 'unshift' ||
            key === 'splice'
          ) {
            return (...args: any[]) => {
              const result = value.apply(target, args);
              node.SELF?.$(target.length);
              for (let i = 0; i < target.length; i++) {
                node.signals.get(i)?.$();
              }
              return result;
            };
          }
          // Read-only iteration methods: call on the proxy receiver so each index
          // access goes through the proxy getter and returns the current child
          // StoreNode proxy (with up-to-date values). Do NOT fire signals — these
          // are pure reads and must not re-queue the render effect mid-execution.
          if (
            key === 'map' ||
            key === 'filter' ||
            key === 'find' ||
            key === 'findIndex' ||
            key === 'forEach' ||
            key === 'some' ||
            key === 'every' ||
            key === 'reduce' ||
            key === 'reduceRight' ||
            key === 'includes' ||
            key === 'indexOf' ||
            key === 'flat' ||
            key === 'flatMap' ||
            key === 'slice'
          ) {
          //   return (...args: any[]) =>{
          //     // node.getDataNode(key, target[key])();
          //     const result = value.apply(target, args);
          //     // if(Array.isArray(result)){
          //     // }
          //     // node.SELF?.$(target.length);
          //     // for (let i = 0; i < target.length; i++) {
          //     //   node.signals.get(i)?.$();
          //     // }
          //     return result;
          // }
            // node.SELF?.$(target.length);
            // return (...args: any[]) => value.apply(receiver, args);
          }
          if (key === 'map') {
            // console.log('map', {target, receiver});
            // node.SELF?.()
          //       return (...args: any[]) =>{
          //     const result = value.apply(target, args);
          //     return result;
          // }

          }
        }

        // ---- nested objects ----

        if (value && typeof value === 'object') {
          let child = node.children.get(key);
          if (!child) {
            const childPath = node.path
              ? `${node.path}.${String(key)}`
              : String(key);

            // Check if we need to evict old children (LRU cache)
            if (node.children.size >= node.maxChildren) {
              const firstKey = node.children.keys().next().value;
              if (firstKey !== undefined) {
                const firstChild = node.children.get(firstKey);
                firstChild?.dispose();
                node.children.delete(firstKey);
              }
            }
            child = new StoreNode(value, childPath, node);
            node.children.set(key, child);
          }
          return child.proxy;
        }

        return value;
      },

      set(target, key, value) {
        return true;
      },

      deleteProperty(target, key) {
        delete target[key];

        node.signals.get(key)?.$();
        node.children.delete(key);
        node.SELF?.$(Array.isArray(target) ? target.length : null);

        return true;
      },

      has(target, key) {
        node.getDataNode(key)();
        return key in target;
      },

      ownKeys(target) {
        node.SELF?.();
        return Reflect.ownKeys(target);
      },

      getOwnPropertyDescriptor(target, key) {
        node.getDataNode(key)();
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    };
  }

  /**
   * Gets the reactive proxy for this node
   * @returns Reactive proxy or primitive value
   */
  getProxy(): T {
    // const [track] = this.getPropSignal(this.path);
    // track();
    if (this.value && typeof this.value === 'object') {
      // Create a wrapper that tracks whole object access
      const proxy = this.proxies.get(this.value);
      if (proxy) {
        return proxy;
      }
    }
    return this.value;
  }

  /**
   * Gets a child node by path
   * @param path - Dot-separated path to child
   * @returns Child node or null if not found
   */
  getNode<P extends SelectorFor<T>>(path: P): StoreNode<T> | null {
    const parts = (path as string).split('.');
    let current: StoreNode<T> = this;

    for (const part of parts) {
      const child = current.children.get(part);
      if (!child) return null;
      current = child;
    }

    return current;
  }

  private getDataNode(key: PropertyKey, initial?: any): DataNode {
    let node = this.signals.get(key);
    if (!node) {
      node = createDataNode(initial);
      this.signals.set(key, node);
    }
    return node;
  }

  etRaw(): T {
    return this.value;
  }

  /**
   * Creates a draft for mutation with structural sharing
   * @param producer - Function that mutates the draft
   * @returns New value after mutation
   */
  produce(producer: Producer<T>): T {
    const draft = this.createDraft(this.value);
    producer(draft);
    return this.finalizeDraft(draft, this.value);
  }

  /**
   * Creates a draft copy for mutation
   * @param value - Value to draft
   * @returns Draft copy
   */
  private createDraft(value: T): T {
    if (!value || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.createDraft(item)) as T;
    }

    if (value instanceof Date) {
      return new Date(value.getTime()) as T;
    }

    if (value instanceof Map) {
      return new Map(
        Array.from(value.entries()).map(([k, v]) => [k, this.createDraft(v)])
      ) as T;
    }

    if (value instanceof Set) {
      return new Set(
        Array.from(value).map((item) => this.createDraft(item))
      ) as T;
    }

    // Create shallow clone for objects
    const clone = Object.create(Object.getPrototypeOf(value));

    // Use proxy for the draft to track changes
    return new Proxy(clone, {
      get: (target, prop) => {
        // Return draft of nested objects
        if (
          prop in value &&
          typeof (value as any)[prop] === 'object' &&
          (value as any)[prop] !== null
        ) {
          if (!(prop in target)) {
            target[prop] = this.createDraft((value as any)[prop]);
          }
          return target[prop];
        }
        // Return original value for primitives and non-existing properties
        return prop in target ? target[prop] : (value as any)[prop];
      },
      set: (target, prop, newValue) => {
        target[prop] = newValue;
        return true;
      },
      ownKeys: (target) => {
        return Reflect.ownKeys(value);
      },
      getOwnPropertyDescriptor: (target, prop) => {
        return (
          Reflect.getOwnPropertyDescriptor(value, prop) ||
          Reflect.getOwnPropertyDescriptor(target, prop)
        );
      },
    });
  }

  /**
   * Finalizes draft and creates new immutable state
   * @param draft - Draft object
   * @param base - Original base object
   * @returns Finalized value
   */
  private finalizeDraft(draft: any, base: any): any {
    if (!draft || typeof draft !== 'object') {
      return draft;
    }

    // Check if draft was modified
    if (draft === base) {
      return base;
    }

    if (Array.isArray(draft)) {
      return draft.map((item, index) => {
        const baseItem = base?.[index];
        return this.finalizeDraft(item, baseItem);
      });
    }

    if (draft instanceof Date) {
      return draft;
    }

    if (draft instanceof Map) {
      const newMap = new Map();
      draft.forEach((value, key) => {
        const baseValue = base?.get(key);
        newMap.set(key, this.finalizeDraft(value, baseValue));
      });
      return newMap;
    }

    if (draft instanceof Set) {
      const newSet = new Set();
      draft.forEach((value) => {
        const baseHasValue = base?.has(value);
        newSet.add(this.finalizeDraft(value, baseHasValue ? value : undefined));
      });
      return newSet;
    }

    // For plain objects, check each property
    const result = Array.isArray(draft) ? [] : {};
    let hasChanges = false;

    // Check all keys from both draft and base
    const allKeys = new Set([
      ...Reflect.ownKeys(draft),
      ...(base ? Reflect.ownKeys(base) : []),
    ]);

    for (const key of allKeys) {
      const draftValue = draft[key];
      const baseValue = base?.[key];

      const finalValue = this.finalizeDraft(draftValue, baseValue);

      if (finalValue !== baseValue) {
        hasChanges = true;
      }

      if (finalValue !== undefined || key in draft) {
        (result as any)[key] = finalValue;
      }
    }

    return hasChanges ? result : base;
  }

  /**
   * Reconciles new value with existing value
   * @param newValue - New value to reconcile
   * @param options - Reconciliation options
   * @returns Reconciled value
   */
  reconcile(newValue: any, options: ReconcileOptions = {}): T {
    const current = this.value;

    if (current === newValue) {
      return current;
    }

    if (
      !current ||
      !newValue ||
      typeof current !== 'object' ||
      typeof newValue !== 'object'
    ) {
      return newValue;
    }

    if (Array.isArray(current) && Array.isArray(newValue)) {
      return this.reconcileArrays(current, newValue, options) as T;
    }

    if (options.merge) {
      return deepMerge(current, newValue) as T;
    }

    return newValue;
  }

  /**
   * Reconciles arrays with optional key-based merging
   */
  private reconcileArrays(
    current: any[],
    newArray: any[],
    options: ReconcileOptions
  ): any[] {
    const key = options.key || 'id';

    if (!current.length && !newArray.length) {
      return current;
    }

    // If arrays are identical by reference, return current
    if (current === newArray) {
      return current;
    }

    // If same length and shallow equal, return current
    if (current.length === newArray.length) {
      let allEqual = true;
      for (let i = 0; i < current.length; i++) {
        if (current[i] !== newArray[i]) {
          allEqual = false;
          break;
        }
      }
      if (allEqual) {
        return current;
      }
    }

    // Key-based reconciliation
    if (key && newArray[0] && newArray[0][key] !== undefined) {
      return this.reconcileByKey(current, newArray, key);
    }

    // Simple replacement for non-keyed arrays
    return newArray;
  }

  /**
   * Key-based array reconciliation
   */
  private reconcileByKey(current: any[], newArray: any[], key: string): any[] {
    const currentMap = new Map();
    current.forEach((item) => {
      if (item[key] !== undefined) {
        currentMap.set(item[key], item);
      }
    });

    const result = [];
    for (const newItem of newArray) {
      if (newItem[key] !== undefined) {
        const existing = currentMap.get(newItem[key]);
        if (existing) {
          // Merge existing item with new item
          if (typeof existing === 'object' && typeof newItem === 'object') {
            result.push(deepMerge(existing, newItem));
          } else {
            result.push(newItem);
          }
          currentMap.delete(newItem[key]);
        } else {
          result.push(newItem);
        }
      } else {
        result.push(newItem);
      }
    }

    // Add items from current that weren't in newArray
    for (const [_, item] of currentMap) {
      result.push(item);
    }

    return result;
  }

  /**
   * Cleans up resources and children
   */
  dispose(): void {
    this.children.forEach((child) => child.dispose());
    this.children.clear();
    this.proxies = new WeakMap();
  }
}

type DataNode = {
  (): any;
  $(value?: any): void;
};

// function createDataNode(initial?: any): DataNode {
//   const [get, set] = createSignal(initial);
//   const node = get as any as DataNode;
//   node.$ = set;
//   return node;
// }

function createDataNode(initial?: any): DataNode {
  const [get, set] = createSignal(initial);
  const node = get as any as DataNode;
  // function setNode(value: any){
  //   if(typeof value!=="undefined"){
  //     if(!deepEqual(untrack(()=>get()),value)){
  //       set(value)
  //       console.log('setting node', value)
  //     }
  //   }
  // }
  node.$ = set;
  return node;
}
/**
 * Reactive store implementation with SolidJS compatibility
 * Provides fine-grained reactivity for nested state objects
 */
class Store<T> {
  private root: StoreNode<T>;
  private batchDepth = 0;
  private batchQueue: Array<() => void> = [];
  $: any;

  bindProps<T>(getter: any, _store?: Store<T>): void {
    const properties = [
      'get',
      'subscribe',
      'watch',
      'select',
      'toObservable',
      'unwrap',
      'produce',
      'reconcile',
      'push',
      'pop',
      'splice',
      'shift',
      'removeAt',
      'insert',
      '$',
    ];
    const store = _store || this;
    function bindProperties() {
      for (const p of properties) {
        if (p === '$') {
          (getter as any)[p] = (store as any)[`_reactive`]?.bind(store);
        } else {
          (getter as any)[p] = (store as any)[p]?.bind(store);
        }
      }
    }
    getter.$ = store._reactive;

    Object.defineProperty(getter.$, $RAW, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: true,
    });
    bindProperties();
  }

  _reactive(key?: string): any {
    if (key === '[*]' && Array.isArray(this.proxy)) {
      const reactiveArray = this.proxy.map((item) => this._reactive(item));
      const node = this.getRootNode();
      console.log('reactive is procy array', reactiveArray);
      // if (node) {
      //   // return reactiveArray || [];
      //   // const [sig] = node.getPropSignal(key!, reactiveArray);
      //   // return sig;
      // } else {
      //   const node = new StoreNode(reactiveArray, key, this.root);
      //   this.root.addNode(key!, node);
      //   if (node) {
      //     const [s] = node.getPropSignal(key!);
      //     return s;
      //   }
      //   return null;
      // }
      //
      return reactiveArray || [];
    }
    let node = this.getNode(key!);
    // let node = this.root.getPropSignal(key!);
    // const proxyValue = (this.proxy as any)[key!];
    // const value = node[0]();
    // console.log('node  is', { node, key });
    if (node) {
      // if (typeof value === 'undefined' || value !== proxyValue) {
      //   node[1](proxyValue);
      // }
      // return node[0];
      const [s] = node.getPropSignal(key!);
      return s;
    } else {
      const value = (this.proxy as any)[key!];
      const node = new StoreNode(value, key, this.root);
      this.root.addNode(key!, node);
      if (node) {
        const [s, set] = node.getPropSignal(key!);
        set(value);
        // console.log('s', s());
        return s;
      }
      return null;
    }
  }
  /**
   * Wraps a value in a reactive store
   * @param value - Value to wrap
   * @param options - Store options
   * @returns Reactive store accessor
   */
  static wrap<U extends object>(
    value: U,
    options: StoreOptions<U> = {}
  ): StoreAccessor<U> {
    const store = new Store(value, options);
    const getter: StoreAccessor<U> = store.accessor.bind(
      store
    ) as StoreAccessor<U>;
    store.bindProps(getter, store);
    return getter as StoreAccessor<U>;
  }

  public get getter(): StoreAccessor<T> {
    const getter = this.accessor.bind(this) as StoreAccessor<T>;
    this.bindProps(getter, this);
    return getter as StoreAccessor<T>;
  }

  /**
   * Gets the raw underlying state without reactivity
   * @returns Raw state object
   */
  unwrap(): T {
    return deserialize(this.getRawState());
  }

  /**
   * Creates a mutable draft for immutable updates
   * @param producer - Function that mutates the draft
   * @returns Promise that resolves when update is complete
   */
  produce(producer: Producer<T>): void {
    this.queueUpdate(() => {
      const current = this.getRawState();
      const newValue = this.root.produce(producer);
      if (newValue !== current) {
        this.root.set(newValue);
      }
    });
  }

  /**
   * Reconciles new state with existing state (SolidJS compatibility)
   * @param newValue - New value or update function
   * @param options - Reconciliation options
   */
  reconcile(
    newValue: T | ((prev: T) => T),
    options: ReconcileOptions = {}
  ): void {
    batch(() => {
      const current = this.getRawState();
      const nextValue =
        typeof newValue === 'function'
          ? (newValue as (prev: T) => T)(current)
          : newValue;

      const reconciled = this.root.reconcile(nextValue, options);
      if (!deepEqual(reconciled, current)) {
        this.root.set(reconciled);
      }
    });
  }
  /**
   * Gets the raw state without proxies
   * @returns Raw state
   */
  private getRawState(): T {
    return this.root.getRaw();
  }

  /**
   * Batch multiple store updates into a single notification
   * @param fn - Function containing store updates
   * @returns Result of the function
   */
  batch<R>(fn: () => R): R {
    this.batchDepth++;
    try {
      // return batch(() => fn());
      return fn();
    } finally {
      this.batchDepth--;
      if (this.batchDepth === 0) {
        this.flushBatch();
      }
    }
  }

  /**
   * Flush all queued batch updates
   */
  private flushBatch(): void {
    const queue = [...this.batchQueue];
    this.batchQueue = [];
    for (const update of queue) {
      update();
    }
  }

  /**
   * Queue an update for batching
   * @param fn - Update function to queue
   */
  private queueUpdate(fn: () => void, auto = false): void {
    if (this.batchDepth > 0) {
      this.batchQueue.push(fn);
    } else {
      // batch(() => fn());
      fn();
    }
  }

  /**
   * Updates store state using SolidJS-compatible API
   * Supports multiple update formats:
   * - Partial state object: `set({ key: value })`
   * - Update function: `set(state => ({ ...state, key: value }))`
   * - Path and value: `set('path.to.key', value)`
   * - Path and update function: `set('path.to.key', current => newValue)`
   * - Array format: `set(['path', value])` or `set(['path', current => newValue])`
   *
   * @param update - The update to apply
   * @example
   * // Partial update
   * store.set({ user: { name: 'John' } });
   *
   * @example
   * // Function update
   * store.set(state => ({ ...state, count: state.count + 1 }));
   *
   * @example
   * // Path update
   * store.set('user.name', 'Jane');
   *
   * @example
   * // Path with function
   * store.set('user.age', age => age + 1);
   *
   * @example
   * // Array format
   * store.set(['user.name', 'Bob']);
   */
  set!: StoreSetter<T>;

  /**
   * Creates a new reactive store
   * @param initialState - Initial store state
   * @param options - Store configuration options
   */
  constructor(
    initialState: T,
    private options: StoreOptions<T> = { immutable: true }
  ) {
    this.root = new StoreNode(initialState, '', null, options);
    this.set = this._set.bind(this) as StoreSetter<T>;
    this.$ = this._reactive.bind(this);
  }

  getRootNode() {
    return this.root.getNode('' as any);
  }
  getNode(key: PropertyKey) {
    return this.root.getNode(key as any);
  }

  toObservable(): Observable<T> {
    return this.root.toObservable();
  }

  // ==================== CORE STORE ACCESS ====================

  /**
   * Gets the current immutable store state with dependency tracking
   * @readonly
   */
  get state(): Immutable<T> {
    // return this.root.get()() as Immutable<T>;
    // return this.root.get() as Immutable<T>;
    return this.proxy[$RAW] as Immutable<T>;
  }

  readonly<T extends object>(proxy: T): T {
    return new Proxy(proxy, {
      set() {
        console.warn('Attempted to write to a readonly store');
        return false; // ignore writes
      },
      deleteProperty() {
        return true;
      },
      apply() {
        console.warn('Attempted to apply a readonly store');
        return false; // ignore writes
      },
    });
  }

  get proxy(): Immutable<T> {
    // return this.root.get()() as Immutable<T>;
    return this.readonly(this.root.getProxy() as any) as Immutable<T>;
  }

  get accessor(): Accessor<T> {
    return this.root.get as Accessor<T>;
  }

  /**
   * Sets a value at a path
   * @param path - Dot-separated path
   * @param value - New value or update function
   */
  private _set(...params: any[]): void {
    let path = params[0];
    let value = params[1];
    let value1 = params[2];
    let value2 = params[3];

    // Get the original state BEFORE any mutations
    const originalState = deepClone(unwrap(this.proxy));
    // const originalState = deepClone(this.getRawState(), [
    //   $RAW,
    //   $PROXY,
    //   $STORE,
    // ]) as Immutable<T>;

    // Deep clone to prevent mutations from affecting the original
    // This is necessary because the set helper mutates nested objects
    const state_clone = untrack(()=>deepClone(structuredClone(originalState)));

    batch(() => {
      const s = set(
        state_clone as any,
        path as any,
        value as any,
        value1 as any,
        value2 as any
      );
      // console.log('set done', s)
      this.mergeState(s, originalState as T);
    });
  }

  /**
   * Mutates a value in-place (for mutable updates)
   * @param path - Dot-separated path to mutate
   * @param mutator - Function that mutates the value directly
   * @throws {Error} When store is in immutable mode
   */
  mutate<P extends SelectorFor<T>>(
    path: P,
    mutator: (value: T | IValueOfKey<T, P>) => void
  ): void {
    if (this.options.immutable) {
      throw new Error('Cannot mutate immutable store');
    }

    this.queueUpdate(() => {
      const currentValue = this.get(path);
      const draft = this.produceDraft(currentValue);
      mutator(draft as any);
      // this.set(path, draft as PathValue<T, P>);
      this.set(path as any, draft as any);
    });
  }

  // ==================== BATCHING API ====================

  // ==================== UTILITY METHODS ====================

  /**
   * Gets a value from a specific path with dependency tracking
   * @param path - Dot-separated path to get
   * @returns The value at the specified path
   */
  get<P extends SelectorFor<T>>(
    path: P
  ): IValueOfKey<T, P> | Partial<T> | undefined {
    const pathStr = path;

    // Special case: empty path means get the whole store
    if (pathStr === '' || pathStr === null || pathStr === undefined) {
      return this.state as IValueOfKey<T, P>;
    }

    const node = this.root.getNode(pathStr);

    if (node) {
      return node.getRaw() as IValueOfKey<T, P>;
    }

    // Fallback to path traversal for non-reactive nodes
    const parts = (pathStr as string).split('.');
    let current: any = this.state;

    for (const part of parts) {
      if (current == null) return undefined as IValueOfKey<T, P>;
      current = current[part];
    }

    return current as IValueOfKey<T, P>;
  }

  /**
   * Creates a reactive selector for derived state
   * @param selector - Function that selects derived state
   * @returns Reactive getter function
   */
  select<U>(selector: (state: Immutable<T>) => U): () => U {
    return createMemo(() => selector(this.state));
  }

  /**
   * Watches for changes to selected state and runs effects
   * @param selector - Function that selects state to watch
   * @param effect - Effect to run when selected state changes
   * @returns Cleanup function
   */
  watch<U>(
    selector: (state: Immutable<T>) => U,
    effect: (value: U, prev: U | undefined) => void
  ): () => void {
    let prev: U | undefined;

    return createEffect(() => {
      const current = selector(this.state);
      if (!deepEqual(current, prev)) {
        effect(current, prev);
        prev = current;
      }
    });
  }

  /**
   * Subscribes to store changes
   * @param listener - Function called on store changes
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: Immutable<T>) => void): () => void {
    return createEffect(() => {
      const currentState = this.state;
      listener(currentState);
    });
  }

  // ==================== ARRAY OPERATIONS ====================

  /**
   * Pushes items to an array path
   * @param path - Path to array
   * @param items - Items to push
   */
  push<P extends SelectorFor<T>>(path: P, ...items: any[]): void {
    const current = this.get(path);
    if (!Array.isArray(current)) {
      throw new Error(`Path ${String(path)} does not point to an array`);
    }

    this.set(path as any, current.slice().concat(items.flat()) as any);
  }

  /**
   * Removes and returns the last item from an array path
   * @param path - Path to array
   * @returns The removed item
   */
  pop<P extends SelectorFor<T>>(path: P): any {
    const current = this.get(path);
    if (!Array.isArray(current)) {
      throw new Error(`Path ${String(path)} does not point to an array`);
    }

    const newArray = current.slice();
    const item = newArray.pop();
    // console.log('before pop');
    this.reconcilePath(path, newArray as any, { merge: false });
    // this.set(path as any, newArray as any);
    // console.log('after pop');
    return item;
  }

  /**
   * Removes and returns the fist item from an array path
   * @param path - Path to array
   * @returns The removed item
   */
  shift<P extends SelectorFor<T>>(path: P): any {
    const current = this.get(path);
    if (!Array.isArray(current)) {
      throw new Error(`Path ${String(path)} does not point to an array`);
    }

    const newArray = current.slice();
    const item = newArray.shift();
    // console.log('before pop');
    this.reconcilePath(path, newArray as any, { merge: false });
    // this.set(path as any, newArray as any);
    // console.log('after pop');
    return item;
  }

  /**
   * Splices items into an array path
   * @param path - Path to array
   * @param start - Start index
   * @param deleteCount - Number of items to delete
   * @param items - Items to insert
   * @returns Array of deleted items
   */
  splice<P extends SelectorFor<T>>(
    path: P,
    start: number,
    deleteCount: number,
    ...items: IValueOfKey<T, P>[]
  ): any[] {
    const current = this.get(path);
    if (!Array.isArray(current)) {
      throw new Error(`Path ${String(path)} does not point to an array`);
    }

    const newArray = current.slice();
    const deleted = newArray.splice(start, deleteCount, ...items);
    this.set(path as any, newArray as any);
    return deleted;
  }

  insert<P extends SelectorFor<T>>(
    path: P,
    index: number,
    value: Flatten<IValueOfKey<T, P>>
  ) {
    const current = this.get(path);
    if (!Array.isArray(current)) {
      throw new Error(`Path ${String(path)} does not point to an array`);
    }

    const newArray = current.slice();
    newArray.splice(index, 0, value);
    this.set(path as any, newArray as any);
  }

  removeAt<P extends SelectorFor<T>>(
    path: P,
    index: number
  ): Flatten<IValueOfKey<T, P>>[] {
    const current = this.get(path);
    if (!Array.isArray(current)) {
      throw new Error(`Path ${String(path)} does not point to an array`);
    }

    const newArray: any[] = current.slice();
    const res = newArray.splice(index, 1);
    this.reconcilePath(path, newArray as any, { merge: false });
    return res;
  }

  private isChanged(diff: DiffResult, path: string) {
    if (diff.added.some((a) => a === path)) {
      return true;
    }
    if (diff.modified.some((a) => a === path)) {
      return true;
    }
    if (diff.deleted.some((a) => a === path)) {
      return true;
    }
    // `diffObjectDetailed` adds nested paths (e.g. 'channels[0]', 'channels[1]')
    // to `modified/added` for array changes, but NOT the top-level key ('channels').
    // However, it always sets `changes[key] = newValue` for any changed property.
    // Check `diff.changes` directly so array/object top-level keys properly
    // trigger their DataNode signals.
    if (diff.changes && typeof diff.changes === 'object' && path in (diff.changes as object)) {
      return true;
    }
    return false;
  }

  /**
   * Merges partial state into the store
   * @param partial - Partial state to merge
   * @param originalState - The state before mutation (for comparison)
   */
  private mergeState(partial: Partial<T>, originalState?: T): void {
    // Use the provided originalState for comparison, or get current if not provided
    const currentState = originalState || deepClone(this.getRawState());

    const newValue = Array.isArray(partial)
      ? partial.slice()
      : ({ ...partial } as any);
    const diff = diffObjectDetailed(
      currentState,
      newValue
    );

    const paths = getPaths(partial as any);
    
    if (diff.hasChanges !== undefined) {
      // Sort paths by depth (deepest first) to ensure leaf properties are updated before parents
      // This prevents parent updates from clearing child signals before they're triggered
      const sortedPaths = [...paths].sort((a, b) => {
        const aDepth = (a as string).split('.').length;
        const bDepth = (b as string).split('.').length;
        return bDepth - aDepth; // Deepest first
      });
      let hasP = false;
      
      // First, trigger all signals with the NEW values from the diff.
      // This must happen BEFORE mutating the data, so signal equality checks work correctly.
      for (const path of sortedPaths) {
        const value = get(partial as any, path as any);
        const pathStr = path as string;
        
        // Handle wildcard paths specially
        if (pathStr.includes('[*]')) {
          this.handleWildcardPath(pathStr, partial);
          continue;
        }
        
        // Only trigger signal if the actual path have change
        if (!this.isChanged(diff, pathStr)) {
          continue;
        }
        if(!hasP){
          hasP= pathStr==='options[0].values[0]'
        }
        this.triggerPathSignals(pathStr, value, partial);
      }
      // console.log('merge state', diff, paths);
      
      // Now apply the diff to the actual current state
      const actualCurrentState = this.getRawState();
      // applyDiff(actualCurrentState as any, diff.changes, true);
      reconcile(newValue, { keepRef: true})(actualCurrentState);
      if(hasP){

        console.log('actual state', actualCurrentState, diff);
      }

      // Update child node values to reflect the new data
      this.updateChildNodeValues(actualCurrentState, hasP);

      // Special handling for arrays: trigger length signal if array length changed
      if (Array.isArray(partial) && Array.isArray(currentState)) {
        if (partial.length !== currentState.length) {
          const lengthSignal = this.root.signals.get('length');
          if (lengthSignal) {
            lengthSignal.$(partial.length);
          }
          // Also trigger the array structure signal
          this.root.SELF?.$(partial.length);
        }
      }
      // Do NOT fire root.SELF for plain-object stores. Individual property
      // signals have already been fired by triggerPathSignals above.
      // Firing SELF here would cause every effect that reads ANY store property
      // (and thus subscribed to SELF) to re-run on every single setState call.
    }
  }

  /**
   * Updates child node values to reflect the new state
   */
  private updateChildNodeValues(state: any, debug?: boolean): void {
    // Recursively update all child nodes with their new values from state
    for (const [key, childNode] of this.root.children.entries()) {
      const newValue = get(state, key as any);
      if(debug){
        console.log('updateChildNodeValues', key, newValue)
      }
      if (newValue !== undefined) {
        // Mutate the existing value object in place to keep proxy references valid
        // throw Error('mutate')
        // console.log('mutate value', newValue, childNode.value)
        this.mutateValue(childNode.value, newValue);
        // Recursively update nested children
        this.updateChildNodeValuesRecursive(childNode, newValue);
        // if(!deepEqual(childNode.value,newValue)){
        // }
      }
    }
  }

  /**
   * Mutates target object/array in place to match source
   */
  private mutateValue(target: any, source: any): void {
    if (!target || typeof target !== 'object') {
      return;
    }

    if (Array.isArray(target) && Array.isArray(source)) {
      // Update array length and elements
      target.length = source.length;
      for (let i = 0; i < source.length; i++) {
        if (target[i] !== source[i]) {
          if (
            typeof source[i] === 'object' &&
            source[i] !== null &&
            typeof target[i] === 'object' &&
            target[i] !== null
          ) {
            this.mutateValue(target[i], source[i]);
          } else {
            target[i] = source[i];
          }
        }
      }
    } else if (!Array.isArray(target) && !Array.isArray(source)) {
      // Update object properties
      // Remove properties that don't exist in source
      for (const key in target) {
        if (!(key in source)) {
          delete target[key];
        }
      }
      // Update/add properties from source
      for (const key in source) {
        if (target[key] !== source[key]) {
          if (
            typeof source[key] === 'object' &&
            source[key] !== null &&
            typeof target[key] === 'object' &&
            target[key] !== null
          ) {
            this.mutateValue(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        }
      }
    }
  }

  /**
   * Recursively updates child node values
   */
  private updateChildNodeValuesRecursive(
    node: StoreNode<any>,
    newValue: any
  ): void {
    if (!newValue || typeof newValue !== 'object') {
      return;
    }

    for (const [key, childNode] of node.children.entries()) {
      const childValue = newValue[key];
      if (childValue !== undefined) {
        // Mutate the existing value in place
        this.mutateValue(childNode.value, childValue);
        this.updateChildNodeValuesRecursive(childNode, childValue);
      }
    }
  }

  /**
   * Handles wildcard path updates like '[*].prop'
   */
  private handleWildcardPath(pathStr: string, state: any): void {
    // Parse wildcard path: '[*].completed' -> update all array elements
    const parts = pathStr.split('.');

    if (parts[0] === '[*]') {
      // Root level wildcard: [*] or [*].prop
      if (Array.isArray(state)) {
        if (parts.length === 1) {
          // Just [*] - trigger all array element signals
          state.forEach((item, index) => {
            const dataNode = this.root.signals.get(String(index));
            if (dataNode) {
              dataNode.$(item);
            }
          });
        } else {
          // [*].prop - update property on all elements
          const propertyName = parts.slice(1).join('.');
          state.forEach((item, index) => {
            const value = get(item, propertyName);
            // Trigger signal on child node if it exists
            const childNode = this.root.children.get(String(index));
            if (childNode) {
              const dataNode = childNode.signals.get(propertyName);
              if (dataNode) {
                dataNode.$(value);
              }
            }
          });
        }
      }
    } else if (parts.length > 1 && parts.some((p) => p === '[*]')) {
      // Nested wildcard like 'items[*].prop' - recursively handle
      const wildcardIndex = parts.indexOf('[*]');
      const beforeWildcard = parts.slice(0, wildcardIndex).join('.');
      const afterWildcard = parts.slice(wildcardIndex + 1).join('.');

      const parentValue = beforeWildcard ? get(state, beforeWildcard) : state;
      if (Array.isArray(parentValue)) {
        parentValue.forEach((item, index) => {
          const value = afterWildcard ? get(item, afterWildcard) : item;
          const fullPath = beforeWildcard
            ? `${beforeWildcard}[${index}]${
                afterWildcard ? '.' + afterWildcard : ''
              }`
            : `[${index}]${afterWildcard ? '.' + afterWildcard : ''}`;
          this.triggerPathSignals(fullPath, value, state);
        });
      }
    }
  }

  /**
   * Triggers signals for a specific path.
   */
  private triggerPathSignals(pathStr: string, value: any, state: any): void {
    const firstDotIndex = pathStr.indexOf('.');
    const isNestedPath = firstDotIndex > 0;
    if (!isNestedPath) {
      // Direct property - extract the actual key
      let propertyKey: PropertyKey;

      // Check if it's array bracket notation like '[0]'
      if (pathStr.startsWith('[') && pathStr.endsWith(']')) {
        // Extract index from '[0]' -> 0 (store as string)
        const indexStr = pathStr.slice(1, -1);
        propertyKey = indexStr;
      } else {
        propertyKey = pathStr;
      }

      // Trigger the property signal on the root node
      const dataNode = this.root.signals.get(propertyKey);
      // (this.proxy as any)[$SELF];
      const n = dataNode && ((dataNode as any)[Symbol.for('signal-node')]);
      if (dataNode && n && n.value!==value) {
        // console.log('node', n)
        dataNode.$(value);
      }
      // Invalidate the cached child StoreNode proxy for this property so that
      // any `createMemo(() => state.someKey)` re-running after the DataNode
      // fires gets a FRESH proxy reference (new reference ≠ old reference →
      // memo equality check fails → downstream litrx / effects re-render).
      //
      // EXCEPTION — array element indices (e.g. propertyKey = '0', '1', …):
      // For-loop renderers (the `For` component) key their entry cache on the
      // proxy reference of each item. If we delete the child StoreNode for an
      // array element, the next `list[i]` read returns a brand-new proxy that
      // doesn't match the stored reference → `For` treats it as a completely
      // new item → disposes the existing reactive root → recreates the DOM node
      // → the focused input is replaced → focus is lost on every keystroke.
      //
      // For array elements we instead rely on `updateChildNodeValues` to mutate
      // the cached child's underlying value in-place. The proxy reference stays
      // stable, `For` correctly identifies the unchanged item, and only the
      // property-level effects (e.g. the reactive `value` binding on the input)
      // fire to apply the new data without touching the DOM structure.
      // Invalidate the cached child StoreNode proxy so that any
      // `createMemo(() => state.someKey)` re-running after the DataNode fires
      // gets a FRESH proxy reference (new reference ≠ old reference →
      // memo equality check fails → downstream litrx / effects re-render).
      //
      // EXCEPTION 1 — array element indices (e.g. propertyKey = '0', '1', …):
      // For-loop renderers key their entry cache on the proxy reference of each
      // item. Deleting the child StoreNode forces a new proxy → For treats it
      // as a new item → disposes reactive root → recreates DOM → focus lost.
      //
      // EXCEPTION 2 — child holds an array value:
      // When `store.options` is an array and `For` reads it via `each={store.options}`,
      // the individual item proxies returned by the array child StoreNode must
      // remain stable across in-place element updates. Deleting the 'options'
      // child StoreNode forces a new array proxy → For's item identity check
      // fails → DOM recreated → focus lost on every keystroke.
      const isArrayElementIndex =
        Array.isArray(this.root.value) &&
        pathStr.startsWith('[') && pathStr.endsWith(']');
      const childHoldsArray = (() => {
        const child = this.root.children.get(propertyKey);
        return child != null && Array.isArray(child.value);
      })();
      if (!isArrayElementIndex && !childHoldsArray) {
        this.root.children.delete(propertyKey);
      }
    } else {
      // Nested path handling
      const pathParts = pathStr.split('.');


      // Handle array element properties like '[0].id' or '[0].tags[0]'
      if (pathParts[0].startsWith('[') && pathParts[0].endsWith(']')) {
        const indexStr = pathParts[0].slice(1, -1);
        const remainingPath = pathParts.slice(1).join('.');

        // Get or create child node for this array element
        let childNode = this.root.children.get(indexStr);


        if (!childNode) {
          // Child node doesn't exist, trigger the parent signal for this index
          const elementValue = (state as any)[parseInt(indexStr, 10)];
          const parentDataNode = this.root.signals.get(indexStr);
          if (parentDataNode) {
            parentDataNode.$(elementValue);
          }
        } else {
          // Trigger signal on the child node for the nested property
          if (remainingPath.includes('.') || remainingPath.includes('[')) {
            // Further nested, recursively handle
            const childValue = get(childNode.value, remainingPath);
            this.triggerNestedSignal(childNode, remainingPath, childValue);
          } else {
            // Direct child property
            const childDataNode = childNode.signals.get(remainingPath);
            if (childDataNode) {
              childDataNode.$(value);
            }
          }
        }
      } else {
        // Regular nested property like 'user.name'
        const firstProp = pathParts[0];
        const remainingPath = pathParts.slice(1).join('.');

        let childNode = this.root.children.get(firstProp);
                if(pathStr==='options[0].values[0]'){
          console.log('spath', {pathStr,remainingPath, childNode})
        }
        if (childNode && remainingPath) {
          this.triggerNestedSignal(childNode, remainingPath, value);
        }
      }
    }
  }

  /**
   * Recursively triggers nested signals
   */
  private triggerNestedSignal(
    node: StoreNode<any>,
    path: string,
    value: any
  ): void {
    const parts = path.split('.');
    if (parts.length === 1) {
      // Leaf property
      const dataNode = node.signals.get(parts[0]);
      if (dataNode) {
        dataNode.$(value);
      }
    } else {
      // Further nested
      const firstPart = parts[0];
      const remainingPath = parts.slice(1).join('.');

      let childKey: string;
      if (firstPart.startsWith('[') && firstPart.endsWith(']')) {
        childKey = firstPart.slice(1, -1);
      } else {
        childKey = firstPart;
      }

      const childNode = node.children.get(childKey);
      if (childNode) {
        this.triggerNestedSignal(childNode, remainingPath, value);
      }
    }
  }

  /**
   * Creates a path in the store if it doesn't exist
   * @param path - Path to create
   * @param value - Value to set
   */
  private createPath(path: string, value: any): void {
    const parts = path.split('.');
    if (parts.length === 0) {
      return;
    }
    let current: any = this.root.getProxy();
    // if (Array.isArray(value)) {
    //   console.log('create path', { current, value, parts });
    // }
    setValueAtPath(current, parts.join('.'), value);
    this.root.getProxy();
    // Trigger update
    // this.root.set(this.root.get());
  }

  /**
   * Produces a draft copy for mutation
   * @param value - Value to draft
   * @returns Draft copy
   */
  private produceDraft<T>(value: T): T {
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        return [...value] as T;
      } else {
        return { ...value };
      }
    }
    return value;
  }

  /**
   * Reconciles a specific path
   */
  private reconcilePath<P extends SelectorFor<T>>(
    path: P,
    value: PathValue<T, P> | ((prev: PathValue<T, P>) => PathValue<T, P>),
    options: ReconcileOptions
  ): void {
    const node = this.root.getNode(path);
    if (!node) {
      // Create new path if it doesn't exist
      const newValue = isFunction(value)
        ? (value as (prev: any) => any)(get(this.getRawState() as any, path))
        : value;
      this.createPath(path as string, newValue);
      return;
    }

    // const current = node.get()();
    // const current = node.get();
    const current = node.getRaw();
    const nextValue = isFunction(value)
      ? (value as (prev: any) => any)(current)
      : value;
    if (Array.isArray(nextValue)) {
      console.log('reconciling', { nextValue, value });
    }

    const reconciled = node.reconcile(nextValue, options);
    if (!deepEqual(reconciled, current)) {
      // console.log('node reconciled');
      node.set(reconciled);
    }
  }
  /**
   * Cleans up store resources
   */
  dispose(): void {
    this.root.dispose();
  }
}

// ==================== COMPUTED STORE ====================

/**
 * Creates a computed store that derives its state from other stores or signals
 * @param fn - Derivation function
 * @param options - Store options
 * @returns Computed store instance
 */
function createComputedStore<T>(
  fn: () => T,
  options: StoreOptions<T> = {}
): Store<T> {
  const [computedState, setComputedState] = createSignal(fn());

  // Update computed state when dependencies change
  createEffect(() => {
    const newState = fn();
    setComputedState(newState);
  });

  // Create store with computed state
  const store = new Store(fn(), options);

  // Keep store in sync with computed state
  createEffect(() => {
    const newState: any = computedState();
    store.batch(() => {
      Object.keys(newState).forEach((key) => {
        store.set(key as any, (newState as any)[key]);
      });
    });
  });

  return store;
}

// ==================== STORE CREATION FUNCTIONS ====================

/**
 * Creates a new reactive store
 * @param initialState - Initial store state
 * @param options - Store configuration options
 * @returns Store instance
 */
function createStore<T>(
  initialState: T,
  options: StoreOptions<T> = { immutable: true }
): [Immutable<T>, Store<T>['set']] {
  const store = new Store(deepClone(initialState), options);
  const setter = store.set;
  store.bindProps(setter, store);
  Object.defineProperty(store.proxy, $PROXY, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: true,
  });
  // Object.defineProperty(store.proxy, $RAW, {
  //   value: store,
  //   enumerable: true,
  // });
  return [store.proxy as Immutable<T>, setter];
}

/**
 * Creates a mutable store that allows direct mutation
 * @param initialState - Initial store state
 * @param options - Store configuration options
 * @returns Mutable store instance
 */
function createMutableStore<T>(
  initialState: T,
  options: Omit<StoreOptions<T>, 'immutable'> = {}
): Store<T> {
  return new Store(initialState, { ...options, immutable: false });
}

// ==================== REACTIVE UTILITIES ====================

/**
 * Creates a store effect that automatically disposes with the store
 * @param store - Store to watch
 * @param selector - State selector function
 * @param effect - Effect to run when selected state changes
 * @returns Cleanup function
 */
function createStoreEffect<T, U>(
  state: Immutable<T>,
  selector: (state: Immutable<T>) => U,
  effect: (value: U) => void | (() => void)
): () => void {
  return createEffect(() => {
    const value = selector(state);
    return effect(value);
  });
}

/**
 * Creates a memoized selector for store state
 * @param store - Store to select from
 * @param selector - Selector function
 * @param options - Memo options
 * @returns Memoized selector function
 */
function createStoreMemo<T, U>(
  store: Store<T>,
  selector: (state: Immutable<T>) => U,
  options?: MemoOptions<U>
): () => U {
  return createMemo(() => selector(store.state), undefined, options);
}

/**
 * Wraps a value in a reactive store
 * @param value - Value to wrap
 * @param options - Store options
 * @returns Reactive store accessor
 */
function wrap<U extends object>(
  value: U,
  options: StoreOptions<U> = {}
): StoreAccessor<U> {
  return Store.wrap(value, options);
}

type StoreWrap<T> = Store<T> | StoreAccessor<T> | (() => T);

/**
 * Unwraps a store to get raw value
 * @param store - Store or store accessor to unwrap
 * @returns Raw value
 */
function unwrap<T>(store: T): T {
  if (typeof store === 'undefined' || store === null) {
    return store;
  }

  if (store instanceof Store) {
    return store.unwrap();
  }

  return deserialize(store);
}

function untrackStore<T>(store: T): T {
  return untrack(() => unwrap(store));
}

/**
 * Recursively strips store proxy wrappers and symbol markers ($RAW, $PROXY) from
 * a value at ALL nesting levels.
 *
 * Previous implementation used deepClone(value, [$RAW, $PROXY]) which only stripped
 * those symbols at the top level — recursive deepClone calls inside don't forward
 * skipKeys. Also, nested object properties were returned as-is (no recursive
 * processing), so nested store proxies or objects with $PROXY set were not unwrapped.
 */
function deserialize<T>(store: T): T {
  if (store == null || (typeof store !== 'object' && typeof store !== 'function')) {
    return store;
  }

  const raw: any = typeof store === 'function' ? (store as any)() : store;

  // Store proxy — follow $RAW to get the underlying plain target, then recurse
  const rawValue = raw[$RAW];
  if (rawValue !== undefined) {
    return deserialize(rawValue as T);
  }

  // Array — recursively deserialize each element
  if (Array.isArray(raw)) {
    return raw.map((item: any) => deserialize(item)) as T;
  }

  // Special built-ins that deepClone handles; delegate to it (they never carry $PROXY)
  if (raw instanceof Date) return new Date(raw.getTime()) as T;
  if (raw instanceof RegExp) return new RegExp(raw.source, raw.flags) as T;
  if (raw instanceof Map) {
    const m = new Map();
    raw.forEach((v: any, k: any) => m.set(k, deserialize(v)));
    return m as T;
  }
  if (raw instanceof Set) {
    const s = new Set();
    raw.forEach((v: any) => s.add(deserialize(v)));
    return s as T;
  }

  // Plain object — copy string-keyed properties recursively, skip $RAW/$PROXY symbols
  const result: any = {};
  for (const key of Object.keys(raw)) {
    result[key] = deserialize(raw[key]);
  }
  // Copy any user-defined symbol keys (but strip store internals)
  for (const sym of Object.getOwnPropertySymbols(raw)) {
    if (sym !== $RAW && sym !== $PROXY) {
      result[sym] = deserialize(raw[sym]);
    }
  }
  return result as T;
}

export function isStore<T>(store: StoreWrap<T>): store is StoreAccessor<T> {
  return (
    typeof store === 'function' &&
    store.length === 0 &&
    $RAW in store &&
    typeof (store as any)[$RAW] !== 'undefined'
  );
}

export function getNode<T>(store: StoreWrap<T>): Accessor<T> | null {
  if (isStore(store)) {
    return (store as any)[$RAW] as Accessor<T>;
  }
  return null;
}

export function storesAsSignal<T>(store: Store<T>, key?: string): any {
  const node = store.getNode(key!);
  if (node) {
    const [s] = node.getPropSignal(key!);
    return s;
  }
  return null;
}

export {
  createStore,
  createMutableStore,
  createComputedStore,
  createStoreEffect,
  createStoreMemo,
  wrap,
  unwrap,
  untrackStore,
  StoreNode,
  Store,
};

// Helper functions
export function getStoreNode<T>(store: any): StoreNode<T> | null {
  if (store && typeof store === 'object' && $NODE in store) {
    return store[$NODE] as StoreNode<T>;
  }
  return null;
}

export function isStoreProxy(value: any): boolean {
  return value && typeof value === 'object' && ($PROXY in value || (value as any).__proxy === true);
}

export function modifiable<T extends object>(value: T): T {
  return value;
}

export const StoreAPI = Object.freeze({
  createStore,
  createMutableStore,
  createComputedStore,
  batch,
  unwrap,
  untrackStore,
  wrap,
});

export type { StoreOptions, StoreSetter, Immutable, StoreAccessor };
