/**
 * A serialisable description of the DOM a tag rendered.
 *
 * The chrome panel reads the graph through `eval` and the editor panel over http, so neither
 * can hold Elements. This is the same tree with the elements reduced to labels.
 *
 * The walk stops at any element that is another tag's root and records that tag's id in
 * `owner`. That keeps the result a tree of the application rather than the whole document,
 * and lets the consumer nest the child tag's own DOM under its own row.
 */
import type { RNode } from './instrument.js';

export interface DomNode {
  /** The element as a selector: `div#app.card`. */
  label: string;
  children: DomNode[];
  /** The node whose root this element is, when it is one. */
  owner?: number;
  /**
   * Ids of the values that write into this element. A consumer outside the page has no
   * elements to compare, so it cannot work this out for itself.
   */
  writes?: number[];
  /**
   * Tags that render inside this element without producing one of their own — a boundary
   * like Suspense, or a component whose body is another component. They sit here rather than
   * beside the element, which is where the nesting actually puts them.
   */
  inside?: number[];
  /**
   * The element the application was mounted into. It is nobody's output — it was on the page
   * first — so it belongs above the root tag rather than under it.
   */
  container?: boolean;
  /**
   * Where the element was written. Stamped on it by the runtime when the compiler listed
   * the positions of a template's elements; absent in a build without source locations.
   */
  at?: { file: string; line: number; column: number };
  /** Set only in-page. A description that crossed a wire has no element. */
  element?: Element;
}

/** Kept in step with LOC_TAG in @fluixi/dom's runtime.ts. */
const LOC_TAG = '__fx_loc';

/** The position the runtime stamped on an element, when there is one. */
function locationOf(element: Element): { file: string; line: number; column: number } | undefined {
  return (element as unknown as Record<string, { file: string; line: number; column: number }>)[LOC_TAG];
}

/** Elements described per tag. Caps how large a snapshot can get. */
export const DOM_BUDGET = 200;

/**
 * Static attributes only: a class computed at runtime is not in the source.
 *
 * Written out rather than spread-and-join. This runs once per element of the page on every
 * sample, and building three throwaway arrays to read at most two class names cost more
 * than everything else the walk does.
 */
export function describeElement(element: Element): string {
  let out = element.tagName.toLowerCase();
  if (element.id) out += `#${element.id}`;
  const classes = element.classList;
  if (classes.length > 0) {
    out += `.${classes[0]}`;
    if (classes.length > 1) out += `.${classes[1]}`;
  }
  return out;
}

/**
 * Describe what every tag rendered, in one pass.
 *
 * Per-tag would rebuild the element maps each time, which is enough work to stall a render
 * loop on a page of any size.
 */
export function describeAll(
  graph: Map<number, RNode>,
  /** What a tag returned. Must not fall back to anything, or two tags claim one element. */
  roots: (of: number) => readonly Element[],
  /** Where a value writes. */
  writtenBy: (of: number) => readonly Element[],
  kinds: ReadonlySet<string>,
): Map<number, DomNode[]> {
  const owners = new Map<Element, number>();
  const writers = new Map<Element, number[]>();
  const rendered = new Map<number, readonly Element[]>();

  for (const node of graph.values()) {
    if (kinds.has(node.kind)) {
      const found = roots(node.id);
      rendered.set(node.id, found);
      for (const element of found) if (!owners.has(element)) owners.set(element, node.id);
      continue;
    }
    for (const element of writtenBy(node.id)) {
      const held = writers.get(element);
      if (held) held.push(node.id);
      else writers.set(element, [node.id]);
    }
  }

  const { claimed, containers } = claimOrphans(graph, rendered, writtenBy, kinds, owners);
  const claims = new Map<number, Element[]>();
  for (const [element, id] of claimed) {
    const held = claims.get(id);
    if (held) held.push(element);
    else claims.set(id, [element]);
  }

  const landing = landings(graph, rendered, writtenBy, kinds, claimed, containers);

  const out = new Map<number, DomNode[]>();
  for (const node of graph.values()) {
    if (!kinds.has(node.kind)) continue;
    const budget = { left: DOM_BUDGET };
    const walk = (element: Element): DomNode => {
      const owner = owners.get(element) ?? claimed.get(element);
      // Another tag starts here, so stop. Its DOM goes under its own row.
      const where = locationOf(element);
      if (owner !== undefined && owner !== node.id) {
        return { label: describeElement(element), children: [], owner, element, ...(where ? { at: where } : {}) };
      }
      // The element the application was mounted into. It goes above the tag rather than
      // inside it, and what it holds is reached through the tags themselves, so the walk
      // stops rather than describing the whole application a second time.
      if (containers.has(element)) {
        return { label: describeElement(element), children: [], container: true, element, ...(where ? { at: where } : {}) };
      }
      const children: DomNode[] = [];
      // Read once: `children` is live, so indexing it in the condition re-resolves the
      // collection on every step and a parent with a thousand of them goes quadratic.
      const kids = element.children;
      for (let i = 0, n = kids.length; i < n && budget.left > 0; i++) {
        budget.left -= 1;
        children.push(walk(kids[i]!));
      }
      const writes = writers.get(element);
      // Only tags nested inside this one. A tag further out writes through this element on
      // its way down, and putting it here would nest it under its own child.
      const inside = landing.get(element)?.filter((id) => within(graph, id, node.id));
      return {
        label: describeElement(element),
        children,
        element,
        ...(where ? { at: where } : {}),
        ...(writes?.length ? { writes } : {}),
        ...(inside?.length ? { inside } : {}),
      };
    };
    out.set(node.id, [...(rendered.get(node.id) ?? []), ...(claims.get(node.id) ?? [])].map(walk));
  }
  return out;
}

