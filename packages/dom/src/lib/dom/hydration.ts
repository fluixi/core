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
import { insert, render } from './runtime.js';
import { DEV as IS_DEV } from './dev.js';
import { setResourceIdSource, setServerDataGetter } from '@fluixi/reactive/signal';
import { getServerData } from './server/fx-data.js';
import {
  clearHydrationKeys,
  hydration,
  indexHydrationKeys,
  keySalt,
  releaseKeyed,
  registerHydrationWalker,
  removeUnclaimedKeyed,
  flushAfterHydrationPass,
  warnTextMismatch,
} from './hydration-state.js';
import { isProduction } from './versions.js';

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

// Tree-shaken out of production (bundlers replace process.env.NODE_ENV). Not behind
// `typeof process`, which is undefined in a browser and kept the warnings from ever firing.
// `__DEV__`-based, so a production bundle folds the warnings away.
const DEV = IS_DEV;

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
/**
 * A custom element that rendered its own content on the server: its children are its own,
 * adopted by the element, not the page's. `data-fx-ssr` while it has not upgraded yet; the
 * owner mark (set by @fluixi/web-components) once it has.
 */
const OWNS_CONTENT = Symbol.for('fluixi.ownsContent');
function ownsServerContent(el: Element): boolean {
  if (!el.localName.includes('-')) return false;
  return el.hasAttribute('data-fx-ssr') || (el as unknown as Record<symbol, unknown>)[OWNS_CONTENT] === true;
}

/**
 * The nodes the server rendered inside a custom element, as the page claims it. What the page
 * inserts into it afterwards are its authored children, which the element tells apart by this.
 */
const SERVER_CONTENT = Symbol.for('fluixi.serverContent');
function recordServerContent(el: Element): void {
  const record = el as unknown as Record<symbol, unknown>;
  if (!record[SERVER_CONTENT]) record[SERVER_CONTENT] = Array.from(el.childNodes);
}

function hydrateElement(tag: string): Element | null {
  recoverCursor();
  const c = hydration.cursor;
  if (c && c.nodeType === 1 && (c as Element).tagName.toLowerCase() === tag.toLowerCase()) {
    releaseKeyed(c as Element);
    if (VOID_ELEMENTS.has(tag.toLowerCase()) || ownsServerContent(c as Element)) {
      if (!VOID_ELEMENTS.has(tag.toLowerCase())) recordServerContent(c as Element);
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

/** An element claimed by key: descend into it, or step past it when it has nothing to adopt. */
function enterElement(el: Element): void {
  if (VOID_ELEMENTS.has(el.localName) || ownsServerContent(el)) {
    if (!VOID_ELEMENTS.has(el.localName)) recordServerContent(el);
    hydration.cursor = el.nextSibling;
  } else {
    hydration.parents.push(el);
    hydration.cursor = el.firstChild;
  }
}

/**
 * Adopt a whole static subtree at the cursor without descending into it.
 *
 * A compiler-emitted template is inert by construction, the analysis only marks a
 * subtree static when nothing inside it can change, so the server's markup for it is
 * exactly the template. There is nothing in there to hydrate, and stepping through it
 * element by element would only give the cursor more chances to desynchronise.
 */
function hydrateStatic(tag: string, salt?: string): Element | null {
  recoverCursor();
  const c = hydration.cursor;
  if (c && c.nodeType === 1 && (c as Element).tagName.toLowerCase() === tag.toLowerCase()) {
    // The server built another template here (a sun where the client builds a moon): adopting
    // it would patch one into the other. Build the client's; the sweep removes the server's.
    const server = keySalt(c as Element);
    if (salt && server && server !== salt) {
      if (DEV) warnMismatch(`<${tag}> (another template)`, c);
      return null;
    }
    releaseKeyed(c as Element);
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
    const data = (c as Text).data;
    // Text written next to an expression, `{lead} <a>`, reaches the browser as one text node
    // with the expression's value: HTML has no boundary between the two. Keep this node's
    // part and leave the rest, a node of its own, for the text that comes next.
    if (data.length > value.length && data.startsWith(value)) {
      hydration.cursor = (c as Text).splitText(value.length);
      return c as Text;
    }
    hydration.cursor = c.nextSibling;
    if (data !== value) {
      warnTextMismatch(data, value);
      (c as Text).data = value;
    }
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
  registerHydrationWalker({ hydrateElement, hydrateText, hydrateMarker, hydrateStatic, enterElement });
}

/** Path and query of the page, which the server's data was rendered for; null off a browser. */
const currentAddress = () => (typeof location === 'undefined' ? null : `${location.pathname}${location.search}`);

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
  clearHydrationKeys();
  indexHydrationKeys(container);

  // Seed resources from server-serialized data (__FX_DATA__) so they don't refetch: ids
  // match by creation order. hydrate() is synchronous, so setting these module-globals is safe.
  const data: Record<string, unknown> | null = getServerData();
  const ns = options?.resourceNamespace;
  let rid = 0;
  setResourceIdSource(() => (ns ? `${ns}:r${rid++}` : `r${rid++}`));
  // The data belongs to the address the server rendered. Once the browser is elsewhere (a
  // redirect while this page hydrates), a new page fetches its own: matched by creation order,
  // it would take the first page's values.
  const rendered = currentAddress();
  setServerDataGetter(data ? (id) => (id in data && currentAddress() === rendered ? { value: data[id] } : undefined) : null);

  try {
    return render(element, container);
  } finally {
    // Stop DOM-reuse after the synchronous pass, but KEEP the resource id source + server-data
    // getter active: lazy file-routes create resources after this returns and still seed
    // from __FX_DATA__ by creation order (later ids simply aren't present and fetch).
    hydration.active = false;
    hydration.cursor = null;
    hydration.parents = [];
    flushAfterHydrationPass();
  }
}

/**
 * Adopt the markup already inside `container` for what `build` returns, under the current
 * owner: a custom element taking over the content the server rendered for it. Re-entrant,
 * since an element can upgrade while the page around it is still hydrating.
 */
export function hydrateChildren(container: Element, build: () => unknown): void {
  ensureWalker();
  indexHydrationKeys(container);
  const previous = { active: hydration.active, cursor: hydration.cursor, parents: hydration.parents };
  hydration.active = true;
  hydration.cursor = container.firstChild;
  hydration.parents = [];
  try {
    insert(container, build() as never);
    // The element's content is all built now: what it did not claim is stale.
    removeUnclaimedKeyed(container);
  } finally {
    hydration.active = previous.active;
    hydration.cursor = previous.cursor;
    hydration.parents = previous.parents;
    // The outermost pass, when an element hydrates with no page pass around it.
    if (!previous.active) flushAfterHydrationPass();
  }
}
