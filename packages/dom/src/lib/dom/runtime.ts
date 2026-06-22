/**
 * @fileoverview Core Reactive DOM Runtime
 * @module @fluixi/dom/runtime
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

import  {
  isSignal,
} from '@fluixi/reactive/signal';
import { JSX_PROPERTIES, setAttribute, applyElementProp, SVG_NAMESPACE } from './utils.js';
import { isComponent } from '../component/modifiers.js';
// Reactive primitives come straight from the signal core (the globalThis-singleton graph makes
// this duplication-safe). The integration bridge is only for framework-provided glue that is
// NOT in the reactive core (e.g. createComponent).
import { batch, createEffect, createRenderEffect, createRoot, onCleanup, childrens as resolveChildren, untrack } from '@fluixi/reactive/signal';
import {
  isServer,
  ServerElement,
  ServerText,
  ServerComment,
  isDomNode,
  isDomElement,
  isDomText,
} from './server/nodes.js';
import {
  hydration,
  hydrateElement,
  hydrateText,
  hydrateMarker,
  isAdopted,
  ascendPast,
} from './hydration.js';


function getElementFingerprint(el: Element): string {
  const parts: string[] = [];

  while (el && el.nodeType === 1) {
    let part = el.tagName.toLowerCase();

    // Prefer stable identifiers
    if (el.id) {
      part += `#${el.id}`;
      parts.unshift(part);
      break; // ID is already unique
    }

    if (el.getAttribute('data-id')) {
      part += `[data-id="${el.getAttribute('data-id')}"]`;
    }

    // Add index among siblings (important)
    let index = 0;
    let sibling = el;

    while ((sibling = sibling.previousElementSibling as Element)) {
      if (sibling.tagName === el.tagName) index++;
    }

    part += `:nth-of-type(${index + 1})`;

    parts.unshift(part);
    el = el.parentElement!;
  }

  return parts.join('>');
}

function hashString(str: string): string {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // convert to 32bit int
  }

  return `el_${Math.abs(hash)}`;
}

export function getStableElementId(el: Element): string {
  return hashString(getElementFingerprint(el));
}
export const generateID = () => {
  return 'xxyxxxxxxy-4xx8'.replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0;
    let v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
const NON_DELEGATED = new Set(['scroll', 'focus', 'blur', 'load', 'error', 'resize', 'mouseenter', 'mouseleave']);

/**
 * Register global delegated event listener for the given event names.
 * Stores handlers as `element.$$eventname = handler` properties.
 */
