// Instrumentation over the real @fluixi/reactive primitives.
// signal/memo/effect/store/resource behave like the core ones but register each node + each read
// into a graph. A read is a subscription, so edges come from real reads; writes (setX) made inside
// a consumer become write edges. Nodes carry the live core node so the inspector reads the real
// version + CLEAN/CHECK/DIRTY state, and onCleanup removes a node when its owner disposes.
import {
  createSignal,
  createMemo,
  createEffect,
  createResource,
  createRoot,
  untrack,
  onCleanup,
  getOwner,
  runWithOwner,
  Signal,
  signal,
  memo,
  effect,
  resource,
} from '@fluixi/reactive/signal';
import { createStore, Immutable, store, StoreSetter } from '@fluixi/reactive/store';
import { componentSource, installSourceMarker, takeReactiveSource, type ReactiveSourceLocation } from './source.js';
import { formatValue, shorten } from './format.js';

const $NODE = Symbol.for('signal-node');

export type NodeKind = 'state' | 'memo' | 'effect' | 'store' | 'resource' | 'component';
export type NodeState = 'clean' | 'check' | 'dirty';

export interface RNode {
  id: number;
  label: string;
  kind: NodeKind;
  /** Source ids read on the last run (read edges: source → this). */
  deps: Set<number>;
  /** Signal ids written while this node ran (write edges: this → signal). */
  writes: Set<number>;
  /** Untracked snapshot reader (state / memo / resource). */
  read?: () => unknown;
  /** Last serialized value, for change detection / display. */
  value?: string;
  /** The same value with room to read it — what a tooltip or an inspector shows. */
  detail?: string;
  /** Times this node recomputed / re-ran. */
  runs: number;
  /** performance.now() of the last change — drives the flash. */
  lastPulse: number;
  /** Live core node, when reachable — gives the real version + state. */
  core?: { version?: number; state?: number } | null;
  /** Where the author created this node, when the compiler said so. Always optional. */
  source?: ReactiveSourceLocation;
  /**
   * The node whose run created this one. A component's memo reads nothing of its own, so
   * what it created is what connects it to the rest of the graph.
   */
  createdIn?: number;
  /**
   * Components only: where the component itself was declared, which is a different place
   * from where it was used and the node made.
   */
  declaredAt?: ReactiveSourceLocation;
  /** Resource only. */
  loading?: boolean;
  depth?: number;
}

const CORE_STATE: Record<number, NodeState> = { 0: 'clean', 1: 'check', 2: 'dirty' };
/** The real version (signals/memos) or recompute count fallback. */
export function nodeVersion(n: RNode): number {
  return n.core && typeof n.core.version === 'number' ? n.core.version : n.runs;
}
/** The real CLEAN/CHECK/DIRTY state when the core node is reachable (memos), else undefined. */
export function nodeState(n: RNode): NodeState | undefined {
  return n.core && typeof n.core.state === 'number' ? CORE_STATE[n.core.state] : undefined;
}

export interface ReactorApi {
  createSignal<T>(
    value: T,
    options?: { name?: string; equals?: false | ((a: T, b: T) => boolean) }
  ): [() => T, (v: T | ((prev: T) => T)) => T];
  // (fn, value?, options?) — matching the real createMemo. Declaring options second read
  // `{ name: 'double' }` as the initial value, so a named memo showed up as m1.
  createMemo<T>(fn: () => T, value?: T, options?: { name?: string }): () => T;
  createEffect(fn: () => void, options?: { name?: string }): void;
  createStore<T extends object>(
    initial: T,
    options?: { name?: string; immutable?: boolean }
  ): [T, (...args: unknown[]) => void];
  createResource(
    ...args: unknown[]
  ): [(() => unknown) & Record<string, unknown>, unknown];
  signal<T>(
    value: T,
    options?: { name?: string; equals?: false | ((a: T, b: T) => boolean) }
  ): (() => T) & ((v: T | ((prev: T) => T)) => T);
  memo<T>(fn: () => T, value?: T, options?: { name?: string }): () => T;
  effect(fn: () => void, options?: { name?: string }): void;
  store<T extends object>(
    initial: T,
    options?: { name?: string; immutable?: boolean }
  ): Immutable<T> & { set: StoreSetter<T> };
  resource<T extends object, S>(
    fetcher: (source: S) => T | Promise<T>,
    source?: ()=>S,
    options?: { name?: string; initialValue?: T | (() => T) }
  ): ()=>T | undefined & {
    loading: boolean;
    error: unknown;
    refetch: () => void;
  };
}

export interface Reactor {
  readonly graph: Map<number, RNode>;
  run(setup: (api: ReactorApi) => void): void;
  sample(): number[];
  dispose(): void;
}

// Kept as the names the rest of this package already uses.
export const fmt = (v: unknown): string => formatValue(v);
export const short = (s: string, n = 18): string => shorten(s, n);

