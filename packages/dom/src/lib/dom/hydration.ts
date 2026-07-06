/**
 * DOM-reuse hydration.
 *
 * Walk the server-rendered DOM with a single depth-first cursor, adopting the
 * existing nodes instead of recreating them. The runtime's leaf factories and
 * insert() call into the helpers here:
 *   - createNativeElement → hydrateElement: reuse the matched element and DESCEND
 *     into its children (cursor = firstChild).
 *   - createTextNode/createMarker → hydrateText/hydrateMarker: reuse + ADVANCE.
 *   - insert → isAdopted/ascendPast: a node already in place is adopted (not
 *     re-inserted) and the cursor ASCENDS past its (already-walked) subtree.
 *
 * This matches the depth-first nested order the imperative codegen emits (each
 * element is fully built before the next sibling is created).
 *
 * `hydration.active` is read on the runtime hot path (every node create/insert,
 * even when NOT hydrating), so it is a plain field read — deliberately not a
 * getter call. All hydration behaviour is gated on it, so the normal client
 * render path is unaffected.
 */
import { render } from './runtime.js';
import { setResourceIdSource, setServerDataGetter } from '@fluixi/reactive/signal';
import { getServerData } from './server/fx-data.js';

// `parents` is a stack of the elements the cursor has DESCENDED into (via hydrateElement).
// It lets the cursor auto-ascend when a sibling list is exhausted: after an element is fully
// built its cursor sits at `null` (past its last child), and the NEXT sibling — built by user
// code like `list.map(...)`, which never routes each item through insert()/ascendPast — would
// otherwise hydrate against that stranded cursor and build fresh (duplicating the server node).
// `recoverCursor` pops back up to a parent's nextSibling in that case. See hydrate-nested-map.
export const hydration: { active: boolean; cursor: Node | null; parents: Node[] } = {
  active: false,
  cursor: null,
  parents: [],
};

/**
 * Re-sync the cursor onto the next adoptable server node. Two things can leave it off-target
 * after an element subtree is built by user code (e.g. `list.map(...)`):
 *   - it's `null` — the current sibling list is exhausted; ascend to an open parent's next
 *     sibling (possibly several levels for a deeply-nested last child), and
 *   - it's a client-only empty-text insertion anchor (`createTextNode('')` that insert() appends
 *     to a parent) — not adoptable, so skip past it.
 * Loop until a real node is found or there's nothing left to ascend to.
 */
function recoverCursor(): void {
  for (;;) {
    while (
      hydration.cursor &&
      hydration.cursor.nodeType === 3 &&
      (hydration.cursor as Text).data === ''
    ) {
      hydration.cursor = hydration.cursor.nextSibling;
    }
    if (hydration.cursor != null || !hydration.parents.length) return;
    hydration.cursor = hydration.parents.pop()!.nextSibling;
  }
}

// HTML void elements never have children. They must NOT be descended into during
// hydration: their `firstChild` is null, so `cursor = firstChild` would strand the
// cursor and the next sibling (e.g. the `<button>` after an `<input>` in a
// component's array children) would be recreated fresh instead of adopted. For
// these we ascend straight to `nextSibling`. (Matches VOID_ELEMENTS in the
// server serializer.)
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// Tree-shaken out of production bundles (vite/esbuild statically replace
// process.env.NODE_ENV), so the mismatch checks cost nothing in prod.
const DEV =
  typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production';

/** Dev-only: warn when the cursor node diverges from what the client builds. */
function warnMismatch(expected: string, found: Node): void {
  const f =
    found.nodeType === 1
      ? `<${(found as Element).tagName.toLowerCase()}>`
      : found.nodeType === 3
        ? `text ${JSON.stringify((found.nodeValue ?? '').slice(0, 24))}`
        : found.nodeType === 8
          ? 'comment'
          : 'node';
  console.warn(
    `[fluixi] hydration mismatch: expected ${expected} but the server DOM has ${f}. ` +
      `Server and client rendered different markup; recreating this node on the client. ` +
      `Check for non-deterministic render (Date.now(), Math.random(), browser-only branches, untransported data).`,
  );
}

/** Reuse the matched element at the cursor and descend into its children. */
export function hydrateElement(tag: string): Element | null {
  recoverCursor();
  const c = hydration.cursor;
  if (c && c.nodeType === 1 && (c as Element).tagName.toLowerCase() === tag.toLowerCase()) {
    // Void elements have no children to walk — ascend to the sibling instead of
    // descending into a null firstChild (which would strand the cursor). Non-void elements
    // are pushed onto `parents` so the cursor can ascend past them once their subtree is done.
    if (VOID_ELEMENTS.has(tag.toLowerCase())) {
      hydration.cursor = c.nextSibling;
    } else {
      hydration.parents.push(c);
      hydration.cursor = c.firstChild;
    }
    return c as Element;
  }
  if (DEV && c) warnMismatch(`<${tag}>`, c);
  return null;
}

/** Reuse the text node at the cursor (syncing its value) and advance. */
export function hydrateText(value: string): Text | null {
  // Empty text is a CLIENT-ONLY insertion-anchor marker (createTextNode('') in insert()) —
  // the server serialized nothing for it. It must NOT consume a server text node (doing so
  // blanked the real content node next to it and threw off the cursor: `text <small>…` →
  // `<small>…text`). Always create it fresh.
  if (value === '') return null;
  recoverCursor();
  const c = hydration.cursor;
  if (c && c.nodeType === 3) {
    hydration.cursor = c.nextSibling;
    if ((c as Text).nodeValue !== value) (c as Text).nodeValue = value;
    return c as Text;
  }
  if (DEV && c) warnMismatch(`text ${JSON.stringify(value.slice(0, 24))}`, c);
  return null;
}

