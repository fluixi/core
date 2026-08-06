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
 *  - **Holes are omitted from the template**, not left as empty placeholders. Content is
 *    then inserted before the hole's next static sibling (or appended when it has none),
 *    so no marker nodes are needed and the server's markup is the same shape.
 *  - **Every reference is captured before any insertion.** Paths are computed against the
 *    template's structure; inserting into it would shift later positions, so the emitted
 *    code reads all the refs it needs up front. This is also why paths use
 *    `firstChild`/`nextSibling` rather than indices.
 */
import type { IRElement, IRNode, IRProp } from '../ir/nodes.js';
import { isPlainLiteralAttr, isRawTextElement, serializeStatic } from './serialize-static.js';

/** A dynamic child to be inserted into the cloned tree. */
export interface TemplateHole {
  /** Expression reaching the hole's parent element, relative to the template root. */
  parentPath: string;
  /** Expression reaching the node to insert before, or null to append. */
  beforePath: string | null;
  node: IRNode;
}

export interface PartialTemplate {
  html: string;
  tag: string;
  holes: TemplateHole[];
}

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

  return { html: serializeStatic(stripHoles(root)), tag: root.tag, holes };

  function collect(el: IRElement, path: string): void {
    // Position within the *template*, which is where the runtime paths will point.
    let templateIndex = 0;
    const paths: string[] = [];
    for (const child of el.children) {
      if (!isTemplateChild(child)) continue;
      paths.push(childPath(path, templateIndex));
      templateIndex++;
    }

    let seen = 0;
    el.children.forEach((child) => {
      if (isTemplateChild(child)) {
        if (child.kind === 'element') collect(child, paths[seen]!);
        seen++;
        return;
      }
      // A hole goes before the next template sibling; with none left it appends.
      holes.push({ parentPath: path, beforePath: paths[seen] ?? null, node: child });
    });
  }
}

function childPath(parent: string, index: number): string {
  return index === 0
    ? `${parent}.firstChild`
    : `${parent}.firstChild${'.nextSibling'.repeat(index)}`;
}

/** The subtree with holes removed, which is what the template contains. */
function stripHoles(el: IRElement): IRElement {
  return {
    ...el,
    children: el.children
      .filter(isTemplateChild)
      .map((c) => (c.kind === 'element' ? stripHoles(c) : c)),
  };
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
  const kept = el.children.filter((c) => !isHole(c));
  for (let i = 0; i < kept.length; i++) {
    const child = kept[i]!;
    if (child.kind === 'text') {
      if (child.value === '') return false;
      if (kept[i + 1]?.kind === 'text') return false;
    }
  }
  // A hole with text on both sides would merge them once removed.
  for (let i = 0; i < el.children.length; i++) {
    if (!isHole(el.children[i]!)) continue;
    if (el.children[i - 1]?.kind === 'text' && el.children[i + 1]?.kind === 'text') return false;
  }
  return el.children.every((c) => c.kind !== 'element' || addressable(c));
}