export function createReactor(): Reactor {
  installSourceMarker();

  const graph = new Map<number, RNode>();
  /** Run counts as of the last sample, so a node with no readable value can still pulse. */
  const runsAtLastSample = new Map<number, number>();
  /** Nodes still carrying a positional label, so a better one can replace it later. */
  const unnamed = new Set<number>();
  const consumerStack: number[] = [];
  let seq = 0;
  let dispose = () => {};
  // The root's owner, kept so a node created after `run` returned still has somewhere to
  // hang its cleanup. A project's modules load asynchronously, so most registration lands
  // well after the synchronous setup — with no owner, `onCleanup` runs immediately and the
  // node disappears the moment it is made, which is why the graph came up empty.
  let rootOwner: ReturnType<typeof getOwner> = null;

  /** Remove a node when whatever created it goes away, or when the reactor is torn down. */
  const forget = (id: number) => {
    const owner = getOwner() ?? rootOwner;
    if (owner) {
      runWithOwner(owner, () =>
        onCleanup(() => {
          graph.delete(id);
          runsAtLastSample.delete(id);
          unnamed.delete(id);
        }),
      );
    }
  };

  const recordRead = (sourceId: number) => {
    const c = consumerStack[consumerStack.length - 1];
    if (c != null) graph.get(c)?.deps.add(sourceId);
  };
  const recordWrite = (targetId: number) => {
    const c = consumerStack[consumerStack.length - 1];
    if (c != null && c !== targetId) graph.get(c)?.writes.add(targetId);
  };
  // Every tracked primitive comes through here, so it is the one place a mark is taken. An
  // explicit `{ name }` wins; otherwise the node borrows the variable name the compiler
  // read, which is why `const count = signal(0)` shows as `count` rather than `s0`.
  const base = (id: number, named: string | undefined, kind: NodeKind, fallback: string): RNode => {
    const mark = takeReactiveSource();
    if (!named && !mark?.name) unnamed.add(id);
    return {
      id,
      label: named ?? mark?.name ?? fallback,
      kind,
      deps: new Set(),
      writes: new Set(),
      runs: 0,
      lastPulse: 0,
      ...(mark?.location ? { source: mark.location } : {}),
    };
  };

  const trackedCreateSignal: ReactorApi['createSignal'] = (value, options) => {
    const id = seq++;
    const [get, set] = createSignal(value, options as never);
    const node = base(id, options?.name, 'state', `s${id}`);
    node.read = () => untrack(get);
    node.detail = formatValue(value);
    node.value = shorten(node.detail);
    node.core = (get as unknown as Record<symbol, { version?: number }>)[$NODE] ?? null;
    graph.set(id, node);
    forget(id);
    const read = () => {
      recordRead(id);
      return get();
    };
    const write = (v: unknown) => {
      recordWrite(id);
      return set((typeof v === 'function' ? (v as (p: unknown) => unknown)(untrack(get)) : v) as never);
    };
    return [read, write as never];
  };

  const trackedCreateMemo: ReactorApi['createMemo'] = (fn, value, options) => {
    const id = seq++;
    const node = base(id, options?.name, 'memo', `m${id}`);
    graph.set(id, node);
    forget(id);
    const m = createMemo(() => {
      node.core ??= Signal.subtle.currentComputed() as never; // capture the live Computed
      node.deps.clear();
      node.writes.clear();
      node.runs++;
      consumerStack.push(id);
      try {
        return fn();
      } finally {
        consumerStack.pop();
      }
    }, value, options as never);
    node.read = () => untrack(m);
    return () => {
      recordRead(id);
      return m();
    };
  };

  const trackedCreateEffect: ReactorApi['createEffect'] = (fn, options) => {
    const id = seq++;
    const node = base(id, options?.name, 'effect', `e${id}`);
    graph.set(id, node);
    forget(id);
    createEffect(() => {
      node.core ??= Signal.subtle.currentComputed() as never;
      node.deps.clear();
      node.writes.clear();
      node.runs++;
      node.lastPulse = performance.now();
      consumerStack.push(id);
      try {
        fn();
      } finally {
        consumerStack.pop();
      }
    });
  };

  const trackedCreateStore: ReactorApi['createStore'] = (initial, options) => {
    const id = seq++;
    const [proxy, setter] = createStore(initial as object, { immutable: true, ...(options as object) } as never);
    const node = base(id, options?.name, 'store', `store${id}`);
    node.read = () => {
      try {
        return untrack(() => JSON.stringify(proxy));
      } catch {
        return '{…}';
      }
    };
    node.value = '{…}';
    graph.set(id, node);
    forget(id);
    const recording = new Proxy(proxy as object, {
      get(t, p, r) {
        recordRead(id);
        return Reflect.get(t, p, r);
      },
    });
    const write = (...args: unknown[]) => {
      recordWrite(id);
      return (setter as (...a: unknown[]) => unknown)(...args);
    };
    return [recording, write] as never;
  };

  const trackedCreateResource: ReactorApi['createResource'] = (...args) => {
    const id = seq++;
    const last = args[args.length - 1];
    const name = last && typeof last === 'object' && !Array.isArray(last) && typeof last !== 'function' ? (last as { name?: string }).name : undefined;
    const node = base(id, name, 'resource', `res${id}`);
    const [data, actions] = (createResource as unknown as (...a: unknown[]) => [Record<string, unknown> & (() => unknown), unknown])(...args);
    node.read = () => {
      try {
        return untrack(() => ((data as Record<string, unknown>).loading ? '⏳ loading' : JSON.stringify((data as Record<string, unknown>).latest)));
      } catch {
        return '?';
      }
    };
    node.value = '⏳ loading';
    graph.set(id, node);
    forget(id);
    const accessor = (() => {
      recordRead(id);
      return (data as () => unknown)();
    }) as (() => unknown) & Record<string, unknown>;
    for (const k of ['loading', 'error', 'latest', 'state']) {
      Object.defineProperty(accessor, k, { get: () => (data as Record<string, unknown>)[k] });
    }
    return [accessor, actions];
  };

  // The short API is the long one with a handle around it — `signal` is
  // `Object.assign(createSignal(...), { set })`, `memo` and `effect` are the same function
  // under another name. Deriving them keeps one definition of what tracking means, instead
  // of a second copy of the node bookkeeping that drifts from the first.
  const trackedSignal: ReactorApi['signal'] = (value, options) => {
    const [read, write] = trackedCreateSignal(value, options);
    Object.defineProperty(read, 'set', { value: write });
    return read as never;
  };

  const trackedMemo: ReactorApi['memo'] = trackedCreateMemo;
  const trackedEffect: ReactorApi['effect'] = trackedCreateEffect;

  const trackedStore: ReactorApi['store'] = (initial, options) => {
    const [state, set] = trackedCreateStore(initial, options);
    // A wrapper rather than assigning onto the state: the proxy is the tracking boundary,
    // and writing a key through it would read as a state change.
    return new Proxy(state as object, {
      get: (target, key) => (key === 'set' ? set : (target as Record<PropertyKey, unknown>)[key]),
      has: (target, key) => key === 'set' || Reflect.has(target, key),
    }) as never;
  };

  const trackedResource: ReactorApi['resource'] = (...args) => {
    const [accessor, controls] = trackedCreateResource(...(args as unknown[]));
    return Object.assign(accessor, controls as object) as never;
  };

  const api: ReactorApi = {
    createSignal: trackedCreateSignal,
    createMemo: trackedCreateMemo,
    createEffect: trackedCreateEffect,
    createStore: trackedCreateStore,
    createResource: trackedCreateResource,
    signal: trackedSignal,
    memo: trackedMemo,
    store: trackedStore,
    effect: trackedEffect,
    resource: trackedResource
  };

  return {
    graph,
    run(setup) {
      dispose();
      graph.clear();
      runsAtLastSample.clear();
      unnamed.clear();
      seq = 0;
      consumerStack.length = 0;
      createRoot((d) => {
        dispose = d;
        rootOwner = getOwner();
        setup(api);
      });
    },
    sample() {
      const changed: number[] = [];
      // Date.now rather than performance.now: the reactor may run in one realm and the view
      // in another — an iframe preview does exactly that — and each realm's performance
      // clock has its own origin, so the age the view computed was nonsense and nothing
      // ever pulsed.
      const now = Date.now();
      for (const node of graph.values()) {
        // An effect has no value to read, so what marks it as having done something is the
        // run count the wrapper keeps. Without this an effect never pulsed.
        if (!node.read) {
          const seen = runsAtLastSample.get(node.id);
          if (seen !== undefined && node.runs > seen) {
            node.lastPulse = now;
            changed.push(node.id);
          }
          runsAtLastSample.set(node.id, node.runs);
          continue;
        }
        const raw = node.read();
        // The compiler wraps each component in a memo, and `createComponent` stamps the
        // component's name on what it returns. A memo that has no name of its own is that
        // wrapper, so it can say `Counter` rather than `m5`.
        // The runtime stamps a component's name on what it returned, so a memo holding
        // that is the wrapper the compiler put round a component. Not gated on the node
        // being unnamed: the compiler marks the tag with the component's name too, which
        // would leave the node named and never recognised.
        const stamped = (raw as { $name?: unknown })?.$name;
        if (node.kind === 'memo' && typeof stamped === 'string' && stamped) {
          // Still a memo underneath. This only says so, so a renderer can draw it as what
          // the author wrote rather than as the wrapper around it.
          node.kind = 'component';
          // `source` stays what it is for every other node — where this one was created,
          // which for a wrapper is where the tag was written. Where the component itself
          // lives is a second fact, and it stands in for the first when nothing marked it.
          node.declaredAt = componentSource(stamped);
          node.source ??= node.declaredAt;
          if (unnamed.has(node.id)) {
            node.label = stamped;
            unnamed.delete(node.id);
          }
        }
        const detail = formatValue(raw);
        const next = shorten(detail);
        if (next !== node.value || detail !== node.detail) {
          node.detail = detail;
          node.value = next;
          node.runs++;
          node.lastPulse = now;
          changed.push(node.id);
        }
        runsAtLastSample.set(node.id, node.runs);
      }
      return changed;
    },
    dispose() {
      dispose();
      dispose = () => {};
    },
  };
}
