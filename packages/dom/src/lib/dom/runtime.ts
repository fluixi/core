/**
 * @module @fluixi/dom/runtime
 *
 * Fine-grained reactive DOM manipulation utilities inspired by SolidJS.
 * Key design: Event delegation uses `$$eventname` properties on DOM nodes
 * (the SolidJS pattern): simpler and more reliable than Map-based lookup.
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
import { JSX_PROPERTIES, isAttributeOnlyName, setAttribute, applyElementProp, serverCustomElementProp, SVG_NAMESPACE } from './utils.js';
import { VERSION_ATTRIBUTE, stampVersions, warnOnVersionSkew } from './versions.js';
import { isComponent } from '../component/modifiers.js';
// Reactive primitives come straight from the signal core (the globalThis-singleton graph makes
// this duplication-safe). The integration bridge is only for framework-provided glue that is
// not in the reactive core (e.g. createComponent).
import { batch, createEffect, createRenderEffect, createRoot, getOwner, onCleanup, runWithOwner, readChildren, reportReactiveBinding, reportReactiveDirective, untrack } from '@fluixi/reactive/signal';
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
  HOLE_TAG,
  ascendPast,
  hydrationKeys,
  warnTextMismatch,
  HYDRATION_KEY,
} from './hydration-state.js';
// `__DEV__` is folded by a build that defines it, so a bundler drops what it guards; without it
// the check reads NODE_ENV. Written inline at each use: a bundler keeps a function whose only
// caller sits behind an imported or local constant.
declare const __DEV__: boolean | undefined;
import { isDevelopment } from './dev-env.js';
// `false` in a production browser build (the Vite integration and the CDN builds define it), so
// a bundler drops the server branches; without it the check asks the runtime. Written inline at
// each use, as `__DEV__` is: a bundler keeps a function whose only caller sits behind a constant.
declare const __FLUIXI_SERVER__: boolean | undefined;

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

// Types

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
  /**
   * The tag is a custom element. The compiler sets this from the tag name; a caller that
   * builds props by hand can leave it out and the tag is read off the element instead.
   */
  isCustomElement?: boolean;
  /**
   * The props the compiler wrapped as accessors. A custom element's property can hold a
   * function (an action, a formatter), and a thunk the compiler made looks the same, so
   * without this list `action={signIn}` was called as an accessor: on a server render that
   * ran the action. With it, any other function is the value itself. A hand-built call that
   * leaves it out keeps treating every function as an accessor.
   */
  accessors?: readonly string[];
}

export type PropertyValue = any;
export type AttributeValue = string | number | boolean | null | undefined;
export type Children =
  | Node
  // Mixed, as written by hand: `insert(el, [header, () => label(), panel])`. Each reactive member
  // updates on its own.
  | Children[]
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => any);

// Constants

const EMPTY_OBJ = {};
const EMPTY_ARR: any[] = [];

/** Where an element's own source position goes, for devtools to read back. */
const LOC_TAG = '__fx_loc';

