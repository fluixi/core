/**
 * @fileoverview Core Reactive DOM Runtime
 * @module @awc/dom/runtime
 *
 * Fine-grained reactive DOM manipulation utilities inspired by SolidJS.
 * Key design: Event delegation uses `$$eventname` properties on DOM nodes
 * (the SolidJS pattern) — simpler and more reliable than Map-based lookup.
 *
 * Critical fixes applied:
 * - insertContent array branch: nested signal content cleanup via onCleanup
 * - flattenArray: uses recursive flattenArray for signal results (not normalizeValue)
 * - DOM Runtime Guards: insertBefore checks marker.parentNode !== container
 * - createRoot owner restoration: Owner = prevOwner (not Owner ??= prevOwner)
 */

import {
  untrack,
  createRoot,
  isSignal,
  createEffect,
  createMemo,
  onCleanup,
  getOwner,
  runWithOwner,
  createRenderEffect as signalCreateRenderEffect,
} from '@awc/reactive/signal';
import { JSX_PROPERTIES, setAttribute, SVG_NAMESPACE } from './utils.js';
import { processValues } from '../lit/templates/helpers.js';
import { html, render as litRender } from 'lit';
import { isTemplateResult } from 'lit/directive-helpers.js';
import { checkRenderType, isComponent, isProvider, isRoutes, asComponent } from '../component/create.js';

// ============================================================================
// Types
// ============================================================================

type Accessor<T> = () => T;

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

// ============================================================================
// Event Delegation — SolidJS $$eventname property pattern
//
// Handlers are stored directly on DOM nodes as `node.$$click = handler`.
// The capture listener reads `node.$$click` directly — no Map lookups needed.
// This approach correctly handles e.preventDefault() and stopPropagation.
// ============================================================================

const delegatedSet = new Set<string>();

// Events that don't bubble — must use direct addEventListener
const NON_DELEGATED = new Set(['scroll', 'focus', 'blur', 'load', 'error', 'resize']);

/**
 * Register global delegated event listener for the given event names.
 * Stores handlers as `element.$$eventname = handler` properties.
 */
export function delegateEvents(eventNames: string[]): void {
  for (const name of eventNames) {
    if (delegatedSet.has(name) || NON_DELEGATED.has(name)) continue;
    delegatedSet.add(name);
    document.addEventListener(name, delegatedEventHandler);
  }
}

function delegatedEventHandler(e: Event): void {
  const key = `$$${e.type}`;
  // Walk up from the actual target (handles shadow DOM via composedPath)
  let node: any = (e.composedPath && e.composedPath()[0]) || e.target;
  while (node) {
    const handler = node[key];
    if (handler && !node.disabled) {
      handler(e);
      if (e.cancelBubble) return; // stopPropagation was called
    }
    // Shadow DOM: step through to host if needed
    node = node.host && node.host !== node && node.host instanceof Element
      ? node.host
      : node.parentNode;
  }
}

/**
 * Add a delegated event handler — stores as $$eventname property
 */
export function addDelegatedEventListener(
  element: Element,
  name: string,
  handler: EventListener
): void {
  (element as any)[`$$${name}`] = handler;
  if (!delegatedSet.has(name) && !NON_DELEGATED.has(name)) {
    delegateEvents([name]);
  }
}

/**
 * Remove a delegated event handler
 */
export function removeDelegatedEventListener(element: Element, name: string): void {
  delete (element as any)[`$$${name}`];
}

/**
 * Check if an event should be delegated
 */
export function isDelegatedEvent(name: string): boolean {
  return !NON_DELEGATED.has(name);
}

// ============================================================================
// Hydration state
// ============================================================================

let isHydrating = false;
let hydrationCursor: Node | null = null;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Check if value is a function
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