/** Whether `id` sits under `ancestor` in the component nesting. */
function within(graph: Map<number, RNode>, id: number, ancestor: number): boolean {
  const seen = new Set<number>();
  for (let at = graph.get(id)?.createdIn; at !== undefined && !seen.has(at); at = graph.get(at)?.createdIn) {
    if (at === ancestor) return true;
    seen.add(at);
  }
  return false;
}

/**
 * Where a tag that rendered nothing of its own goes: the shallowest element it writes into.
 * A tag writes to its own insertion point and, through whatever it renders, to everything
 * below that — so the shallowest is the one it is responsible for.
 *
 * Where several land on the same element only the outermost is kept, because the rest come
 * with it as its children.
 */
function landings(
  graph: Map<number, RNode>,
  rendered: Map<number, readonly Element[]>,
  writtenBy: (of: number) => readonly Element[],
  kinds: ReadonlySet<string>,
  claimed: Map<Element, number>,
  containers: ReadonlySet<Element>,
): Map<Element, number[]> {
  const claimers = new Set(claimed.values());
  const landing = new Map<Element, number[]>();
  for (const node of graph.values()) {
    if (!kinds.has(node.kind) || (rendered.get(node.id) ?? []).length) continue;
    if (claimers.has(node.id)) continue;
    let shallowest: Element | undefined;
    let best = Infinity;
    for (const element of writtenBy(node.id)) {
      // The mount container holds the whole application; landing a tag in it would put that
      // tag beside the root instead of under it.
      if (containers.has(element)) continue;
      const depth = depthInDocument(element);
      if (depth < best) {
        best = depth;
        shallowest = element;
      }
    }
    if (!shallowest) continue;
    const held = landing.get(shallowest);
    if (held) held.push(node.id);
    else landing.set(shallowest, [node.id]);
  }
  for (const [element, ids] of landing) {
    landing.set(element, ids.filter((id) => !ids.some((other) => other !== id && within(graph, id, other))));
  }
  return landing;
}

/** How deep a tag sits in the component nesting, following what created it. */
function tagDepths(graph: Map<number, RNode>, kinds: ReadonlySet<string>): Map<number, number> {
  const depth = new Map<number, number>();
  const of = (id: number, seen: Set<number>): number => {
    const held = depth.get(id);
    if (held !== undefined) return held;
    if (seen.has(id)) return 0;
    seen.add(id);
    const parent = graph.get(id)?.createdIn;
    const value = parent === undefined ? 0 : of(parent, seen) + 1;
    depth.set(id, value);
    return value;
  };
  for (const node of graph.values()) if (kinds.has(node.kind)) of(node.id, new Set());
  return depth;
}

function depthInDocument(element: Element): number {
  let steps = 0;
  for (let at = element.parentElement; at; at = at.parentElement) steps++;
  return steps;
}

/**
 * Where to put a tag that returned no element of its own — one whose body is another
 * component, or a boundary like Suspense. What it writes into is the only evidence of where
 * its content went.
 *
 * Two rules keep this from doing damage. Only elements with no owned ancestor are taken: one
 * below an owned element is already inside that tag's tree, and claiming it there would cut
 * the tree in half at an arbitrary point. And where several tags write to the same place, the
 * innermost wins — every tag on the path from the root writes through to the leaves, so the
 * outermost is always a match and never the interesting one.
 */
function claimOrphans(
  graph: Map<number, RNode>,
  rendered: Map<number, readonly Element[]>,
  writtenBy: (of: number) => readonly Element[],
  kinds: ReadonlySet<string>,
  owners: Map<Element, number>,
): { claimed: Map<Element, number>; containers: Set<Element> } {
  const depth = tagDepths(graph, kinds);
  // An element holding something a tag rendered is a wrapper the application was put into,
  // not content a tag produced. The outermost tag writing there is the one it belongs to;
  // for anything else it is the innermost.
  const wraps = (element: Element): boolean => {
    for (const owned of owners.keys()) if (element !== owned && element.contains(owned)) return true;
    return false;
  };

  const writing = new Map<Element, number[]>();
  for (const node of graph.values()) {
    if (!kinds.has(node.kind) || (rendered.get(node.id) ?? []).length) continue;
    for (const element of writtenBy(node.id)) {
      if (owners.has(element)) continue;
      const held = writing.get(element);
      if (held) held.push(node.id);
      else writing.set(element, [node.id]);
    }
  }

  const claimed = new Map<Element, number>();
  const containers = new Set<Element>();
  const covered = (element: Element): boolean => {
    for (let at = element.parentElement; at; at = at.parentElement) {
      if (owners.has(at) || claimed.has(at)) return true;
    }
    return false;
  };
  // Shallowest first, so each one is only tested against ancestors already decided.
  const order = [...writing.keys()].sort((a, b) => depthInDocument(a) - depthInDocument(b));
  for (const element of order) {
    if (covered(element)) continue;
    const ids = writing.get(element)!;
    const container = wraps(element);
    const pick = ids.reduce((best, id) => {
      const a = depth.get(id) ?? 0;
      const b = depth.get(best) ?? 0;
      return container ? (a < b ? id : best) : a > b ? id : best;
    });
    claimed.set(element, pick);
    if (container) containers.add(element);
  }
  return { claimed, containers };
}

/**
 * Drop the Elements so the result can be serialised.
 *
 * Everything else is copied as-is rather than field by field. The copy that describes and the
 * copy that strips are built separately — an extension bundles its own — so a list of fields
 * here goes stale against a description made elsewhere, and the field just disappears.
 */
export function withoutElements(nodes: readonly DomNode[]): DomNode[] {
  return nodes.map(({ element, children, ...rest }) => ({
    ...rest,
    children: withoutElements(children),
  }));
}
