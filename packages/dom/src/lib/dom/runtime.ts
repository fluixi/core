/**
 * @fileoverview Core Reactive DOM Runtime
 * @module @awc/dom/runtime
 *
 * This module provides fine-grained reactive DOM manipulation utilities
 * similar to SolidJS's dom-expressions. It handles:
 * - Dynamic attribute and property updates
 * - Event delegation and binding
 * - Reactive text nodes
 * - Component rendering and lifecycle
 * - Template cloning and caching
 */

import { untrack, createRoot, isSignal, createEffect, createMemo } from '@awc/reactive/signal';
import { JSX_PROPERTIES, setAttribute, SVG_NAMESPACE } from './utils.js';
import { processValues } from '../lit/templates/helpers.js';
import { html, render as litRender } from 'lit';
import { isTemplateResult } from 'lit/directive-helpers.js';
import { checkRenderType, isComponent, isProvider, isRoutes } from '../component/create.js';

// import type { Accessor } from '@awc/reactive/signal';

type Accessor<T> = () => T;
// Import store symbols for proxy detection
let $PROXY: symbol | undefined;
let $NODE: symbol | undefined;
let isStoreProxyFn: ((value: any) => boolean) | undefined;

// Lazy load store utilities to avoid hard dependency
try {
  const storeModule = require('@awc/reactive/store');
  $PROXY = storeModule.$PROXY;
  $NODE = storeModule.$NODE;
  isStoreProxyFn = storeModule.isStoreProxy;
} catch (e) {
  // Store module not available, skip store proxy detection
}

// ============================================================================
// Types
// ============================================================================

export interface InsertOptions {
  marker?: Node;
  before?: boolean;
}

export interface SpreadOptions {
  element: Element;
  props: Record<string, any>;
  prevProps?: Record<string, any>;
  isSVG?: boolean;
  skipChildren?: boolean;
}

export interface DelegatedEvent {
  type: string;
  handler: (e: Event) => void;
}

export type PropertyValue = any;
export type AttributeValue = string | number | boolean | null | undefined;
export type Children =
  | Node
  | Node[]
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => any);

// ============================================================================
// Constants
// ============================================================================

const EMPTY_OBJ = {};
const EMPTY_ARR: any[] = [];

// Template cache
const templateCache = new Map<string, HTMLTemplateElement>();

// Event delegation registry
const delegatedEvents = new Map<string, Set<Element>>();
const delegatedHandlers = new Map<Element, Map<string, EventListener>>();

// Hydration state
let isHydrating = false;
let hydrationCursor: Node | null = null;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Check if value is a signal accessor
 */
function isAccessor<T>(value: any): value is Accessor<T> {
  return (
    typeof value === 'function' &&
    value.length === 0 &&
    typeof (value as any)._node !== 'undefined'
  );
}

/**
 * Check if value is a store proxy
 */
function isStoreProxy(value: any): boolean {
  if (!value || typeof value !== 'object') return false;

  // Use the loaded function if available
  if (isStoreProxyFn) {
    console.log('checking if store proxy', value);
    return isStoreProxyFn(value);
  }

  // Fallback check using symbol
  if ($PROXY) {
    return $PROXY in value;
  }

  return false;
}

/**
 * Resolve a value that might be an accessor or store proxy
 */
export function resolveValue<T>(value: T | Accessor<T>): T {
  if (isAccessor(value)) {
    return value();
  }

  // For store proxies, we should NOT resolve them - they need to be tracked
  // in the reactive context where they're used
  return value;
}

/**
 * Check if value is callable
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * Create a text node
 */
function createTextNode(value: string): Text {
  if (isHydrating && hydrationCursor && hydrationCursor.nodeType === 3) {
    const node = hydrationCursor as Text;
    hydrationCursor = hydrationCursor.nextSibling;
    if (node.nodeValue !== value) {
      node.nodeValue = value;
    }
    return node;
  }
  // console.log('stringify', value)
  return document.createTextNode(value);
}

function createMarker(value: string): Comment {
  if (isHydrating && hydrationCursor && hydrationCursor.nodeType === 8) {
    const node = hydrationCursor as Comment;
    if (node.data === value) {
      hydrationCursor = hydrationCursor.nextSibling;
      return node;
    }
  }
  return document.createComment(value);
}

/**
 * Create an element
 */
export function createNativeElement(tag: string, isSVG = false): Element {
  if (isHydrating && hydrationCursor && hydrationCursor.nodeType === 1) {
    const node = hydrationCursor as Element;
    if (node.tagName.toLowerCase() === tag.toLowerCase()) {
      hydrationCursor = hydrationCursor.nextSibling;
      return node;
    }
  }

  return isSVG
    ? document.createElementNS(SVG_NAMESPACE, tag)
    : document.createElement(tag);
}

/**
 * Create a template element and cache it
 */
export function createTemplate(
  html: string,
  isSVG = false
): HTMLTemplateElement {
  const cached = templateCache.get(html);
  if (cached) return cached;

  const template = document.createElement('template');
  if (isSVG) {
    template.innerHTML = `<svg>${html}</svg>`;
  } else {
    template.innerHTML = html;
  }

  templateCache.set(html, template);
  return template;
}

/**
 * Clone a template
 */