function createTextNode(value: string): Text {
  if (isHydrating && hydrationCursor && hydrationCursor.nodeType === 3) {
    const node = hydrationCursor as Text;
    hydrationCursor = hydrationCursor.nextSibling;
    if (node.nodeValue !== value) node.nodeValue = value;
    return node;
  }
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

export function createTemplate(html: string, isSVG = false): HTMLTemplateElement {
  const cached = templateCache.get(html);
  if (cached) return cached;

  const template = document.createElement('template');
  if (isSVG) { template.innerHTML = `<svg>${html}</svg>`; }
  else { template.innerHTML = html; }
  templateCache.set(html, template);
  return template;
}

export function cloneTemplate(
  template: HTMLTemplateElement,
  isSVG = false
): DocumentFragment | Element {
  const clone = template.content.cloneNode(true) as DocumentFragment;
  if (isSVG) return clone.firstChild as Element;
  return clone;
}

export function makeArrayFlat(values: any[]) {
  if (!Array.isArray(values)) return values;
  if (values.length === 2 && values[1] === ' ') {
    if (Array.isArray(values[0])) return makeArrayFlat(values[0]);
    if (typeof values[0] === 'function') return values[0];
    return values[0];
  }
  if (values.length === 1 && typeof values[0] === 'function') return values[0];
  return values;
}

export function fnName(fn: Function) {
  if (typeof fn !== 'function') return null;
  return (fn as any)._name || fn.name || 'anonymous';
}

/**
 * iterateFn — resolves a value by calling through plain function wrappers.
 *
 * CRITICAL: Must stop at signals/memos/resources ($SIGNAL marker) and
 * component thunks (kettle-component marker). Without this:
 *  - components returning memos get unwrapped to static values, losing reactivity
 *  - lazy component createMemo re-triggers C(props) → infinite recursion
 */
export function iterateFn(item: any): any {
  // Stop immediately if it's a signal, memo, or resource
  if (isSignal(item)) return item;
  // Stop if it's a component thunk
  if (isComponent(item)) return item;

  if (typeof item !== 'function') return item;

  // Unwrap plain function wrappers — stop at signals and component thunks
  let content = item();
  while (
    typeof content === 'function' &&
    !isSignal(content) &&
    !isComponent(content)
  ) {
    content = content();
  }
  return content;
}

// ============================================================================
// createRenderEffect — re-export from reactive system
// ============================================================================

/**
 * Create a reactive render effect. Re-runs when its signal dependencies change.
 * Returns a dispose function.
 */
export function createRenderEffect(fn: () => void): () => void {
  return signalCreateRenderEffect(fn as any);
}

// ============================================================================
// Insert depth guard
// ============================================================================

let _insertDepth = 0;
const MAX_INSERT_DEPTH = 200;

// ============================================================================
// _createInsertEffect
//
// Creates a reactive render effect for DOM insertion.
// Uses a componentCache to ensure component thunks are called at most once —
// same thunk function reference always returns the same output across re-runs.
// ============================================================================

function _createInsertEffect(
  getAccessor: () => any,
  parent: Node,
  marker: Node | undefined,
  initialCurrent: Node | Node[] | null,
  setCurrent: (v: Node | Node[] | null) => void
): () => void {
  let current = initialCurrent;
  const componentCache = new Map<Function, any>();

  return createRenderEffect(() => {
    let value: any;

    // ── 0. If accessor itself is a component thunk (not a signal/memo), call it once via cache ──
    // IMPORTANT: must check !isSignal to avoid caching reactive values that are also
    // stamped as components (e.g. memos returned from components via $component/asComponent).
    if (isComponent(getAccessor as any) && !isSignal(getAccessor as any)) {
      console.log('comp accessor')
      if (!componentCache.has(getAccessor as Function)) {
        _insertDepth++;
        try {
          const inst = (getAccessor as any)();
          componentCache.set(getAccessor as Function, inst);
        } finally {
          _insertDepth--;
        }
        // createRoot(() => {
        // });
      }
      value = componentCache.get(getAccessor as Function)!;
      while (typeof value === 'function' && isSignal(value)) value = value();
    } else {
      value = getAccessor();

      // ── 1. Follow nested signal chain ──────────────────────────────────
      while (typeof value === 'function' && isSignal(value)) {
        value = value();
      }
    }

    // ── 2. Resolve component/signal chain via cache ───────────────────────
    {
      let chainDepth = 0;
      while (typeof value === 'function' && chainDepth++ < 50) {
        if (isComponent(value)) {
          const thunk = value;
          _insertDepth++;
          try {
            const inst = thunk();
            componentCache.set(thunk, inst);
          } finally {
            _insertDepth--;
          }
          // if (!componentCache.has(value)) {
          //   // createRoot(() => {
          //   // });
          // }
          value = componentCache.get(value)!;
        } else if (isSignal(value)) {
          value = (value as Function)();
        } else {
          // Plain non-component, non-signal function
          value = (value as Function)();
          if (typeof value !== 'function' || (!isSignal(value) && !isComponent(value))) break;
        }
      }
    }

    // ── 3. Insert resolved value ──────────────────────────────────────────
    _insertDepth++;
    try {
      current = insertExpression(parent, value, marker, current, componentCache);
      setCurrent(current);
    } finally {
      _insertDepth--;
    }
  });
}

// ============================================================================
// insert
// ============================================================================

export function insert(
  parent: Node,
  accessor?: Children | Accessor<Children> | null,
  marker?: Node,
  init?: Node | Node[] | null
): (() => Node | Node[] | null) | (Node | Node[] | null) {
  if (_insertDepth > MAX_INSERT_DEPTH) {
    console.error('[insert] Exceeded max call depth — possible infinite loop.');
    return () => null;
  }

  if (marker !== undefined && !marker) {
    marker = createTextNode('');
    parent.appendChild(marker);
  }

  let current: Node | Node[] | null = init ?? null;

  if (typeof accessor !== 'function') {
    _insertDepth++;
    try {
      current = insertExpression(parent, accessor, marker, null);
    } finally {
      _insertDepth--;
    }
    return () => current;
  }

  const dispose = _createInsertEffect(
    accessor as () => any,
    parent,
    marker,
    current,
    (v) => { current = v; }
  );
  return () => { dispose?.(); return current; };
}

// ============================================================================
// insertExpression
// ============================================================================

export function insertExpression(
  parent: Node,
  value: Children,
  marker?: Node,
  current?: Node | Node[] | null,
  componentCache?: Map<Function, any>
): Node | Node[] | null {
  // if (count > 100) throw('insertExpression')
  if (value == null || typeof value === 'boolean') {
    return cleanChildren(parent, current, marker);
  }

  if (typeof value === 'function') {
    if (isComponent(value) && !isSignal(value)) {
      // Component thunk — must be called via componentCache (not here)
      return current ?? null;
    }
    // Non-component functions: call defensively to unwrap plain wrappers
    while (typeof value === 'function' && !isSignal(value) && !isComponent(value)) {
      value = (value as Function)();
    }
    if (typeof value === 'function') {
      // Reached a signal or component thunk — cannot handle here
      return current ?? null;
    }
  }

  if (value == null || typeof value === 'boolean') {
    return cleanChildren(parent, current, marker);
  }

  // Handle promises
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
      parent.replaceChild(placeholder, current as Node);
    } else {
      insertBefore(parent, placeholder, marker);
    }

    (value as Promise<any>)
      .then((resolved) => {
        if (placeholder.parentNode === parent) {
          insertExpression(parent, resolved, placeholder.nextSibling as Node, placeholder);
        }
      })
      .catch((err) => {
        console.error('Error resolving promise in insertExpression:', err);
      });

    return placeholder;
  }

  const t = typeof value;

  if (t === 'string' || t === 'number') {
    if (t === 'number') value = String(value) as any;

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
      parent.replaceChild(node, current as Node);
    } else {
      insertBefore(parent, node, marker);
    }
    return node;
  }

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
      if ((current as Node).parentNode === parent) {
        parent.replaceChild(value, current as Node);
      } else {
        insertBefore(parent, value, marker);
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    const array: Node[] = [];
    const currentArray = Array.isArray(current)
      ? current
      : current
      ? [current as Node]
      : [];

    // console.log('flattening', value)
    flattenArray(value, array, parent, marker, true, componentCache);
    return reconcileArrays(parent, currentArray, array, marker);
  }

  if (t === 'object' && value !== null && typeof value === 'object') {
    const objValue = value as Record<string, any>;
    if ('_$litType$' in objValue || '_$litDirective$' in objValue) {
      return insertExpression(parent, renderLitToNodes(value), marker, current);
    }
    if ('type' in objValue && 'props' in objValue) {
      const jsxValue = objValue as { type: any; props: any };
      if (typeof jsxValue.type === 'function') {
        const result = jsxValue.type(jsxValue.props || {});
        return insertExpression(parent, result, marker, current);
      }
    }
  }

  return cleanChildren(parent, current, marker);
}

