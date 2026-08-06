/**
 * Cloning a subtree whose *structure* is static but which contains dynamic holes.
 *
 * The fully-static case is easy: serialize, clone, done. The common case is not static —
 * a card wrapper with one reactive value inside — and until now a single hole sent the
 * whole subtree back to building an element at a time. This plans the middle ground: the
 * structure becomes one template, and each hole is filled at runtime through a reference
 * into the cloned tree.
 *
 * Two things make it work:
 *
 *  - **Each hole leaves a marker comment in the template.** That is what makes the three
 *    environments agree: the clone, the server's markup and the DOM being hydrated all
 *    have the same shape, so one set of `firstChild`/`nextSibling` paths addresses all of
 *    them. Omitting holes instead was cheaper in bytes and wrong — the paths then
 *    described the template but not the server DOM, which also contains the rendered hole
 *    content.
 *  - **Every reference is captured before any insertion.** Paths are computed against that
 *    shared shape; inserting would shift later positions, so the emitted code reads all
 *    the refs it needs up front.
 */
import type { IRElement, IRNode, IRProp } from '../ir/nodes.js';
import { isPlainLiteralAttr, isRawTextElement, serializeStatic } from './serialize-static.js';

/** A dynamic child to be inserted into the cloned tree. */
export interface TemplateHole {
  /** Expression reaching the hole's parent element, relative to the template root. */
  parentPath: string;
  /** Expression reaching this hole's marker comment, which content is inserted before. */
  markerPath: string;
  node: IRNode;
}

export interface PartialTemplate {
  html: string;
  tag: string;
  holes: TemplateHole[];
}

/**
 * The comment left where a hole goes.
 *
 * Empty rather than labelled: it appears once per interpolation in the shipped HTML, and
 * the runtime never reads its content — position is the whole signal.
 */
export const HOLE_MARKER = '<!---->';

/** A child the template contains rather than fills in at runtime. */
function isTemplateChild(node: IRNode): boolean {
  return node.kind === 'text' || (node.kind === 'element' && isTemplateElement(node));
}

/**
 * True when the element itself contributes only fixed structure.
 *
 * Its children may be dynamic — that is the whole point — but the element's own tag and
 * attributes must be constants, or the template would bake in a value that should vary.
 */
function isTemplateElement(node: IRElement): boolean {
  if (node.svg) return false;
  if (isRawTextElement(node.tag)) return false;
  if (!node.props.every((p: IRProp) => isPlainLiteralAttr(p))) return false;
  return node.children.every((c) => isTemplateChild(c) || isHole(c));
}

function isHole(node: IRNode): boolean {
  return node.kind === 'expr' || node.kind === 'component' || node.kind === 'control';
}

/**
 * Plan a partial template for `root`, or null when it does not qualify.
 *
 * Returns null for a subtree with no holes: that is the fully-static case, which has a
 * cheaper path of its own and must not be routed through this one.
 */
export function planPartialTemplate(root: IRElement): PartialTemplate | null {
  if (!isTemplateElement(root)) return null;
  if (!addressable(root)) return null;

  const holes: TemplateHole[] = [];
  collect(root, '_el$');
  if (holes.length === 0) return null;

  return { html: serializeWithMarkers(root), tag: root.tag, holes };

  function collect(el: IRElement, path: string): void {
    // Every child occupies one node in the template — a hole's node is its marker — so
    // index arithmetic here matches the DOM exactly.
    el.children.forEach((child, index) => {
      const childRef = childPath(path, index);
      if (isHole(child)) {
        holes.push({ parentPath: path, markerPath: childRef, node: child });
      } else if (child.kind === 'element') {
        collect(child, childRef);
      }
    });
  }
}

/** The subtree as HTML, with a marker comment standing in for each hole. */
function serializeWithMarkers(el: IRElement): string {
  const withMarkers: IRElement = {
    ...el,
    children: el.children.map((child) =>
      isHole(child)
        ? ({ kind: 'text', value: MARKER_SENTINEL } as IRNode)
        : child.kind === 'element'
          ? serializeMarkersDeep(child)
          : child,
    ),
  };
  // Serialize as text, then swap the sentinel for the comment. Going through the normal
  // serializer keeps escaping and void-element handling in one place.
  return serializeStatic(withMarkers).split(escapedSentinel).join(HOLE_MARKER);
}

function serializeMarkersDeep(el: IRElement): IRElement {
  return {
    ...el,
    children: el.children.map((child) =>
      isHole(child)
        ? ({ kind: 'text', value: MARKER_SENTINEL } as IRNode)
        : child.kind === 'element'
          ? serializeMarkersDeep(child)
          : child,
    ),
  };
}

/** Escaped by the serializer, so the swap has to look for the escaped form. */
const MARKER_SENTINEL = '\u0000fx-hole\u0000';
const escapedSentinel = MARKER_SENTINEL;

function childPath(parent: string, index: number): string {
  return index === 0
    ? `${parent}.firstChild`
    : `${parent}.firstChild${'.nextSibling'.repeat(index)}`;
}


/**
 * Whether every hole in the subtree can be addressed by a node reference.
 *
 * Paths count children positionally, so the IR's child list has to match the DOM's after
 * the template is parsed — and the DOM merges adjacent text. Two cases break that, and
 * both are rejected rather than mis-addressed:
 *
 *  - **Adjacent text children.** `["a", "b"]` in the IR is one text node in the DOM, so
 *    every later sibling's index is off by one. That is the `null.nextSibling` crash.
 *  - **A hole between two texts.** Removing the hole makes the texts adjacent, so they
 *    merge — and there is then no node to insert *between*. Only a marker would fix it,
 *    and a marker costs more than the template saves for a single interpolation.
 *
 * An empty text child is rejected for the same reason: it serializes to nothing, so it
 * occupies an index in the IR that does not exist in the DOM.
 */
function addressable(el: IRElement): boolean {
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i]!;
    if (child.kind !== 'text') continue;
    if (child.value === '') return false;
    if (el.children[i + 1]?.kind === 'text') return false;
  }
  return el.children.every((c) => c.kind !== 'element' || addressable(c));
}