export function cloneTemplate(
  template: HTMLTemplateElement,
  isSVG = false
): DocumentFragment | Element {
  const clone = template.content.cloneNode(true) as DocumentFragment;
  if (isSVG) {
    return clone.firstChild as Element;
  }
  return clone;
}

// ============================================================================
// Dynamic Content Insertion
// ============================================================================

/**
 * Insert dynamic content into the DOM with fine-grained updates
 */

function makeArrayFlat(values: any[]) {
  if (values.length === 2 && values[1] === ' ') {
    if (Array.isArray(values[0])) {
      return makeArrayFlat(values[0])
    }
    if (typeof values[0] === 'function') {
      let fn = values[0]()
      while (typeof fn === 'function' && !isSignal(fn)) {
        fn = fn()
      }
      if (Array.isArray(fn)) {
        return makeArrayFlat(fn)
      }
      // if (isSignal(fn)) {
      //   fn = iterateFn(fn())
      // }
      console.log('is fn', fn)
      return fn
    }
    return values[0]
  }
  return values
 }

/**
 * Flatten nested arrays and resolve thunks, preserving signals.
 * Thunks (component factories) are called once here in component scope.
 * Signals/memos are kept as-is so render effects can track them.
 */
function resolveInsertArray(arr: any[]): any[] {
  const result: any[] = [];
  for (let i = 0; i < arr.length; i++) {
    let item = arr[i];
    if (item == null || typeof item === 'boolean') continue;

    // Resolve thunks but preserve signals
    while (typeof item === 'function' && !isSignal(item) && !isPromise(item)) {
      const isJsx = isProvider(item)
      item = item();

      if (isJsx) {
        // item = createMemo(()=>item)
        console.log('is jsx fn', item)
        // break;
      }
      if (item == null || typeof item === 'boolean') break;
    }

    if (item == null || typeof item === 'boolean') continue;

    if (Array.isArray(item)) {
      const nested = resolveInsertArray(item);
      for (const n of nested) result.push(n);
    } else {
      result.push(item);
    }
  }
  return result;
}

let currentDispose: (()=> void) | undefined;

export function insert(
  parent: Node,
  accessor: Children | Accessor<Children>,
  marker?: Node,
  init?: Node | Node[] | null
): (() => Node | Node[] | null) | (Node | Node[] | null) {
  if (marker !== undefined && !marker) {
    marker = createTextNode('');
    parent.appendChild(marker);
  }

  // Resolve $COMPONENT thunks ONCE outside the render effect.
  // Components must be created once — re-calling them creates new instances
  // with new signals/resources, causing infinite loops.
  // ONLY unwrap functions marked as components (isComponent). Plain reactive
  // accessors like () => store.text must stay as functions so the render
  // effect can call them WITH tracking for fine-grained reactivity.
  if (typeof accessor === 'function' && isComponent(accessor)) {
    while (typeof accessor === 'function' && !isSignal(accessor) && !isPromise(accessor) && !isProvider(accessor)) {
      accessor = (accessor as Function)();
    }
  }

  // // Flatten nested arrays and resolve thunks OUTSIDE effects.
  // if (Array.isArray(accessor)) {
  //   // accessor = resolveInsertArray(accessor);
  // }

  // Check if we need reactive tracking
  // const needsEffect =
  //   typeof accessor === 'function' ||
  //   isStoreProxy(accessor) ||
  //   (Array.isArray(accessor) && accessor.some((item: any) => typeof item === 'function'));

  // if (!needsEffect) {
  //     // console.log('no effect', accessor)
  //   return insertExpression(parent, accessor, marker, init);
  // }

  // Create an effect for reactive updates.
  // Cache resolved arrays by reference — thunks (component factories) must
  // only be called ONCE. Re-calling them creates new component instances
  // with new resources, causing increment/decrement cycles → infinite loop.
  let current: Node | Node[] | null = init || null;
  let cachedArrayInput: any = null;
  let cachedArrayOutput: any = null;

  const dispose = createRenderEffect(() => {
    // Read accessor WITH tracking — this is the only dependency for this effect.
    let value = accessor as any
    //   typeof accessor === 'function' ? accessor() : accessor;

    // Read through nested signal chains WITH tracking.
    // e.g. Router memo → routeContent memo → actual DOM content.
    // Each signal read registers this effect as a listener, so when any
    // signal in the chain updates, this effect re-runs.
    while (typeof value === 'function') value = value()

    // Cache resolved arrays — thunks must only run ONCE.
    if (Array.isArray(value)) {
      // value = untrack(() => resolveInsertArray(value))
      if (value !== cachedArrayInput) {
        cachedArrayInput = value;
        // cachedArrayOutput = untrack(() => resolveInsertArray(value));
        cachedArrayOutput = createMemo(()=> untrack(() => resolveInsertArray(value)));
      }
      value = cachedArrayOutput();
    }

    console.log('inserting', value)
    if (Array.isArray(value)) {
      // Process array items individually so each signal gets its own effect.
      // This prevents one big effect tracking ALL nested signals.
      current = cleanChildren(parent, current, marker);
      const nodes: Node[] = [];
      for (const _item of value as any[]) {
          let item = _item
        if ((typeof item === 'function' && !isPromise(item))) {
           // while (typeof item === 'function' && !isSignal(item)) item = item()
          // console.log('ins', item)
          // Each signal/function gets its own insert → own effect
          const m = createTextNode('');
          insertBefore(parent, m, marker);
          nodes.push(m);
          insert(parent, item, m);
        } else if (item instanceof Node) {
          insertBefore(parent, item, marker);
          nodes.push(item);
        } else if (item != null && typeof item !== 'boolean') {
          // Use insertExpression for all other types (strings, numbers,
          // Lit templates, JSX elements, etc.) — not just String() which
          // produces [object Object] for non-primitives.
          const result = insertExpression(parent, item, marker, null);
          if (result) {
            if (Array.isArray(result)) nodes.push(...result);
            else nodes.push(result);
          }
        }
      }
      current = nodes;
    } else {
      current = insertExpression(parent, value, marker, current);
    }
      // current = insertExpression(parent, value, marker, current);
      // current = insertExpression(parent, value, marker, current);
  });

  // currentDispose = dispose;

  return () => {
    dispose?.();
    return current;
  };
}