// ============================================================================
// flattenArray
//
// CRITICAL FIX: When a signal is read and its result is a component thunk
// (e.g. routerMemo() returns SuspenseThunk), use flattenArray recursively
// (NOT normalizeValue) so component thunks go through componentCache.
// This ensures Suspense/Routes/outlet signals are stable across navigations.
// ============================================================================

let count = 0
function flattenArray(
  arr: any[],
  result: Node[],
  parent: Node,
  marker?: Node,
  track = true,
  componentCache?: Map<Function, any>
): void {
  count+=1
  

  for (let i = 0; i < arr.length; i++) {
    let item = arr[i];

    if (item == null || typeof item === 'boolean') continue;

    // Resolve plain functions (not signals, not component thunks)
    while (typeof item === 'function' && !isPromise(item) && !isSignal(item) && !isComponent(item)) {
      item = item();
      if (item == null || typeof item === 'boolean') break;
    }

    if (item == null || typeof item === 'boolean') continue;

    // if(count > 200) {
    //   console.log('flatten broken', item)
    //   throw Error('cache')
    // }
    if (typeof item === 'function') {
      let resolved: any;

      if (isComponent(item)) {
        // Component thunk — call exactly once, cache result
        if (!componentCache) componentCache = new Map();
        if (!componentCache.has(item)) componentCache.set(item, item());
        resolved = componentCache.get(item);
      } else {
        // Signal or remaining function — read to track reactivity
        resolved = item();
      }

      // Unwrap plain wrappers; stop at signals and component thunks
      while (
        typeof resolved === 'function' &&
        !isPromise(resolved) &&
        !isSignal(resolved) &&
        !isComponent(resolved)
      ) {
        resolved = resolved();
      }

      if (resolved == null || typeof resolved === 'boolean') continue;

      if (typeof resolved === 'function') {
        if (isSignal(resolved)) {
          // Read the signal — tracked inside the enclosing render effect.
          // CRITICAL: Use flattenArray recursively (NOT normalizeValue) so
          // component thunks inside the result go through componentCache.
          let val = resolved();
          while (typeof val === 'function' && isSignal(val)) val = val();
          if (val == null || typeof val === 'boolean') continue;
          if (Array.isArray(val)) flattenArray(val, result, parent, marker, track, componentCache);
          else flattenArray([val], result, parent, marker, track, componentCache);
          continue;
        }
        // if (isComponent(resolved)) {
        //   if (!componentCache) componentCache = new Map();
        //   if (!componentCache.has(resolved)) componentCache.set(resolved, resolved());
        //   const inst = componentCache.get(resolved);
        //   if (inst == null || typeof inst === 'boolean') continue;
        //   if (typeof inst === 'function' && isSignal(inst)) {
        //     let val = inst();
        //     while (typeof val === 'function' && isSignal(val)) val = val();
        //     if (val == null || typeof val === 'boolean') continue;
        //     if (Array.isArray(val)) flattenArray(val, result, parent, marker, track, componentCache);
        //     else flattenArray([val], result, parent, marker, track, componentCache);
        //   } else if (Array.isArray(inst)) {
        //     flattenArray(inst, result, parent, marker, track, componentCache);
        //   } else {
        //     flattenArray([inst], result, parent, marker, track, componentCache);
        //   }
        //   continue;
        // }
        // Other function type — skip
        continue;
      }

      // resolved is not a function
      if (Array.isArray(resolved)) flattenArray(resolved, result, parent, marker, track, componentCache);
      else flattenArray([resolved], result, parent, marker, track, componentCache);
      continue;
    }

    if (isPromise(item)) {
      const placeholder = createTextNode('');
      result.push(placeholder);
      (item as Promise<any>)
        .then((resolved) => {
          if (placeholder.parentNode) {
            const tempNodes: Node[] = [];
            flattenArray([resolved], tempNodes, placeholder.parentNode, undefined, false, componentCache);
            if (tempNodes.length > 0) {
              placeholder.parentNode.replaceChild(tempNodes[0], placeholder);
              for (let j = 1; j < tempNodes.length; j++) {
                placeholder.parentNode?.insertBefore(tempNodes[j], tempNodes[j - 1].nextSibling);
              }
            }
          }
        })
        .catch((err) => console.error('Error resolving promise in array:', err));
      continue;
    }

    if (Array.isArray(item)) {
      flattenArray(item, result, parent, marker, track, componentCache);
      continue;
    }

    if (item instanceof Node) {
      result.push(item);
      continue;
    }

    if (
      typeof item === 'object' &&
      item !== null &&
      ('_$litType$' in item || '_$litDirective$' in item)
    ) {
      const nodes = renderLitToNodes(item);
      for (const node of nodes) result.push(node);
      continue;
    }

    if (
      typeof item === 'object' &&
      item !== null &&
      'type' in item &&
      'props' in item
    ) {
      const jsxItem = item as { type: any; props: any };
      if (typeof jsxItem.type === 'function') {
        const resolved = jsxItem.type(jsxItem.props || {});
        if (Array.isArray(resolved)) flattenArray(resolved, result, parent, marker, false, componentCache);
        else flattenArray([resolved], result, parent, marker, false, componentCache);
        continue;
      }
    }

    if (typeof item === 'string' || typeof item === 'number') {
      const str = String(item);
      if (str.trim() === '' && str !== ' ') continue;
      result.push(createTextNode(str));
      continue;
    }

    result.push(createTextNode(String(item)));
  }
}

