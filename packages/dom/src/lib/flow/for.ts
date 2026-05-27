import { Accessor } from '@awc/reactive/signal';
import {
  createMemo,
  createRoot,
  createSignal,
  onCleanup,
  untrack,
  // createEffect,
  // createComputed,
} from '../dom/integration.js';
import { normalizeAccessor } from './utils.js';

type EachSource<T> =
  | ReadonlyArray<T>
  | (() => ReadonlyArray<T> | null | undefined)
  | Accessor<ReadonlyArray<T>>
  | null
  | undefined
  | false;

/** Props when `by` is NOT provided — item is the plain value `T`. */
export interface ForPropsUnkeyed<T, U = any> {
  /** Reactive array to iterate over — static, readonly, accessor, or signal. */
  each: EachSource<T>;
  /** Rendered when the array is empty or nullish. */
  fallback?: any;
  /**
   * Render function called once per unique item (keyed by object reference).
   *
   * @example
   * <For each={rows}>{(row, idx) => <tr>...</tr>}</For>
   */
  children: (item: T, index: Accessor<number>) => U;
  by?: undefined;
}

/** Props when `by` IS provided — item is a reactive `Accessor<T>`. */
export interface ForPropsKeyed<T, U = any> {
  /** Reactive array to iterate over — static, readonly, accessor, or signal. */
  each: EachSource<T>;
  /** Rendered when the array is empty or nullish. */
  fallback?: any;
  /**
   * Render function called once per unique key.
   * `item` is a reactive accessor — call `item()` inside to read the current value.
   * The same DOM is reused whenever `by(item)` returns the same key, even if the
   * object reference changes.
   *
   * @example
   * <For each={rows} by={r => r.id}>{(row, idx) => <tr>{row().name}</tr>}</For>
   */
  children: (item: Accessor<T>, index: Accessor<number>) => U;
  /**
   * Key function for stable DOM reuse across reference changes.
   * When provided, `item` in the render function is an `Accessor<T>`.
   */
  by: (item: T) => any;
}

export type ForProps<T, U = any> = ForPropsUnkeyed<T, U> | ForPropsKeyed<T, U>;

type Entry<U> = {
  rendered: U;
  dispose: () => void;
  setIndex: (n: number) => void;
};

/**
 * Keyed list rendering — mirrors SolidJS `<For>`.
 *
 * Default: keyed by object reference. Same object at new index → only index
 * signal updates (no DOM re-render). Removed items are disposed.
 *
 * With `by`: keyed by the return value of `by(item)`. When the same key is
 * found in the previous render, the DOM entry is reused and the index signal
 * is updated. The item accessor is a live `createMemo(() => list[idx()])` so
 * that reading `item().someField` inside a reactive context creates a
 * fine-grained dependency on the store proxy property — not a frozen snapshot.
 *
 * @example Reference-keyed (default)
 * <For each={items}>{(item, idx) => <li>{item.name}</li>}</For>
 *
 * @example Stable-key (by prop) — survives object recreation
 * <For each={rows} by={r => r.id}>
 *   {(row, idx) => <tr><td>{() => row().name}</td></tr>}
 * </For>
 */