/**
 * Insert a non-reactive expression
 * Handles primitives, DOM nodes, arrays, functions, and promises
 */
function insertExpression(
  parent: Node,
  value: Children,
  marker?: Node,
  current?: Node | Node[] | null
): Node | Node[] | null {
  // Null, undefined, boolean - clean up
  if (value == null || typeof value === 'boolean') {
    return cleanChildren(parent, current, marker);
  }

  // Resolve the full function/signal chain.
  // Signals are read (for tracking by the parent render effect),
  // then plain functions are resolved until we reach a non-function value.
  while (typeof value === 'function') {
    if (isSignal(value) || isComponent(value)) {
      // Read signal — if called inside a render effect, this establishes tracking.
      value = (value as Function)();
    } else if (!isPromise(value)) {
      value = (value as Function)();
    } else {
      break;
    }
    if (value == null || typeof value === 'boolean') {
      return cleanChildren(parent, current, marker);
    }
  }
  // console.log('insert node', value)

  // Handle promises - create placeholder and update when resolved
  if (isPromise(value)) {
    const placeholder = createTextNode('');
    if (Array.isArray(current)) {
      if (current.length > 0) {
        parent.replaceChild(placeholder, current[0]);
        cleanChildren(parent, current.slice(1), marker);
      } else {
        insertBefore(parent, placeholder, marker);
      }
    } else if (current) {
      parent.replaceChild(placeholder, current);
    } else {
      insertBefore(parent, placeholder, marker);
    }

    // When promise resolves, insert the actual content
    (value as Promise<any>)
      .then((resolved) => {
        if (placeholder.parentNode === parent) {
          insertExpression(
            parent,
            resolved,
            placeholder.nextSibling as Node,
            placeholder
          );
        }
      })
      .catch((err) => {
        console.error('Error resolving promise in insertExpression:', err);
      });

    return placeholder;
  }

  const t = typeof value;

  // Handle primitive values (string, number)
  if (t === 'string' || t === 'number') {
    if (t === 'number') value = value.toString();
    // console.log('ins prim', t, current, value)

    if (Array.isArray(current)) {
      if (current.length === 0) {
        const node = createTextNode(value as string);
        insertBefore(parent, node, marker);
        return node;
      }
      if (current.length === 1 && current[0].nodeType === 3) {
        (current[0] as Text).data = value as string;
        return current;
      }
      current = cleanChildren(parent, current, marker);
    }

    if (current && current instanceof Text) {
      current.data = value as string;
      return current;
    }

    const node = createTextNode(value as string);
    if (current && (current as Node).parentNode === parent) {
      parent.replaceChild(node, current);
    } else {
      insertBefore(parent, node, marker);
    }
    return node;
  }

  // Handle DOM nodes
  if (value instanceof Node) {
    if (Array.isArray(current)) {
      if (current.length === 0) {
        insertBefore(parent, value, marker);
      } else if (current[0].parentNode === parent) {
        parent.replaceChild(value, current[0]);
        cleanChildren(parent, current.slice(1), marker);
      } else {
        insertBefore(parent, value, marker);
      }
      return value;
    }

    if (!current) {
      insertBefore(parent, value, marker);
    } else if (current !== value) {
      // Guard: check if current is still a child of parent
      if ((current as Node).parentNode === parent) {
        parent.replaceChild(value, current);
      } else {
        insertBefore(parent, value, marker);
      }
    }
    return value;
  }

  // Handle arrays (including nested arrays)
  if (Array.isArray(value)) {
    // if (value.length === 2 && (value[1] as any) === ' ') {
    //   return insertExpression(parent, value[0], marker, current)

    // }
    const array: Node[] = [];
    const currentArray = Array.isArray(current)
      ? current
      : current
      ? [current]
      : [];
    // for (const arr of value) {
    //   insertExpression(parent, arr, marker, array)
    // }

    // return array


    // Flatten and normalize the array
    flattenArray(value, array, parent, marker);
    // console.log('flatten', array)

    return reconcileArrays(parent, currentArray, array, marker);
  }

  // Handle objects with special markers (like Lit templates or JSX)
  if (t === 'object' && value !== null && typeof value === 'object') {
  // console.log('value is', value, t)
    const objValue = value as Record<string, any>;
    // Check for Lit TemplateResult
    if ('_$litType$' in objValue || '_$litDirective$' in objValue) {
      // console.log('on lit', renderLitToNodes(value));
      return insertExpression(parent, renderLitToNodes(value), marker, current);

      // Let Lit handle its own rendering - just return current
      // return current ?? null;
    }
    // Check for JSX element
    if ('type' in objValue && 'props' in objValue) {
      // Resolve JSX element
      const jsxValue = objValue as { type: any; props: any };
      if (typeof jsxValue.type === 'function') {
        const result = jsxValue.type(jsxValue.props || {});
        return insertExpression(parent, result, marker, current);
      }
    }
  }

  // Unsupported type - clean up
  return cleanChildren(parent, current, marker);
}