function normalizeValue(value: any, result: Node[]): void {
  if (value == null || typeof value === 'boolean') return;

  while (typeof value === 'function' && !isPromise(value)) {
    value = value();
    if (value == null || typeof value === 'boolean') return;
  }

  if (isPromise(value)) {
    const placeholder = createTextNode('');
    result.push(placeholder);
    (value as Promise<any>)
      .then((resolved) => {
        if (placeholder.parentNode) {
          const parent = placeholder.parentNode;
          const tempNodes: Node[] = [];
          normalizeValue(resolved, tempNodes);
          for (const node of tempNodes) parent.insertBefore(node, placeholder);
          parent.removeChild(placeholder);
        }
      })
      .catch((err) => console.error('Error resolving promise in normalizeValue:', err));
    return;
  }

  if (value instanceof Node) { result.push(value); return; }

  if (
    typeof value === 'object' &&
    value !== null &&
    ('_$litType$' in value || '_$litDirective$' in value)
  ) {
    const nodes = renderLitToNodes(value);
    for (const node of nodes) result.push(node);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) normalizeValue(item, result);
    return;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    result.push(createTextNode(String(value)));
    return;
  }

  if (typeof value === 'object' && value !== null && 'type' in value && 'props' in value) {
    const jsxValue = value as { type: any; props: any };
    if (typeof jsxValue.type === 'function') {
      const resolved = jsxValue.type(jsxValue.props || {});
      normalizeValue(resolved, result);
      return;
    }
  }

  result.push(createTextNode(String(value)));
}