/** Only ever called with a position when the compiler recorded one. */
function located<T extends Element>(element: T, at?: { file: string; line: number; column: number }): T {
  if (!(typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) return element;
  if (at) (element as unknown as Record<string, unknown>)[LOC_TAG] = at;
  return element;
}

const templateCache = new Map<string, HTMLTemplateElement>();

// Event Delegation. SolidJS $$eventname property pattern
//
// Handlers are stored directly on DOM nodes as `node.$$click = handler`.
// The capture listener reads `node.$$click` directly, no Map lookups needed.
// This approach correctly handles e.preventDefault() and stopPropagation.

/**
 * Which events already have a document listener, shared across every copy of this module.
 *
 * On globalThis for the same reason the reactive graph is (see reactive's `graph/state.ts`):
 * a page can load more than one build of the runtime, and two standalone custom elements
 * is the ordinary way that happens. As a module-level `Set` each copy believed it was the
 * first, each added its own listener to the document, and every handler ran once per copy.
 * One click on a page with two elements counted twice.
 *
 * The dispatcher is stored beside it so the copies share one function rather than adding
 * an identical listener each.
 */
interface DelegationState {
  names: Set<string>;
  dispatch?: EventListener;
}
const DELEGATION_KEY = '__fluixi_delegated_events__';
const delegation: DelegationState = ((globalThis as any)[DELEGATION_KEY] ??= {
  names: new Set<string>(),
});
const delegatedSet = delegation.names;

// Events that don't bubble: must use direct addEventListener
const NON_DELEGATED = new Set(['scroll', 'focus', 'blur', 'load', 'error', 'resize', 'mouseenter', 'mouseleave', 'pointerenter', 'pointerleave', 'gotpointercapture', 'lostpointercapture']);

/**
 * Register global delegated event listener for the given event names.
 * Stores handlers as `element.$$eventname = handler` properties.
 */
export function delegateEvents(eventNames: string[]): void {
  if ((typeof __FLUIXI_SERVER__ !== 'undefined' ? __FLUIXI_SERVER__ : isServer())) return; // no document to attach to; events are inert in SSR
  for (const name of eventNames) {
    if (delegatedSet.has(name) || NON_DELEGATED.has(name)) continue;
    delegatedSet.add(name);
    // The first copy to get here owns the function every copy then registers, so a
    // second build cannot add a second listener for the same event.
    delegation.dispatch ??= delegatedEventHandler as EventListener;
    document.addEventListener(name, delegation.dispatch);
  }
}

function delegatedEventHandler(e: Event): void {
  const key = `$$${e.type}`;
  // Walk up from the actual target (handles shadow DOM via composedPath)
  let node: any = (e.composedPath && e.composedPath()[0]) || e.target;
  // A handler reads `event.currentTarget` as the element it is attached to, as it would with
  // addEventListener. The browser reports the document, where the one real listener sits, so
  // `new FormData(event.currentTarget)` in an onSubmit threw. Reported per step, then the
  // native getter is put back.
  Object.defineProperty(e, 'currentTarget', { configurable: true, get: () => node ?? document });
  try {
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
  } finally {
    delete (e as { currentTarget?: unknown }).currentTarget;
  }
}

/**
 * Add a delegated event handler: stores as $$eventname property
 */
export function addDelegatedEventListener(
  element: Element,
  name: string,
  handler: EventListener
): void {
  (element as any)[`$$${name}`] = handler;
  if (NON_DELEGATED.has(name)) {
    // Non-bubbling event (focus/blur/pointerenter/...): document delegation can't observe it, so
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

// Utilities

/**
 * Check if value is a function
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

function createTextNode(value: string, anchor = false): Text {
  if ((typeof __FLUIXI_SERVER__ !== 'undefined' ? __FLUIXI_SERVER__ : isServer())) return getServerNodes().createText(value) as unknown as Text;
  // Anchors/placeholders (insert markers) are client-only insertion points, the server
  // serialized nothing for them, so they must never adopt a server text node. Only real
  // content goes through the hydration walker.
  if (hydration.active && !anchor) {
    const node = getHydrationWalker()?.hydrateText(value);
    if (node) return node;
  }
  return document.createTextNode(value);
}

function createMarker(value: string): Comment {
  if ((typeof __FLUIXI_SERVER__ !== 'undefined' ? __FLUIXI_SERVER__ : isServer())) return getServerNodes().createComment(value) as unknown as Comment;
  if (hydration.active) {
    const node = getHydrationWalker()?.hydrateMarker(value);
    if (node) return node;
  }
  return document.createComment(value);
}

/**
 * Create an element, or adopt the server's during hydration.
 *
 * One of the calls the compiler emits, so its three modes are the whole of how a
 * template becomes DOM. Server rendering routes to the realm's node factory and returns
 * a string-serializable stand-in rather than a real element. Hydration asks the walker
 * for the next element the server wrote and reuses it. Otherwise it creates one.
 *
 * `at` is a dev-only source position, stamped onto the node for devtools. A production
 * build passes none and carries no marker.
 */
export function createNativeElement(
  tag: string,
  isSVG = false,
  at?: { file: string; line: number; column: number },
): Element {
  // Null unless a server render or `hydrate()` loaded the keys: a page that only renders here.
  const keys = hydrationKeys();
  const key = keys ? keys.next() : null;
  if ((typeof __FLUIXI_SERVER__ !== 'undefined' ? __FLUIXI_SERVER__ : isServer())) {
    const node = getServerNodes().createElement(tag, isSVG) as unknown as Element;
    if (key) node.setAttribute(HYDRATION_KEY, key);
    return node;
  }
  if (hydration.active) {
    const claimed = keys ? keys.claim(key, tag) : null;
    if (claimed) {
      getHydrationWalker()?.enterElement(claimed);
      if (tag.includes('-')) keys?.handOwner(claimed);
      return at ? located(claimed, at) : claimed;
    }
    const node = getHydrationWalker()?.hydrateElement(tag);
    if (node) {
      if (tag.includes('-')) keys?.handOwner(node);
      return at ? located(node, at) : node;
    }
  }
  return located(
    isSVG ? document.createElementNS(SVG_NAMESPACE, tag) : document.createElement(tag),
    at,
  );
}

/**
 * Parse static template HTML once and cache it by that string.
 *
 * Every clone of a template comes from one parse, which is most of why a compiled
 * template is cheap. The cache is keyed by the markup rather than by identity, so two
 * modules emitting the same HTML share the parse.
 */
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
 * to behave like the elements it replaces, or it works only in client-rendered apps,
 * which is exactly how it failed before this existed.
 *
 *  - **server**: carried as text and written out verbatim. Parsing it into elements
 *    only to serialize them straight back would be pure cost.
 *  - **hydrating**: adopt the server's existing subtree and skip past it. The subtree
 *    is inert, so there is nothing inside to wire up.
 *  - **client**: parse once (cached by HTML) and clone per instance.
 */
export function templateNode(
  html: string,
  tag: string,
  holes = false,
  isSVG = false,
  at?: TemplatePositions,
): Node {
  const keys = hydrationKeys();
  const salt = keys ? keys.salt(html) : '';
  const key = keys ? keys.next(salt) : null;
  if ((typeof __FLUIXI_SERVER__ !== 'undefined' ? __FLUIXI_SERVER__ : isServer())) {
    // With holes the server needs real nodes for the hole content to be inserted into;
    // without them the string can be written out untouched, which is strictly cheaper.
    const nodes = getServerNodes();
    if (holes) {
      const node = nodes.parseTemplate(html, isSVG);
      if (key) node.setAttribute(HYDRATION_KEY, key);
      return node as unknown as Node;
    }
    return nodes.createRaw(key ? withKey(html, key) : html) as unknown as Node;
  }
  if (hydration.active) {
    const claimed = keys ? keys.claim(key, tag) : null;
    if (claimed) {
      // Adopted whole, as a static template is: the generated walk reaches the holes.
      hydration.cursor = claimed.nextSibling;
      keys?.handOwnerTree(claimed, html);
      return stampPositions(claimed, at);
    }
    // Adopt the server's root either way. With holes the generated walk reaches them
    // through the adopted tree, whose structure matches the template by construction.
    const node = getHydrationWalker()?.hydrateStatic(tag, salt);
    if (node) {
      keys?.handOwnerTree(node, html);
      return stampPositions(node, at);
    }
  }
  return stampPositions(cloneTemplate(createTemplate(html, isSVG), isSVG).firstChild as Node, at);
}

/**
 * A compiled template for code that only renders in the browser: parsed on first use, then
 * cloned per call. Code compiled to render on the server or hydrate uses `templateNode`.
 */
export function template(html: string): (at?: TemplatePositions) => Node {
  let parsed: HTMLTemplateElement | undefined;
  return (at) => {
    parsed ??= createTemplate(html);
    return stampPositions(copyIntoDocument(parsed.content.firstChild!), at);
  };
}

/**
 * A deep copy owned by the page's document. A plain `cloneNode` of template content belongs to
 * the template's inert document until it is inserted: a ref that kept `el.ownerDocument` found no
 * `body`, and a custom element in it stays un-upgraded, so a property set before insertion misses
 * its class. The server renderer has no document and clones.
 */
function copyIntoDocument<T extends Node>(node: T): T {
  const doc = typeof document === 'undefined' ? undefined : document;
  return (doc && node.ownerDocument !== doc ? doc.importNode(node, true) : node.cloneNode(true)) as T;
}

/** The template's root tag with its hydration key: `<div class` to `<div data-hk="3" class`. */
function withKey(html: string, key: string): string {
  return html.replace(/^(\s*<[^\s/>]+)/, `$1 ${HYDRATION_KEY}="${key}"`);
}

/** Line and column per element of a template, flattened, in document order. */
export interface TemplatePositions {
  file: string;
  pos: number[];
}

/**
 * Write each element's own source position onto it.
 *
 * The whole template is one string, so a source map traces every element in it back to the
 * line the root opens at: devtools would name the component and nothing finer. This is the
 * one moment the two line up: the tree holds exactly the elements the compiler listed, in
 * the same order, because holes are filled after this returns.
 *
 * Only reached when the compiler emitted positions, which it does for a dev build.
 */
function stampPositions(node: Node, at?: TemplatePositions): Node {
  if (!(typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) return node;
  const root = node as Element;
  if (!at || typeof root?.querySelectorAll !== 'function') return node;
  const all: Element[] = [root, ...root.querySelectorAll('*')];
  for (let i = 0; i < all.length && i * 2 + 1 < at.pos.length; i++) {
    const line = at.pos[i * 2]!;
    if (line) (all[i] as any)[LOC_TAG] = { file: at.file, line, column: at.pos[i * 2 + 1]! };
  }
  return node;
}

/**
 * Evaluate a hole's content with the hydration cursor placed at what the server rendered
 * for *that hole*.
 *
 * Without this, only the hole's top level adopts. `templateNode` moves the cursor past the
 * whole template, the subtree is inert, so there is nothing in it to walk, which leaves
 * the cursor in the wrong place for anything the hole builds internally. A component in a
 * hole would then recreate its own elements: no duplication, but every server node thrown
 * away, which is most of what hydration is for.
 *
 * The markers make the position exact: the content starts immediately after `start`.
 */
export function holeScope<T>(start: Node, produce: () => T): T {
  const keys = hydration.active && hydrationKeys();
  return keys ? keys.holeScope(start, produce) : produce();
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
 * back: `insertExpression` then reuses those nodes (setting `.data` on a text node
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
  const clone = copyIntoDocument(template.content);
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
 * iterateFn: resolves a value by calling through plain function wrappers.
 *
 * Must stop at signals/memos/resources ($SIGNAL marker) and
 * component thunks (fluixi-component marker). Without this:
 *  - components returning memos get unwrapped to static values, losing reactivity
 *  - lazy component createMemo re-triggers C(props) -> infinite recursion
 */
export function iterateFn(item: any): any {
  // Stop immediately if it's a signal, memo, or resource
  if (isSignal(item)) return item;
  // Stop if it's a component thunk
  if (isComponent(item)) return item;

  if (typeof item !== 'function') return item;

  // Unwrap plain function wrappers: stop at signals and component thunks
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

// Insert depth guard

let _insertDepth = 0;
const MAX_INSERT_DEPTH = 200;

// _createInsertEffect
//
// Creates a reactive render effect for DOM insertion.
// Uses a componentCache to ensure component thunks are called at most once:
// same thunk function reference always returns the same output across re-runs.

function _createInsertEffect(
  getAccessor: () => any,
  parent: Node,
  marker: Node | undefined,
  initialCurrent: Node | Node[] | null,
  setCurrent: (v: Node | Node[] | null) => void
): () => void {
  let current = initialCurrent;
  // Built on the first component thunk, not up front: most insert positions
  // never hold a component, and a Map per position is per-row weight in a list.
  let componentCache: Map<Function, any> | undefined;
  const cache = () => (componentCache ??= new Map<Function, any>());
  let adopted = false;
  return createRenderEffect(() => {
    // Only the first run adopts server nodes. A later run is an update, even when it happens
    // while the page around it is still hydrating (a custom element that adopted its content,
    // then got a new prop from the page): with the page's cursor it would claim nodes that
    // are already its own, or someone else's.
    const update = adopted && hydration.active;
    adopted = true;
    if (!update) return runInsert();
    hydration.active = false;
    try {
      return runInsert();
    } finally {
      hydration.active = true;
    }
  });

  function runInsert() {
    // The accessor, never its result: it carries the compiler's hole position, and calling it
    // again here builds the dom twice, during hydration, a duplicated subtree.
    //
    // Every run, because what this effect writes into moves as the value does.
    if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveBinding(marker ?? parent, 'content', undefined, getAccessor);
    let value: any;

    // ── 0. If accessor itself is a component thunk (not a signal/memo), call it once via cache ──
    // must check !isSignal to avoid caching reactive values that are also
    // stamped as components (e.g. memos returned from components via $component/asComponent).
    if (isComponent(getAccessor as any) && !isSignal(getAccessor as any)) {
      if (!cache().has(getAccessor as Function)) {
        _insertDepth++;
        try {
          const inst = (getAccessor as any)();
          cache().set(getAccessor as Function, inst);
        } finally {
          _insertDepth--;
        }
      }
      value = cache().get(getAccessor as Function)!;
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
          if (!cache().has(value)) {
            const thunk = value;
            _insertDepth++;
            try {
              const inst = thunk();
              cache().set(thunk, inst);
            } finally {
              _insertDepth--;
            }
          }
          value = cache().get(value)!;
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
    // An array can hide component thunks that only flattening meets; the cache
    // has to exist before it does, so those thunks keep their identity too.
    if (Array.isArray(value)) cache();
    _insertDepth++;
    try {
      current = insertExpression(parent, value, marker, current, componentCache);
      setCurrent(current);
    } finally {
      _insertDepth--;
    }
  }
}

// insert

/**
 * Place content in a parent, and keep it current when the content is reactive.
 *
 * The other half of the compiler's output. `accessor` may be a value or a function: a
 * function is read inside a render effect, so the position updates on its own when
 * anything it read changes. That is where fine-grained updating actually happens, since
 * only this position is touched rather than the subtree around it.
 *
 * `marker` is the node the content sits before, which is what makes several holes in one
 * parent independent. `init` is what the position already holds, empty on a fresh clone
 * and the server's nodes when hydrating, so hydration reconciles against them instead of
 * building a second copy.
 */
export function insert(
  parent: Node,
  accessor?: Children | Accessor<Children> | null,
  /** Insert before this node. `null`: before an anchor of its own, appended (or at the hydration cursor). */
  marker?: Node | null,
  init?: Node | Node[] | null
): (() => Node | Node[] | null) | (Node | Node[] | null) {
  if (_insertDepth > MAX_INSERT_DEPTH) {
    console.error('[insert] Exceeded max call depth, possible infinite loop.');
    return () => null;
  }

  // Hydrating, the parent already holds every server child, so an appended anchor would sit
  // after later siblings and content that turns up later would land there. It goes where the
  // cursor stands once this slot has claimed its own content: before the next unclaimed node.
  const anchorAtCursor = marker !== undefined && !marker && hydration.active;
  if (marker !== undefined && !marker) {
    marker = createTextNode('', true);
    if (!anchorAtCursor) parent.appendChild(marker);
  }
  const placeAnchor = () => {
    if (!anchorAtCursor || marker!.parentNode) return;
    const next = hydration.cursor;
    parent.insertBefore(marker!, next && next.parentNode === parent ? next : null);
  };

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
      // `current`, not null. The caller passes what is already in this slot, and for a
      // hydrating template hole that is the server's own nodes (`holeContent`). Dropping it
      // meant a static value never adopted: insertExpression saw an empty slot and appended
      // a second copy beside the server's, so `{cmd}` rendered the string twice.
      // Without an `init` this is null anyway, so nothing else changes.
      current = insertExpression(parent, accessor, marker, current);
    } finally {
      _insertDepth--;
    }
    placeAnchor();
    return () => current;
  }

  const dispose = _createInsertEffect(
    normalizeAccessor(accessor),
    parent,
    marker,
    current,
    (v) => { current = v; }
  );
  placeAnchor();
  return () => { dispose?.(); return current; };
}

// insertExpression

const KEEP_SERVER_CONTENT = Symbol.for('fluixi.keepServerContent');

/** What {@link keepServerContent} returns. */
export interface KeptServerContent {
  readonly [KEEP_SERVER_CONTENT]: true;
  readonly adopt?: (nodes: Node[]) => void;
}

/**
 * A value a component returns during hydration to leave its slot as the server rendered it:
 * `insert` keeps the nodes it holds there, and hands them to `adopt`. For a component that has
 * nothing to build yet (its code not loaded) and must not blank what the server sent. Returning
 * something else later replaces them.
 */
export function keepServerContent(adopt?: (nodes: Node[]) => void): KeptServerContent {
  return { [KEEP_SERVER_CONTENT]: true, adopt } as KeptServerContent;
}

function isKeptServerContent(value: unknown): value is KeptServerContent {
  return !!value && typeof value === 'object' && (value as Record<symbol, unknown>)[KEEP_SERVER_CONTENT] === true;
}

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

  if (isKeptServerContent(value)) {
    const nodes = current == null ? [] : Array.isArray(current) ? current : [current];
    // Nothing claims them, so the sweep after hydration would take them for stale markup.
    hydrationKeys()?.keep(nodes);
    value.adopt?.(nodes);
    return current ?? null;
  }

  if (isPromise(value) && (typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) console.warn('[fluixi] A Promise was passed as a child and renders nothing. Load it with a resource and read it under <Suspense>.');

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
        const text = current[0] as Text;
        if (hydration.active && text.data !== value && (typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) warnTextMismatch(text.data, value as string);
        text.data = value as string;
        return current;
      }
      current = cleanChildren(parent, current, marker);
    }

    if (current && isDomText(current)) {
      if (hydration.active && (current as Text).data !== value && (typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) warnTextMismatch((current as Text).data, value as string);
      (current as Text).data = value as string;
      return current;
    }

    const node = createTextNode(value as string);
    if (current && (current as Node).parentNode === parent) {
      parent.replaceChild(node, current as Node);
    } else if (!isAdopted(parent, node)) {
      // during hydration createTextNode reuses the in-place server text node and
      // already advanced the cursor: don't re-insert (that would reorder).
      insertBefore(parent, node, marker);
    }
    return node;
  }

  if (isDomNode(value)) {
    // Hydration: the node was already produced from the server DOM (reused by
    // createNativeElement) and sits in `parent` in place: adopt it without
    // re-inserting, and ascend the cursor past its (already-walked) subtree.
    if (isAdopted(parent, value as Node)) {
      ascendPast(value as Node);
      return value;
    }
    if (current !== value) replaceCurrent(parent, current, value as Node, marker);
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
    const reactiveSlots: Array<{ marker: Node; sig: any; wired?: boolean }> = [];
    // Nodes a slot adopted while hydrating: they are the slot's, not the array's to reconcile.
    const adopted = new Set<Node>();
    // Hydrating a hole: its server nodes are `current`, so the items (resolved here, after the
    // hole's accessor returned and its cursor was restored) claim from the first of them.
    const flatten = () => flattenArray(value as any[], array, parent, componentCache, reactiveSlots, adopted);
    const keys = hydration.active && currentArray.length && hydrationKeys();
    if (keys) keys.resume(currentArray[0] as Node, flatten);
    else flatten();
    const reconciled = reconcileArrays(
      parent,
      adopted.size ? currentArray.filter((node) => !adopted.has(node)) : currentArray,
      array,
      marker,
    );
    // Markers are now in the DOM: wire a per-slot reactive insert. insert() sets up a nested
    // render effect that re-inserts the member's content before its marker on change, so a bare
    // control-flow component return (<Show>/<Switch>/<For>) updates in place.
    //
    // The per-slot content lives OUTSIDE the reconcile array (only the marker is tracked), so if
    // this enclosing effect re-runs with a shorter array: e.g. a <For> item dropped, or its child
    // resolved to a memo (Provider -> component): reconcile removes the marker but would orphan the
    // content. Register a cleanup that removes the slot's nodes when its effect is torn down. This
    // only fires when the enclosing effect re-runs (the array itself changed); an in-place update
    // (e.g. <Show> toggling) never re-runs this effect, so it keeps updating in place.
    //
    // The marker stays: it is in this array, so the next reconcile removes it, and until then it
    // holds the position. The cleanup runs before the re-run, and removing the markers there left
    // the reconcile only detached nodes to place against, so with no `marker` the new content
    // went to the end of the parent, after the siblings that follow it.
    for (const slot of reactiveSlots) {
      if (slot.wired) continue;
      const disposeSlot = insert(parent, slot.sig, slot.marker) as () => Node | Node[] | null;
      onCleanup(() => cleanChildren(parent, disposeSlot()));
    }
    return reconciled;
  }

  if (expandElementObject && typeof value === 'object') {
    const expanded = expandElementObject(value);
    if (expanded !== value) return insertExpression(parent, expanded as Children, marker, current);
  }
  return cleanChildren(parent, current, marker);
}

/**
 * Expands a `{ type, props }` element, the shape the uncompiled JSX runtime returns on the
 * server, into what its component renders; returns anything else as it is. Installed by that
 * runtime when it loads, so compiled code, which never makes these, does not carry it.
 */
let expandElementObject: ((value: object) => unknown) | null = null;

export function installElementObjects(expand: (value: object) => unknown): void {
  expandElementObject = expand;
}

// flattenArray: flatten a children array to DOM nodes. A signal whose result is a
// component thunk (e.g. a router memo returning a SuspenseThunk) is recursed through
// flattenArray, not read inline, so the thunk goes through componentCache and stays
// stable across navigations.
function flattenArray(
  arr: any[],
  result: Node[],
  parent: Node,
  componentCache?: Map<Function, any>,
  // When provided, a reactive member is not read inline (which would subscribe the enclosing
  // render effect and re-render the whole subtree on change). Instead it emits a placeholder
  // marker and records itself here; the array caller wires a fine-grained insert() per slot
  // after the markers are placed. This is what makes a bare control-flow component return
  // (a memo, e.g. <Show>) update in place, like an element child does.
  reactiveSlots?: Array<{ marker: Node; sig: any; wired?: boolean }>,
  // Filled while hydrating: nodes a reactive slot adopted in place (see below).
  adopted?: Set<Node>
): void {
  for (let i = 0; i < arr.length; i++) {
    let item = arr[i];

    if (item == null || typeof item === 'boolean') continue;

    // Where the caller collects slots, every reactive member is one: it gets its own insert and
    // updates on its own, so a change to one never runs, or rebuilds, its siblings. Elsewhere (an
    // array read inside an effect that owns it) plain functions are read here.
    while (!reactiveSlots && typeof item === 'function' && !isSignal(item) && !isComponent(item)) {
      item = item();
      if (item == null || typeof item === 'boolean') break;
    }

    if (item == null || typeof item === 'boolean') continue;

    if (typeof item === 'function') {
      let resolved: any;

      if (isComponent(item) && !isSignal(item)) {
        // Pure component thunk (e.g. () => <div>): call exactly once and cache so
        // re-runs of the enclosing render effect return the same DOM nodes (keeps
        // focus etc. stable across navigations).
        // must check !isSignal. A memo stamped as a component (e.g. an
        // Outlet/Routes/Suspense output returned via $component/asComponent) is BOTH
        // isComponent AND isSignal; caching it would freeze its first value (so a
        // boundary that later switches from a single node to an array: fallback ->
        // children: would never update). Read those reactively in the else branch.
        if (!componentCache) componentCache = new Map();
        if (!componentCache.has(item)) componentCache.set(item, item());
        resolved = componentCache.get(item);
      } else {
        // Signal/memo (or memo-stamped component). Where the caller collects slots, the signal
        // is one: it gets its own insert, so it updates in place. A component hands back the
        // control flow it returns as such a memo, and read here it would be read once. Anywhere
        // else it is read to track it.
        resolved = reactiveSlots ? item : item();
      }

      // Unwrap plain wrappers; stop at signals and component thunks.
      // Cache calls by function reference, a plain function returned by a
      // signal/memo (e.g. `createMemo(() => cond ? () => <JSX> : ...)`) is a
      // stable reference as long as the memo doesn't re-evaluate. Calling it
      // once and caching the result means re-runs of the outer render effect
      // (triggered by unrelated signals like `activeLevel()`) hit the cache and
      // return the same DOM nodes. reconcileArrays then sees identical references
      // and skips the slot, the focused <input> is never removed.
      while (resolved !== item && typeof resolved === 'function' && !isSignal(resolved) && !isComponent(resolved)) {
        if (!componentCache) componentCache = new Map();
        if (!componentCache.has(resolved)) componentCache.set(resolved, resolved());
        resolved = componentCache.get(resolved);
      }

      if (resolved == null || typeof resolved === 'boolean') continue;

      if (typeof resolved === 'function') {
        if (isSignal(resolved) || resolved === item) {
          // Defer to a per-slot insert effect (see reactiveSlots) so a reactive member updates
          // in place instead of re-rendering the enclosing subtree. Only the synchronous array
          // path collects slots; async/promise resolutions fall back to the inline read below.
          if (reactiveSlots) {
            const slot = createTextNode('', true);
            result.push(slot);
            // Only where there is something to claim: the cursor inside this parent. A parent
            // built fresh during hydration (a branch the server did not render) has no server
            // nodes, and claiming early there put the slot's content ahead of its siblings.
            if (hydration.active && adopted && hydration.cursor?.parentNode === parent) {
              // Hydrating: the slot has to claim the server's nodes now, in document order.
              // Deferred, a plain sibling later in this array would claim them first (a lazy
              // <Show> label taken by the input after it). The marker goes in at the cursor so
              // new content has somewhere to go, then moves past what was adopted, where it
              // sits in a normal render: after its content.
              const here = () => (hydration.cursor && hydration.cursor.parentNode === parent ? hydration.cursor : null);
              const start = here();
              parent.insertBefore(slot, start);
              // Returns the disposer, which is also how the slot's nodes are read: called here it
              // would dispose the slot's effect as soon as it was made.
              const disposeSlot = insert(parent, resolved, slot) as () => Node | Node[] | null;
              // What the slot claimed is the run of server nodes the cursor passed, including
              // those a slot nested in it adopted (a <Show> whose child is a <Show>). A node left
              // out would be taken for an unclaimed one and removed by this array's reconcile.
              const end = here();
              for (let node = start; node && node !== end; node = node.nextSibling) adopted.add(node);
              parent.insertBefore(slot, end);
              // The content only: the marker is in the array, see the note in insertExpression.
              onCleanup(() => cleanChildren(parent, disposeSlot()));
              reactiveSlots.push({ marker: slot, sig: resolved, wired: true });
              continue;
            }
            reactiveSlots.push({ marker: slot, sig: resolved });
            continue;
          }
          // Read the signal: tracked inside the enclosing render effect.
          // Use flattenArray recursively (not normalizeValue) so
          // component thunks inside the result go through componentCache.
          let val = resolved();
          while (typeof val === 'function' && isSignal(val)) val = val();
          if (val == null || typeof val === 'boolean') continue;
          if (Array.isArray(val)){
            flattenArray(val, result, parent, componentCache)
          }else flattenArray([val], result, parent, componentCache);
          continue;
        }
        // Other function type: skip
        continue;
      }

      // resolved is not a function
      if (Array.isArray(resolved)) flattenArray(resolved, result, parent, componentCache, reactiveSlots, adopted);
      else flattenArray([resolved], result, parent, componentCache, reactiveSlots, adopted);
      continue;
    }

    if (isPromise(item)) {
      if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) console.warn('[fluixi] A Promise was passed as a child and renders nothing. Load it with a resource and read it under <Suspense>.');
      continue;
    }

    if (Array.isArray(item)) {
      flattenArray(item, result, parent, componentCache, reactiveSlots, adopted);
      continue;
    }

    if (isDomNode(item)) {
      // Hydrating: a member built before this walk (an element adopted by its key) stands where
      // the cursor is, or the cursor is still inside it after its children were adopted, as
      // `createNativeElement` leaves it. Step past it either way, as the single-node path does,
      // or every later slot in this parent anchors at its end.
      // Inside it means anywhere below: an element adopted by position, not by key, is not on
      // the parents stack, and its holes leave the cursor at their own markers.
      if (hydration.active && (hydration.cursor === item || hydration.parents.includes(item as Node) || (item as Node).contains?.(hydration.cursor))) {
        ascendPast(item as Node);
      }
      result.push(item);
      continue;
    }

    if (expandElementObject && typeof item === 'object') {
      const expanded = expandElementObject(item);
      if (expanded !== item) {
        flattenArray(Array.isArray(expanded) ? expanded : [expanded], result, parent, componentCache);
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

// reconcileArrays

function reconcileArrays(
  parent: Node,
  a: Node[],
  b: Node[],
  marker?: Node
): Node[] {
  // Pre-process: clone any node already owned by a different parent.
  // The Babel plugin hoists static elements to module-level, the same node
  // can appear in `b` for multiple parents simultaneously. Clone to avoid
  // stealing it from its current owner; future reconciles track the clone.
  //
  // A DocumentFragment is not such an owner. `cloneTemplate` hands back the clone still
  // sitting in its fragment, so a template-cloned element arrives here with a non-null
  // parent that nothing else refers to. Cloning it again threw away the node whose props
  // had just been applied: `cloneNode` copies attributes but not the event-handler
  // properties, so an element built from a template lost its handlers the moment it was
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
    // 1. Common prefix: already in the right place, skip.
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }

    // 2. Common suffix: already in the right place, shrink window.
    while (aEnd > aStart && bEnd > bStart && a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }

    // 3. Old list exhausted: insert remaining new nodes.
    if (aEnd === aStart) {
      const node: Node | undefined = bEnd < bLength
        ? bStart
          ? (b[bStart - 1].nextSibling as Node | null | undefined) ?? undefined
          : b[bEnd - bStart]
        : after;
      while (bStart < bEnd) insertBefore(parent, b[bStart++], node);
    }

    // 4. New list exhausted: remove remaining old nodes.
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
            // Guard replaceChild, if a[aStart] was moved out by another effect, insert instead.
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

// cleanChildren

/**
 * Put `node` where `current` was: in place of its first node, the rest removed, or before
 * `marker` when there was nothing, or nothing still in `parent`.
 */
function replaceCurrent(parent: Node, current: Node | Node[] | null | undefined, node: Node, marker?: Node): void {
  const first = Array.isArray(current) ? current[0] : current;
  if (first && first.parentNode === parent) {
    parent.replaceChild(node, first);
    if (Array.isArray(current)) cleanChildren(parent, current.slice(1), marker);
  } else insertBefore(parent, node, marker);
}

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

// insertBefore
//
// DOM Runtime Guard: checks marker.parentNode === container before inserting.
// This prevents failures when markers are removed during route changes.

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

// Attributes & Properties

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

/**
 * Name each key of a class or style object as the directive it came from.
 *
 * `class:a class:b` are merged by the compiler into one classList prop, so the keys are the
 * only record that two directives were written.
 */
/**
 * A directive the compiler had to name, because the runtime sees only what it lowers to.
 * `bind:value` arrives as an ordinary value and an input handler.
 */
function reportMarked(element: Element, accessor: unknown): void {
  if (!accessor || typeof accessor !== 'function') return;
  const written = (accessor as unknown as Record<string, { name?: string }>)[HOLE_TAG]?.name;
  if (!written) return;
  const colon = written.indexOf(':');
  if (colon === -1) return;
  if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveDirective(element, written.slice(0, colon), written.slice(colon + 1), accessor);
}

function reportKeys(element: Element, kind: string, value: unknown): void {
  const from = typeof value === 'function' ? untrack(() => (value as () => unknown)()) : value;
  if (!from || typeof from !== 'object') return;
  if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) for (const key of Object.keys(from)) reportReactiveDirective(element, kind, key);
}

export function applyUse(element: Element, value: any): void {
  const call = (dir: any, accessor?: any) => {
    if (typeof dir !== 'function') return;
    // Named so a watcher can tell one directive from another. Nothing else reads it.
    if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveDirective(element, 'use', dir.name || 'use', accessor);
    dir(element, accessor ?? (() => undefined));
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
  reportMarked(element, accessor);
  if (typeof accessor !== 'function') {
    setAttribute(element, name, accessor, isSVG);
    return () => {};
  }
  return createRenderEffect(() => {
    if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveBinding(element, 'attribute', name, accessor);
    const value = typeof accessor === 'function' ? accessor() : accessor;
    setAttribute(element, name, value, isSVG);
  });
}

export function setDynamicProperty(element: any, name: string, accessor: any): () => void {
  if (typeof accessor !== 'function') {
    setProperty(element, name, accessor);
    return () => {};
  }
  reportMarked(element, accessor);
  return createRenderEffect(() => {
    if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveBinding(element, 'property', name, accessor);
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
    if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveBinding(element, 'attribute', name, accessor);
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
    // A render effect, like every other attribute binding: `spread` already wraps
    // class this way, so going through `applyProps` shouldn't schedule it later.
    createRenderEffect(() => {
      if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveBinding(element, 'attribute', 'class', value);
      setClassName(element, value());
    });
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
 * Apply a `classList`-style map `{ 'a b': condition }`, toggling each class on
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

/**
 * One style property. A dashed name (`--gap`, `background-color`) goes through setProperty:
 * assigning it as a property of `element.style` is silently ignored for custom properties.
 * `null` and `undefined` clear it.
 */
function setStyleProperty(style: any, key: string, value: unknown): void {
  if (key.includes('-')) {
    if (value == null) style.removeProperty(key);
    else style.setProperty(key, String(value));
  } else style[key] = value == null ? '' : value;
}

function unwrap(value: unknown): unknown {
  while (typeof value === 'function') value = value();
  return value;
}

// The keys an object style last set on an element, so the next object can clear the ones it
// no longer has.
const styleKeys = new WeakMap<object, Set<string>>();

/**
 * Apply a style: a string, an object of properties whose values may be accessors, or an array
 * of those applied in order (`style="..."` with `style:x` after it). With `disposers`, each
 * accessor gets its own render effect, so a change writes one property: `style:color=${c}`
 * touches `color` only.
 */
export function setStyle(element: any, _value: any, disposers?: Array<() => void>): void {
  // A function for the whole value moves as a whole: read it inside an effect, not once here.
  if (typeof _value === 'function' && disposers) {
    disposers.push(createRenderEffect(() => setStyle(element, unwrap(_value))));
    return;
  }
  const value = unwrap(_value);
  const previous = styleKeys.get(element);
  if (value == null) {
    styleKeys.delete(element);
    element.removeAttribute('style');
    return;
  }
  const keys = new Set<string>();
  const apply = (item: unknown): void => {
    if (typeof item === 'function' && disposers) {
      // A part that moves as a whole (a reactive `style=` next to `style:` keys).
      disposers.push(createRenderEffect(() => apply(unwrap(item))));
      return;
    }
    item = unwrap(item);
    if (item == null) return;
    if (typeof item === 'string') element.style.cssText = item;
    else if (Array.isArray(item)) for (const part of item) apply(part);
    else if (typeof item === 'object') {
      for (const key in item as Record<string, unknown>) {
        keys.add(key);
        const v = (item as Record<string, unknown>)[key];
        if (typeof v === 'function' && disposers) {
          disposers.push(createRenderEffect(() => setStyleProperty(element.style, key, unwrap(v))));
        } else setStyleProperty(element.style, key, unwrap(v));
      }
    }
  };
  if (Array.isArray(value)) for (const part of value) apply(part);
  else apply(value);
  // What the last object set and this one does not is cleared, not left behind.
  if (previous) for (const key of previous) if (!keys.has(key)) setStyleProperty(element.style, key, null);
  styleKeys.set(element, keys);
}

/**
 * A whole style value that moves: the branch `spread` takes for a function
 * `style`, as a helper the compiler can bind directly on a templated element.
 */
export function setDynamicStyle(element: any, accessor: any): void {
  if (typeof accessor !== 'function') {
    setStyle(element, accessor, []);
    return;
  }
  createRenderEffect(() => {
    if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveBinding(element, 'attribute', 'style', accessor);
    setStyle(element, accessor());
  });
}

/**
 * A whole classList map that moves: the branch `spread` takes for a function
 * `classList`, as a helper the compiler can bind directly on a templated element.
 */
export function setDynamicClassList(element: Element, accessor: any): void {
  if (typeof accessor !== 'function') {
    setClassList(element, accessor, []);
    return;
  }
  createRenderEffect(() => {
    if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveBinding(element, 'attribute', 'class', accessor);
    setClassList(element, accessor());
  });
}

// spread

/**
 * Apply a props object to an element, and re-apply what changes.
 *
 * Handles every prop kind the compiler can emit: attributes, properties, events,
 * `class`/`style` in their object and string forms, `ref` and `use:`. Each reactive prop
 * gets its own effect, so a change touches one attribute rather than re-running the
 * element.
 *
 * `prevProps` is what was applied last, which is how a removed key is cleared rather
 * than left behind. A getter-backed prop stays reactive: the value is read inside the
 * effect, not when the object was built, which is what keeps `splitProps` and a
 * polymorphic wrapper live.
 */
/** Whether `key` is read through a getter, here or on a prototype: its value can change. */
function isGetter(props: object, key: string): boolean {
  for (let source: object | null = props; source; source = Object.getPrototypeOf(source)) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor) return typeof descriptor.get === 'function';
  }
  return false;
}

export function spread(options: SpreadOptions): () => void {
  const {
    element,
    props,
    prevProps = EMPTY_OBJ as Record<string, any>,
    isSVG = false,
    skipChildren = false,
    isCustomElement,
    accessors,
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
  // an actually-SVG element, a key like `x1` is `in element` (read-only SVGAnimatedLength), so the
  // property branch below would throw "Cannot set property x1". Detecting SVG by namespaceURI keeps
  // those on the setAttribute path. (Matters under hydration, where we adopt the real, correctly
  // namespaced server node.)
  const elementIsSVG = isSVG || (element as any).namespaceURI === SVG_NAMESPACE;

  // Binds one key; what it registers goes in `own`, so a key that leaves the props can be undone
  // alone. `fresh`: nothing was applied for this key before.
  const bindKey = (key: string, prev: any, fresh: boolean, own: (() => void)[]): void => {
    // JSX children of the element win over spread ones (the compiler says so with skipChildren).
    // Spread `children` are content, as in Solid: written as a property they threw (a read-only
    // property of every element), and on the server an attribute held a dump of a node.
    if (key === 'children') {
      if (!skipChildren) own.push(insert(element, () => props.children) as () => void);
      return;
    }
    const value = props[key];

    // On the first pass every previous value is undefined, so a getter with no value yet would
    // be skipped and never bound. Such a prop goes on to the generic binding below, which reads
    // it inside an effect; an unset handler, ref, directive or prefixed binding stays skipped.
    const unsetGetter = value === undefined && fresh && isGetter(props, key);
    if (value === prev && !unsetGetter) return;
    if (unsetGetter && (key === 'ref' || key === 'use' || key.startsWith('on') || key.includes(':') || key === 'class' || key === 'className' || key === 'classList' || key === 'style')) return;

    if (key === 'ref') { handleRef(value, element); return; }

    // Custom directives: `use=${dir}` / `use:name` / `use:name=${opts}`. The
    // compiler normalizes to an array of [directive, accessor?] pairs; each is
    // called with the element (accessor optional). Directives register their own
    // onCleanup, so run them in the current reactive owner.
    if (key === 'use') { applyUse(element, value); return; }

    // Native event binding: `on:click` / `@click.capture` / `@input.passive`.
    // Value is a handler or `[handler, options]`. Uses addEventListener (bypasses
    // delegation) so capture/once/passive work. Must precede the `on`-delegated
    // branch below (both start with "on").
    if (key.startsWith('on:')) {
      own.push(addNativeEventListener(element, key.slice(3), value));
      return;
    }

    // Forced bindings: prop:x always assigns the property, attr:x always sets the
    // attribute, bool:x toggles a boolean attribute, skipping the heuristic below.
    if (key.startsWith('prop:')) {
      if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveDirective(element, 'prop', key.slice(5), value);
      own.push(setDynamicProperty(element, key.slice(5), value));
      return;
    }
    if (key.startsWith('attr:')) {
      if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveDirective(element, 'attr', key.slice(5), value);
      own.push(setDynamicAttribute(element, key.slice(5), value, elementIsSVG));
      return;
    }
    if (key.startsWith('bool:')) {
      if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveDirective(element, 'bool', key.slice(5), value);
      own.push(setDynamicBoolAttribute(element, key.slice(5), value));
      return;
    }

    if (key === 'class' || key === 'className') {
      if (typeof value === 'function') {
        own.push(
          createRenderEffect(() => {
            if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveBinding(element, 'attribute', 'class', value);
            setClassName(element, value());
          }),
        );
      } else {
        setClassName(element, value);
      }
      return;
    }

    if (key === 'classList') {
      reportKeys(element, 'class', value);
      if (typeof value === 'function') {
        own.push(
          createRenderEffect(() => {
            if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveBinding(element, 'attribute', 'class', value);
            setClassList(element, value());
          }),
        );
      } else {
        setClassList(element, value, own);
      }
      return;
    }

    if (key === 'style') {
      reportKeys(element, 'style', value);
      if (typeof value === 'function') {
        own.push(
          createRenderEffect(() => {
            if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveBinding(element, 'attribute', 'style', value);
            setStyle(element as any, value());
          }),
        );
      } else {
        setStyle(element as any, value, own);
      }
      return;
    }

    if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase();
      if (prev) removeDelegatedEventListener(element, eventName);
      if (value) addDelegatedEventListener(element, eventName, value);
      return;
    }

    // A custom element takes the property even when it does not have one yet.
    //
    // `key in element` is false until the element upgrades, so a page that renders
    // before `customElements.define` runs sent every value to an attribute, and an
    // object arrived as the string `[object Object]`. Upgrading afterwards did not
    // recover it: the property was never assigned, so the element had nothing to read.
    // Assigning it now leaves an own property that the element adopts on upgrade (see
    // the constructor in @fluixi/web-components/element).
    const custom = isCustomElement ?? element.localName.includes('-');
    const asProperty =
      JSX_PROPERTIES.has(key) ||
      (!elementIsSVG && key in element) ||
      (custom && !elementIsSVG && !isAttributeOnlyName(key));
    const functionValue =
      custom && !elementIsSVG && !isAttributeOnlyName(key) && accessors !== undefined && typeof value === 'function' && !accessors.includes(key);
    if (functionValue) {
      if ((typeof __FLUIXI_SERVER__ !== 'undefined' ? __FLUIXI_SERVER__ : isServer())) serverCustomElementProp(element, key, value);
      else setProperty(element, key, value);
      return;
    }
    if (custom && !elementIsSVG && !isAttributeOnlyName(key) && (typeof __FLUIXI_SERVER__ !== 'undefined' ? __FLUIXI_SERVER__ : isServer())) {
      // No element object on a server: see serverCustomElementProp.
      own.push(
        createRenderEffect(() => {
          let v = typeof value === 'function' ? (value as () => unknown)() : props[key];
          while (typeof v === 'function' && (v as () => unknown).length === 0) v = (v as () => unknown)();
          serverCustomElementProp(element, key, v);
        }),
      );
      return;
    }
    if (typeof value === 'function') {
      // Accessor value (`() => expr`): setDynamic* wraps it in its own effect.
      own.push(
        asProperty
          ? setDynamicProperty(element, key, value)
          : setDynamicAttribute(element, key, value, elementIsSVG),
      );
    } else {
      // A plain, non-function value may still be backed by a reactive getter:
      // component props compile to `get x() {...}`, and splitProps/mergeProps
      // forward those getters. Reading `props[key]` once (above) snapshots the
      // current value and drops the dependency, so the DOM never updates. Re-read
      // it inside a render effect so the getter's reads are tracked. (A truly
      // static value just runs the effect once with no deps: negligible.)
      own.push(
        createRenderEffect(() =>
          asProperty
            ? setProperty(element, key, props[key])
            : setAttribute(element, key, props[key], elementIsSVG),
        ),
      );
    }
  };

  const clearKey = (key: string): void => {
    if (key === 'children') return;
    if (key.startsWith('on')) {
      removeDelegatedEventListener(element, key.slice(2).toLowerCase());
    } else if (JSX_PROPERTIES.has(key)) {
      setProperty(element, key, null);
    } else {
      element.removeAttribute(key);
    }
  };

  const bound = new Map<string, (() => void)[]>();
  const bind = (key: string, prev: any, fresh: boolean): void => {
    const own: (() => void)[] = [];
    bound.set(key, own);
    bindKey(key, prev, fresh, own);
  };

  // What is read here only decides how each prop is bound; the bindings track their own values.
  // Tracked, the reads belonged to whatever was creating the element (a Show or For memo), which
  // then rebuilt it whenever a spread value changed.
  untrack(() => {
    for (const key in props) bind(key, prevProps[key], prevProps === EMPTY_OBJ);
    for (const key in prevProps as Record<string, any>) if (!(key in props)) clearKey(key);
  });

  // The key set can move too: a spread source computed from signals (`{...attrs()}`) gains or
  // loses keys. Listed in an effect of its own, it binds a key that appears and clears one that
  // goes, leaving the bindings of the keys that stay as they are.
  const owner = getOwner();
  const keysEffect = createRenderEffect(() => {
    const keys = new Set<string>();
    for (const key in props) keys.add(key);
    untrack(() =>
      runWithOwner(owner, () => {
        for (const key of keys) if (!bound.has(key)) bind(key, undefined, true);
        for (const [key, own] of bound) {
          if (keys.has(key)) continue;
          own.forEach((d) => d());
          bound.delete(key);
          clearKey(key);
        }
      }),
    );
  });

  return () => {
    keysEffect();
    for (const own of bound.values()) own.forEach((d) => d());
  };
}

/**
 * Apply props to an element.
 * For event handlers, stores as $$eventname property for delegation.
 */
export function applyProps(element: Element, props: Record<string, any>, isSVG = false): void {
  for (const key in props) {
    // Before the read: a `get children()` builds the subtree, and the caller inserts its own.
    if (key === 'children') continue;
    const val = props[key];
    if (key === 'ref') { handleRef(val, element); continue; }
    if (key === 'use') { applyUse(element, val); continue; }
    if (key.startsWith('on:')) { addNativeEventListener(element, key.slice(3), val); continue; }
    // Forced bindings: see spread().
    if (key.startsWith('prop:')) {
      if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveDirective(element, 'prop', key.slice(5), val);
      setDynamicProperty(element, key.slice(5), val); continue;
    }
    if (key.startsWith('attr:')) {
      if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveDirective(element, 'attr', key.slice(5), val);
      setDynamicAttribute(element, key.slice(5), val, isSVG); continue;
    }
    if (key.startsWith('bool:')) {
      if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveDirective(element, 'bool', key.slice(5), val);
      setDynamicBoolAttribute(element, key.slice(5), val); continue;
    }
    if (key.startsWith('on') && key.length > 2) {
      const name = key.slice(2).toLowerCase();
      if (typeof val === 'function') {
        if (NON_DELEGATED.has(name)) {
          // Non-bubbling events (blur, focus, scroll...): store handler on the element
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
      reportKeys(element, 'class', val);
      if (typeof val === 'function')
        createRenderEffect(() => {
          if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveBinding(element, 'attribute', 'class', val);
          setClassList(element, val());
        });
      else setClassList(element, val, []);
      continue;
    }
    if (key === 'style') {
      // An accessor reaches applyProps whenever a component forwards a computed
      // style through a props object rather than as a compiled JSX attribute,
      // which is what every polymorphic/`as` wrapper does. class and classList
      // already handled that; style applied once and never updated.
      reportKeys(element, 'style', val);
      if (typeof val === 'function')
        createRenderEffect(() => {
          if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveBinding(element, 'attribute', 'style', val);
          setStyle(element as HTMLElement, (val as () => unknown)());
        });
      else setStyle(element as HTMLElement, val, []);
      continue;
    }
    if (key === 'innerHTML') {
      // Accept a static string or a reactive accessor. A function is wrapped in an effect so
      // updates apply; a plain value is set once. (The previous code always called val(), which
      // threw on a static string, wiping content during hydration.)
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
    // Special case: <input>/<textarea> value: use DOM property assignment, not
    // setAttribute. Skip reactive updates while the element has focus so user
    // input is never interrupted and focus is never lost due to signal writes.
    if (key === 'value' && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
      if (typeof val === 'function') {
        const dispose = createEffect(() => {
          let v = val();
          while (typeof v === 'function' && (v as Function).length === 0) v = v();
          // Only update if element is not currently focused: don't fight user input
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
          // Only update if element is not currently focused: don't fight user input
          if (document.activeElement !== element) {
            (element as any).checked = v ?? '';
          }
        });
        onCleanup(() => { dispose(); });
      } else {
        // Plain value possibly behind a reactive getter: re-read live. See the
        // value branch above.
        createRenderEffect(() => {
          if (document.activeElement !== element) {
            (element as any).checked = props[key] ?? '';
          }
        });
      }
      continue;
    }

    // Special case: <select value=...>: must assign .value as DOM property
    // after options are in the DOM. We defer the initial run via queueMicrotask
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
        // Plain value possibly behind a reactive getter: re-read live, keeping the
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
 * Merge several (possibly reactive) prop sources into one, last-source-wins, but a later
 * source's `undefined` does not clobber an earlier defined value; it falls through to it. This
 * is what makes `mergeProps(defaults, props)` work, and why the compiler can emit
 * `mergeProps(...spreads, baseProps)` for JSX spreads (`<div {...a} {...b} />`) without a missing
 * `b.x` wiping `a.x`.
 *
 * Like Solid's mergeProps (and `splitProps` above), the result is a Proxy that resolves each key
 * LAZILY off the sources: getter/signal-backed props stay live (re-read on every access, not
 * snapshotted), and the key set is the union across all sources (so dynamic prop objects work).
 */
export function mergeProps<T extends object>(...sources: (Partial<T> | (() => Partial<T>))[]): T {
  // A function source is called on each read: a spread computed from signals (`{...attrs()}`)
  // is then read where the prop is applied, inside its binding, not where the element is made.
  const at = (source: unknown): any => (typeof source === 'function' ? (source as () => unknown)() : source);
  // Last defined (non-undefined) value wins; scan sources from the end so a later `undefined`
  // falls through to an earlier source. Reads `source[key]` live each call, no snapshot, and
  // once: a `children` getter builds its nodes when read, so a second read built them twice.
  const resolve = (key: string | symbol): any => {
    for (let i = sources.length - 1; i >= 0; i--) {
      const s = at(sources[i]);
      if (!s || !(key in s)) continue;
      const value = s[key];
      if (value !== undefined) return value;
    }
    return undefined;
  };
  const hasKey = (key: string | symbol): boolean => {
    for (const source of sources) {
      const s = at(source);
      if (s && key in s) return true;
    }
    return false;
  };

  return new Proxy({} as any, {
    get: (_, key) => resolve(key),
    has: (_, key) => hasKey(key),
    ownKeys: () => {
      const keys = new Set<string | symbol>();
      for (const source of sources) {
        const s = at(source);
        if (s) for (const k of Reflect.ownKeys(s as object)) keys.add(k);
      }
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
 * preserving reactivity, each returned object is a Proxy whose `get` forwards
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

// Refs

/**
 * Hand an element to its ref: call a function, fill a `{ current }` object, or, for
 * `ref={el}` on a variable, assign it through `assign`, which the compiler passes when the
 * expression can be assigned.
 */
export function handleRef(ref: any, element: Element, assign?: (element: Element) => void): void {
  if (!ref) {
    assign?.(element);
    return;
  }
  // Which variable ends up holding the element is the question a ref raises, and only the
  // compiler's mark on the value can answer it.
  // The compiler's mark names the variable it is stored in; a function's own name is the
  // next best thing.
  const held = (ref as Record<string, { name?: string }>)[HOLE_TAG]?.name;
  if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) reportReactiveDirective(
    element,
    'ref',
    held || (typeof ref === 'function' ? ref.name || 'ref' : 'ref'),
    ref,
  );

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
  else assign?.(element);
}

// Portal

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
    });

  })

  // Portal returns nothing to its original parent's DOM location
  return null;
}
// Misc utilities

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

// isAccessor: deprecated, kept for backward compat

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
      // Clear container (but not when hydrating: we reuse the server DOM).
      if (!hydration.active) {
        container.textContent = '';
      }

      // Which build is running, on the element and as `window.Fluixi`, in development; here
      // rather than in core's render so the hydrate path gets it too. Production keeps the
      // empty mark only: a deployed page says it runs Fluixi without naming the release.
      if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment())) {
        stampVersions(container);
        warnOnVersionSkew();
      } else container.setAttribute(VERSION_ATTRIBUTE, '');

      // The code runs once, untracked, as core's `render` and Solid's do. Handed to `insert` as a
      // function it ran inside the insert's effect, so anything the app read while building made
      // that effect re-run it and build the whole app again.
      const code = element as unknown;
      insert(container, (typeof code === 'function' && !isSignal(code) ? untrack(code as () => unknown) : code) as any);
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
 * are the same primitive, so `bind:value` has to take either, steering people to the
 * new API and then refusing it in a directive would be its own kind of broken.
 */
export function bindPair(source: any): [() => any, (value: any) => void] {
  if (Array.isArray(source)) return source as [() => any, (value: any) => void];
  // `signal(...)` is the accessor itself with `set` attached.
  if (typeof source === 'function' && typeof source.set === 'function') {
    return [source, source.set];
  }
  throw new TypeError(
    '[fluixi] bind: needs a signal, either `signal(...)` or the `[get, set]` pair from `createSignal(...)`.',
  );
}