let count = 0

/**
 * Flatten nested arrays and resolve functions/promises into DOM nodes
 */
function flattenArray(
  arr: any[],
  result: Node[],
  parent: Node,
  marker?: Node,
  track = true
): void {
  count += 1
  if (count > 1200) {
    return
  }
  for (let i = 0; i < arr.length; i++) {
    let item = arr[i];

    // Skip null, undefined, boolean
    if (item == null || typeof item === 'boolean') {
      continue;
    }

    let isFirst = false
    // Resolve functions, but stop if we hit a promise or signal.
    // Signals must be preserved — they are tracked by the parent render effect.
    while (typeof item === 'function' && !isPromise(item) && !isSignal(item)) {
      item = item();
      if (isProvider(item)) {
      console.log('is provider', item)

      }
      if (item == null || typeof item === 'boolean') {
        break;
      }
    }

    if (Array.isArray(item)) {
      // console.log('item is signal', item[0]()())

    }
    // if (isSignal(item)) {
    //   createRenderEffect(() => {
    //   })
    // }
    if (item == null || typeof item === 'boolean') {
      continue;
    }

    // Handle signals/memos — the while loop above stopped at them.
    // Read the signal value and process it. Since flattenArray is called
    // inside a render effect, reading the signal creates a dependency so
    // the effect re-runs when the signal changes.
    if (isSignal(item) || isComponent(item)) {
      let resolved = item();
      // Unwrap function layers but STOP at signals — they are reactive
      // boundaries that must be preserved for tracking.
      while (typeof resolved === 'function' && !isPromise(resolved) && !isSignal(resolved) && !isComponent(resolved)) {
        if (isProvider(resolved)) {
        console.log('is provider', resolved)

        }
        resolved = resolved();
      }
      // If we hit a nested signal, recurse to read and track it
      if (isSignal(resolved) || isComponent(resolved)) {
        const nested = resolved();
        if (nested == null || typeof nested === 'boolean') {
          continue;
        }
        if (Array.isArray(nested)) {
          flattenArray(nested, result, parent, marker);
        } else {
          normalizeValue(nested, result);
        }
        continue;
      }
      if (resolved == null || typeof resolved === 'boolean') {
        continue;
      }
      if (Array.isArray(resolved)) {
        console.log('array is resoved', resolved)
        // insertExpression(parent, resolved, marker, result)
        flattenArray(resolved, result, parent, marker, true);
      } else {
        normalizeValue(resolved, result);
      }
      continue;
    }

    // Handle promises - create placeholder
    if (isPromise(item)) {
      const placeholder = createTextNode('');
      result.push(placeholder);

      (item as Promise<any>)
        .then((resolved) => {
          console.log('resolved', resolved);
          if (placeholder.parentNode) {
            const tempNodes: Node[] = [];
            normalizeValue(resolved, tempNodes);
            if (tempNodes.length > 0) {
              placeholder.parentNode.replaceChild(tempNodes[0], placeholder);
              for (let j = 1; j < tempNodes.length; j++) {
                placeholder.parentNode?.insertBefore(
                  tempNodes[j],
                  tempNodes[j - 1].nextSibling
                );
              }
            }
          }
        })
        .catch((err) => {
          console.error('Error resolving promise in array:', err);
        });
      continue;
    }

    // Handle nested arrays
    if (Array.isArray(item)) {
      flattenArray(item, result, parent, marker);
      continue;
    }

    // Handle DOM nodes
    if (item instanceof Node) {
      result.push(item);
      continue;
    }

    // Handle Lit TemplateResults (from lit-html components used inside JSX)
    if (
      typeof item === 'object' &&
      item !== null &&
      ('_$litType$' in item || '_$litDirective$' in item)
    ) {
      const nodes = renderLitToNodes(item);
      for (const node of nodes) {
        result.push(node);
      }
      continue;
    }

    // Handle JSX elements
    if (
      typeof item === 'object' &&
      item !== null &&
      'type' in item &&
      'props' in item
    ) {
      const jsxItem = item as { type: any; props: any };
      if (typeof jsxItem.type === 'function') {
        const resolved = jsxItem.type(jsxItem.props || {});
        // Recursively handle the result
        if (Array.isArray(resolved)) {
          flattenArray(resolved, result, parent, marker);
        } else {
          normalizeValue(resolved, result);
        }
        continue;
      }
    }

    // Primitives become text nodes
    if (typeof item === 'string' || typeof item === 'number') {
      // Skip empty strings and whitespace-only strings that are just formatting
      const str = String(item);
      if (str.trim() === '' && str !== ' ') {
        continue;
      }
      result.push(createTextNode(str));
      continue;
    }

    console.log('stringify', item)

    // Fallback: convert to string
    result.push(createTextNode(String(item)));
  }
}

/**
 * Normalize a single value into DOM nodes
 */