// ============================================================================
// reconcileArrays
// ============================================================================

function reconcileArrays(
  parent: Node,
  a: Node[],
  b: Node[],
  marker?: Node
): Node[] {
  let i = 0;
  const aLength = a.length;
  const bLength = b.length;

  while (i < aLength && i < bLength) {
    if (a[i] !== b[i]) {
      if (a[i].parentNode === parent) {
        parent.replaceChild(b[i], a[i]);
      } else {
        insertBefore(parent, b[i], marker);
      }
    }
    i++;
  }

  if (i < aLength) {
    for (let j = i; j < aLength; j++) {
      if (a[j].parentNode === parent) parent.removeChild(a[j]);
    }
  }

  if (i < bLength) {
    for (let j = i; j < bLength; j++) {
      insertBefore(parent, b[j], marker);
    }
  }

  return b;
}

// ============================================================================
// cleanChildren
// ============================================================================

export function cleanChildren(
  parent: Node,
  current?: Node | Node[] | null,
  marker?: Node
): null {
  if (current) {
    if (Array.isArray(current)) {
      for (let i = 0; i < current.length; i++) {
        if (current[i].parentNode === parent) parent.removeChild(current[i]);
      }
    } else if ((current as Node).parentNode === parent) {
      parent.removeChild(current as Node);
    }
  }
  return null;
}

// ============================================================================
// insertBefore
//
// DOM Runtime Guard: checks marker.parentNode === container before inserting.
// This prevents failures when markers are removed during route changes.
// ============================================================================

function insertBefore(parent: Node, node: Node, marker?: Node) {
  if (isHydrating) {
    if (node.parentNode === parent) return;
  }

  if (marker) {
    if (marker.parentNode === parent) {
      parent.insertBefore(node, marker);
    } else {
      parent.appendChild(node);
    }
  } else {
    parent.appendChild(node);
  }
}

// ============================================================================
// Attributes & Properties
// ============================================================================

export function setProperty(element: any, name: string, value: any): void {
  if (value == null) delete element[name];
  else element[name] = value;
}

