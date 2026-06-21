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

export const hydration: { active: boolean; cursor: Node | null } = {
  active: false,
  cursor: null,
};

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
  const c = hydration.cursor;
  if (c && c.nodeType === 1 && (c as Element).tagName.toLowerCase() === tag.toLowerCase()) {
    hydration.cursor = c.firstChild;
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
  hydration.active = true;
  hydration.cursor = cursor;
  try {
    return fn();
  } finally {
    hydration.active = prevActive;
    hydration.cursor = prevCursor;
  }
}

/** Ascend the cursor past an adopted node's (already-walked) subtree. */
export function ascendPast(node: Node): void {
  hydration.cursor = node.nextSibling;
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
    hydration.cursor = (last as Node).nextSibling;
  }
}

/**
 * Hydrate `element` over the server-rendered markup already in `container`:
 * reuse the existing DOM and wire events/reactivity in place (no re-render).
 */
export function hydrate<T>(element: T, container: Element): () => void {
  hydration.active = true;
  hydration.cursor = container.firstChild;

  // Seed resources from server-serialized data (window.__FX_DATA__) so they
  // don't refetch — ids match by creation order (the server assigns r0, r1, …
  // in the same order this hydration render creates them). hydrate() is
  // synchronous, so setting these module-globals around it is safe.
  const data: Record<string, unknown> | null =
    (typeof window !== 'undefined' && (window as any).__FX_DATA__) || null;
  let rid = 0;
  setResourceIdSource(() => `r${rid++}`);
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
  }
}