function normalizeValue(value: any, result: Node[]): void {
  if (value == null || typeof value === 'boolean') {
    return;
  }

  // Resolve functions, but stop if we hit a promise
  while (typeof value === 'function' && !isPromise(value)) {
    if (isProvider(value)) {
    console.log('is provider', value)

    }
    value = value();
    if (value == null || typeof value === 'boolean') {
      return;
    }
  }

  // Handle promises
  if (isPromise(value)) {
    const placeholder = createTextNode('');
    result.push(placeholder);

    (value as Promise<any>)
      .then((resolved) => {
        // console.log('resolved 1', resolved);
        if (placeholder.parentNode) {
          const parent = placeholder.parentNode;
          const tempNodes: Node[] = [];
          normalizeValue(resolved, tempNodes);
          for (const node of tempNodes) {
            parent.insertBefore(node, placeholder);
          }
          parent.removeChild(placeholder);
        }
      })
      .catch((err) => {
        console.error('Error resolving promise in normalizeValue:', err);
      });
    return;
  }

  if (value instanceof Node) {
    result.push(value);
    return;
  }

  // Handle Lit TemplateResults
  if (
    typeof value === 'object' &&
    value !== null &&
    ('_$litType$' in value || '_$litDirective$' in value)
  ) {
    const nodes = renderLitToNodes(value);
    for (const node of nodes) {
      result.push(node);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      normalizeValue(item, result);
    }
    return;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    result.push(createTextNode(String(value)));
    return;
  }

  // JSX element
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'props' in value
  ) {
    const jsxValue = value as { type: any; props: any };
    if (typeof jsxValue.type === 'function') {
      const resolved = jsxValue.type(jsxValue.props || {});
      normalizeValue(resolved, result);
      return;
    }
  }
  console.log('stringify', value)

  // Fallback
  result.push(createTextNode(String(value)));
}

/**
 * Normalize incoming array items (legacy support)
 */
function normalizeIncomingArray(normalized: Node[], value: any): Node | Node[] {
  if (value == null || typeof value === 'boolean') return createTextNode('');

  // Resolve functions, but stop if we hit a promise
  while (typeof value === 'function' && !isPromise(value)) {
    value = value();
    if (value == null || typeof value === 'boolean') {
      return createTextNode('');
    }
  }

  // Handle promises
  if (isPromise(value)) {
    const placeholder = createTextNode('');

    (value as Promise<any>)
      .then((resolved) => {
        console.log('resolved 2', resolved);
        if (placeholder.parentNode) {
          const parent = placeholder.parentNode;
          const nodes = normalizeIncomingArray(normalized, resolved);
          const nodeArray = Array.isArray(nodes) ? nodes : [nodes];
          for (const node of nodeArray) {
            parent.insertBefore(node, placeholder);
          }
          parent.removeChild(placeholder);
        }
      })
      .catch((err) => {
        console.error(
          'Error resolving promise in normalizeIncomingArray:',
          err
        );
      });

    return placeholder;
  }

  if (value instanceof Node) return value;

  if (Array.isArray(value)) {
    const result: Node[] = [];
    flattenArray(value, result, document.createDocumentFragment());
    return result.length > 0 ? result : createTextNode('');
  }

  // JSX element
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'props' in value
  ) {
    const jsxValue = value as { type: any; props: any };
    if (typeof jsxValue.type === 'function') {
      const resolved = jsxValue.type(jsxValue.props || {});
      return normalizeIncomingArray(normalized, resolved);
    }
  }

  console.log('stringify', value)

  return createTextNode(String(value));
}

/**
 * Reconcile two arrays of nodes
 */
function reconcileArrays(
  parent: Node,
  a: Node[],
  b: Node[],
  marker?: Node
): Node[] {
  let i = 0;
  const aLength = a.length;
  const bLength = b.length;

  // Remove extra nodes from the old array
  while (i < aLength && i < bLength) {
    if (a[i] !== b[i]) {
      // Guard: check if old node is still a child of parent
      if (a[i].parentNode === parent) {
        parent.replaceChild(b[i], a[i]);
      } else {
        // Old node was removed, just insert new one
        insertBefore(parent, b[i], marker);
      }
    }
    i++;
  }

  // Remove remaining old nodes
  if (i < aLength) {
    for (let j = i; j < aLength; j++) {
      // Guard: check if node is still a child of parent
      if (a[j].parentNode === parent) {
        parent.removeChild(a[j]);
      }
    }
  }

  // Add new nodes
  if (i < bLength) {
    for (let j = i; j < bLength; j++) {
      insertBefore(parent, b[j], marker);
    }
  }

  return b;
}

/**
 * Clean up children nodes
 */
function cleanChildren(
  parent: Node,
  current?: Node | Node[] | null,
  marker?: Node
): null {
  if (current) {
    if (Array.isArray(current)) {
      for (let i = 0; i < current.length; i++) {
        parent.removeChild(current[i]);
      }
    } else {
      parent.removeChild(current);
    }
  }
  return null;
}

/**
 * Insert node before marker
 */
function insertBefore(parent: Node, node: Node, marker?: Node) {
  if (isHydrating) {
    if (node.parentNode === parent) {
      return;
    }
  }

  if (marker) {
    // Safety check: ensure marker is actually a child of parent
    // This can fail with nested reactive content where closures capture stale markers
    if (marker.parentNode === parent) {
      parent.insertBefore(node, marker);
    } else {
      // Marker is not in this parent - append to end instead
      console.warn('[DOM] Marker not in parent, appending to end');
      parent.appendChild(node);
    }
  } else {
    parent.appendChild(node);
  }
}

