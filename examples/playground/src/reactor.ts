// Instrumented reactive sandbox for the playground.
// Wraps the real @fluixi/reactive primitives; each signal/memo/effect a snippet makes registers
// into a graph. Edges come from real reads (a read is a subscription) — the actual dep graph, not
// a mock. Values re-read untracked each frame; effects count their own runs → the graph animates
// as the core propagates.
import { createSignal, createMemo, createEffect, createRoot, untrack } from '@fluixi/reactive/signal';

export type NodeKind = 'state' | 'memo' | 'effect';

export interface RNode {
  id: number;
  label: string;
  kind: NodeKind;
  /** Source node ids this node read on its last run (incoming edges). */
  deps: Set<number>;
  /** Untracked snapshot reader (state + memo). */
  read?: () => unknown;
  /** Last serialized value, for change detection / display. */
  value?: string;
  /** Total times this node recomputed / re-ran (the "pulse" count). */
  runs: number;
  /** performance.now() of the last change — drives the flash animation. */
  lastPulse: number;
  /** Layout (filled by the renderer). */
  depth?: number;
}

export interface ReactorHandle {
  graph: Map<number, RNode>;
  /** Refresh value snapshots; returns ids that changed this tick. */
  sample(): number[];
  dispose(): void;
  error: string | null;
}

const $NODE = Symbol.for('signal-node');
const fmt = (v: unknown): string => {
  try {
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'function') return 'ƒ';
    if (typeof v === 'object' && v) return Array.isArray(v) ? `[${v.length}]` : '{…}';
    return String(v);
  } catch {
    return '?';
  }
};

/**
 * Compile + run a snippet. Returns a handle whose `graph` the inspector reads and whose
 * `sample()` the animation loop polls. The snippet runs inside a `createRoot` so a re-run
 * disposes the previous effects cleanly.
 */
export function runSnippet(code: string, previewEl: HTMLElement): ReactorHandle {
  const graph = new Map<number, RNode>();
  const consumerStack: number[] = [];
  let seq = 0;
  let dispose = () => {};

  const recordRead = (sourceId: number) => {
    const c = consumerStack[consumerStack.length - 1];
    if (c != null) graph.get(c)?.deps.add(sourceId);
  };

  // ---- sandbox API ----------------------------------------------------------
  function signal<T>(initial: T, label?: string) {
    const id = seq++;
    const [get, set] = createSignal<T>(initial);
    const node: RNode = { id, label: label ?? `s${id}`, kind: 'state', deps: new Set(), runs: 0, lastPulse: 0, read: () => untrack(get) };
    node.value = fmt(initial);
    graph.set(id, node);
    const accessor = (() => {
      recordRead(id);
      return get();
    }) as { (): T; set: (v: T | ((p: T) => T)) => void; id: number };
    accessor.set = (v) => set((typeof v === 'function' ? (v as (p: T) => T)(untrack(get)) : v) as T);
    accessor.id = id;
    return accessor;
  }

  function memo<T>(fn: () => T, label?: string) {
    const id = seq++;
    const node: RNode = { id, label: label ?? `m${id}`, kind: 'memo', deps: new Set(), runs: 0, lastPulse: 0 };
    graph.set(id, node);
    const m = createMemo<T>(() => {
      node.deps.clear();
      node.runs++;
      consumerStack.push(id);
      try {
        return fn();
      } finally {
        consumerStack.pop();
      }
    });
    node.read = () => untrack(m);
    const accessor = (() => {
      recordRead(id);
      return m();
    }) as { (): T; id: number };
    accessor.id = id;
    return accessor;
  }

  function effect(fn: () => void, label?: string) {
    const id = seq++;
    const node: RNode = { id, label: label ?? `e${id}`, kind: 'effect', deps: new Set(), runs: 0, lastPulse: 0 };
    graph.set(id, node);
    createEffect(() => {
      node.deps.clear();
      node.runs++;
      node.lastPulse = performance.now();
      consumerStack.push(id);
      try {
        fn();
      } finally {
        consumerStack.pop();
      }
    });
  }

  // ---- preview helpers (real interactive DOM, bound via effects) -------------
  const ui = {
    /** A live text node bound to `fn` (creates a render-effect — visible in the graph). */
    text(fn: () => unknown, label?: string) {
      const span = document.createElement('span');
      span.className = 'pv-text';
      effect(() => (span.textContent = String(fn())), label ?? 'view');
      previewEl.appendChild(span);
      return span;
    },
    label(text: string) {
      const span = document.createElement('span');
      span.className = 'pv-label';
      span.textContent = text;
      previewEl.appendChild(span);
      return span;
    },
    button(text: string, onClick: () => void) {
      const b = document.createElement('button');
      b.className = 'pv-btn';
      b.textContent = text;
      b.addEventListener('click', onClick);
      previewEl.appendChild(b);
      return b;
    },
    row(...nodes: Node[]) {
      const d = document.createElement('div');
      d.className = 'pv-row';
      nodes.forEach((n) => d.appendChild(n));
      previewEl.appendChild(d);
      return d;
    },
  };

  let error: string | null = null;
  previewEl.innerHTML = '';
  try {
    const fn = new Function('signal', 'memo', 'effect', 'ui', `"use strict";\n${code}`);
    createRoot((d) => {
      dispose = d;
      fn(signal, memo, effect, ui);
    });
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  const handle: ReactorHandle = {
    graph,
    error,
    dispose,
    sample() {
      const changed: number[] = [];
      const now = performance.now();
      for (const node of graph.values()) {
        if (!node.read) continue; // effects update via their own run counter
        const next = fmt(node.read());
        if (next !== node.value) {
          node.value = next;
          node.runs++;
          node.lastPulse = now;
          changed.push(node.id);
        }
      }
      return changed;
    },
  };
  return handle;
}