/** Reuse a matching comment marker at the cursor and advance. */
export function hydrateMarker(value: string): Comment | null {
  recoverCursor();
  const c = hydration.cursor;
  if (c && c.nodeType === 8 && (c as Comment).data === value) {
    hydration.cursor = c.nextSibling;
    return c as Comment;
  }
  // Empty markers ARE serialized (`<!---->`), so unlike empty text a missing/diverged
  // marker is a real structural divergence — warn in dev.
  if (DEV && c) warnMismatch(`marker <!--${value.slice(0, 24)}-->`, c);
  return null;
}

/** True when hydrating and `node` is already server-rendered in `parent`. */
export function isAdopted(parent: Node, node: Node): boolean {
  return hydration.active && node.parentNode === parent;
}

/**
 * Capture the current hydration cursor (the server node about to be hydrated), or null
 * when not hydrating. An async boundary (lazy/Suspense) records this when it's created,
 * then resumes hydration there once its content resolves — see runHydrationAt.
 */
export function captureHydrationCursor(): Node | null {
  return hydration.active ? hydration.cursor : null;
}

/**
 * Resume hydration with the cursor at `cursor` for the duration of `fn`, then restore.
 * Lets an async boundary hydrate its server DOM in place when its content arrives AFTER
 * the initial synchronous pass (a lazy file-route resolving later) — instead of building
 * a fresh, duplicate subtree. No-op (just runs `fn`) when `cursor` is null.
 */
export function runHydrationAt<T>(cursor: Node | null, fn: () => T): T {
  if (!cursor || cursor.parentNode == null) return fn();
  const prevActive = hydration.active;
  const prevCursor = hydration.cursor;
  const prevParents = hydration.parents;
  hydration.active = true;
  hydration.cursor = cursor;
  hydration.parents = []; // fresh descent stack for the resumed subtree
  try {
    return fn();
  } finally {
    hydration.active = prevActive;
    hydration.cursor = prevCursor;
    hydration.parents = prevParents;
  }
}

/**
 * Ascend the cursor past an adopted node's (already-walked) subtree. If the node is an open
 * parent we descended into, pop it (and anything still open above it) off the stack so
 * recoverCursor doesn't later re-ascend through a node we've already closed.
 */
export function ascendPast(node: Node): void {
  const idx = hydration.parents.lastIndexOf(node);
  if (idx !== -1) hydration.parents.length = idx;
  hydration.cursor = node.nextSibling;
}

/**
 * Run `fn` with DOM-reuse hydration temporarily OFF, restoring the cursor afterwards.
 * For building a DETACHED subtree mid-hydration that must NOT consume the cursor — e.g. a
 * Suspense fallback that the boundary instantiates eagerly but isn't currently showing. Without
 * this, the fallback's `createNativeElement('div')` would adopt a same-tag server node (the real
 * content), overwrite it, and strand the cursor — duplicating the tree on hydration.
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
 * After a control-flow item (For/Index/Show child) builds its node(s), ascend the
 * cursor past it so the NEXT sibling item reuses the right server node. The item's
 * own createNativeElement descended into it; without this, item 2+ would be built
 * from a stale (descended) cursor and recreated fresh. No-op outside hydration.
 */
export function hydrateAdvancePast(rendered: unknown): void {
  if (!hydration.active || rendered == null) return;
  const last = Array.isArray(rendered) ? rendered[rendered.length - 1] : rendered;
  if (last && typeof (last as any).nodeType === 'number') {
    ascendPast(last as Node); // pops the item off `parents` too, keeping the stack consistent
  }
}

/**
 * Hydrate `element` over the server-rendered markup already in `container`:
 * reuse the existing DOM and wire events/reactivity in place (no re-render).
 *
 * `options.resourceNamespace` scopes resource ids for partial (island) hydration:
 * each island hydrates independently and restarts its local counter, so the server
 * namespaced that island's resource ids the same way (`Counter#0:r0`, …). Omitted for
 * a whole-app hydrate, where global creation order (`r0`, `r1`, …) already lines up.
 */
export function hydrate<T>(
  element: T,
  container: Element,
  options?: { resourceNamespace?: string },
): () => void {
  hydration.active = true;
  hydration.cursor = container.firstChild;
  hydration.parents = [];

  // Seed resources from server-serialized data (the __FX_DATA__ transport) so they
  // don't refetch — ids match by creation order (the server assigns r0, r1, …
  // in the same order this hydration render creates them). hydrate() is
  // synchronous, so setting these module-globals around it is safe.
  const data: Record<string, unknown> | null = getServerData();
  const ns = options?.resourceNamespace;
  let rid = 0;
  setResourceIdSource(() => (ns ? `${ns}:r${rid++}` : `r${rid++}`));
  setServerDataGetter(data ? (id) => (id in data ? { value: data[id] } : undefined) : null);

  try {
    return render(element, container);
  } finally {
    // Stop DOM-reuse hydration after the synchronous pass (client renders must not
    // hydrate). But KEEP the resource id source + server-data getter active: lazy
    // file-routes create their resources asynchronously, after this returns, and still
    // need to seed from __FX_DATA__ by creation order. Leaving them active is harmless —
    // post-hydration client resources get later ids not present in __FX_DATA__, so they
    // simply fetch.
    hydration.active = false;
    hydration.cursor = null;
    hydration.parents = [];
  }
}