// ============================================================================
// Attributes & Properties
// ============================================================================

/**
 * Set a property on an element
 */
export function setProperty(element: any, name: string, value: any): void {
  if (value == null) {
    delete element[name];
  } else {
    element[name] = value;
  }
}

/**
 * Set a dynamic attribute that can be reactive
 */
export function setDynamicAttribute(
  element: Element,
  name: string,
  accessor: any,
  isSVG = false
): () => void {
  // Handle non-reactive values (not functions or store proxies)
  if (typeof accessor !== 'function' && !isStoreProxy(accessor)) {
    setAttribute(element, name, accessor, isSVG);
    return () => {};
  }

  // Handle both signal accessors and store proxies reactively
  return createRenderEffect(() => {
    // For signal accessors, call them. For store proxies, access directly to trigger tracking
    const value = typeof accessor === 'function' ? accessor() : accessor;
    setAttribute(element, name, value, isSVG);
  });
}

/**
 * Set a dynamic property that can be reactive
 */
export function setDynamicProperty(
  element: any,
  name: string,
  accessor: any
): () => void {
  // Handle non-reactive values (not functions or store proxies)
  if (typeof accessor !== 'function' && !isStoreProxy(accessor)) {
    setProperty(element, name, accessor);
    return () => {};
  }

  // Handle both signal accessors and store proxies reactively
  return createRenderEffect(() => {
    // For signal accessors, call them. For store proxies, access directly to trigger tracking
    const value = typeof accessor === 'function' ? accessor() : accessor;
    setProperty(element, name, value);
  });
}

/**
 * Handle className/class specially
 */
export function setClassName(element: Element, value: any): void {
  if (value == null) {
    element.removeAttribute('class');
    return;
  }

  if (typeof value === 'string') {
    element.className = value;
    return;
  }

  if (Array.isArray(value)) {
    element.className = value.filter(Boolean).join(' ');
    return;
  }

  if (typeof value === 'object') {
    const classes = Object.keys(value)
      .filter((key) => value[key])
      .join(' ');
    element.className = classes;
    return;
  }

  element.className = String(value);
}

/**
 * Handle style specially
 */
export function setStyle(element: any, value: any): void {
  if (value == null) {
    element.removeAttribute('style');
    return;
  }

  if (typeof value === 'string') {
    element.style.cssText = value;
    return;
  }

  if (typeof value === 'object') {
    for (const key in value) {
      const styleValue = value[key];
      if (styleValue == null) {
        (element.style as any)[key] = '';
      } else {
        (element.style as any)[key] = styleValue;
      }
    }
  }
}

/**
 * Spread props onto an element with fine-grained updates
 */
export function spread(options: SpreadOptions): () => void {
  const {
    element,
    props,
    prevProps = EMPTY_OBJ as Record<string, any>,
    isSVG = false,
    skipChildren = false,
  } = options;
  console.log('spread', options);

  // Defensive check: ensure element is actually an Element
  if (!element || !(element instanceof Element)) {
    console.error('[spread] Error: element is not a DOM Element!');
    return () => {};
  }

  // Defensive check: ensure props is defined
  if (!props) {
    console.warn('[spread] Warning: props is undefined!');
    return () => {};
  }

  const disposers: (() => void)[] = [];

  // Handle each prop
  for (const key in props) {
    if (skipChildren && key === 'children') continue;

    const value = props[key];
    const prev = prevProps[key];

    if (value === prev) continue;

    // Handle special cases
    if (key === 'ref') {
      handleRef(value, element);
      continue;
    }

    if (key === 'class' || key === 'className') {
      if (typeof value === 'function' || isStoreProxy(value)) {
        disposers.push(
          createRenderEffect(() => {
            const val = typeof value === 'function' ? value() : value;
            setClassName(element, val);
          })
        );
      } else {
        setClassName(element, value);
      }
      continue;
    }

    if (key === 'style') {
      if (typeof value === 'function' || isStoreProxy(value)) {
        disposers.push(
          createRenderEffect(() => {
            const val = typeof value === 'function' ? value() : value;
            setStyle(element as any, val);
          })
        );
      } else {
        setStyle(element as any, value);
      }
      continue;
    }

    // Handle events
    if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase();
      if (prev) {
        element.removeEventListener(eventName, prev);
      }
      if (value) {
        element.addEventListener(eventName, value);
      }
      continue;
    }

    // Handle properties vs attributes
    if (JSX_PROPERTIES.has(key) || (!isSVG && key in element)) {
      disposers.push(setDynamicProperty(element, key, value));
    } else {
      disposers.push(setDynamicAttribute(element, key, value, isSVG));
    }
  }

  // Remove old props
  for (const key in prevProps as Record<string, any>) {
    if (!(key in props)) {
      if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase();
        element.removeEventListener(eventName, prevProps[key]);
      } else if (JSX_PROPERTIES.has(key)) {
        setProperty(element, key, null);
      } else {
        element.removeAttribute(key);
      }
    }
  }

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}

// ============================================================================
// Event Delegation
// ============================================================================

/**
 * Setup event delegation for an event type
 */
