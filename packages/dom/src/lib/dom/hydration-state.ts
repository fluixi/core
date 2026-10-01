/**
 * Hydration state + the small helpers the runtime hot path reads on every render
 * (even when not hydrating). The heavy DOM-reuse walker lives in ./hydration.ts
 * and registers itself here, so render-only apps don't bundle it.
 *
 * `hydration.active` gates everything, so it's a plain field read (not a getter).
 */

// `parents` is the stack of elements the cursor has descended into (via the walker's
// hydrateElement). Lets the cursor auto-ascend when a sibling list is exhausted.
import { getOwner, type Owner } from '@fluixi/reactive/signal';
import { isServer } from './server/host.js';
import { getRequestContext } from './server/request-context.js';

export const hydration: { active: boolean; cursor: Node | null; parents: Node[] } = {
  active: false,
  cursor: null,
  parents: [],
};

// The heavy walker, registered by ./hydration.ts when hydrate() runs.
export interface HydrationWalker {
  hydrateElement(tag: string): Element | null;
  hydrateText(value: string): Text | null;
  hydrateMarker(value: string): Comment | null;
  /** Adopt a static subtree whole, without descending into it. `salt` is the template's identity. */
  hydrateStatic(tag: string, salt?: string): Element | null;
  /** An element claimed by key: move the cursor into it, as `hydrateElement` would. */
  enterElement(el: Element): void;
}

let _walker: HydrationWalker | null = null;

export function registerHydrationWalker(walker: HydrationWalker): void {
  _walker = walker;
}

export function getHydrationWalker(): HydrationWalker | null {
  return _walker;
}

/** True when hydrating and `node` is already server-rendered in `parent`. */
export function isAdopted(parent: Node, node: Node): boolean {
  return hydration.active && node.parentNode === parent;
}

/**
 * Ascend the cursor past an adopted node's (already-walked) subtree. If the node is an
 * open parent we descended into, pop it (and anything still open above it) off the stack.
 */
export function ascendPast(node: Node): void {
  const idx = hydration.parents.lastIndexOf(node);
  if (idx !== -1) hydration.parents.length = idx;
  hydration.cursor = node.nextSibling;
}

/**
 * Capture the current hydration cursor (or null when not hydrating). An async boundary
 * records this when created, then resumes hydration there via runHydrationAt.
 */
export function captureHydrationCursor(): Node | null {
  return hydration.active ? hydration.cursor : null;
}

/** Resume hydration with the cursor at `cursor` for the duration of `fn`, then restore. */
export function runHydrationAt<T>(cursor: Node | null, fn: () => T): T {
  if (!cursor || cursor.parentNode == null) return fn();
  const prevActive = hydration.active;
  const prevCursor = hydration.cursor;
  const prevParents = hydration.parents;
  hydration.active = true;
  hydration.cursor = cursor;
  hydration.parents = [];
  try {
    return fn();
  } finally {
    hydration.active = prevActive;
    hydration.cursor = prevCursor;
    hydration.parents = prevParents;
  }
}

/**
 * Run `fn` with DOM-reuse hydration temporarily OFF, restoring the cursor afterwards.
 * For a detached subtree mid-hydration that must not consume the cursor (e.g. an eagerly
 * instantiated Suspense fallback that isn't showing).
 */
export function runWithoutHydration<T>(fn: () => T): T {
  if (!hydration.active) return fn();
  const prevCursor = hydration.cursor;
  const prevParents = hydration.parents;
  hydration.active = false;
  hydration.parents = [];
  try {
    return fn();
  } finally {
    hydration.active = true;
    hydration.cursor = prevCursor;
    hydration.parents = prevParents;
  }
}

/**
 * After a control-flow item (For/Index/Show child) builds its node(s), ascend the cursor
 * past it so the next sibling item reuses the right server node. No-op outside hydration.
 */
export function hydrateAdvancePast(rendered: unknown): void {
  if (!hydration.active || rendered == null) return;
  const last = Array.isArray(rendered) ? rendered[rendered.length - 1] : rendered;
  if (last && typeof (last as any).nodeType === 'number') {
    ascendPast(last as Node);
  }
}

/**
 * An application hydrating this document, announced before its first `await`.
 *
 * A custom element the server rendered inside the app upgrades when its module loads, which
 * is before the app hydrates. Built then, it has no owner above it, so every context read in
 * its first render is missing: a `Link` found no router and swallowed its click. Such an
 * element waits for the app to hand it an owner, or for this to end if the app never reaches
 * it. On `globalThis`, because a page can load more than one copy of this module.
 */
interface AppHydration {
  pending: number;
  waiting: Set<() => void>;
}

function appHydration(): AppHydration {
  const g = globalThis as Record<symbol, AppHydration | undefined>;
  return (g[Symbol.for('fluixi.appHydration')] ??= { pending: 0, waiting: new Set() });
}

/** An app is about to hydrate: server-rendered custom elements wait for their owner. */
export function beginAppHydration(): void {
  appHydration().pending++;
}

/** The app's hydration pass is over; elements it did not reach build on their own. */
export function endAppHydration(): void {
  const state = appHydration();
  if (state.pending > 0) state.pending--;
  if (state.pending > 0) return;
  const waiting = [...state.waiting];
  state.waiting.clear();
  for (const resume of waiting) resume();
}

export function isAppHydrationPending(): boolean {
  return appHydration().pending > 0;
}

/** Runs `fn` once the pending app hydration ends. Returns a function that cancels it. */
export function whenAppHydrated(fn: () => void): () => void {
  const state = appHydration();
  state.waiting.add(fn);
  return () => state.waiting.delete(fn);
}

// ─── Hydration keys ─────────────────────────────────────────────────────────────
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
export const HYDRATION_KEY = 'data-hk';

interface KeyScope {
  id: string;
  next: number;
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

/** Keys are only needed while rendering on the server or hydrating. */
function keyed(): boolean {
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

/** A component starts: the elements it builds, now or later, number within its own scope. */
export function openKeyScope(): void {
  if (!keyed()) return;
  const owner = getOwner() as ScopedOwner | null;
  if (!owner) return;
  const parent = scopeOf(owner);
  const scope: KeyScope = { id: parent.id + (parent.next++).toString(36) + '.', next: 0 };
  (owner.contexts ??= new Map()).set(KEY_SCOPE, scope);
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
