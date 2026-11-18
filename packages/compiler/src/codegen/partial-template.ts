/**
 * Cloning a subtree whose *structure* is static but which contains dynamic holes.
 *
 * The fully-static case is easy: serialize, clone, done. The common case is not static,
 * a card wrapper with one reactive value inside: and a single hole used to send the
 * whole subtree back to being built an element at a time. This plans the middle ground:
 * the structure becomes one template, and each hole is filled through a reference into
 * the cloned tree.
 *
 * An element with dynamic attributes takes the same middle ground. Its static
 * attributes serialize with the structure, and each attribute that can be bound one
 * by one becomes a binding on the walked node, through the same setters `spread`
 * applies internally. What cannot be bound that way (a real spread, a property-only
 * name, a custom element's props, an SVG subtree) keeps the element out of the
 * template entirely, so the imperative path builds it exactly as before.
 *
 * Three things make it correct in all three environments, fresh client render, server
 * render, and hydration:
 *
 *  - **Each hole is bracketed by a marker pair.** A hole's content is then, by
 *    definition, the nodes between its own two markers. That is what lets hydration
 *    *adopt* what the server rendered rather than rebuild it, with no dependence on where
 *    a hydration cursor happens to be.
 *  - **The walk is sequential, not positional.** Index arithmetic against the template
 *    only describes a fresh clone: the server's DOM has the rendered content sitting
 *    between the markers, so every position after a hole is shifted. Each node is reached
 *    from the previous sibling instead, and a hole's end marker is found at runtime.
 *  - **Every reference is read before any insertion**, since inserting shifts what
 *    follows.
 */
import type { IRElement, IRNode, IRProp } from '../ir/nodes.js';
import { isPlainLiteralAttr, isRawTextElement, serializeStatic, PROPERTY_ONLY } from './serialize-static.js';

/**
 * The comments bracketing a hole.
 *
 * Named rather than anonymous so they are recognisable in devtools and in a page's
 * source: an unexplained `<!---->` is a support question.
 */
export const HOLE_START = '<!--fx-->';
export const HOLE_END = '<!--fx/-->';

/** `const <ref> = <expr>;`, emitted before any insertion happens. */
export interface WalkStep {
  ref: string;
  expr: string;
}

/** A dynamic child, and the markers its content lives between. */
export interface TemplateHole {
  /** Reference to the hole's parent element. */
  parentRef: string;
  /** Reference to the opening marker. */
  startRef: string;
  /** Reference to the closing marker, resolved at runtime by scanning from the start. */
  endRef: string;
  node: IRNode;
}

/** How one attribute is bound on a walked node: the runtime helper family it uses. */
export type BindingKind =
  | 'class'
  | 'classList'
  | 'classListDynamic'
  | 'style'
  | 'styleDynamic'
  | 'attr'
  | 'property'
  | 'boolAttr'
  | 'event'
  | 'nativeEvent'
  | 'ref'
  | 'use';

/** One attribute bound at runtime on the element `ref` resolves to. */
export interface TemplateBinding {
  ref: string;
  prop: IRProp;
  kind: BindingKind;
}

export interface PartialTemplate {
  html: string;
  tag: string;
  /** Declarations to emit in order, before the inserts. */
  steps: WalkStep[];
  holes: TemplateHole[];
  /** Attribute bindings to emit after the walk, before the inserts. */
  bindings: TemplateBinding[];
}

function isHole(node: IRNode): boolean {
  return node.kind === 'expr' || node.kind === 'component' || isCustomElement(node);
}

/**
 * A custom element is always created as a node, never baked into a template string: on the
 * server a template is one opaque piece of HTML the element renderer never sees, so the
 * element was sent empty. As a hole it is built the way an element with a dynamic attribute
 * already is, which the server renders.
 */
export function isCustomElement(node: IRNode): boolean {
  return node.kind === 'element' && node.tag.includes('-');
}

/** Whether a subtree holds a custom element anywhere. */
export function containsCustomElement(node: IRNode): boolean {
  if (isCustomElement(node)) return true;
  return 'children' in node && Array.isArray(node.children) && node.children.some(containsCustomElement);
}