export function delegateEvents(eventNames: string[]): void {
  for (const name of eventNames) {
    if (delegatedEvents.has(name)) continue;

    const eventName = name.toLowerCase();
    delegatedEvents.set(name, new Set());

    document.addEventListener(
      eventName,
      (e: Event) => {
        let target = e.target as Element | null;

        while (target && target !== document.documentElement) {
          const handlers = delegatedHandlers.get(target);
          if (handlers) {
            const handler = handlers.get(name);
            if (handler) {
              handler.call(target, e);
              if (!e.defaultPrevented) {
                // Continue bubbling
              }
            }
          }
          target = target.parentElement;
        }
      },
      { capture: true }
    );
  }
}

/**
 * Add a delegated event handler
 */
export function addDelegatedEventListener(
  element: Element,
  name: string,
  handler: EventListener
): void {
  if (!delegatedHandlers.has(element)) {
    delegatedHandlers.set(element, new Map());
  }
  delegatedHandlers.get(element)!.set(name, handler);

  if (!delegatedEvents.has(name)) {
    delegateEvents([name]);
  }
  delegatedEvents.get(name)!.add(element);
}

/**
 * Remove a delegated event handler
 */
export function removeDelegatedEventListener(
  element: Element,
  name: string
): void {
  const handlers = delegatedHandlers.get(element);
  if (handlers) {
    handlers.delete(name);
    if (handlers.size === 0) {
      delegatedHandlers.delete(element);
    }
  }

  const elements = delegatedEvents.get(name);
  if (elements) {
    elements.delete(element);
  }
}

// ============================================================================
// Refs
// ============================================================================

/**
 * Handle ref prop
 */
export function handleRef(ref: any, element: Element): void {
  if (!ref) return;

  if (typeof ref === 'function') {
    ref(element);
  } else if (typeof ref === 'object' && 'current' in ref) {
    ref.current = element;
  }
}

// ============================================================================
// Effects (minimal implementation, assumes external effect system)
// ============================================================================

// These should be provided by the reactive system, but we provide
// minimal fallbacks for standalone usage

let currentEffect: (() => void) | null = null;
const effects: Set<() => void> = new Set();

/**
 * Create a render effect (to be replaced by actual reactive system)
 */
export function createRenderEffect(fn: () => void): () => void {
  // If there's a global effect system, use it
  if (typeof (globalThis as any).__createEffect === 'function') {
    return (globalThis as any).__createEffect(fn);
  }

  // Fallback: just run it once
  fn();
  effects.add(fn);

  return () => {
    effects.delete(fn);
  };
}

/**
 * Register the effect creator from the reactive system
 */
export function registerEffectCreator(
  creator: (fn: () => void) => () => void
): void {
  (globalThis as any).__createEffect = creator;
}

// ============================================================================
// Portals
// ============================================================================

/**
 * Create a portal to render content in a different part of the DOM
 */
export function createPortal(
  children: Children | Accessor<Children>,
  container?: Element
): () => void {
  return insert(container || (globalThis as any).body, children) as () => void;
}

// ============================================================================
// Utilities for JSX Runtime
// ============================================================================

/**
 * Check if a tag name is a native element
 */
export function isNativeElement(tag: string): boolean {
  return typeof tag === 'string' && tag.toLowerCase() === tag;
}

/**
 * Check if a tag is SVG
 */
export function isSVGElement(tag: string): boolean {
  return (
    tag === 'svg' ||
    tag === 'path' ||
    tag === 'circle' ||
    tag === 'rect' ||
    tag === 'line' ||
    tag === 'polygon' ||
    tag === 'polyline' ||
    tag === 'ellipse' ||
    tag === 'g' ||
    tag === 'defs' ||
    tag === 'clipPath' ||
    tag === 'text'
  );
}

/**
 * Escape HTML for SSR
 */
export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Batch multiple updates together
 */
export function runtimeBatch(fn: () => void): void {
  if (typeof (globalThis as any).__batch === 'function') {
    (globalThis as any).__batch(fn);
  } else {
    fn();
  }
}
// export function createComponent(fn: (props?: any) => any, props?: any): void {
//   if (typeof (globalThis as any).__createComponent === 'function') {
//     return (globalThis as any).__createComponent(fn, props);
//   } else {
//     return fn(props);
//   }
// }

/**
 * Register batch function from reactive system
 */
export function registerBatch(batchFn: (fn: () => void) => void): void {
  (globalThis as any).__batch = batchFn;
}
export function registerCreateComponent(
  createComponent: (fn: () => any, props?: any) => any
): void {
  (globalThis as any).__createComponent = createComponent;
}

function isPromise(v: any): v is Promise<any> {
  return (
    (v != null &&
      (typeof v === 'object' || typeof v === 'function') &&
      typeof (v as any).then === 'function') ||
    v instanceof Promise
  );
}

// Store reference to Lit's render function
let litRenderFn: ((template: any, container: any) => void) | null = null;

/**
 * Register Lit's render function for use in reactive DOM updates
 */
export function registerLitRender(
  render: (template: any, container: any) => void
): void {
  litRenderFn = render;
}

/**
 * Check if value is a Lit TemplateResult
 */
function isLitTemplateResult(value: any): boolean {
  return (
    value != null &&
    typeof value === 'object' &&
    ('_$litType$' in value || '_$litDirective$' in value)
  );
}