export function setDynamicAttribute(
  element: Element,
  name: string,
  accessor: any,
  isSVG = false
): () => void {
  if (typeof accessor !== 'function') {
    setAttribute(element, name, accessor, isSVG);
    return () => {};
  }
  return createRenderEffect(() => {
    const value = typeof accessor === 'function' ? accessor() : accessor;
    setAttribute(element, name, value, isSVG);
  });
}

export function setDynamicProperty(element: any, name: string, accessor: any): () => void {
  if (typeof accessor !== 'function') {
    setProperty(element, name, accessor);
    return () => {};
  }
  return createRenderEffect(() => {
    const value = typeof accessor === 'function' ? accessor() : accessor;
    setProperty(element, name, value);
  });
}

/**
 * Set className. Accepts string | string[] | Record<string,boolean> | null.
 */
export function setClassName(element: Element, value: any): void {
  if (value == null) { element.removeAttribute('class'); return; }
  if(typeof value === 'function'){
    createEffect(()=>{
      // console.log('set class fn', value)
      setClassName(element, value())
      // element.setAttribute('class', value());
    })
    return;
  }
  // if (typeof value === 'function') {
  //   setClassName(element, value());
  //   return;
  // }

  if (typeof value === 'string') { element.setAttribute('class', value); return; }

  if (Array.isArray(value)) {
    element.setAttribute('class', value.filter(Boolean).join(' '));
    return;
  }

  if (typeof value === 'object') {
    const classes = Object.keys(value)
      .filter((key) => {
        const v = value[key];
        return typeof v === 'function' ? v() : Boolean(v);
      })
      .join(' ');
    element.setAttribute('class', classes);
    return;
  }


  element.setAttribute('class', String(value));
}

export function setStyle(element: any, value: any): void {
  if (value == null) { element.removeAttribute('style'); return; }

  if (typeof value === 'string') { element.style.cssText = value; return; }

  if (typeof value === 'object') {
    for (const key in value) {
      const styleValue = value[key];
      if (styleValue == null) (element.style as any)[key] = '';
      else (element.style as any)[key] = styleValue;
    }
  }
}

// ============================================================================
// spread
// ============================================================================

export function spread(options: SpreadOptions): () => void {
  const {
    element,
    props,
    prevProps = EMPTY_OBJ as Record<string, any>,
    isSVG = false,
    skipChildren = false,
  } = options;

  if (!element || !(element instanceof Element)) {
    console.error('[spread] Error: element is not a DOM Element!');
    return () => {};
  }

  if (!props) {
    console.warn('[spread] Warning: props is undefined!');
    return () => {};
  }

  const disposers: (() => void)[] = [];

  for (const key in props) {
    if (skipChildren && key === 'children') continue;

    const value = props[key];
    const prev = prevProps[key];

    if (value === prev) continue;

    if (key === 'ref') { handleRef(value, element); continue; }

    if (key === 'class' || key === 'className') {
      if (typeof value === 'function') {
        disposers.push(createRenderEffect(() => setClassName(element, value())));
      } else {
        setClassName(element, value);
      }
      continue;
    }

    if (key === 'style') {
      if (typeof value === 'function') {
        disposers.push(createRenderEffect(() => setStyle(element as any, value())));
      } else {
        setStyle(element as any, value);
      }
      continue;
    }

    if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase();
      if (prev) removeDelegatedEventListener(element, eventName);
      if (value) addDelegatedEventListener(element, eventName, value);
      continue;
    }

    if (JSX_PROPERTIES.has(key) || (!isSVG && key in element)) {
      disposers.push(setDynamicProperty(element, key, value));
    } else {
      disposers.push(setDynamicAttribute(element, key, value, isSVG));
    }
  }

  for (const key in prevProps as Record<string, any>) {
    if (!(key in props)) {
      if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase();
        removeDelegatedEventListener(element, eventName);
      } else if (JSX_PROPERTIES.has(key)) {
        setProperty(element, key, null);
      } else {
        element.removeAttribute(key);
      }
    }
  }

  return () => { disposers.forEach((d) => d()); };
}

/**
 * Apply props to an element.
 * For event handlers, stores as $$eventname property for delegation.
 */
