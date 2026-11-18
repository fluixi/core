/**
 * Component props type - any object
 */
export interface ComponentProps {
  children?: ComponentChild | ComponentChild[];
  [key: string]: any;
}

/**
 * Anything renderable: a node, a primitive, a list, or a function returning one
 * (a reactive child).
 *
 * This union must not contain `any`, a union with `any` in it *is* `any`, which
 * silently erased the type of every component return, every `children`, and every
 * render prop's parameter in the framework.
 */
export type ComponentChild =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | ComponentChild[]
  | (() => ComponentChild);

/**
 * Build-time guard: fails to compile if `ComponentChild` ever becomes `any` again.
 *
 * `any` in this union is invisible, nothing errors, types just stop being checked
 * everywhere at once, so it needs an assertion rather than a test.
 */
type IsAny<T> = 0 extends 1 & T ? true : false;
type Assert<T extends false> = T;
export type ComponentChildIsNotAny = Assert<IsAny<ComponentChild>>;

/**
 * A component is a function of its props: annotate it to type `props`:
 *
 *   const MyComp: Component<{ name: string }> = (props) => <h1>{props.name}</h1>;
 *
 * `props` is typed as `P` (required), the return is anything renderable. A zero-arg `() => ...`
 * component is still assignable (fewer params is fine). `FxComponent`/`FxC` are short brand
 * aliases. For the loose "function or a built node" shape some internals pass around, use
 * `ComponentOrElement`.
 */
export type ComponentFn<P = ComponentProps> = (props: P) => ComponentChild;
export type Component<P = ComponentProps> = ComponentFn<P>;

/** Fluixi-branded aliases of {@link Component}. `FxC` is the short form. */
export type FxComponent<P = ComponentProps> = Component<P>;
export type FxC<P = ComponentProps> = Component<P>;

/** A component function or an already-rendered child (the loose, internal "renderable" shape). */
export type ComponentOrElement<P = ComponentProps> = ComponentFn<P> | ComponentChild;

/** Props plus optional `children`. */
export type FxParentProps<P = {}> = P & { children?: ComponentChild };
/** A component that renders `children` (layout/provider). */
export type FxParent<P = {}> = Component<FxParentProps<P>>;

/** Props that explicitly take NO `children`. */
export type FxVoidProps<P = {}> = P & { children?: never };
/** A component that renders no `children`. */
export type FxVoid<P = {}> = Component<FxVoidProps<P>>;

/** Props with a REQUIRED `children` of type `C` (control-flow style). */
export type FxFlowProps<P = {}, C = ComponentChild> = P & { children: C };
/** A component whose `children` is required (`<For>`/`<Show>`-style). */
export type FxFlow<P = {}, C = ComponentChild> = Component<FxFlowProps<P, C>>;