export function For<T, U>(props: ForPropsKeyed<T, U>): Accessor<U[]>;
export function For<T, U>(props: ForPropsUnkeyed<T, U>): Accessor<U[]>;
export function For<T, U>(props: ForProps<T, U>): Accessor<U[]> {
  let each = normalizeAccessor(props.each as any);
  const keyFn = props.by as ((item: T) => any) | undefined;
  // const [_value, setValue] = createSignal(undefined)
  // each();

  // createEffect(() => {
  //   if (!each) throw new Error('For: `each` is required');
  //   if (!props.children) throw new Error('For: `children` is required');
  //   const eachvalue = typeof props.each === 'function' ? props.each() : props.each
  //   console.log('each',  eachvalue);
  //   setValue(()=>eachvalue)
  // })

  // each =  _value
  let prevItems: T[] = [];
  let entries: Entry<U>[] = [];
  let prevKeys: any[] = []; // only used when keyFn is set

  onCleanup(() => {
    for (const e of entries) e.dispose();
    prevItems = [];
    entries = [];
    prevKeys = [];
  });

  return createMemo<any>(() => {
    let list: ReadonlyArray<T> = [];
    try{
        list = each()
    }catch(e){

    }
    return untrack(()=>{
    // console.log('memo list proxy', list);

    if (list.length === 0) {
      for (const e of entries) e.dispose();
      prevItems = [];
      entries = [];
      prevKeys = [];
      return props.fallback ?? null;
    }

    // ── Keyed diffing (by prop) ───────────────────────────────────────────────
    if (keyFn) {
      const prevMap = new Map<any, Entry<U>>();
      for (let i = 0; i < prevKeys.length; i++) {
        prevMap.set(prevKeys[i], entries[i]);
      }

      const nextEntries: Entry<U>[] = [];
      const nextKeys: any[] = [];
      const usedKeys = new Set<any>();

      for (let i = 0; i < list.length; i++) {
        const item = untrack(()=>list[i]);
        const key = keyFn(item);
        
        if (prevMap.has(key) && !usedKeys.has(key)) {
          console.log('reuse each keyed', {key, item})
          // Reuse existing DOM — update the index signal only.
          // The item accessor is a live memo reading each()[idx()], so store
          // proxy property updates propagate automatically without any setItem.
          const entry = prevMap.get(key)!;
          untrack(() => entry.setIndex(i));
          nextEntries.push(entry);
          nextKeys.push(key);
          usedKeys.add(key);
        } else {
          // New key — create entry with a live item accessor.
          // Using createMemo(() => each()[idx()]) instead of createSignal(item)
          // ensures opt().someField reads through the live store proxy and
          // creates fine-grained reactive dependencies on sub-properties.
          // This mirrors SolidJS's mapArray behaviour.
          let rendered!: U;
          let setIndex!: (n: number) => void;
          let dispose!: () => void;

          createRoot((d) => {
            dispose = d;
            const [idx, setIdx] = createSignal(i);
            setIndex = setIdx;
            // Carry the previous value as fallback: when the item is removed
            // (array shrinks, idx() goes out of bounds) the memo would return
            // undefined, which causes "cannot read property of undefined" in
            // render functions before dispose() fires. Returning the last
            // known value keeps the render stable until disposal completes.
            const getItem = createMemo((prev: any) => {
              const currentList = each() ?? [];
              const item = currentList[idx()];
              return item !== undefined && item !== null ? (item as T) : prev;
            }, untrack(() => (each() ?? [])[i]) as T | undefined);

            if (!props.children || typeof untrack(getItem) === 'undefined') return;
            rendered = (
              Array.isArray(props.children)
                ? (props.children as any[]).map((c: any) =>
                    typeof c === 'function' ? c(getItem, idx) : c
                  )
                : typeof props.children === 'function' && props.children(getItem as any, idx)
            ) as any;
          });

          nextEntries.push({ rendered, dispose, setIndex });
          nextKeys.push(key);
          usedKeys.add(key);
        }
      }

      // Dispose entries whose keys are no longer in the list
      for (const [key, entry] of prevMap) {
        if (!usedKeys.has(key)) entry.dispose();
      }

      prevItems = list as any
      entries = nextEntries;
      prevKeys = nextKeys;
      return nextEntries.map((e) => e.rendered);
    }

    // ── Reference-based diffing (default) ────────────────────────────────────
    const prevMap = new Map<T, Entry<U>>();
    for (let i = 0; i < prevItems.length; i++) {
      prevMap.set(prevItems[i], entries[i]);
    }

    const nextEntries: Entry<U | null>[] = [];
    const used = new Set<T>();

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (prevMap.has(item) && !used.has(item)) {
        const entry = prevMap.get(item)!;
        untrack(() => entry.setIndex(i));
        nextEntries.push(entry);
        used.add(item);
      } else {
        let rendered!: U | null;
        let setIndex!: (n: number) => void;
        let dispose!: () => void;

        createRoot((d) => {
          dispose = d;
          const [idx, setIdx] = createSignal(i);
          setIndex = setIdx;
          if (!props.children) return;
          if (typeof item !== 'undefined') {
            rendered = null;
          }
          rendered = (Array.isArray(props.children)
            ? props.children.map((c) => (typeof c === 'function' ? c(item, idx) : c))
            : props.children(item as any, idx)) as any;
        });

        nextEntries.push({ rendered, dispose, setIndex });
        used.add(item);
      }
    }

    for (const [item, entry] of prevMap) {
      if (!used.has(item)) entry.dispose();
    }

    prevItems = [...list];
    entries = nextEntries as Entry<U>[];
    return nextEntries.map((e) => e.rendered).filter((e) => e !== null);
  })
  });
}
