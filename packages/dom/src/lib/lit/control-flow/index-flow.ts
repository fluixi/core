import { Accessor, createEffect, createSignal } from '@awc/reactive';
import { html, nothing, TemplateResult } from 'lit';
import { childToTemplate, normalizeAccessor, renderContent } from './utils.js';

import { Component } from '@awc/dom';
/**
 * Props for the Index component (non-keyed list rendering)
 * @template T - Type of items in the array
 * @template U - Type of the rendered result
 */
export interface $IndexProps<T, U = TemplateResult> {
  /**
   * Array of items to iterate over, or an accessor returning the array
   */
  each: T[] | Accessor<T[]> | undefined | null;

  /**
   * Function to render each item
   * @param {Accessor<T>} item - Accessor for the current item (reactive)
   * @param {number} index - Index of the item (stable)
   * @returns {U} Rendered result
   */
  children: (item: Accessor<T>, index: number) => U;

  /**
   * Fallback content when the array is empty or undefined
   */
  fallback?: Component<T>;
}

/**
 * Index component for non-keyed list rendering with reactive items
 *
 * Similar to For, but provides reactive accessors for items instead of direct values.
 * The index remains stable, and each item is accessed reactively. This is more efficient
 * when items change frequently but their positions remain stable.
 *
 * @template T - Type of items in the array
 * @template U - Type of the rendered result
 * @param {$IndexProps<T, U>} props - Component props
 * @returns {TemplateResult | typeof nothing} Rendered template
 *
 * @example
 * ```typescript
 * // Basic usage with reactive items
 * const MyList = () => {
 *   const [items, setItems] = createSignal([1, 2, 3, 4, 5]);
 *
 *   return html`
 *     <ul>
 *       ${$index({
 *         each: items,
 *         children: (item, index) => html`
 *           <li>Item ${item()} at index ${index}</li>
 *         `
 *       })}
 *     </ul>
 *   `;
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Efficient updates when items change
 * const Counter = () => {
 *   const [counts, setCounts] = createSignal([0, 0, 0]);
 *
 *   const increment = (index: number) => {
 *     setCounts(prev => {
 *       const next = [...prev];
 *       next[index]++;
 *       return next;
 *     });
 *   };
 *
 *   return html`
 *     <div>
 *       ${$index({
 *         each: counts,
 *         children: (count, index) => html`
 *           <div>
 *             <span>Count ${index}: ${count()}</span>
 *             <button @click=${() => increment(index)}>+</button>
 *           </div>
 *         `
 *       })}
 *     </div>
 *   `;
 * };
 * ```
 */
export function $index<T, U = TemplateResult>(
  props: $IndexProps<T, U>
): TemplateResult | typeof nothing {
  const [itemAccessors, setItemAccessors] = createSignal<Array<Accessor<T>>>(
    []
  );
  const [results, setResults] = createSignal<U[]>([]);

  createEffect(() => {
    const eachAccessor = normalizeAccessor(props.each);
    const items = eachAccessor();

    if (!items || items.length === 0) {
      // Empty array - render fallback
      if (props.fallback !== undefined) {
        const fallbackContent = renderContent(props.fallback);
        setResults([fallbackContent] as U[]);
        setItemAccessors([]);
      } else {
        setResults([]);
        setItemAccessors([]);
      }
      return;
    }

    // Create or update accessors for each index
    const prevAccessors = itemAccessors();
    const newAccessors: Array<Accessor<T>> = [];
    const newResults: U[] = [];

    for (let i = 0; i < items.length; i++) {
      // Reuse existing accessor if available
      if (i < prevAccessors.length) {
        newAccessors.push(prevAccessors[i]);
        // Update the accessor's internal value
        const [get, set] = createSignal(items[i]);
        newAccessors[i] = get;
        set(items[i]);
      } else {
        // Create new accessor for new index
        const [get] = createSignal(items[i]);
        newAccessors.push(get);
      }

      // Render with the accessor
      newResults.push(props.children(newAccessors[i], i));
    }

    setItemAccessors(newAccessors);
    setResults(newResults);
  });

  const current = results();

  if (current.length === 0) {
    return nothing;
  }

  return html`${current.map((result) => childToTemplate(result as any))}`;
}