export function applyProps(element: Element, props: Record<string, any>, isSVG = false): void {
  for (const key in props) {
    const val = props[key];
    if (key === 'ref') { handleRef(val, element); continue; }
    if (key === 'children') continue;
    if (key.startsWith('on') && key.length > 2) {
      const name = key.slice(2).toLowerCase();
      if (typeof val === 'function') {
        (element as any)[`$$${name}`] = val;
        if (!delegatedSet.has(name) && !NON_DELEGATED.has(name)) delegateEvents([name]);
      }
      continue;
    }
    if (key === 'class' || key === 'className') { 
      setClassName(element, val); continue; }
    if (key === 'style') { setStyle(element as HTMLElement, val); continue; }
    if (key === 'innerHTML') {
      (element as any).innerHTML = val;
      continue;
    }
    setAttribute(element, key, val, isSVG);
  }
}

export function mergeProps<T extends object>(...sources: Partial<T>[]): T {
  const target = {} as T;
  for (const source of sources) {
    if (!source) continue;
    const descriptors = Object.getOwnPropertyDescriptors(source);
    Object.defineProperties(target, descriptors);
  }
  // console.log('target is', target)
  return target;
}

// ============================================================================
// Refs
// ============================================================================

export function handleRef(ref: any, element: Element): void {
  if (!ref) return;

  // Swapped-argument guard
  if (ref instanceof Node) {
    const actualRef = element as unknown as any;
    const actualElement = ref as unknown as Element;
    if (!actualRef) return;
    if (typeof actualRef === 'function') actualRef(actualElement);
    else if (typeof actualRef === 'object' && 'current' in actualRef) actualRef.current = actualElement;
    return;
  }

  if (typeof ref === 'function') ref(element);
  else if (typeof ref === 'object' && 'current' in ref) ref.current = element;
}

// ============================================================================
// Lit integration
// ============================================================================

let litRenderFn: ((template: any, container: any) => void) | null = null;

export function registerLitRender(render: (template: any, container: any) => void): void {
  litRenderFn = render;
}

export function renderLitToNodes(template: any): Node[] {
  const nodes: Node[] = [];

  if (!litRenderFn) {
    console.warn('Lit render not registered. Call registerLitRender first.');
    return nodes;
  }

  try {
    const tempContainer = document.createElement('div');
    litRenderFn!(template, tempContainer);
    while (tempContainer.firstChild) {
      nodes.push(tempContainer.firstChild);
      tempContainer.removeChild(tempContainer.firstChild);
    }
  } catch (e) {
    console.warn('Could not render Lit template:', e);
  }
  return nodes;
}

// ============================================================================
// Portal
// ============================================================================

export function createPortal(
  children: Children | Accessor<Children>,
  container?: Element
): () => void {
  return insert(container || (globalThis as any).body, children) as () => void;
}

// ============================================================================
// Misc utilities
// ============================================================================

export function isNativeElement(tag: string): boolean {
  return typeof tag === 'string' && tag.toLowerCase() === tag;
}

export function isSVGElement(tag: string): boolean {
  return (
    tag === 'svg' || tag === 'path' || tag === 'circle' || tag === 'rect' ||
    tag === 'line' || tag === 'polygon' || tag === 'polyline' || tag === 'ellipse' ||
    tag === 'g' || tag === 'defs' || tag === 'clipPath' || tag === 'text'
  );
}

export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function runtimeBatch(fn: () => void): void {
  if (typeof (globalThis as any).__batch === 'function') {
    (globalThis as any).__batch(fn);
  } else {
    fn();
  }
}

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

// ============================================================================
// Batch & scheduling registration helpers
// ============================================================================

export function registerEffectCreator(creator: (fn: () => void) => () => void): void {
  (globalThis as any).__createEffect = creator;
}

// ============================================================================
// isAccessor — deprecated, kept for backward compat
// ============================================================================

export function isAccessor<T>(value: any): value is Accessor<T> {
  return typeof value === 'function' && value.length === 0 && isSignal(value);
}

// ============================================================================
// isStoreProxy — lazy load store utils
// ============================================================================

// let $PROXY_SYM: symbol | undefined;
// let isStoreProxyFn: ((value: any) => boolean) | undefined;

// try {
//   const storeModule = require('@awc/reactive/store');
//   $PROXY_SYM = storeModule.$PROXY;
//   isStoreProxyFn = storeModule.isStoreProxy;
// } catch (e) {
//   // Store module not available
// }

// export function isStoreProxy(value: any): boolean {
//   if (!value || typeof value !== 'object') return false;
//   if (isStoreProxyFn) return isStoreProxyFn(value);
//   if ($PROXY_SYM) return $PROXY_SYM in value;
//   return false;
// }

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

      // console.log('inserting', element);
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