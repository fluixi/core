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
import { stampVersions, warnOnVersionSkew } from './versions.js';
import { isComponent } from '../component/modifiers.js';
// Reactive primitives come straight from the signal core (the globalThis-singleton graph makes
// this duplication-safe). The integration bridge is only for framework-provided glue that is
// NOT in the reactive core (e.g. createComponent).
import { batch, createEffect, createRenderEffect, createRoot, onCleanup, readChildren, untrack } from '@fluixi/reactive/signal';
import {
  isServer,
  getServerNodes,
  isDomNode,
  isDomElement,
  isDomText,
} from './server/host.js';
import {
  hydration,
  getHydrationWalker,
  isAdopted,
  runHydrationAt,
  ascendPast,
} from './hydration-state.js';


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
const NON_DELEGATED = new Set(['scroll', 'focus', 'blur', 'load', 'error', 'resize', 'mouseenter', 'mouseleave', 'pointerenter', 'pointerleave', 'gotpointercapture', 'lostpointercapture']);

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
  if (NON_DELEGATED.has(name)) {
    // Non-bubbling event (focus/blur/pointerenter/…): document delegation can't observe it, so
    // attach a direct listener once. A stable forwarder reads $$name so updating the handler
    // doesn't churn addEventListener/removeEventListener.
    const key = `__fx_${name}`;
    if (!(element as any)[key]) {
      const forwarder = (e: Event) => { (element as any)[`$$${name}`]?.(e); };
      element.addEventListener(name, forwarder);
      (element as any)[key] = forwarder;
    }
    return;
  }
  if (!delegatedSet.has(name)) {
    delegateEvents([name]);
  }
}

/**
 * Remove a delegated event handler
 */
