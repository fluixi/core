/**
 * Hydration state + the small helpers the runtime hot path reads on every render
 * (even when not hydrating). The heavy DOM-reuse walker lives in ./hydration.ts
 * and registers itself here, so render-only apps don't bundle it.
 *
 * `hydration.active` gates everything, so it's a plain field read (not a getter).
 */

// `parents` is the stack of elements the cursor has descended into (via the walker's
// hydrateElement). Lets the cursor auto-ascend when a sibling list is exhausted.
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
  /** Adopt a static subtree whole, without descending into it. */
  hydrateStatic(tag: string): Element | null;
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
 * For a detached subtree mid-hydration that must NOT consume the cursor (e.g. an eagerly
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
