/**
 * Which expressions get wired reactively: `count()` re-runs on change, `count`
 * does not, `props.children` is a subtree reference rather than a value.
 *
 * `ExprShape` is four cases and must not grow into a JavaScript AST, a front-end
 * reports what the rule branches on, everything else collapses to `compound` or
 * `opaque`. One rule, one place, whatever the parser.
 */

export type ExprShape =
  /** A call: `count()`, `t('key')`, `mergeRefs(a, b)`. Always reactive. */
  | { kind: 'call' }
  /**
   * A property access. `property` is the static name, or `null` when the access is
   * computed or otherwise not a plain identifier (`obj[key]`, `obj[fn()]`).
   */
  | { kind: 'member'; property: string | null }
  /**
   * Anything built out of sub-expressions: conditionals, logical and binary
   * operators, template literals, object and array literals. Reactive when any
   * part is, so `class={{ active: active() }}` reacts and `class={{ a: true }}`
   * does not. The front-end decides which children count: a spread element or a
   * computed key contributes nothing, because the compiler cannot see through it.
   */
  | { kind: 'compound'; parts: ExprShape[] }
  /** Identifiers, literals, functions, JSX: passed through untouched. */
  | { kind: 'opaque' };

/**
 * `props.children`: and any `.children` access: is a stable subtree reference,
 * not a reactive value. Compiling it to a `() => props.children` thunk adds an
 * insert layer that fully unwraps the children's Suspense/memo into a static node,
 * severing the reactive binding: a nested lazy/Suspense that resolves later never
 * propagates up through the component-children hop. Passing it through
 * non-reactively (`insert(el, props.children)`) keeps the child's memo intact so
 * `insert` binds to it, which is what a direct `<Outlet/>` does.
 */
const STABLE_MEMBER = 'children';

/** Whether an expression of this shape must be wired reactively. */
export function isReactiveShape(shape: ExprShape): boolean {
  switch (shape.kind) {
    case 'call':
      return true;
    case 'member':
      return shape.property !== STABLE_MEMBER;
    case 'compound':
      return shape.parts.some(isReactiveShape);
    case 'opaque':
      return false;
  }
}
