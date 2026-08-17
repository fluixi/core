import { Accessor, indexArray } from '@fluixi/reactive/signal';
import { resolveReactiveProp } from './utils.js';
import { hydrateAdvancePast } from '../dom/hydration-state.js';

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

/**
 * Non-keyed list rendering — mirrors SolidJS `<Index>`.
 *
 * Keyed by position. When the list grows, new slots are created.
 * When it shrinks, trailing slots are disposed. When an item at a
 * given index changes value, only the `item` signal updates (no re-render).
 * Returns a memo of the rendered array — works in both JSX and `html` templates.
 *
 * @example JSX
 * <Index each={items()} fallback={<p>Empty</p>}>
 *   {(item, index) => <li>{index} — {item().name}</li>}
 * </Index>
 *
 * @example html template
 * Index({ each: items, children: (item, i) => html`<li>${i} — ${item().name}</li>` })
 */
export function Index<T, U = any>(props: IndexProps<T, U>): Accessor<U[] | any> {
  const each = resolveReactiveProp<T[]>(() => props.each as any);
  return indexArray<T, U>(
    each,
    (item, index) => {
      const rendered = props.children(item, index);
      hydrateAdvancePast(rendered); // ascend cursor past this item (hydration)
      return rendered;
    },
    { fallback: () => props.fallback ?? null },
  );
}
