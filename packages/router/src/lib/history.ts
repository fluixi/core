/**
 * @fileoverview Pluggable history backends.
 *
 * The router core depends only on the {@link HistoryAdapter} interface, so it
 * runs identically in tests/SSR (memory) and the browser (History API).
 */

import type { HistoryAdapter } from './types.js';

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
export function createMemoryHistory(initial = '/'): HistoryAdapter {
  let entries: Array<{ path: string; state: unknown }> = [
    { path: initial, state: null },
  ];
  let index = 0;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    get() {
      const { path, state } = entries[index];
      return { ...splitPath(path), state };
    },
    push(to, state = null) {
      entries = entries.slice(0, index + 1);
      entries.push({ path: to, state });
      index = entries.length - 1;
      notify();
    },
    replace(to, state = null) {
      entries[index] = { path: to, state };
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
  const notify = () => listeners.forEach((l) => l());
  if (w) w.addEventListener('popstate', notify);

  return {
    get() {
      if (!w) return { pathname: '/', search: '', hash: '', state: null };
      const { pathname, search, hash } = w.location;
      return { pathname, search, hash, state: w.history.state ?? null };
    },
    push(to, state = null) {
      w?.history.pushState(state, '', to);
      notify();
    },
    replace(to, state = null) {
      w?.history.replaceState(state, '', to);
      notify();
    },
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}
