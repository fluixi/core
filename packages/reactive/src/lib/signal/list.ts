/**
 * Keyed list reconciliation primitives — the reactive foundation for `<For>`,
 * `<For by>` and `<Index>` (mirrors SolidJS `mapArray`/`keyArray`/`indexArray`).
 *
 * Each maps a reactive array to an array of mapped values and reuses per-item
 * reactive scopes across updates so only changed items re-run their map fn. Every
 * mapped item lives in its own `createRoot`, so it has a disposable owner scope —
 * this is what keeps list items owner-stable (the thing ad-hoc array handling gets
 * wrong).
 */
import { type Accessor, createMemo, createRoot, createSignal, onCleanup, untrack } from './graph/compat.js';

type ListSource<T> = Accessor<readonly T[] | null | undefined | false>;

interface ListOptions {
  /** Returned (as-is, not wrapped) when the list is empty/nullish. */
  fallback?: () => any;
}

/**
 * Reference-keyed map. Reuses an item's mapped value while the same value (by
 * `===`) stays in the list; new values get a fresh root + index signal; removed
 * values are disposed. The map fn receives the plain value (a snapshot) and a
 * reactive index accessor. Backs `<For>`.
 */
export function mapArray<T, U>(
  list: ListSource<T>,
  mapFn: (item: T, index: Accessor<number>) => U,
  options?: ListOptions,
): Accessor<U[]> {
  interface Entry { item: T; rendered: U; dispose: () => void; setIndex: (n: number) => void; }
  let items: Entry[] = [];

  onCleanup(() => { for (const e of items) e.dispose(); items = []; });

  return createMemo<any>(() => {
    const next = (list() || []) as readonly T[];
    return untrack(() => {
      if (next.length === 0) {
        for (const e of items) e.dispose();
        items = [];
        return options?.fallback ? options.fallback() : [];
      }

      const prevByItem = new Map<T, Entry>();
      for (const e of items) if (!prevByItem.has(e.item)) prevByItem.set(e.item, e);

      const result: Entry[] = [];
      const used = new Set<Entry>();
      for (let i = 0; i < next.length; i++) {
        const value = next[i];
        const reuse = prevByItem.get(value);
        if (reuse && !used.has(reuse)) {
          reuse.setIndex(i);
          result.push(reuse);
          used.add(reuse);
        } else {
          let rendered!: U, setIndex!: (n: number) => void, dispose!: () => void;
          createRoot((d) => {
            dispose = d;
            const [index, setIdx] = createSignal(i, { name: 'row index' });
            setIndex = setIdx;
            rendered = mapFn(value, index);
          });
          const entry: Entry = { item: value, rendered, dispose, setIndex };
          result.push(entry);
          used.add(entry);
        }
      }
      for (const e of items) if (!used.has(e)) e.dispose();
      items = result;
      return result.map((e) => e.rendered);
    });
  }, undefined, { name: 'mapArray' });
}

/**
 * Key-function map. Like `mapArray` but reuse is keyed by `keyFn(item)` (so the
 * same key survives object recreation), and the map fn receives a *live* item
 * accessor (reads through to the current list value, so sub-property updates
 * propagate). Backs `<For by={…}>`.
 */
export function keyArray<T, U>(
  list: ListSource<T>,
  keyFn: (item: T) => any,
  mapFn: (item: Accessor<T>, index: Accessor<number>) => U,
  options?: ListOptions,
): Accessor<U[]> {
  interface Entry { rendered: U; dispose: () => void; setIndex: (n: number) => void; }
  let keys: any[] = [];
  let entries: Entry[] = [];

  onCleanup(() => { for (const e of entries) e.dispose(); keys = []; entries = []; });

  return createMemo<any>(() => {
    const next = (list() || []) as readonly T[];
    return untrack(() => {
      if (next.length === 0) {
        for (const e of entries) e.dispose();
        keys = []; entries = [];
        return options?.fallback ? options.fallback() : [];
      }

      const prevByKey = new Map<any, Entry>();
      for (let i = 0; i < keys.length; i++) prevByKey.set(keys[i], entries[i]);

      const resultEntries: Entry[] = [];
      const resultKeys: any[] = [];
      const usedKeys = new Set<any>();
      for (let i = 0; i < next.length; i++) {
        const key = keyFn(next[i]);
        const reuse = prevByKey.get(key);
        if (reuse && !usedKeys.has(key)) {
          reuse.setIndex(i);
          resultEntries.push(reuse);
        } else {
          let rendered!: U, setIndex!: (n: number) => void, dispose!: () => void;
          createRoot((d) => {
            dispose = d;
            const [index, setIdx] = createSignal(i, { name: 'row index' });
            setIndex = setIdx;
            // Live accessor: reads the current list at this index. Falls back to the
            // last known value while the array is mid-shrink (idx out of bounds)
            // so render fns don't read undefined before disposal completes.
            const item = createMemo<T>((prev) => {
              const cur = (list() || []) as readonly T[];
              const v = cur[index()];
              return v !== undefined && v !== null ? v : (prev as T);
            }, next[i]);
            rendered = mapFn(item, index);
          });
          resultEntries.push({ rendered, dispose, setIndex });
        }
        resultKeys.push(key);
        usedKeys.add(key);
      }
      for (const [key, e] of prevByKey) if (!usedKeys.has(key)) e.dispose();
      keys = resultKeys;
      entries = resultEntries;
      return resultEntries.map((e) => e.rendered);
    });
  }, undefined, { name: 'keyArray' });
}

/**
 * Index-keyed map. Reuse is keyed by *position*: growing adds slots, shrinking
 * disposes trailing slots, and when the value at a position changes only that
 * slot's item signal updates (the map fn is NOT re-run). The map fn receives a
 * live item accessor and a plain (stable) index. Backs `<Index>`.
 */
export function indexArray<T, U>(
  list: ListSource<T>,
  mapFn: (item: Accessor<T>, index: number) => U,
  options?: ListOptions,
): Accessor<U[]> {
  interface Slot { rendered: U; setItem: (v: T) => void; dispose: () => void; }
  let slots: Slot[] = [];

  onCleanup(() => { for (const s of slots) s.dispose(); slots = []; });

  return createMemo<any>(() => {
    const next = (list() || []) as readonly T[];
    return untrack(() => {
      if (next.length === 0) {
        for (const s of slots) s.dispose();
        slots = [];
        return options?.fallback ? options.fallback() : [];
      }

      const prevLen = slots.length;
      const nextLen = next.length;

      for (let i = prevLen; i < nextLen; i++) {
        let rendered!: U, setItem!: (v: T) => void, dispose!: () => void;
        const value = next[i];
        createRoot((d) => {
          dispose = d;
          const [item, setVal] = createSignal<T>(value);
          setItem = setVal as (v: T) => void;
          rendered = mapFn(item, i);
        });
        slots.push({ rendered, setItem, dispose });
      }

      for (let i = nextLen; i < prevLen; i++) slots[i].dispose();
      if (nextLen < prevLen) slots = slots.slice(0, nextLen);

      const survive = Math.min(prevLen, nextLen);
      for (let i = 0; i < survive; i++) slots[i].setItem(next[i]);

      return slots.map((s) => s.rendered);
    });
  }, undefined, { name: 'indexArray' });
}
