/**
 * @fileoverview For component for efficient list rendering with keyed reconciliation in Fluixi
 * @module @fluixi/core/control-flow/For
 */

import { html, TemplateResult, nothing } from 'lit';
import { createEffect, createSignal, Accessor } from '@fluixi/reactive/signal';
import { childToTemplate, normalizeAccessor, renderContent } from './utils.js';
import type { Component } from '@fluixi/dom';

/**
 * Props for the For component
 * @template T - Type of items in the array
 * @template U - Type of the rendered result
 */
export interface $ForProps<T, U = TemplateResult> {
  /**
   * Array of items to iterate over, or an accessor returning the array
   */
  each: T[] | Accessor<T[]> | undefined | null;

  /**
   * Function to render each item
   * @param {T} item - Current item
   * @param {number} index - Index of the item
   * @returns {U} Rendered result
   */
  children: (item: T, index: number) => U;

  /**
   * Fallback content when the array is empty or undefined
   */
  fallback?: Component<T>;
}

/**
 * Internal map entry for keyed reconciliation
 * @template T - Type of the item
 */
interface MapEntry<T> {
  item: T;
  index: number;
  result: any;
}

/**
 * For component for efficient list rendering with keyed reconciliation
 *
 * Renders a list of items with efficient updates. Each item is keyed by its reference,
 * allowing for efficient reconciliation when items are added, removed, or reordered.
 *
 * @template T - Type of items in the array
 * @template U - Type of the rendered result
 * @param {$ForProps<T, U>} props - Component props
 * @returns {TemplateResult | typeof nothing} Rendered template
 *
 * @example
 * ```typescript
 * // Basic list rendering
 * const MyList = () => {
 *   const [items, setItems] = createSignal([1, 2, 3, 4, 5]);
 *
 *   return html`
 *     <ul>
 *       ${For({
 *         each: items,
 *         children: (item, index) => html`<li>Item ${item} at index ${index}</li>`
 *       })}
 *     </ul>
 *   `;
 * };
 * ```
 *
 * @example
 * ```typescript
 * // With fallback
 * const MyList = () => {
 *   const [items, setItems] = createSignal<string[]>([]);
 *
 *   return html`
 *     <ul>
 *       ${For({
 *         each: items,
 *         fallback: html`<li>No items to display</li>`,
 *         children: (item, index) => html`<li>${item}</li>`
 *       })}
 *     </ul>
 *   `;
 * };
 * ```
 *
 * @example
 * ```typescript
 * // With objects
 * interface User {
 *   id: number;
 *   name: string;
 * }
 *
 * const UserList = () => {
 *   const [users, setUsers] = createSignal<User[]>([
 *     { id: 1, name: 'Alice' },
 *     { id: 2, name: 'Bob' }
 *   ]);
 *
 *   return html`
 *     <div>
 *       ${For({
 *         each: users,
 *         children: (user, index) => html`
 *           <div class="user">
 *             <span>${user.name}</span>
 *           </div>
 *         `
 *       })}
 *     </div>
 *   `;
 * };
 * ```
 */
export function $for<T, U = TemplateResult>(
  props: $ForProps<T, U>
): TemplateResult | typeof nothing {
  const [results, setResults] = createSignal<U[]>([]);

  createEffect(() => {
    const eachAccessor = normalizeAccessor(props.each);
    const items = eachAccessor();

    if (!items || items.length === 0) {
      // Empty array - render fallback
      if (props.fallback !== undefined) {
        const fallbackContent = renderContent(props.fallback);
        setResults([fallbackContent] as U[]);
      } else {
        setResults([]);
      }
      return;
    }

    // Map items to results
    const newResults = items.map((item, index) => {
      return props.children(item, index);
    });

    setResults(newResults);
  });

  const current = results();

  if (current.length === 0) {
    return nothing;
  }

  return html`${current.map((result) => childToTemplate(result as any))}`;
}

/**
 * Creates a keyed For component with a custom key function
 *
 * Allows you to specify a custom key extraction function for more efficient reconciliation
 * when items have unique identifiers.
 *
 * @template T - Type of items in the array
 * @template K - Type of the key
 * @param {(item: T) => K} keyFn - Function to extract key from item
 * @returns {(props: Omit<$ForProps<T>, 'fallback'>) => TemplateResult | typeof nothing} Keyed For component
 *
 * @example
 * ```typescript
 * interface User {
 *   id: number;
 *   name: string;
 * }
 *
 * const KeyedUserList = createKeyedFor<User, number>(user => user.id);
 *
 * const MyComponent = () => {
 *   const [users, setUsers] = createSignal<User[]>([
 *     { id: 1, name: 'Alice' },
 *     { id: 2, name: 'Bob' }
 *   ]);
 *
 *   return html`
 *     ${KeyedUserList({
 *       each: users,
 *       children: (user, index) => html`<div>${user.name}</div>`
 *     })}
 *   `;
 * };
 * ```
 */
export function createKeyedFor<T, K = any>(
  keyFn: (item: T) => K
): (props: $ForProps<T>) => TemplateResult | typeof nothing {
  return (props: $ForProps<T>) => {
    const [resultsMap, setResultsMap] = createSignal<Map<K, MapEntry<T>>>(
      new Map()
    );

    createEffect(() => {
      const eachAccessor = normalizeAccessor(props.each);
      const items = eachAccessor();

      if (!items || items.length === 0) {
        setResultsMap(new Map());
        return;
      }

      const prevMap = resultsMap();
      const newMap = new Map<K, MapEntry<T>>();

      items.forEach((item, index) => {
        const key = keyFn(item);
        const prevEntry = prevMap.get(key);

        if (prevEntry && prevEntry.item === item) {
          // Item unchanged - reuse result
          newMap.set(key, { ...prevEntry, index });
        } else {
          // New or changed item - render
          newMap.set(key, {
            item,
            index,
            result: props.children(item, index),
          });
        }
      });

      setResultsMap(newMap);
    });

    const map = resultsMap();

    if (map.size === 0) {
      if (props.fallback !== undefined) {
        return childToTemplate(renderContent(props.fallback));
      }
      return nothing;
    }

    const sortedEntries = Array.from(map.values()).sort(
      (a, b) => a.index - b.index
    );
    const results = sortedEntries.map((entry) => entry.result);

    return html`${results.map((result) => childToTemplate(result as any))}`;
  };
}
