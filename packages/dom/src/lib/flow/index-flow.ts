import {
  Accessor,
  createMemo,
  createRoot,
  createSignal,
  onCleanup,
  untrack,
} from '@awc/reactive/signal';
import { normalizeAccessor } from './utils.js';

export interface IndexProps<T, U = any> {
  /** Reactive array to iterate over. */
  each: T[] | Accessor<T[]> | null | undefined;
  /** Rendered when the array is empty or nullish. */
  fallback?: any;
  /**
   * Render function called once per stable index slot.
   * `item` is a reactive accessor — updates when the item at that index changes.
   * `index` is a plain number (stable).
   *
   * JSX:    <Index each={items()}>{(item, index) => <li>{item().name}</li>}</Index>
   * lit:    Index({ each: items, children: (item, index) => html`<li>${item().name}</li>` })
   */
  children: (item: Accessor<T>, index: number) => U;
}

type Slot<T, U> = {
  rendered: U;
  setItem: (item: T) => void;
  dispose: () => void;
};

/**
 * Non-keyed list rendering — mirrors SolidJS `<Index>`.
 *
 * Keyed by position. When the list grows, new slots are created.
 * When it shrinks, trailing slots are disposed. When an item at a
 * given index changes value, only the `item` signal updates (no re-render).
 * Returns a memo of the rendered array — works in both JSX and lit-html.
 *
 * @example JSX
 * <Index each={items()} fallback={<p>Empty</p>}>
 *   {(item, index) => <li>{index} — {item().name}</li>}
 * </Index>
 *
 * @example lit-html
 * Index({ each: items, children: (item, i) => html`<li>${i} — ${item().name}</li>` })
 */
export function Index<T, U = any>(props: IndexProps<T, U>): Accessor<U[] | any> {
  const each = normalizeAccessor(props.each as T[]);

  let slots: Slot<T, U>[] = [];

  onCleanup(() => {
    for (const s of slots) s.dispose();
    slots = [];
  });

  return createMemo<U[] | any>(() => {
    const list = each() ?? [];

    if (list.length === 0) {
      for (const s of slots) s.dispose();
      slots = [];
      return props.fallback ?? null;
    }

    const prevLen = slots.length;
    const nextLen = list.length;

    // Grow: create new slots for added positions.
    if (nextLen > prevLen) {
      for (let i = prevLen; i < nextLen; i++) {
        const item = list[i];
        let rendered!: U;
        let setItem!: (v: T) => void;
        let dispose!: () => void;

        createRoot((d) => {
          dispose = d;
          const [itemSignal, setItemSignal] = createSignal<T>(item);
          setItem = setItemSignal as (v: T) => void;
          rendered = props.children(itemSignal, i);
        });

        slots.push({ rendered, setItem, dispose });
      }
    }

    // Shrink: dispose trailing slots.
    if (nextLen < prevLen) {
      for (let i = nextLen; i < prevLen; i++) {
        slots[i].dispose();
      }
      slots = slots.slice(0, nextLen);
    }

    // Update changed items (by value) within the surviving range.
    const surviveLen = Math.min(prevLen, nextLen);
    for (let i = 0; i < surviveLen; i++) {
      untrack(() => slots[i].setItem(list[i]));
    }

    return slots.map((s) => s.rendered);
  });
}