/** A child the template contains rather than fills in at runtime. */
function isTemplateChild(node: IRNode): boolean {
  return node.kind === 'text' || (node.kind === 'element' && isTemplateElement(node));
}

/**
 * Names spread assigns as properties even though they are not property-only:
 * `indeterminate` has no attribute at all, so setting one would lose the value.
 */
const PROPERTY_BINDS = new Set(['indeterminate']);

/**
 * What one prop becomes inside a template: part of the serialized structure, a
 * runtime binding, or a reason the element stays imperative (null).
 *
 * Mirrors what `spread` would do with the same prop, narrowed to what can be
 * decided at compile time. The decisions that need the live element (whether a
 * plain name is a property on this tag, whether a custom element has upgraded)
 * are the ones that return null.
 */
function disposition(prop: IRProp): 'serialize' | BindingKind | null {
  if (prop.kind === 'spread') return null;
  if (prop.name === 'ref') return 'ref';
  if (prop.name === 'use') return 'use';
  if (prop.kind === 'event') return prop.event ? 'event' : null;
  if (prop.kind === 'prop') return 'property';
  if (prop.kind !== 'attr') return null;

  const name = prop.name;
  if (name.startsWith('on:')) return 'nativeEvent';
  if (name.startsWith('prop:')) return 'property';
  if (name.startsWith('attr:')) return 'attr';
  if (name.startsWith('bool:')) return 'boolAttr';
  if (name === 'className' || name === 'class') {
    return isPlainLiteralAttr(prop) ? 'serialize' : 'class';
  }
  if (name === 'classList') {
    if (isPlainLiteralAttr(prop)) return 'serialize';
    return prop.reactive ? 'classListDynamic' : 'classList';
  }
  if (name === 'style') {
    if (isPlainLiteralAttr(prop)) return 'serialize';
    return prop.reactive ? 'styleDynamic' : 'style';
  }
  if (name.includes(':')) return null;
  if (PROPERTY_ONLY.has(name)) return null;
  if (PROPERTY_BINDS.has(name)) return 'property';
  if (prop.expr === undefined) return isPlainLiteralAttr(prop) ? 'serialize' : null;
  return 'attr';
}

/**
 * The props that take effect, one per name. A props object keeps only the last
 * value written for a name, so an earlier duplicate is dropped the same way.
 */
function effectiveProps(el: IRElement): IRProp[] {
  const order: string[] = [];
  const byName = new Map<string, IRProp>();
  for (const prop of el.props) {
    if (!byName.has(prop.name)) order.push(prop.name);
    byName.set(prop.name, prop);
  }
  return order.map((name) => byName.get(name)!);
}

interface PropPlan {
  serialize: IRProp[];
  bindings: { prop: IRProp; kind: BindingKind }[];
}

/** One element's props split into serialized and bound, or null when it stays imperative. */
function propPlan(el: IRElement): PropPlan | null {
  const custom = el.tag.includes('-');
  const plan: PropPlan = { serialize: [], bindings: [] };
  for (const prop of effectiveProps(el)) {
    const kind = disposition(prop);
    if (kind === null) return null;
    if (kind === 'serialize') {
      plan.serialize.push(prop);
      continue;
    }
    // A custom element's props are assigned as properties, and which names those
    // are is decided against the live element, so nothing dynamic is bound here.
    if (custom) return null;
    plan.bindings.push({ prop, kind });
  }
  return plan;
}

/**
 * True when the element itself contributes only fixed structure.
 *
 * Its children may be dynamic: that is the point. The element's own attributes
 * must either serialize as constants or bind one by one, or the template would
 * bake in a value that should vary.
 */
function isTemplateElement(node: IRElement): boolean {
  if (node.svg) return false;
  if (isCustomElement(node)) return false;
  if (isRawTextElement(node.tag)) return false;
  if (!propPlan(node)) return false;
  return node.children.every((c) => isTemplateChild(c) || isHole(c));
}

