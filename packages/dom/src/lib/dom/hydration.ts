/**
 * DOM-reuse hydration walker.
 *
 * Walk the server-rendered DOM with a single depth-first cursor, adopting the
 * existing nodes instead of recreating them. The runtime's leaf factories call the
 * walker registered here (hydrateElement/hydrateText/hydrateMarker); insert() and
 * control flow use the small cursor helpers in ./hydration-state.ts. This module is
 * the heavy half: pulled in only when an app imports hydrate().
 *
 * This matches the depth-first nested order the imperative codegen emits (each
 * element is fully built before the next sibling is created).
 */
import { render } from './runtime.js';
import { setResourceIdSource, setServerDataGetter } from '@fluixi/reactive/signal';
import { getServerData } from './server/fx-data.js';
import { hydration, registerHydrationWalker } from './hydration-state.js';

/**
 * Re-sync the cursor onto the next adoptable server node. Two things can leave it off-target
 * after an element subtree is built by user code (e.g. `list.map(...)`): it's `null` (sibling
 * list exhausted: ascend to an open parent's next sibling) or it's a client-only empty-text
 * insertion anchor (skip past it). Loop until a real node is found or nothing's left.
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

// Void elements have no children: ascend to nextSibling instead of descending into a
// null firstChild (which would strand the cursor). Matches VOID_ELEMENTS in the serializer.
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// Tree-shaken out of production (vite/esbuild replace process.env.NODE_ENV).
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
function hydrateElement(tag: string): Element | null {
  recoverCursor();
  const c = hydration.cursor;
  if (c && c.nodeType === 1 && (c as Element).tagName.toLowerCase() === tag.toLowerCase()) {
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

/**
 * Adopt a whole static subtree at the cursor without descending into it.
 *
 * A compiler-emitted template is inert by construction, the analysis only marks a
 * subtree static when nothing inside it can change, so the server's markup for it is
 * exactly the template. There is nothing in there to hydrate, and stepping through it
 * element by element would only give the cursor more chances to desynchronise.
 */
function hydrateStatic(tag: string): Element | null {
  recoverCursor();
  const c = hydration.cursor;
  if (c && c.nodeType === 1 && (c as Element).tagName.toLowerCase() === tag.toLowerCase()) {
    hydration.cursor = c.nextSibling;
    return c as Element;
  }
  if (DEV && c) warnMismatch(`<${tag}> (static)`, c);
  return null;
}

/** Reuse the text node at the cursor (syncing its value) and advance. */
function hydrateText(value: string): Text | null {
  if (value === '') {
    // Empty reactive CONTENT (anchors bypass this via createTextNode(_, true)). When the
    // client renders '' but the server rendered NON-empty content here (e.g. a resource's
    // loading state, resolved on the server), adopt+clear that server text node: else it
    // is orphaned and duplicates once the value resolves ("User #9User #9"). A genuinely
    // empty text (no server node, cursor not at a non-empty text node) builds fresh.
    const c = hydration.cursor;
    if (c && c.nodeType === 3 && (c as Text).data !== '') {
      hydration.cursor = c.nextSibling;
      (c as Text).data = '';
      return c as Text;
    }
    return null;
  }
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
function hydrateMarker(value: string): Comment | null {
  recoverCursor();
  const c = hydration.cursor;
  if (c && c.nodeType === 8 && (c as Comment).data === value) {
    hydration.cursor = c.nextSibling;
    return c as Comment;
  }
  // Empty markers ARE serialized (`<!---->`), so a missing/diverged one is a real divergence.
  if (DEV && c) warnMismatch(`marker <!--${value.slice(0, 24)}-->`, c);
  return null;
}

// Registered on first hydrate() rather than at module load, so it survives
// sideEffects:false tree-shaking (tied to the used hydrate export).
let _walkerRegistered = false;
function ensureWalker(): void {
  if (_walkerRegistered) return;
  _walkerRegistered = true;
  registerHydrationWalker({ hydrateElement, hydrateText, hydrateMarker, hydrateStatic });
}

/**
 * Hydrate `element` over the server-rendered markup already in `container`: reuse the
 * existing DOM and wire events/reactivity in place (no re-render).
 *
 * `options.resourceNamespace` scopes resource ids for partial (island) hydration.
 */
export function hydrate<T>(
  element: T,
  container: Element,
  options?: { resourceNamespace?: string },
): () => void {
  ensureWalker();
  hydration.active = true;
  hydration.cursor = container.firstChild;
  hydration.parents = [];

  // Seed resources from server-serialized data (__FX_DATA__) so they don't refetch: ids
  // match by creation order. hydrate() is synchronous, so setting these module-globals is safe.
  const data: Record<string, unknown> | null = getServerData();
  const ns = options?.resourceNamespace;
  let rid = 0;
  setResourceIdSource(() => (ns ? `${ns}:r${rid++}` : `r${rid++}`));
  setServerDataGetter(data ? (id) => (id in data ? { value: data[id] } : undefined) : null);

  try {
    return render(element, container);
  } finally {
    // Stop DOM-reuse after the synchronous pass, but KEEP the resource id source + server-data
    // getter active: lazy file-routes create resources after this returns and still seed
    // from __FX_DATA__ by creation order (later ids simply aren't present and fetch).
    hydration.active = false;
    hydration.cursor = null;
    hydration.parents = [];
  }
}
