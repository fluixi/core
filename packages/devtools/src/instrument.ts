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
  Signal,
} from '@fluixi/reactive/signal';
import { createStore } from '@fluixi/reactive/store';

const $NODE = Symbol.for('signal-node');

export type NodeKind = 'state' | 'memo' | 'effect' | 'store' | 'resource';
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
  /** Times this node recomputed / re-ran. */
  runs: number;
  /** performance.now() of the last change — drives the flash. */
  lastPulse: number;
  /** Live core node, when reachable — gives the real version + state. */
  core?: { version?: number; state?: number } | null;
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
  createSignal<T>(value: T, options?: { name?: string; equals?: false | ((a: T, b: T) => boolean) }): [() => T, (v: T | ((prev: T) => T)) => T];
  createMemo<T>(fn: () => T, options?: { name?: string }): () => T;
  createEffect(fn: () => void, options?: { name?: string }): void;
  createStore<T extends object>(initial: T, options?: { name?: string; immutable?: boolean }): [T, (...args: unknown[]) => void];
  createResource(...args: unknown[]): [((() => unknown) & Record<string, unknown>), unknown];
}

export interface Reactor {
  readonly graph: Map<number, RNode>;
  run(setup: (api: ReactorApi) => void): void;
  sample(): number[];
  dispose(): void;
}

const fmt = (v: unknown): string => {
  try {
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'function') return 'ƒ';
    if (typeof v === 'bigint') return `${v}n`;
    if (typeof v === 'object' && v) return JSON.stringify(v);
    return String(v);
  } catch {
    return '?';
  }
};
const short = (s: string, n = 18): string => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function createReactor(): Reactor {
  const graph = new Map<number, RNode>();
  const consumerStack: number[] = [];
  let seq = 0;
  let dispose = () => {};

  const recordRead = (sourceId: number) => {
    const c = consumerStack[consumerStack.length - 1];
    if (c != null) graph.get(c)?.deps.add(sourceId);
  };
  const recordWrite = (targetId: number) => {
    const c = consumerStack[consumerStack.length - 1];
    if (c != null && c !== targetId) graph.get(c)?.writes.add(targetId);
  };
  const base = (id: number, label: string, kind: NodeKind): RNode => ({
    id,
    label,
    kind,
    deps: new Set(),
    writes: new Set(),
    runs: 0,
    lastPulse: 0,
  });

  const trackedCreateSignal: ReactorApi['createSignal'] = (value, options) => {
    const id = seq++;
    const [get, set] = createSignal(value, options as never);
    const node = base(id, options?.name ?? `s${id}`, 'state');
    node.read = () => untrack(get);
    node.value = short(fmt(value));
    node.core = (get as unknown as Record<symbol, { version?: number }>)[$NODE] ?? null;
    graph.set(id, node);
    onCleanup(() => graph.delete(id));
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

  const trackedCreateMemo: ReactorApi['createMemo'] = (fn, options) => {
    const id = seq++;
    const node = base(id, options?.name ?? `m${id}`, 'memo');
    graph.set(id, node);
    onCleanup(() => graph.delete(id));
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
    });
    node.read = () => untrack(m);
    return () => {
      recordRead(id);
      return m();
    };
  };

  const trackedCreateEffect: ReactorApi['createEffect'] = (fn, options) => {
    const id = seq++;
    const node = base(id, options?.name ?? `e${id}`, 'effect');
    graph.set(id, node);
    onCleanup(() => graph.delete(id));
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
    const node = base(id, options?.name ?? `store${id}`, 'store');
    node.read = () => {
      try {
        return untrack(() => JSON.stringify(proxy));
      } catch {
        return '{…}';
      }
    };
    node.value = '{…}';
    graph.set(id, node);
    onCleanup(() => graph.delete(id));
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
    const node = base(id, name ?? `res${id}`, 'resource');
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
    onCleanup(() => graph.delete(id));
    const accessor = (() => {
      recordRead(id);
      return (data as () => unknown)();
    }) as (() => unknown) & Record<string, unknown>;
    for (const k of ['loading', 'error', 'latest', 'state']) {
      Object.defineProperty(accessor, k, { get: () => (data as Record<string, unknown>)[k] });
    }
    return [accessor, actions];
  };

  const api: ReactorApi = {
    createSignal: trackedCreateSignal,
    createMemo: trackedCreateMemo,
    createEffect: trackedCreateEffect,
    createStore: trackedCreateStore,
    createResource: trackedCreateResource,
  };

  return {
    graph,
    run(setup) {
      dispose();
      graph.clear();
      seq = 0;
      consumerStack.length = 0;
      createRoot((d) => {
        dispose = d;
        setup(api);
      });
    },
    sample() {
      const changed: number[] = [];
      const now = performance.now();
      for (const node of graph.values()) {
        if (!node.read) continue;
        const next = short(fmt(node.read()));
        if (next !== node.value) {
          node.value = next;
          node.runs++;
          node.lastPulse = now;
          changed.push(node.id);
        }
      }
      return changed;
    },
    dispose() {
      dispose();
      dispose = () => {};
    },
  };
}