/** True when this subtree needs a reference because something inside it is dynamic. */
function containsHole(node: IRNode): boolean {
  if (isHole(node)) return true;
  const children = (node as { children?: IRNode[] }).children;
  return children ? children.some(containsHole) : false;
}

/** True when the element or anything under it carries an attribute binding. */
function containsBinding(node: IRNode): boolean {
  if (node.kind !== 'element') return false;
  const plan = propPlan(node);
  if (plan && plan.bindings.length > 0) return true;
  return node.children.some(containsBinding);
}

function interesting(node: IRNode): boolean {
  return containsHole(node) || containsBinding(node);
}

/**
 * Whether the shape can be addressed at all.
 *
 * Adjacent text children are rejected: the DOM merges them into one node while the IR
 * keeps two, so the walk would go one node short. An empty text child is rejected for the
 * same reason: it occupies an IR position that does not exist in the DOM. Holes no
 * longer cause this, because their markers keep neighbouring text apart.
 */
function addressable(el: IRElement): boolean {
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i]!;
    if (child.kind === 'text') {
      if (child.value === '') return false;
      if (el.children[i + 1]?.kind === 'text') return false;
    }
  }
  return el.children.every((c) => c.kind !== 'element' || addressable(c));
}

/**
 * Plan a partial template for `root`, or null when it does not qualify.
 *
 * Returns null for a subtree with no holes and no bindings: that is the fully-static
 * case, which has a cheaper path of its own and must not be routed through this one.
 */
export function planPartialTemplate(root: IRElement): PartialTemplate | null {
  if (!isTemplateElement(root)) return null;
  if (!addressable(root)) return null;
  if (!interesting(root)) return null;

  const steps: WalkStep[] = [];
  const holes: TemplateHole[] = [];
  const bindings: TemplateBinding[] = [];
  let refCount = 0;

  const declare = (expr: string): string => {
    const ref = `_n$${refCount++}`;
    steps.push({ ref, expr });
    return ref;
  };

  walk(root, '_el$');
  return { html: serializeWithMarkers(root), tag: root.tag, steps, holes, bindings };

  function walk(el: IRElement, elementRef: string): void {
    const plan = propPlan(el);
    if (plan) {
      for (const binding of plan.bindings) {
        bindings.push({ ref: elementRef, prop: binding.prop, kind: binding.kind });
      }
    }
    // Nothing after the last interesting child needs a reference, so stop there rather
    // than declaring a variable per node.
    let last = -1;
    el.children.forEach((child, i) => {
      if (interesting(child)) last = i;
    });

    let previous: string | null = null;
    for (let i = 0; i <= last; i++) {
      const child = el.children[i]!;
      const expr = previous ? `${previous}.nextSibling` : `${elementRef}.firstChild`;

      if (isHole(child)) {
        const startRef = declare(expr);
        // Resolved at runtime: on a fresh clone the end marker is the next node, while
        // the server's DOM has the rendered content in between.
        const endRef = declare(`holeEnd(${startRef})`);
        holes.push({ parentRef: elementRef, startRef, endRef, node: child });
        previous = endRef;
        continue;
      }

      const ref = declare(expr);
      if (child.kind === 'element' && interesting(child)) walk(child, ref);
      previous = ref;
    }
  }
}

/** The subtree as HTML, with a marker pair standing in for each hole. */
function serializeWithMarkers(el: IRElement): string {
  return serializeStatic(templateTree(el)).split(SENTINEL).join(HOLE_START + HOLE_END);
}

/** The element as the template holds it: serialized props only, holes as sentinels. */
function templateTree(el: IRElement): IRElement {
  const plan = propPlan(el);
  return {
    ...el,
    props: plan ? plan.serialize : [],
    children: el.children.map((child) =>
      isHole(child)
        ? ({ kind: 'text', value: SENTINEL } as IRNode)
        : child.kind === 'element'
          ? templateTree(child)
          : child,
    ),
  };
}

/** A value no real template text contains, swapped for the markers after serializing. */
const SENTINEL = '\u0000fx-hole\u0000';
