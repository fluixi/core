/**
 * Hydration keys: how a server render and the browser pair elements by identity rather than by
 * position. Only loaded where keys are needed (a server render, or `hydrate()`), which install
 * this module into ./hydration-state.ts through `useHydrationKeys()`; a page that only renders in
 * the browser never bundles it.
 */
import { createChildOwner, getOwner, type Owner } from '@fluixi/reactive/signal';
import { isServer } from './server/host.js';
import { getRequestContext } from './server/request-context.js';
import { HOLE_TAG, HYDRATION_KEY, hydration, installHydrationKeys, runHydrationAt } from './hydration-state.js';

// Hydration keys
//
// A cursor pairs client nodes with server nodes by creation order, so it breaks wherever
// creation order is not document order: in `list.map(m => (m.soon ? <span/> : <Nav/>))` the
// spans are built at once and Nav, a lazy memo, later. Keys pair them by identity instead.
// The server and the client run the same code in the same order, lazy memos and discarded
// reads included, so a counter gives the same key on both sides. Each component opens its
// own scope, so a branch that renders more or less shifts only the keys inside it.
//
// The server stamps the key on each element it builds (`data-hk`); the client indexes them
// once and claims by key. Inside a claimed element, text and markers stay positional.

const KEY_SCOPE = Symbol.for('fluixi.hydrationKeys');

interface KeyScope {
  id: string;
  next: number;
  /** `createUniqueId` calls in this scope, counted apart so element keys do not move. */
  ids?: number;
}

type ScopedOwner = Owner & { contexts: Map<symbol, unknown> | null };

/** The nearest scope up the owner chain; the root gets one the first time it is asked. */
function scopeOf(owner: Owner | null): KeyScope {
  let o = owner as ScopedOwner | null;
  while (o) {
    const scope = o.contexts?.get(KEY_SCOPE) as KeyScope | undefined;
    if (scope) return scope;
    if (!o.parent) {
      const root: KeyScope = { id: '', next: 0 };
      (o.contexts ??= new Map()).set(KEY_SCOPE, root);
      return root;
    }
    o = o.parent as ScopedOwner;
  }
  return { id: '', next: 0 };
}

/**
 * Keys are only needed while rendering on the server or hydrating. Off for a server render
 * nothing will hydrate (`renderToString(app, { hydrationKeys: false })`), which also leaves out
 * the hole markers hydration would look for.
 */
export function keyed(): boolean {
  return isServer() ? getRequestContext()?.hydrationKeys !== false : hydration.active;
}

/**
 * A short, opaque key for a scope path such as `0.3.1`. Keys are only compared, never read,
 * so both sides hash the same path. 53 bits (cyrb53) rather than 32: at 32 bits a page of
 * ten thousand keyed elements has about a one in a hundred chance of two sharing a key, and
 * a shared key adopts the wrong element without a word.
 */