/**
 * Render Lit template to a temporary container and return nodes
 */
function renderLitToNodes(template: any, context?: any): Node[] {
  const nodes: Node[] = [];

  if (!litRenderFn) {
    console.warn('Lit render not registered. Call registerLitRender first.');
    return nodes;
  }

  console.log('render lit to node', template)
  try {
    const tempContainer = document.createElement('div');
    litRenderFn!(template, tempContainer);
    while (tempContainer.firstChild) {
      nodes.push(tempContainer.firstChild);
      tempContainer.removeChild(tempContainer.firstChild);
    }
    // console.log('lit node', context);
  } catch (e) {
    console.warn('Could not render Lit template:', e);
  }
  return nodes;
}

function isSuspense(v: any) {
  return (
    (typeof v === 'object' || typeof v === 'function') &&
    !!v &&
    (v as any).__suspense
  );
}

// export function iterateFn(item: any, debug = false) {
//   if (debug) {
//     console.log('iterate fn start', { item, type: typeof item });
//   }
//   let content;
//   // Don't unwrap $COMPONENT thunks - they must be called by Provider
//   if (typeof item === 'function' && !isPromise(item)&& !(item as any).$COMPONENT) {
//     content = item();
//     while (typeof content === 'function' && !isPromise(content) && !(item as any).$COMPONENT) {
//       content = content();
//     }
//   } else {
//     content = item;
//   }
//   if (debug) {
//     console.log('iterate fn', content);
//   }
//   return content;
// }
export function iterateFn(item: any, debug = false, signal = false) {
  let content: any;
  const { type } = checkRenderType(item)
  // Don't unwrap $COMPONENT thunks - they must be called by Provider
  // Don't unwrap signals/memos/resources - they must be preserved for reactive tracking
  if (typeof item === 'function' && !isPromise(item) && !isSignal(item)) {
    content = untrack(()=>item());
    while (typeof content === 'function'
      && !isPromise(content)
      && !isSignal(content)) {
      content = untrack(()=>content());
    }
  } else {
    content = item;
  }
  return content;
}
// export function iterateFn(item: any, debug = false) {
//   if (debug) {
//     console.log('iterate fn start', { item, type: typeof item });
//   }
//   let content;
//   // Don't unwrap $COMPONENT thunks - they must be called by Provider
//   if (typeof item === 'function' && !isPromise(item) && !(item as any).$COMPONENT) {
//     content = item();
//     while (typeof content === 'function' && !isPromise(content) && !(content as any).$COMPONENT) {
//       content = content();
//     }
//   } else {
//     content = item;
//   }
//   if (debug) {
//     console.log('iterate fn', content);
//   }
//   return content;
// }

function isObject(o: any) {
  return typeof o === 'object' && !!o && !Array.isArray(o);
}

export const deepEqual = (obj1: any, obj2: any): boolean => {
  // console.log('equiality check', { obj1, obj2 });
  if (typeof obj1 === 'function' && typeof obj2 === 'function') {
    // console.log('iterate', {
    //   obj1: untrack(() => iterateFn(obj1)),
    //   obj2: untrack(() => iterateFn(obj2)),
    // });
    // return untrack(() => iterateFn(obj1)) === untrack(() => iterateFn(obj2))
    // return iterateFn(obj1) === iterateFn(obj2);
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => deepEqual(item, obj2[index]));
  }
  // Same reference or both null/undefined
  if (obj1 === obj2) return true;

  // Check for null/undefined
  if (obj1 == null || obj2 == null) return false;

  // Check type
  if (typeof obj1 !== typeof obj2) return false;

  // Check for primitive types
  if (typeof obj1 !== 'object' && typeof obj2 !== 'object') {
    return obj1 === obj2;
  }

  // Check for Date
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }

  // Check for RegExp
  if (obj1 instanceof RegExp && obj2 instanceof RegExp) {
    return obj1.toString() === obj2.toString();
  }

  // Check if both are objects
  if (!isObject(obj1) || !isObject(obj2)) return false;

  // Check keys length
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  // Check each property
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;

    const val1 = (obj1 as any)[key];
    const val2 = (obj2 as any)[key];

    if (!deepEqual(val1, val2)) return false;
  }

  return true;
};



/**
 * Render a JSX element to a DOM container
 * Handles nested arrays, functions, promises, and various node types
 */
export function render<T>(
  element: T,
  container: Element,
  context?: any
): () => void {
  if (!container) {
    throw new Error('Container element is required');
  }

  let rendererDispose: (() => void) | undefined;
  let disposeRoot: (() => void) | undefined;
  const disposers: (() => void)[] = [];

  // Wrap in createRoot to establish reactive ownership tree.
  // This is critical for context propagation (Provider/useContext).
  createRoot((dispose) => {
    runtimeBatch(() => {
      // Clear container
      if (!isHydrating) {
        container.textContent = '';
      }

      insert(container, element as any);
      return;
    });
    disposeRoot = dispose;

  });

  // Return cleanup function
  return () => {
    disposeRoot?.();
    rendererDispose?.();
    disposers.forEach((d) => d());
    container.textContent = '';
  };
}

export function hydrate<T>(element: T, container: Element) {
  isHydrating = true;
  hydrationCursor = container.firstChild;
  try {
    return render(element, container);
  } finally {
    isHydrating = false;
    hydrationCursor = null;
  }
}
