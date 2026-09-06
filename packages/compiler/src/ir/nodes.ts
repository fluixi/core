/**
 * Normalized, host-agnostic IR. Both the babel and (future) swc front-ends
 * produce this; codegen backends consume it. This is the stable contract
 * between parsing and code generation — the layer your own improvements
 * (hoisting, islands, resumability hints) transform.
 */
import type { IRLoadStrategy } from '../resolve/load-directive.js';

export type { IRLoadStrategy };

export interface SourceSpan { start: number; end: number; }

export type IRNode =
  | IRElement
  | IRComponent
  | IRText
  | IRExpression
  | IRControl
  | IRFragment;

export type IRPropKind =
  | 'attr' | 'prop' | 'event' | 'ref' | 'class' | 'style' | 'spread';

export interface IRProp {
  /** prop/attribute name (already normalized, e.g. class -> className). Empty for spreads. */
  name: string;
  kind: IRPropKind;
  /**
   * A static literal value. Mutually exclusive with `expr`. Used for things like
   * `id="x"` (string), `tabindex={3}` (number) or a valueless attr (boolean true).
   */
  literal?: string | number | boolean | null;
  /** Raw JS expression code. Mutually exclusive with `literal`. */
  expr?: string;
  /** When true, `expr` must be wired reactively (emitted as a `() => expr` thunk). */
  reactive?: boolean;
  /**
   * `expr` is an inline JSX element/fragment passed as a component prop (e.g.
   * `<Suspense fallback={<div/>}>`). Emitted as a LAZY getter — like children — so the DOM is
   * built only when the component reads the prop, not eagerly when the props object is
   * constructed (which during hydration would walk the cursor and duplicate the tree).
   */
  jsxElement?: boolean;
  /** For kind 'event': the DOM event name + whether it is delegated. */
  event?: { name: string; delegated: boolean };
}

export interface IRElement {
  kind: 'element';
  tag: string;
  svg: boolean;
  props: IRProp[];
  children: IRNode[];
  /** analyze/statics: subtree has no dynamic parts → hoistable (template-clone) */
  static: boolean;
  loc?: SourceSpan;
}

/**
 * Where a component reference comes from, attached to the reference itself.
 *
 * A capitalised tag with no binding in the file is supplied by the compiler — from a
 * `resolve` rule, or from the built-in control-flow/router sets. That decision used to
 * live only in the Babel plugin's state, which meant the IR could not see which
 * components a template referenced: no pass could vary a decision per usage, group
 * references into chunks, or drop a subtree it knows is server-only. Recording it on
 * the node is what turns resolution from a convenience into something later passes can
 * read.
 *
 * `origin` distinguishes the two suppliers because they behave differently: a `rule`
 * is configuration and may be overridden or re-targeted, while a `builtin` control-flow
 * name also selects codegen and cannot be re-pointed at another module.
 */
export interface IRComponentSource {
  module: string;
  /** The export to import, or `default`. */
  export: string;
  origin: 'rule' | 'builtin';
  /**
   * When the module is fetched. Set from a `load:` directive at the usage site, and
   * `eager` otherwise — resolution decides where a component comes from, this decides
   * when, and the two vary independently.
   */
  loading: IRLoadStrategy;
  /** Assigned by the optimizer once references are grouped. */
  chunk?: string;
}

export interface IRComponent {
  kind: 'component';
  name: string;
  props: IRProp[];
  children: IRNode[];
  /**
   * Set by the resolve pass when the compiler supplies this reference. Absent when the
   * name is bound in the file — an ordinary import the author wrote — or when nothing
   * claims it, which is a diagnostic rather than a resolution.
   */
  source?: IRComponentSource;
  /**
   * Where the tag was written, when the transform was asked for source locations. Distinct
   * from `source`, which says where the component reference was resolved from.
   */
  at?: { file: string; line: number; column: number };
  /**
   * A `load:` strategy read off the tag by the frontend. The resolve pass folds it into
   * `source.loading`; it lives here first because the frontend knows the directive and
   * the resolve pass knows whether the name is deferrable at all.
   */
  load?: IRLoadStrategy;
  loc?: SourceSpan;
}

export interface IRText { kind: 'text'; value: string; loc?: SourceSpan; }

export interface IRExpression {
  kind: 'expr';
  code: string;
  reactive: boolean;
  loc?: SourceSpan;
}

export interface IRFragment { kind: 'fragment'; children: IRNode[]; loc?: SourceSpan; }

export type ControlKind =
  | 'show' | 'for' | 'index' | 'switch' | 'match'
  | 'dynamic' | 'errorBoundary' | 'suspense';

export interface IRControl {
  kind: 'control';
  control: ControlKind;
  props: IRProp[];
  children: IRNode[];
  loc?: SourceSpan;
}
