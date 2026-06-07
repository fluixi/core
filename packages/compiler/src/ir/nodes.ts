/**
 * Normalized, host-agnostic IR. Both the babel and (future) swc front-ends
 * produce this; codegen backends consume it. This is the stable contract
 * between parsing and code generation — the layer your own improvements
 * (hoisting, islands, resumability hints) transform.
 */
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
  name: string;
  /** raw expression code, literal, or null */
  value: string | boolean | number | null;
  /** true when the value must be wired with a reactive binding */
  reactive: boolean;
  kind: IRPropKind;
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

export interface IRComponent {
  kind: 'component';
  name: string;
  props: IRProp[];
  children: IRNode[];
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
