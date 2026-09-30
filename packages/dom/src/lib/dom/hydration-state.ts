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
