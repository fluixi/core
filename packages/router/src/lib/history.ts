/**
 * @fileoverview Pluggable history backends.
 *
 * The router core depends only on the {@link HistoryAdapter} interface, so it
 * runs identically in tests/SSR (memory) and the browser (History API).
 */

import type { HistoryAction, HistoryAdapter } from './types.js';

let keys = 0;
const nextKey = () => `${Date.now().toString(36)}-${(keys++).toString(36)}`;

/** Split a full path string into pathname / search / hash. */
export function splitPath(to: string): {
  pathname: string;
  search: string;
  hash: string;
} {
  let rest = to;
  let hash = '';
  const hashIdx = rest.indexOf('#');
  if (hashIdx !== -1) {
    hash = rest.slice(hashIdx);
    rest = rest.slice(0, hashIdx);
  }
  let search = '';
  const qIdx = rest.indexOf('?');
  if (qIdx !== -1) {
    search = rest.slice(qIdx);
    rest = rest.slice(0, qIdx);
  }
  return { pathname: rest || '/', search, hash };
}

/**
 * In-memory history: for tests and server-side rendering. Holds a stack of
 * entries; `push`/`replace` mutate it and notify subscribers synchronously.
 */
export function createMemoryHistory(initial = '/'): HistoryAdapter & { go(delta: number): void } {
  let entries: Array<{ path: string; state: unknown; key: string }> = [
    { path: initial, state: null, key: nextKey() },
  ];
  let index = 0;
  let action: HistoryAction = 'pop';
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    get() {
      const { path, state, key } = entries[index];
      return { ...splitPath(path), state, key, action };
    },
    push(to, state = null) {
      entries = entries.slice(0, index + 1);
      entries.push({ path: to, state, key: nextKey() });
      index = entries.length - 1;
      action = 'push';
      notify();
    },
    replace(to, state = null) {
      entries[index] = { path: to, state, key: nextKey() };
      action = 'replace';
      notify();
    },
    /** Back (`-1`) or forward (`1`), as the browser's buttons would. */
    go(delta: number) {
      const next = index + delta;
      if (next < 0 || next >= entries.length) return;
      index = next;
      action = 'pop';
      notify();
    },
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}

/**
 * Browser history backed by the History API. `pushState`/`replaceState` do NOT
 * emit `popstate`, so the adapter keeps its own listener set and notifies on
 * push/replace AND on popstate (back/forward). This makes the history adapter
 * the single source of change notification for the router.
 */
export function createBrowserHistory(): HistoryAdapter {
  const w = typeof window !== 'undefined' ? window : undefined;
  const listeners = new Set<() => void>();
  let action: HistoryAction = 'pop';
  const notify = () => listeners.forEach((l) => l());
  if (w) w.addEventListener('popstate', () => ((action = 'pop'), notify()));

  // Each entry's state carries its key beside the app's own state, `{ fx, usr }`, so back
  // and forward can tell which entry they returned to; `get` hands the app its state alone.
  // An entry made outside the router (the first load) gets a key when it is first read.
  const wrapped = (value: unknown): value is { fx: string; usr: unknown } =>
    typeof value === 'object' && value !== null && typeof (value as { fx?: unknown }).fx === 'string';
  const entry = () => {
    const raw = w!.history.state;
    if (wrapped(raw)) return raw;
    const keyed = { fx: nextKey(), usr: raw ?? null };
    w!.history.replaceState(keyed, '');
    return keyed;
  };

  return {
    window: w !== undefined,
    get() {
      if (!w) return { pathname: '/', search: '', hash: '', state: null };
      const { pathname, search, hash } = w.location;
      const { fx, usr } = entry();
      return { pathname, search, hash, state: usr, key: fx, action };
    },
    push(to, state = null) {
      w?.history.pushState({ fx: nextKey(), usr: state }, '', to);
      action = 'push';
      notify();
    },
    replace(to, state = null) {
      w?.history.replaceState({ fx: nextKey(), usr: state }, '', to);
      action = 'replace';
      notify();
    },
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}