export function hashKey(path: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < path.length; i++) {
    const ch = path.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * The next key in the current scope, or null when no key is needed. `salt` names what is built
 * there (a template): if the server built something else at this position, the keys differ, and
 * the client builds its own instead of adopting the server's and patching one into the other.
 */
export function nextHydrationKey(salt?: string): string | null {
  if (!keyed()) return null;
  const scope = scopeOf(getOwner());
  const path = scope.id + (scope.next++).toString(36);
  return salt ? `${hashKey(path)}-${salt}` : hashKey(path);
}

/** Ids made where nothing will hydrate: the browser after hydration, or a keyless render. */
let looseIds = 0;

/**
 * An id the server render and the browser agree on, for pairing elements: `<label for>` and
 * `<input id>`, `aria-describedby`, `aria-controls`. Rendered on the server and hydrated, the
 * same component at the same place gets the same id on both sides, as long as it calls this the
 * same number of times in the same order: call it in the component body, not in a branch that
 * only one side takes. Created later in the browser, it is unique within the page.
 */
export function createUniqueId(): string {
  if (!keyed()) return `fx-c${(looseIds++).toString(36)}`;
  const scope = scopeOf(getOwner());
  scope.ids = (scope.ids ?? 0) + 1;
  return `fx-${hashKey(`${scope.id}#${scope.ids}`)}`;
}

/** A template's identity for its keys: hashed once per template string. */
const templateSalts = new Map<string, string>();
export function templateSalt(html: string): string {
  let salt = templateSalts.get(html);
  if (salt === undefined) templateSalts.set(html, (salt = hashKey(html).slice(0, 6)));
  return salt;
}

/** The template part of a key (`<position>-<template>`), empty for an element's key. */
export function keySalt(el: Element): string {
  const key = el.getAttribute(HYDRATION_KEY) ?? '';
  const dash = key.indexOf('-');
  return dash < 0 ? '' : key.slice(dash + 1);
}

/** An element adopted by the cursor: it is in use, so the sweep must not take it. */
export function releaseKeyed(el: Element): void {
  const key = el.getAttribute(HYDRATION_KEY);
  if (key && keyed_nodes?.get(key) === el) keyed_nodes.delete(key);
}

/**
 * A component starts: the elements it builds, now or later, number within its own scope.
 * Returns the owner to run the component under, or null when no key is needed. The scope goes
 * on a child owner, never on the current one: a component created directly in its parent
 * shares the parent's owner, and stamping there moved every later sibling into the
 * component's scope, so a branch that rendered differently on the client shifted their keys.
 */
export function openKeyScope(): Owner | null {
  if (!keyed()) return null;
  const owner = getOwner() as ScopedOwner | null;
  if (!owner) return null;
  const parent = scopeOf(owner);
  const scope: KeyScope = { id: parent.id + (parent.next++).toString(36) + '.', next: 0 };
  const child = createChildOwner(owner) as ScopedOwner;
  (child.contexts = new Map()).set(KEY_SCOPE, scope);
  return child;
}

/** Name the current owner's scope: an element rendering its own content in its own root. */
export function setKeyScope(id: string): void {
  const owner = getOwner() as ScopedOwner | null;
  if (!owner) return;
  (owner.contexts ??= new Map()).set(KEY_SCOPE, { id, next: 0 } satisfies KeyScope);
}

/** Server elements by key, indexed once per hydrated container. */
let keyed_nodes: Map<string, Element> | null = null;

/** Index the keyed server elements under `container`. Adds to what is already indexed. */
export function indexHydrationKeys(container: ParentNode): void {
  keyed_nodes ??= new Map();
  for (const el of container.querySelectorAll(`[${HYDRATION_KEY}]`)) {
    const key = el.getAttribute(HYDRATION_KEY)!;
    if (!keyed_nodes.has(key)) keyed_nodes.set(key, el);
  }
}

/** Drop the index: hydration of the page is over. */
export function clearHydrationKeys(): void {
  keyed_nodes = null;
}


/**
 * Remove the keyed server elements nothing claimed: markup the server rendered and the client
 * did not, or rendered differently. Left in place they show as a stale or duplicate copy.
 * Content of a custom element that has not built yet is kept for it; the element cleans its own
 * subtree once it has hydrated. `within` limits the sweep to one subtree.
 */
export function removeUnclaimedKeyed(within?: Node): number {
  if (!keyed_nodes) return 0;
  let removed = 0;
  for (const [key, el] of keyed_nodes) {
    if (!el.isConnected) {
      keyed_nodes.delete(key);
      continue;
    }
    if (within && !within.contains(el)) continue;
    // Inside an element still waiting to build: its content is its own to adopt.
    if (el.parentElement?.closest('[data-fx-ssr]')) continue;
    keyed_nodes.delete(key);
    el.remove();
    removed++;
  }
  return removed;
}

/**
 * Take the keyed server elements in `nodes` (and below them) out of the unclaimed index: content
 * a component kept as the server rendered it, which nothing claims and which must stay.
 */
export function keepKeyed(nodes: Node[]): void {
  if (!keyed_nodes || nodes.length === 0) return;
  for (const [key, el] of keyed_nodes) {
    if (nodes.some((n) => n === el || n.contains(el))) keyed_nodes.delete(key);
  }
}

/**
 * The server element with this key and tag, taken out of the index so it is claimed once.
 * Null when there is none, and the caller falls back to the cursor.
 */
export function claimKeyed(key: string | null, tag: string): Element | null {
  if (!key || !keyed_nodes) return null;
  const el = keyed_nodes.get(key);
  if (!el || el.localName !== tag.toLowerCase()) return null;
  keyed_nodes.delete(key);
  return el;
}


/**
 * Where hydration leaves the owner a custom element was rendered under.
 *
 * On the client that owner is current when the template makes the element, so the element
 * reads it in its constructor. A server-rendered element is different: it upgrades when its
 * definition is imported, before hydration reaches it, with no owner around. Hydration hands
 * it over here instead. An element that has upgraded takes it through a setter on this key; one
 * that has not finds it as an own property when it does. Nothing else reads it.
 */
const OWNER_KEY = Symbol.for('fluixi.owner');

export function handOwner(element: Element): void {
  const owner = getOwner();
  if (owner) (element as unknown as Record<symbol, unknown>)[OWNER_KEY] = owner;
}

/** Every custom element in an adopted subtree, the root included. */
function handOwnerToCustomElements(root: Node): void {
  if (!(root instanceof Element)) return;
  if (root.localName.includes('-')) handOwner(root);
  for (const element of root.querySelectorAll('*')) if (element.localName.includes('-')) handOwner(element);
}

/** A template's markup names a custom element: a tag with a dash. Checked before walking. */
const CUSTOM_TAG = /<[a-z][\w.]*-/i;

/** Hand the owner to the custom elements in an adopted template, when its markup names one. */
function handOwnerTree(root: Node, html: string): void {
  if (CUSTOM_TAG.test(html)) handOwnerToCustomElements(root);
}

/**
 * The compiler tags a hole's accessor with where it was written, and devtools reads the tag
 * off whatever finally reaches `insert`. Under hydration that is this wrapper, not the
 * accessor, so the tag has to come along: otherwise the binding reports the frame it was
 * created from, which is a line in this file.
 */
function carryHoleTag<T extends object>(from: object, to: T): T {
  const tag = (from as Record<string, unknown>)[HOLE_TAG];
  if (tag !== undefined) (to as Record<string, unknown>)[HOLE_TAG] = tag;
  return to;
}

/** `holeScope` while hydrating: place the cursor at the hole for whatever builds its content. */
function hydrateHole<T>(start: Node, produce: () => T): T {

  // `produce` is called with the cursor already placed, because the value may be built
  // eagerly: `props.children` is a getter, and reading it constructs its nodes there and
  // then. Wrapping the result instead would be too late: the DOM would already exist,
  // built against whatever cursor happened to be current, and the server's nodes would be
  // left behind as duplicates.
  const value = runHydrationAt(start.nextSibling, produce);

  // A memo or accessor builds nothing until it is read, which happens inside `insert`'s
  // effect, so it needs the cursor placed again at that moment. The guard matters: once
  // hydration is over, later updates must render normally rather than re-enter it.
  if (typeof value === 'function') {
    const accessor = value as unknown as (...args: unknown[]) => unknown;
    // A memo can return another (a component that returns its own memo): read the whole chain
    // here, with the cursor placed, not after this returns. insert() unwraps functions the same
    // way, so the value it ends up with is unchanged.
    const wrapped = (...args: unknown[]) =>
      hydration.active
        ? runHydrationAt(start.nextSibling, () => {
            let value = accessor(...args);
            while (typeof value === 'function') value = (value as () => unknown)();
            return value;
          })
        : accessor(...args);
    return carryHoleTag(accessor, wrapped) as unknown as T;
  }
  return value;
}

/** Start using hydration keys: called by `hydrate()` and the server renders before they render. */
export function useHydrationKeys(): void {
  installHydrationKeys({ keyed, next: nextHydrationKey, salt: templateSalt, claim: claimKeyed, keep: keepKeyed, scope: openKeyScope, handOwner, handOwnerTree, holeScope: hydrateHole, resume: runHydrationAt, unkeyed, slotStart, slotOrder });
}

/**
 * A slot's server content starts right after the member before it. A member built before the
 * walk reached it, a router <Link> adopting its <a>, can leave the cursor past the slot's text,
 * which would then go to the next slot.
 */
function slotStart(parent: Node, members: Node[]): void {
  const prev = members[members.length - 1];
  if (prev && prev.parentNode === parent) hydration.cursor = prev.nextSibling;
}

/**
 * A slot that claimed while hydrating put its marker in the DOM, after what it adopted. Left out
 * of what the reconcile starts from, the markers read as new nodes and all went in before the
 * first sibling; each slot's insert then moved its content back in front of its marker.
 */
function slotOrder(parent: Node, current: Node[], adopted: Set<Node>, slots: { marker: Node; wired?: boolean }[]): Node[] {
  const before = adopted.size ? current.filter((node) => !adopted.has(node)) : current;
  const placed = slots.filter((slot) => slot.wired).map((slot) => slot.marker);
  if (!placed.length) return before;
  const ours = new Set<Node>([...before, ...placed]);
  return Array.from(parent.childNodes).filter((node) => ours.has(node));
}

/** Run `fn` with keys off for this server render; elsewhere keys follow hydration already. */
function unkeyed<T>(fn: () => T): T {
  const context = isServer() ? getRequestContext() : undefined;
  if (!context || context.hydrationKeys === false) return fn();
  const previous = context.hydrationKeys;
  context.hydrationKeys = false;
  try {
    return fn();
  } finally {
    context.hydrationKeys = previous;
  }
}