export function delegateEvents(eventNames: string[]): void {
  if (isServer) return; // no document to attach to; events are inert in SSR
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
// Utilities
// ============================================================================

/**
 * Check if value is a function
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

function createTextNode(value: string): Text {
  if (isServer) return new ServerText(value) as unknown as Text;
  if (hydration.active) {
    const node = hydrateText(value);
    if (node) return node;
  }
  return document.createTextNode(value);
}

function createMarker(value: string): Comment {
  if (isServer) return new ServerComment(value) as unknown as Comment;
  if (hydration.active) {
    const node = hydrateMarker(value);
    if (node) return node;
  }
  return document.createComment(value);
}

export function createNativeElement(tag: string, isSVG = false): Element {
  if (isServer) return new ServerElement(tag, isSVG) as unknown as Element;
  if (hydration.active) {
    const node = hydrateElement(tag);
    if (node) return node;
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
 * component thunks (fluixi-component marker). Without this:
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

// function createRenderEffect(fn: () => void): (()=>void) {
//   if (typeof (globalThis as any).__createRenderEffect === 'function') {
//     // console.log('render effect found');
//     return (globalThis as any).__createRenderEffect(fn);
//   } else {
//     console.log('render effect not found');
//     return fn() as any;
//   }
// }
// function createEffect(fn: () => void): () => void {
//   if (typeof (globalThis as any).__createEffect === 'function') {
//     // console.log('effect found');
//    return  (globalThis as any).__createEffect(fn);
//   } else {
//     console.log('effect not found');
//     return ()=>{
//       fn();

//     }
//   }
// }
// function createRoot<T>(fn: (dispose: () => void) => T): T | void {
//   if (typeof (globalThis as any).__createRoot === 'function') {
//     console.log('create root found');
//     (globalThis as any).__createRoot(fn) as T;
//   } else {
//     console.log('create root not found');
//     // fn() as any;
//   }
// }
// function onCleanup(fn: Cleanup): void {
//   if (typeof (globalThis as any).__onCleanup === 'function') {
//     // console.log('on cleanup found');
//     (globalThis as any).__onCleanup(fn);
//   } else {
//     console.log('on cleanup not found');
//     // fn() as any;
//   }
// }

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
      if (!componentCache.has(getAccessor as Function)) {
        _insertDepth++;
        try {
          const inst = (getAccessor as any)();
          componentCache.set(getAccessor as Function, inst);
        } finally {
          _insertDepth--;
        }
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
          if (!componentCache.has(value)) {
            const thunk = value;
            _insertDepth++;
            try {
              const inst = thunk();
              componentCache.set(thunk, inst);
            } finally {
              _insertDepth--;
            }
          }
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
  // console.log('runtime insert', value);

  if (typeof value === 'function') {
    while (typeof value === 'function') {
      value = (value as Function)();
    }
    // if (isComponent(value) && !isSignal(value)) {
    //   // Component thunk — must be called via componentCache (not here)
    //   return current ?? null;
    // }
    // // Non-component functions: call defensively to unwrap plain wrappers
    // while (typeof value === 'function' && !isSignal(value) && !isComponent(value)) {
    //   value = (value as Function)();
    // }
    // if (typeof value === 'function') {
    //   // Reached a signal or component thunk — cannot handle here
    //   return current ?? null;
    // }
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

    if (current && isDomText(current)) {
      (current as Text).data = value as string;
      return current;
    }

    const node = createTextNode(value as string);
    if (current && (current as Node).parentNode === parent) {
      parent.replaceChild(node, current as Node);
    } else if (!isAdopted(parent, node)) {
      // during hydration createTextNode reuses the in-place server text node and
      // already advanced the cursor — don't re-insert (that would reorder).
      insertBefore(parent, node, marker);
    }
    return node;
  }

  if (isDomNode(value)) {
    // Hydration: the node was already produced from the server DOM (reused by
    // createNativeElement) and sits in `parent` in place — adopt it without
    // re-inserting, and ascend the cursor past its (already-walked) subtree.
    if (isAdopted(parent, value as Node)) {
      ascendPast(value as Node);
      return value;
    }
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

      flattenArray(value, array, parent, marker, true, componentCache);
      // console.log('flattening', currentArray, array)
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

      if (isComponent(item) && !isSignal(item)) {
        // Pure component thunk (e.g. () => <div>) — call exactly once and cache so
        // re-runs of the enclosing render effect return the same DOM nodes (keeps
        // focus etc. stable across navigations).
        // IMPORTANT: must check !isSignal. A memo stamped as a component (e.g. an
        // Outlet/Routes/Suspense output returned via $component/asComponent) is BOTH
        // isComponent AND isSignal; caching it would freeze its first value (so a
        // boundary that later switches from a single node to an array — fallback ->
        // children — would never update). Read those reactively in the else branch.
        if (!componentCache) componentCache = new Map();
        if (!componentCache.has(item)) componentCache.set(item, item());
        resolved = componentCache.get(item);
      } else {
        // Signal/memo (or memo-stamped component) — read to track reactivity.
        resolved = item();
      }

      // Unwrap plain wrappers; stop at signals and component thunks.
      // Cache calls by function reference — a plain function returned by a
      // signal/memo (e.g. `createMemo(() => cond ? () => <JSX> : ...)`) is a
      // stable reference as long as the memo doesn't re-evaluate. Calling it
      // once and caching the result means re-runs of the outer render effect
      // (triggered by unrelated signals like `activeLevel()`) hit the cache and
      // return the same DOM nodes. reconcileArrays then sees identical references
      // and skips the slot — the focused <input> is never removed.
      while (
        typeof resolved === 'function' &&
        !isPromise(resolved) &&
        !isSignal(resolved) &&
        !isComponent(resolved)
      ) {
        if (!componentCache) componentCache = new Map();
        if (!componentCache.has(resolved)) componentCache.set(resolved, resolved());
        resolved = componentCache.get(resolved);
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
          if (Array.isArray(val)){
            flattenArray(val, result, parent, marker, track, componentCache)
          }else flattenArray([val], result, parent, marker, track, componentCache);
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

    if (isDomNode(item)) {
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

// function normalizeValue(value: any, result: Node[]): void {
//   if (value == null || typeof value === 'boolean') return;

//   while (typeof value === 'function' && !isPromise(value)) {
//     value = value();
//     if (value == null || typeof value === 'boolean') return;
//   }

//   if (isPromise(value)) {
//     const placeholder = createTextNode('');
//     result.push(placeholder);
//     (value as Promise<any>)
//       .then((resolved) => {
//         if (placeholder.parentNode) {
//           const parent = placeholder.parentNode;
//           const tempNodes: Node[] = [];
//           normalizeValue(resolved, tempNodes);
//           for (const node of tempNodes) parent.insertBefore(node, placeholder);
//           parent.removeChild(placeholder);
//         }
//       })
//       .catch((err) => console.error('Error resolving promise in normalizeValue:', err));
//     return;
//   }

//   if (value instanceof Node) { result.push(value); return; }

//   if (
//     typeof value === 'object' &&
//     value !== null &&
//     ('_$litType$' in value || '_$litDirective$' in value)
//   ) {
//     const nodes = renderLitToNodes(value);
//     for (const node of nodes) result.push(node);
//     return;
//   }

//   if (Array.isArray(value)) {
//     for (const item of value) normalizeValue(item, result);
//     return;
//   }

//   if (typeof value === 'string' || typeof value === 'number') {
//     result.push(createTextNode(String(value)));
//     return;
//   }

//   if (typeof value === 'object' && value !== null && 'type' in value && 'props' in value) {
//     const jsxValue = value as { type: any; props: any };
//     if (typeof jsxValue.type === 'function') {
//       const resolved = jsxValue.type(jsxValue.props || {});
//       normalizeValue(resolved, result);
//       return;
//     }
//   }

//   result.push(createTextNode(String(value)));
// }

// ============================================================================
// reconcileArrays
// ============================================================================

function reconcileArrays(
  parent: Node,
  a: Node[],
  b: Node[],
  marker?: Node
): Node[] {
  // Pre-process: clone any node already owned by a different parent.
  // The Babel plugin hoists static elements to module-level — the same node
  // can appear in `b` for multiple parents simultaneously. Clone to avoid
  // stealing it from its current owner; future reconciles track the clone.
  for (let i = 0; i < b.length; i++) {
    if (b[i].parentNode !== null && b[i].parentNode !== parent) {
      b = b.slice();
      b[i] = b[i].cloneNode(true) as Node;
    }
  }

  // SolidJS-style reconcile: skip common prefix/suffix by identity so unchanged
  // nodes (e.g. a focused <input> inside a stable parent div) are never removed.
  let bLength = b.length,
    aEnd   = a.length,
    bEnd   = bLength,
    aStart = 0,
    bStart = 0,
    // When `a` is empty fall back to marker so insertions land in the right slot.
    after: Node | undefined = aEnd > 0
      ? (a[aEnd - 1].nextSibling as Node | null | undefined) ?? undefined
      : marker,
    map: Map<Node, number> | null = null;

  while (aStart < aEnd || bStart < bEnd) {
    // 1. Common prefix — already in the right place, skip.
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }

    // 2. Common suffix — already in the right place, shrink window.
    while (aEnd > aStart && bEnd > bStart && a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }

    // 3. Old list exhausted — insert remaining new nodes.
    if (aEnd === aStart) {
      const node: Node | undefined = bEnd < bLength
        ? bStart
          ? (b[bStart - 1].nextSibling as Node | null | undefined) ?? undefined
          : b[bEnd - bStart]
        : after;
      while (bStart < bEnd) insertBefore(parent, b[bStart++], node);
    }

    // 4. New list exhausted — remove remaining old nodes.
    else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if ((!map || !map.has(a[aStart])) && a[aStart].parentNode === parent)
          parent.removeChild(a[aStart]);
        aStart++;
      }
    }

    // 5. Two-node swap (cross-endpoints match).
    else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      insertBefore(parent, b[bStart++], a[aStart++].nextSibling as Node | undefined);
      insertBefore(parent, b[--bEnd], node as Node | undefined);
      a[aEnd] = a[aStart - 1];
    }

    // 6. Map-based fallback for complex reordering.
    else {
      if (!map) {
        map = new Map();
        let i = bStart;
        while (i < bEnd) map.set(b[i], i++);
      }
      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart, sequence = 1;
          while (++i < aEnd && i < bEnd) {
            if (!map.has(a[i]) || map.get(a[i]) !== index + sequence) break;
            sequence++;
          }
          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index) insertBefore(parent, b[bStart++], node);
          } else {
            // Guard replaceChild: if a[aStart] was moved out by another effect, insert instead.
            if (a[aStart].parentNode === parent) {
              parent.replaceChild(b[bStart++], a[aStart++]);
            } else {
              insertBefore(parent, b[bStart++], after);
              aStart++;
            }
          }
        } else {
          aStart++;
        }
      } else {
        if (a[aStart].parentNode === parent) parent.removeChild(a[aStart]);
        aStart++;
      }
    }
  }

  return b;
}

// function reconcileArrays(
//   parent: Node,
//   a: Node[],
//   b: Node[],
//   marker?: Node
// ): Node[] {
//   // Step 1: remove from the DOM any a-node not present in b.
//   // The bSet is built from the original b references.  After step 2 may
//   // replace some entries with clones, so we rebuild a clean set for removal.
//   if (a.length > 0) {
//     const bSet = new Set<Node>(b);
//     for (let i = a.length - 1; i >= 0; i--) {
//       if (!bSet.has(a[i]) && a[i].parentNode === parent) {
//         parent.removeChild(a[i]);
//         // if(a[i].textContent.trim() !== '') {
//         // }else{
//         //   console.log('skip remove', a[i].textContent.trim(), b);
//         // }
//       }
//     }
//   }

//   // Step 2: insert / reorder b-nodes right-to-left.
//   //
//   // CRITICAL: The Babel plugin hoists fully-static elements (e.g. an empty
//   // <span>) to a single module-level DOM node.  When the same node appears in
//   // the `b` array of *multiple* parents (e.g. several list rows), inserting it
//   // into the second parent would silently steal it from the first.  To prevent
//   // this we clone any node that already lives in a *different* parent and
//   // update the returned array so that future reconciles track the clone instead
//   // of the original.
//   //
//   // Nodes that are already in THIS parent are reused / reordered as normal —
//   // cloning is only necessary for cross-parent theft.
//   const out: Node[] = b.slice(); // copy; entries may be replaced by clones
//   let after: Node | undefined = marker;
//   for (let i = b.length - 1; i >= 0; i--) {
//     let node = out[i];
//     if (node.parentNode !== null && node.parentNode !== parent) {
//       // Already owned by another parent — clone so we don't steal it.
//       node = node.cloneNode(true) as Node;
//       out[i] = node;
//     }
//     const alreadyPlaced =
//       node.parentNode === parent &&
//       node.nextSibling === (after ?? null);
//     if (!alreadyPlaced) {
//       insertBefore(parent, node, after);
//     }
//     after = node;
//   }

//   return out;
// }

// ============================================================================
// cleanChildren
// ============================================================================

export function cleanChildren(
  parent: Node,
  current?: Node | Node[] | null,
  marker?: Node
): null {
  // console.log('cleanChildren', parent, current, marker);
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
  if (hydration.active && node.parentNode === parent) return;

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

/**
 * Apply a `classList`-style map `{ 'a b': condition }` — toggling each class on
 * the element. A condition may be a value or a reactive accessor; when
 * `disposers` is provided, accessor entries are wired with a render effect so
 * they update fine-grained (Solid-style `classList`).
 */
export function setClassList(
  element: Element,
  value: any,
  disposers?: Array<() => void>,
): void {
  if (!value || typeof value !== 'object') return;
  for (const name in value) {
    const cond = value[name];
    const names = name.split(/\s+/).filter(Boolean);
    if (typeof cond === 'function' && disposers) {
      disposers.push(
        createRenderEffect(() => {
          const on = !!cond();
          for (const n of names) element.classList.toggle(n, on);
        }),
      );
    } else {
      const on = !!(typeof cond === 'function' ? cond() : cond);
      for (const n of names) element.classList.toggle(n, on);
    }
  }
}

export function setStyle(element: any, _value: any): void {
  let value = _value;
  while(typeof value === 'function') value = value()
  
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

  if (!element || !isDomElement(element)) {
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

    if (key === 'classList') {
      if (typeof value === 'function') {
        disposers.push(createRenderEffect(() => setClassList(element, value())));
      } else {
        setClassList(element, value, disposers);
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
        if (NON_DELEGATED.has(name)) {
          // Non-bubbling events (blur, focus, scroll…): store handler on the element
          // and attach a single stable forwarder listener. This avoids
          // addEventListener/removeEventListener churn when a reactive scope re-runs,
          // which would silently drop the listener via onCleanup before re-adding it.
          (element as any)[`$$${name}`] = val;
          const listenerKey = `__awc_${name}`;
          if (!(element as any)[listenerKey]) {
            const forwarder = (e: Event) => { (element as any)[`$$${name}`]?.(e); };
            element.addEventListener(name, forwarder);
            (element as any)[listenerKey] = forwarder;
          }
        } else {
          (element as any)[`$$${name}`] = val;
          if (!delegatedSet.has(name)) delegateEvents([name]);
        }
      }
      continue;
    }
    if (key === 'class' || key === 'className') {
      setClassName(element, val); continue; }
    if (key === 'classList') {
      if (typeof val === 'function') createRenderEffect(() => setClassList(element, val()));
      else setClassList(element, val);
      continue;
    }
    if (key === 'style') { setStyle(element as HTMLElement, val); continue; }
    if (key === 'innerHTML') {
        // let v = typeof val === 'function' ? val() : val
        // while(typeof v === 'function') v = v()
              const dispose = createEffect(() => {
                let v = val()
                while(typeof v === 'function') v = v();
                (element as any).innerHTML = v;
              });
              onCleanup(()=>{
                dispose()
              })
              // (element as any).innerHTML = val;
                // console.log('inner html is', v);
      continue;
    }
    // Special case: <input>/<textarea> value — use DOM property assignment, not
    // setAttribute. Skip reactive updates while the element has focus so user
    // input is never interrupted and focus is never lost due to signal writes.
    if (key === 'value' && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
      if (typeof val === 'function') {
        const dispose = createEffect(() => {
          let v = val();
          //  console.log('apply inpit props', v, element);
          while (typeof v === 'function' && (v as Function).length === 0) v = v();
          // Only update if element is NOT currently focused — don't fight user input
          if (document.activeElement !== element) {
            (element as HTMLInputElement).value = v ?? '';
          }
        });
        onCleanup(() => { dispose(); });
      } else {
        (element as HTMLInputElement).value = val ?? '';
      }
      continue;
    }
    if (key === 'checked' && (element.tagName === 'INPUT')) {
      if (typeof val === 'function') {
        const dispose = createEffect(() => {
          let v = val();
          while (typeof v === 'function' && (v as Function).length === 0) v = v();
          // Only update if element is NOT currently focused — don't fight user input
          if (document.activeElement !== element) {
            (element as any).checked = v ?? '';
          }
        });
        onCleanup(() => { dispose(); });
      } else {
        (element as any).checked = val ?? '';
      }
      continue;
    }

    // Special case: <select value=...> — must assign .value as DOM property
    // AFTER options are in the DOM. We defer the initial run via queueMicrotask
    // (children/options are inserted synchronously after applyProps returns).
    if (key === 'value' && (element as Element).tagName === 'SELECT') {
      if (typeof val === 'function') {
        let firstRun = true;
        const dispose = createEffect(() => {
          let v = val();
          while (typeof v === 'function' && (v as Function).length === 0) v = v();
          if (firstRun) {
            firstRun = false;
            queueMicrotask(() => { (element as HTMLSelectElement).value = v ?? ''; });
          } else {
            (element as HTMLSelectElement).value = v ?? '';
          }
        });
        onCleanup(() => { dispose(); });
      } else {
        queueMicrotask(() => { (element as HTMLSelectElement).value = val ?? ''; });
      }
      continue;
    }
    
    if (typeof val === 'function') {
      const dispose = createEffect(() => {
        let v = val()
        while((typeof v === 'function' && (v as Function).length===0)) v = v()
          // if(key==='opened'){
          //   console.log('opened is', val, element,v)
          // }
          applyElementProp(element, key, v, isSVG)
      });
                onCleanup(()=>{
                dispose()
              })
    } else {
      applyElementProp(element, key, val, isSVG);
    }
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

type SplitArgs<T, K extends (keyof T)[][]> = {
  [P in keyof K]: Pick<T, Extract<K[P][number], keyof T>>;
};

/**
 * Split a (possibly reactive) props object into groups of keys plus a `rest`,
 * preserving reactivity — each returned object is a Proxy whose `get` forwards
 * to the original `props`, so a getter/signal-backed prop stays live.
 *
 *   const [local, rest] = splitProps(props, ['class', 'id']);
 *   //   local.class tracks props.class; rest has everything else.
 *
 * Mirrors Solid's splitProps. Descriptors are exposed as accessors (not eager
 * values) so spreading a group stays reactive, and forced `configurable` avoids
 * Proxy invariant errors when `props` has non-configurable descriptors.
 */
export function splitProps<T extends object, K extends (keyof T)[][]>(
  props: T,
  ...keys: K
): [...SplitArgs<T, K>, Omit<T, K[number][number]>] {
  const taken = new Set<string | symbol>();
  for (const group of keys) for (const k of group) taken.add(k as string | symbol);

  const descriptor = (p: string | symbol): PropertyDescriptor => ({
    enumerable: true,
    configurable: true,
    get: () => (props as any)[p],
  });

  const groups = keys.map((group) => {
    const keySet = new Set<string | symbol>(group as (string | symbol)[]);
    return new Proxy({} as any, {
      get: (_, p) => (keySet.has(p) ? (props as any)[p] : undefined),
      has: (_, p) => keySet.has(p) && p in (props as any),
      ownKeys: () => Array.from(keySet).filter((k) => k in (props as any)),
      getOwnPropertyDescriptor: (_, p) =>
        keySet.has(p) && p in (props as any) ? descriptor(p) : undefined,
    });
  });

  const rest = new Proxy({} as any, {
    get: (_, p) => (taken.has(p) ? undefined : (props as any)[p]),
    has: (_, p) => !taken.has(p) && p in (props as any),
    ownKeys: () => Reflect.ownKeys(props).filter((k) => !taken.has(k)),
    getOwnPropertyDescriptor: (_, p) =>
      !taken.has(p) && p in (props as any) ? descriptor(p) : undefined,
  });

  return [...groups, rest] as any;
}



// ============================================================================
// Refs
// ============================================================================

export function handleRef(ref: any, element: Element): void {
  if (!ref) return;

  // Swapped-argument guard
  if (isDomNode(ref)) {
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

export function createPortal(children: any, element: any, props?: any) {
  // 1. Define the target (default to document.body)
  const container = element || document.body;

  // 2. Use the 'children' helper to resolve the reactive content
  // This ensures that if children are a function or signal, they are tracked.
  const resolved = resolveChildren(() => children);
  const cleanups: any[] = [];

  batch(()=>{
    const dispose = createRenderEffect(() => {
      const nodes = resolved();
      // console.log('resolved', nodes)
  
      // 3. Handle the insertion
      if (Array.isArray(nodes)) {
        nodes.forEach((node) => container.appendChild(node));
  
        // 4. Cleanup: Remove nodes when the effect re-runs or component unmounts
        cleanups.push(() => {
          nodes.forEach((node) => {
            if (node.parentNode === container) {
              container.removeChild(node);
            }
          });
        });
      } else if (isDomNode(nodes)) {
        container.appendChild(nodes);
        cleanups.push(() => {
          console.log('on cleanup nodes', nodes, nodes.parentNode, container)
          if (nodes.parentNode === container) {
            container.removeChild(nodes);
          }
        });
      }
    });
    cleanups.push(dispose);
    // 5. Return the cleanup function
    onCleanup(()=>{
      cleanups.forEach((fn) => fn());
      // dispose();
    });
    
  })



  // Portal returns nothing to its original parent's DOM location
  return null;
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

// export function registerCreateComponent(
//   _createComponent: (fn: () => any, props?: any) => any
// ): void {
//   (globalThis as any).__createComponent = _createComponent;
// }
export function registerCreateRoot(
  _createRoot: (fn: <T>(fn: (dispose: () => void) => T)=> T) => any
): void {
  (globalThis as any).__createRoot = _createRoot;
}
export function registerOncleanUp(
  _onCleanup: (fn: () => void) => void
): void {
  (globalThis as any).__onCleanup = _onCleanup;
}

export function isPromise(v: any): v is Promise<any> {
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
export function registerRenderEffectCreator(creator: (fn: () => void) => () => void): void {
  (globalThis as any).__createRenderEffect = creator;
}
export function registerCreateRootCreator(creator: (fn: () => void) => () => void): void {
  (globalThis as any).__createRoot = creator;
}
export function registerCreateMemoCreator(creator: any): void {
  (globalThis as any).__createMemo = creator;
}
export function registeronCleanupCreator(creator: any): void {
  (globalThis as any).__onCleanup = creator;
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
//   const storeModule = require('@fluixi/reactive/store');
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
      // Clear container (but not when hydrating — we reuse the server DOM).
      if (!hydration.active) {
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

// hydrate() lives in ./hydration.js (the DOM-reuse hydration feature). Re-export
// it here so the existing import path (`@fluixi/dom` → runtime) keeps working.
export { hydrate, captureHydrationCursor, runHydrationAt } from './hydration.js';