export function removeDelegatedEventListener(element: Element, name: string): void {
  delete (element as any)[`$$${name}`];
  const key = `__fx_${name}`;
  const forwarder = (element as any)[key];
  if (forwarder) {
    element.removeEventListener(name, forwarder);
    delete (element as any)[key];
  }
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

function createTextNode(value: string, anchor = false): Text {
  if (isServer) return getServerNodes().createText(value) as unknown as Text;
  // Anchors/placeholders (insert markers) are client-only insertion points — the server
  // serialized nothing for them, so they must never adopt a server text node. Only real
  // content goes through the hydration walker.
  if (hydration.active && !anchor) {
    const node = getHydrationWalker()?.hydrateText(value);
    if (node) return node;
  }
  return document.createTextNode(value);
}

function createMarker(value: string): Comment {
  if (isServer) return getServerNodes().createComment(value) as unknown as Comment;
  if (hydration.active) {
    const node = getHydrationWalker()?.hydrateMarker(value);
    if (node) return node;
  }
  return document.createComment(value);
}

export function createNativeElement(tag: string, isSVG = false): Element {
  if (isServer) return getServerNodes().createElement(tag, isSVG) as unknown as Element;
  if (hydration.active) {
    const node = getHydrationWalker()?.hydrateElement(tag);
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

/**
 * A node for a compiler-emitted static template, built the way the current environment
 * needs it.
 *
 * The three cases mirror {@link createNativeElement}, which is the point: a template has
 * to behave like the elements it replaces, or it works only in client-rendered apps —
 * which is exactly how it failed before this existed.
 *
 *  - **server** — carried as text and written out verbatim. Parsing it into elements
 *    only to serialize them straight back would be pure cost.
 *  - **hydrating** — adopt the server's existing subtree and skip past it. The subtree
 *    is inert, so there is nothing inside to wire up.
 *  - **client** — parse once (cached by HTML) and clone per instance.
 */
export function templateNode(html: string, tag: string, holes = false, isSVG = false): Node {
  if (isServer) {
    // With holes the server needs real nodes for the hole content to be inserted into;
    // without them the string can be written out untouched, which is strictly cheaper.
    const nodes = getServerNodes();
    return (holes ? nodes.parseTemplate(html, isSVG) : nodes.createRaw(html)) as unknown as Node;
  }
  if (hydration.active) {
    // Adopt the server's root either way. With holes the generated walk reaches them
    // through the adopted tree, whose structure matches the template by construction.
    const node = getHydrationWalker()?.hydrateStatic(tag);
    if (node) return node;
  }
  return cloneTemplate(createTemplate(html, isSVG), isSVG).firstChild as Node;
}

/**
 * Evaluate a hole's content with the hydration cursor placed at what the server rendered
 * for *that hole*.
 *
 * Without this, only the hole's top level adopts. `templateNode` moves the cursor past the
 * whole template — the subtree is inert, so there is nothing in it to walk — which leaves
 * the cursor in the wrong place for anything the hole builds internally. A component in a
 * hole would then recreate its own elements: no duplication, but every server node thrown
 * away, which is most of what hydration is for.
 *
 * The markers make the position exact: the content starts immediately after `start`.
 */
export function holeScope<T>(start: Node, produce: () => T): T {
  if (!hydration.active) return produce();

  // `produce` is called with the cursor already placed, because the value may be built
  // eagerly — `props.children` is a getter, and reading it constructs its nodes there and
  // then. Wrapping the result instead would be too late: the DOM would already exist,
  // built against whatever cursor happened to be current, and the server's nodes would be
  // left behind as duplicates.
  const value = runHydrationAt(start.nextSibling, produce);

  // A memo or accessor builds nothing until it is read, which happens inside `insert`'s
  // effect — so it needs the cursor placed again at that moment. The guard matters: once
  // hydration is over, later updates must render normally rather than re-enter it.
  if (typeof value === 'function') {
    const accessor = value as unknown as (...args: unknown[]) => unknown;
    return ((...args: unknown[]) =>
      hydration.active
        ? runHydrationAt(start.nextSibling, () => accessor(...args))
        : accessor(...args)) as unknown as T;
  }
  return value;
}

/**
 * The closing marker for a hole opened at `start`.
 *
 * Found by scanning rather than by position: on a fresh clone it is the very next node,
 * but the server's DOM has the rendered content in between, and hydration walks that DOM.
 * Scanning is what makes one set of generated references work in both.
 */
export function holeEnd(start: Node): Node {
  for (let n = start.nextSibling; n; n = n.nextSibling) {
    if (n.nodeType === 8 && (n as Comment).data === 'fx/') return n;
  }
  /* c8 ignore next 2 */
  throw new Error('[fluixi] template hole is missing its closing marker');
}

/**
 * The nodes a hole already contains, for `insert` to reconcile against.
 *
 * On a fresh clone the markers are adjacent and this is empty, so `insert` builds the
 * content. When hydrating, the server's rendered content sits between them and is handed
 * back — `insertExpression` then reuses those nodes (setting `.data` on a text node
 * rather than creating one), which is what adoption means here.
 *
 * Paired markers are what make this exact: a hole's content is *by definition* the nodes
 * between its own two markers, with no dependence on the hydration cursor's position.
 */
export function holeContent(start: Node, end: Node): Node[] {
  const nodes: Node[] = [];
  for (let n = start.nextSibling; n && n !== end; n = n.nextSibling) nodes.push(n);
  return nodes;
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
 * Must stop at signals/memos/resources ($SIGNAL marker) and
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
    // must check !isSignal to avoid caching reactive values that are also
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
    marker = createTextNode('', true);
    parent.appendChild(marker);
  }

  let current: Node | Node[] | null = init ?? null;
  const isReactiveArray = (element: any) => {
    return Array.isArray(element) && element.some((v: any) => typeof v === 'function');
  };
  const normalizeAccessor = (accessor: any): Accessor<any> => {
     if(typeof accessor === 'function') return accessor;
    return ()=>accessor;
  };

  if (typeof accessor !== 'function' && !isReactiveArray(accessor)) {
    _insertDepth++;
    try {
      // `current` — not null. The caller passes what is already in this slot, and for a
      // hydrating template hole that is the server's own nodes (`holeContent`). Dropping it
      // meant a static value never adopted: insertExpression saw an empty slot and appended
      // a second copy beside the server's, so `{cmd}` rendered the string twice.
      // Without an `init` this is null anyway, so nothing else changes.
      current = insertExpression(parent, accessor, marker, current);
    } finally {
      _insertDepth--;
    }
    return () => current;
  }

  const dispose = _createInsertEffect(
    normalizeAccessor(accessor),
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
  if (value == null || typeof value === 'boolean') {
    return cleanChildren(parent, current, marker);
  }

  if (typeof value === 'function') {
    while (typeof value === 'function') {
      value = (value as Function)();
    }
  }

  if (value == null || typeof value === 'boolean') {
    return cleanChildren(parent, current, marker);
  }

  // Handle promises
  if (isPromise(value)) {
    const placeholder = createTextNode('', true);
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

    // Collect reactive members so each gets its own fine-grained insert effect instead of being
    // read inline in this (enclosing) render effect.
    const reactiveSlots: Array<{ marker: Node; sig: any }> = [];
    flattenArray(value, array, parent, marker, true, componentCache, reactiveSlots);
    const reconciled = reconcileArrays(parent, currentArray, array, marker);
    // Markers are now in the DOM — wire a per-slot reactive insert. insert() sets up a nested
    // render effect that re-inserts the member's content before its marker on change, so a bare
    // control-flow component return (<Show>/<Switch>/<For>) updates in place.
    //
    // The per-slot content lives OUTSIDE the reconcile array (only the marker is tracked), so if
    // this enclosing effect re-runs with a shorter array — e.g. a <For> item dropped, or its child
    // resolved to a memo (Provider -> component) — reconcile removes the marker but would orphan the
    // content. Register a cleanup that removes the slot's nodes when its effect is torn down. This
    // only fires when the enclosing effect re-runs (the array itself changed); an in-place update
    // (e.g. <Show> toggling) never re-runs this effect, so it keeps updating in place.
    for (const slot of reactiveSlots) {
      const disposeSlot = insert(parent, slot.sig, slot.marker) as () => Node | Node[] | null;
      onCleanup(() => {
        cleanChildren(parent, disposeSlot());
        if (slot.marker.parentNode === parent) parent.removeChild(slot.marker);
      });
    }
    return reconciled;
  }

  if (t === 'object' && value !== null && typeof value === 'object') {
    const objValue = value as Record<string, any>;
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

// flattenArray — flatten a children array to DOM nodes. A signal whose result is a
// component thunk (e.g. a router memo returning a SuspenseThunk) is recursed through
// flattenArray, not read inline, so the thunk goes through componentCache and stays
// stable across navigations.
function flattenArray(
  arr: any[],
  result: Node[],
  parent: Node,
  marker?: Node,
  track = true,
  componentCache?: Map<Function, any>,
  // When provided, a reactive member is NOT read inline (which would subscribe the enclosing
  // render effect and re-render the whole subtree on change). Instead it emits a placeholder
  // marker and records itself here; the array caller wires a fine-grained insert() per slot
  // after the markers are placed. This is what makes a bare control-flow component return
  // (a memo, e.g. <Show>) update in place, like an element child does.
  reactiveSlots?: Array<{ marker: Node; sig: any }>
): void {
  for (let i = 0; i < arr.length; i++) {
    let item = arr[i];

    if (item == null || typeof item === 'boolean') continue;

    // Resolve plain functions (not signals, not component thunks)
    while (typeof item === 'function' && !isPromise(item) && !isSignal(item) && !isComponent(item)) {
      item = item();
      if (item == null || typeof item === 'boolean') break;
    }

    if (item == null || typeof item === 'boolean') continue;

    if (typeof item === 'function') {
      let resolved: any;

      if (isComponent(item) && !isSignal(item)) {
        // Pure component thunk (e.g. () => <div>) — call exactly once and cache so
        // re-runs of the enclosing render effect return the same DOM nodes (keeps
        // focus etc. stable across navigations).
        // must check !isSignal. A memo stamped as a component (e.g. an
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
          // Defer to a per-slot insert effect (see reactiveSlots) so a reactive member updates
          // in place instead of re-rendering the enclosing subtree. Only the synchronous array
          // path collects slots; async/promise resolutions fall back to the inline read below.
          if (reactiveSlots) {
            const slot = createTextNode('', true);
            result.push(slot);
            reactiveSlots.push({ marker: slot, sig: resolved });
            continue;
          }
          // Read the signal — tracked inside the enclosing render effect.
          // Use flattenArray recursively (NOT normalizeValue) so
          // component thunks inside the result go through componentCache.
          let val = resolved();
          while (typeof val === 'function' && isSignal(val)) val = val();
          if (val == null || typeof val === 'boolean') continue;
          if (Array.isArray(val)){
            flattenArray(val, result, parent, marker, track, componentCache)
          }else flattenArray([val], result, parent, marker, track, componentCache);
          continue;
        }
        // Other function type — skip
        continue;
      }

      // resolved is not a function
      if (Array.isArray(resolved)) flattenArray(resolved, result, parent, marker, track, componentCache, reactiveSlots);
      else flattenArray([resolved], result, parent, marker, track, componentCache, reactiveSlots);
      continue;
    }

    if (isPromise(item)) {
      const placeholder = createTextNode('', true);
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
      flattenArray(item, result, parent, marker, track, componentCache, reactiveSlots);
      continue;
    }

    if (isDomNode(item)) {
      result.push(item);
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
  //
  // A DocumentFragment is NOT such an owner. `cloneTemplate` hands back the clone still
  // sitting in its fragment, so a template-cloned element arrives here with a non-null
  // parent that nothing else refers to. Cloning it again threw away the node whose props
  // had just been applied — `cloneNode` copies attributes but not the event-handler
  // properties — so an element built from a template lost its handlers the moment it was
  // inserted as part of an array. Moving it out of the fragment is exactly right.
  for (let i = 0; i < b.length; i++) {
    const owner = b[i].parentNode;
    if (owner !== null && owner !== parent && owner.nodeType !== 11) {
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

/**
 * Apply `use:` custom directives. `value` is an array of `[directive, accessor?]`
 * pairs (the compiler's normalized shape); each directive is called
 * `directive(element, accessor)`. A bare function or single pair is tolerated so
 * the runtime is usable directly too.
 */
/**
 * Attach a NATIVE event listener (bypassing delegation) for `on:name` /
 * `@name.capture` bindings. `value` is a handler or `[handler, options]` where
 * options is an `AddEventListenerOptions` (`{ capture, once, passive }`).
 * Returns a disposer that removes the listener.
 */
export function addNativeEventListener(element: Element, name: string, value: any): () => void {
  let handler = value;
  let options: AddEventListenerOptions | undefined;
  if (Array.isArray(value)) { handler = value[0]; options = value[1]; }
  if (typeof handler !== 'function') return () => {};
  element.addEventListener(name, handler as EventListener, options);
  return () => element.removeEventListener(name, handler as EventListener, options);
}

export function applyUse(element: Element, value: any): void {
  const call = (dir: any, accessor?: any) => {
    if (typeof dir === 'function') dir(element, accessor ?? (() => undefined));
  };
  if (typeof value === 'function') { call(value); return; }
  if (!Array.isArray(value)) return;
  // A single [fn, accessor] pair, or an array of such pairs.
  if (typeof value[0] === 'function') { call(value[0], value[1]); return; }
  for (const pair of value) {
    if (Array.isArray(pair)) call(pair[0], pair[1]);
    else call(pair);
  }
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

// Boolean attribute (`bool:name`): truthy renders the empty string, falsy removes it.
// setAttribute already does that for true/false, so coerce with !!.
export function setDynamicBoolAttribute(element: Element, name: string, accessor: any): () => void {
  if (typeof accessor !== 'function') {
    setAttribute(element, name, !!accessor);
    return () => {};
  }
  return createRenderEffect(() => {
    const value = (accessor as () => unknown)();
    setAttribute(element, name, !!value);
  });
}

/**
 * Set className. Accepts string | string[] | Record<string,boolean> | null.
 */
export function setClassName(element: Element, value: any): void {
  if (value == null) { element.removeAttribute('class'); return; }

  if (typeof value === 'function') {
    // A render effect, like every other attribute binding — `spread` already wraps
    // class this way, so going through `applyProps` shouldn't schedule it later.
    createRenderEffect(() => setClassName(element, value()));
    return;
  }

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

  // Trust the element's real namespace over the compile-time isSVG flag: the codegen only marks
  // some SVG elements (e.g. <svg>/<defs>) and misses nested ones (<linearGradient>, <stop>). For
  // an actually-SVG element, a key like `x1` IS `in element` (read-only SVGAnimatedLength), so the
  // property branch below would throw "Cannot set property x1". Detecting SVG by namespaceURI keeps
  // those on the setAttribute path. (Matters under hydration, where we adopt the real, correctly
  // namespaced server node.)
  const elementIsSVG = isSVG || (element as any).namespaceURI === SVG_NAMESPACE;

  const disposers: (() => void)[] = [];

  for (const key in props) {
    if (skipChildren && key === 'children') continue;

    const value = props[key];
    const prev = prevProps[key];

    if (value === prev) continue;

    if (key === 'ref') { handleRef(value, element); continue; }

    // Custom directives: `use=${dir}` / `use:name` / `use:name=${opts}`. The
    // compiler normalizes to an array of [directive, accessor?] pairs; each is
    // called with the element (accessor optional). Directives register their own
    // onCleanup, so run them in the current reactive owner.
    if (key === 'use') { applyUse(element, value); continue; }

    // Native event binding: `on:click` / `@click.capture` / `@input.passive`.
    // Value is a handler or `[handler, options]`. Uses addEventListener (bypasses
    // delegation) so capture/once/passive work. Must precede the `on`-delegated
    // branch below (both start with "on").
    if (key.startsWith('on:')) {
      disposers.push(addNativeEventListener(element, key.slice(3), value));
      continue;
    }

    // Forced bindings: prop:x always assigns the property, attr:x always sets the
    // attribute, bool:x toggles a boolean attribute — skipping the heuristic below.
    if (key.startsWith('prop:')) {
      disposers.push(setDynamicProperty(element, key.slice(5), value));
      continue;
    }
    if (key.startsWith('attr:')) {
      disposers.push(setDynamicAttribute(element, key.slice(5), value, elementIsSVG));
      continue;
    }
    if (key.startsWith('bool:')) {
      disposers.push(setDynamicBoolAttribute(element, key.slice(5), value));
      continue;
    }

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

    const asProperty = JSX_PROPERTIES.has(key) || (!elementIsSVG && key in element);
    if (typeof value === 'function') {
      // Accessor value (`() => expr`): setDynamic* wraps it in its own effect.
      disposers.push(
        asProperty
          ? setDynamicProperty(element, key, value)
          : setDynamicAttribute(element, key, value, elementIsSVG),
      );
    } else {
      // A plain, non-function value may still be backed by a reactive GETTER —
      // component props compile to `get x() {...}`, and splitProps/mergeProps
      // forward those getters. Reading `props[key]` once (above) snapshots the
      // current value and drops the dependency, so the DOM never updates. Re-read
      // it inside a render effect so the getter's reads are tracked. (A truly
      // static value just runs the effect once with no deps — negligible.)
      disposers.push(
        createRenderEffect(() =>
          asProperty
            ? setProperty(element, key, props[key])
            : setAttribute(element, key, props[key], elementIsSVG),
        ),
      );
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
    if (key === 'use') { applyUse(element, val); continue; }
    if (key.startsWith('on:')) { addNativeEventListener(element, key.slice(3), val); continue; }
    // Forced bindings — see spread().
    if (key.startsWith('prop:')) { setDynamicProperty(element, key.slice(5), val); continue; }
    if (key.startsWith('attr:')) { setDynamicAttribute(element, key.slice(5), val, isSVG); continue; }
    if (key.startsWith('bool:')) { setDynamicBoolAttribute(element, key.slice(5), val); continue; }
    if (key.startsWith('on') && key.length > 2) {
      const name = key.slice(2).toLowerCase();
      if (typeof val === 'function') {
        if (NON_DELEGATED.has(name)) {
          // Non-bubbling events (blur, focus, scroll…): store handler on the element
          // and attach a single stable forwarder listener. This avoids
          // addEventListener/removeEventListener churn when a reactive scope re-runs,
          // which would silently drop the listener via onCleanup before re-adding it.
          (element as any)[`$$${name}`] = val;
          const listenerKey = `__fx_${name}`;
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
      // setClassName unwraps an accessor itself.
      setClassName(element, val); continue; }
    if (key === 'classList') {
      if (typeof val === 'function') createRenderEffect(() => setClassList(element, val()));
      else setClassList(element, val);
      continue;
    }
    if (key === 'style') {
      // An accessor reaches applyProps whenever a component forwards a computed
      // style through a props object rather than as a compiled JSX attribute —
      // which is what every polymorphic/`as` wrapper does. class and classList
      // already handled that; style applied once and never updated.
      if (typeof val === 'function') createRenderEffect(() => setStyle(element as HTMLElement, (val as () => unknown)()));
      else setStyle(element as HTMLElement, val);
      continue;
    }
    if (key === 'innerHTML') {
      // Accept a static string OR a reactive accessor. A function is wrapped in an effect so
      // updates apply; a plain value is set once. (The previous code always called val(), which
      // threw on a static string — wiping content during hydration.)
      if (typeof val === 'function') {
        const dispose = createEffect(() => {
          let v: unknown = (val as () => unknown)();
          while (typeof v === 'function') v = (v as () => unknown)();
          (element as any).innerHTML = v;
        });
        onCleanup(() => dispose());
      } else {
        (element as any).innerHTML = val;
      }
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
        // A plain value may still be backed by a reactive getter (component props
        // compile to `get value(){...}`, forwarded live through splitProps/mergeProps).
        // Re-read props[key] in a render effect so the getter's reads are tracked;
        // a static value just runs once. Same focus guard as the accessor branch.
        createRenderEffect(() => {
          if (document.activeElement !== element) {
            (element as HTMLInputElement).value = props[key] ?? '';
          }
        });
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
        // Plain value possibly behind a reactive getter — re-read live. See the
        // value branch above.
        createRenderEffect(() => {
          if (document.activeElement !== element) {
            (element as any).checked = props[key] ?? '';
          }
        });
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
        // Plain value possibly behind a reactive getter — re-read live, keeping the
        // first assignment deferred until the options are in the DOM.
        let firstRun = true;
        createRenderEffect(() => {
          const v = props[key];
          if (firstRun) {
            firstRun = false;
            queueMicrotask(() => { (element as HTMLSelectElement).value = v ?? ''; });
          } else {
            (element as HTMLSelectElement).value = v ?? '';
          }
        });
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
      // Plain value possibly behind a reactive getter (component props compile to
      // `get x(){...}`, forwarded live by splitProps/mergeProps). Re-read props[key]
      // in a render effect so getter reads are tracked; a static value runs once.
      // Mirrors spread().
      createRenderEffect(() => applyElementProp(element, key, props[key], isSVG));
    }
  }
}

/**
 * Merge several (possibly reactive) prop sources into one, last-source-wins — but a later
 * source's `undefined` does NOT clobber an earlier defined value; it falls through to it. This
 * is what makes `mergeProps(defaults, props)` work, and why the compiler can emit
 * `mergeProps(...spreads, baseProps)` for JSX spreads (`<div {...a} {...b} />`) without a missing
 * `b.x` wiping `a.x`.
 *
 * Like Solid's mergeProps (and `splitProps` above), the result is a Proxy that resolves each key
 * LAZILY off the sources — getter/signal-backed props stay live (re-read on every access, not
 * snapshotted), and the key set is the union across all sources (so dynamic prop objects work).
 */
export function mergeProps<T extends object>(...sources: Partial<T>[]): T {
  // Last defined (non-undefined) value wins; scan sources from the end so a later `undefined`
  // falls through to an earlier source. Reads `source[key]` live each call — no snapshot.
  const resolve = (key: string | symbol): any => {
    for (let i = sources.length - 1; i >= 0; i--) {
      const s = sources[i] as any;
      if (s && key in s && s[key] !== undefined) return s[key];
    }
    return undefined;
  };
  const hasKey = (key: string | symbol): boolean => {
    for (const s of sources) if (s && key in (s as any)) return true;
    return false;
  };

  return new Proxy({} as any, {
    get: (_, key) => resolve(key),
    has: (_, key) => hasKey(key),
    ownKeys: () => {
      const keys = new Set<string | symbol>();
      for (const s of sources) if (s) for (const k of Reflect.ownKeys(s as object)) keys.add(k);
      return [...keys];
    },
    getOwnPropertyDescriptor: (_, key) =>
      hasKey(key)
        ? { enumerable: true, configurable: true, get: () => resolve(key) }
        : undefined,
  }) as T;
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
// Portal
// ============================================================================

export function createPortal(children: any, element: any, props?: any) {
  // 1. Define the target (default to document.body)
  const container = element || document.body;

  // 2. Use the 'children' helper to resolve the reactive content
  // This ensures that if children are a function or signal, they are tracked.
  const resolved = readChildren(() => children);
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

export function isPromise(v: any): v is Promise<any> {
  return (
    (v != null &&
      (typeof v === 'object' || typeof v === 'function') &&
      typeof (v as any).then === 'function') ||
    v instanceof Promise
  );
}

// ============================================================================
// isAccessor — deprecated, kept for backward compat
// ============================================================================

export function isAccessor<T>(value: any): value is Accessor<T> {
  return typeof value === 'function' && value.length === 0 && isSignal(value);
}

/** Render a JSX element into a DOM container (nested arrays, thunks, promises, and node types). */
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
    batch(() => {
      // Clear container (but not when hydrating — we reuse the server DOM).
      if (!hydration.active) {
        container.textContent = '';
      }

      // Which build is running, on the element and as `window.Fluixi`. Stamped here
      // rather than in core's render so the hydrate path gets it too.
      stampVersions(container);
      warnOnVersionSkew();

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


/**
 * Normalize what `bind:` was given into a `[read, write]` pair.
 *
 * `createSignal` hands back that pair already; `signal` hands back `{ get, set }`. Both
 * are the same primitive, so `bind:value` has to take either — steering people to the
 * new API and then refusing it in a directive would be its own kind of broken.
 */
export function bindPair(source: any): [() => any, (value: any) => void] {
  if (Array.isArray(source)) return source as [() => any, (value: any) => void];
  // `signal(…)` is the accessor itself with `set` attached.
  if (typeof source === 'function' && typeof source.set === 'function') {
    return [source, source.set];
  }
  throw new TypeError(
    '[fluixi] bind: needs a signal — either `signal(…)` or the `[get, set]` pair from `createSignal(…)`.',
  );
}
