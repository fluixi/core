/**
 * Static analysis: mark the element subtrees that never change after creation.
 *
 * A static subtree can be built once as an HTML string and cloned per instance, instead
 * of constructed an element at a time. That is the difference between one `cloneNode`
 * and N `createElement` + N `spread` calls: measured at 2.1x faster for a three-element
 * row and 2.4x for a nine-element card, with the gap widening as components grow.
 *
 * `IRElement.static` has existed since the IR was written, documented as
 * "subtree has no dynamic parts → hoistable (template-clone)", but was hardcoded `false`
 * with no producer. This is the producer.
 *
 * The analysis is deliberately conservative: marking something static that is not is a
 * correctness bug (a shared DOM node across renders), while missing one is only a lost
 * optimisation. Anything not positively known to be inert makes its whole ancestry
 * dynamic.
 */
import type { IRNode, IRElement, IRProp } from '../ir/nodes.js';

/** Why a subtree could not be treated as static. Useful for diagnostics and tests. */
export type DynamicReason =
  | 'reactive-prop'
  | 'expression-prop'
  | 'event'
  | 'ref'
  | 'spread'
  | 'class-or-style-directive'
  | 'expression-child'
  | 'component-child'
  | 'control-child';

export interface StaticReport {
  /** Elements marked static, in visit order. */
  staticElements: IRElement[];
  /** Why each non-static element was rejected, keyed by the element node. */
  reasons: Map<IRElement, DynamicReason>;
}

/**
 * A prop is inert only when it is a plain attribute or property with a literal value.
 *
 * `expr` means arbitrary JS, which may read a signal or allocate, so it is dynamic even
 * when `reactive` is false: a non-reactive expression still has to run per instance.
 */
function propReason(prop: IRProp): DynamicReason | undefined {
  switch (prop.kind) {
    case 'event':
      return 'event';
    case 'ref':
      return 'ref';
    case 'spread':
      return 'spread';
    case 'class':
    case 'style':
      // classList/style objects are built from expressions even when they look literal.
      return 'class-or-style-directive';
    case 'attr':
    case 'prop':
      if (prop.reactive) return 'reactive-prop';
      if (prop.expr !== undefined) return 'expression-prop';
      return undefined;
    /* c8 ignore next 2 */
    default:
      return 'expression-prop';
  }
}

/**
 * Mark every static element in the tree, returning what was decided.
 *
 * Mutates `IRElement.static` in place, since that field is the contract codegen reads.
 */
export function analyzeStatic(root: IRNode | IRNode[]): StaticReport {
  const staticElements: IRElement[] = [];
  const reasons = new Map<IRElement, DynamicReason>();

  /** Returns whether `node` is static, marking elements bottom-up. */
  const visit = (node: IRNode): boolean => {
    switch (node.kind) {
      case 'text':
        return true;

      case 'expr':
        // A hole is dynamic even when it is not reactive: its value is computed.
        return false;

      case 'component':
      case 'control':
        // Both produce their own subtree at runtime, so an ancestor cannot be cloned
        // wholesale. Still walk in, so nested elements are marked for their own sake.
        for (const child of node.children) visit(child);
        return false;

      case 'fragment':
        // A fragment is not an element and cannot itself be cloned, but its children
        // can be considered independently.
        for (const child of node.children) visit(child);
        return false;

      case 'element': {
        // Children are visited first and unconditionally, so a static subtree nested
        // under a dynamic parent is still marked and can be cloned on its own.
        let childrenStatic = true;
        for (const child of node.children) {
          if (!visit(child)) childrenStatic = false;
        }

        let reason: DynamicReason | undefined;
        for (const prop of node.props) {
          reason = propReason(prop);
          if (reason) break;
        }

        if (!reason && !childrenStatic) {
          reason = childReason(node);
        }

        node.static = !reason;
        if (reason) reasons.set(node, reason);
        else staticElements.push(node);
        return node.static;
      }

      /* c8 ignore next 2 */
      default:
        return false;
    }
  };

  for (const node of Array.isArray(root) ? root : [root]) visit(node);
  return { staticElements, reasons };
}

/** The most specific reason a child made its parent dynamic. */
function childReason(node: IRElement): DynamicReason {
  for (const child of node.children) {
    if (child.kind === 'expr') return 'expression-child';
    if (child.kind === 'component') return 'component-child';
    if (child.kind === 'control') return 'control-child';
    if (child.kind === 'element' && !child.static) return 'expression-child';
    if (child.kind === 'fragment') return 'expression-child';
  }
  /* c8 ignore next */
  return 'expression-child';
}

/**
 * The outermost static elements: the roots worth turning into templates.
 *
 * Cloning a static child of a static parent is wasted: the parent's template already
 * contains it.
 */
export function staticRoots(root: IRNode | IRNode[]): IRElement[] {
  const roots: IRElement[] = [];

  const visit = (node: IRNode): void => {
    if (node.kind === 'element' && node.static) {
      roots.push(node);
      return; // its subtree is inside this template
    }
    const children = (node as { children?: IRNode[] }).children;
    if (children) for (const child of children) visit(child);
  };

  for (const node of Array.isArray(root) ? root : [root]) visit(node);
  return roots;
}
