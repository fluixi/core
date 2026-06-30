/**
 * Component props type - any object
 */
export interface ComponentProps {
  children?: ComponentChild | ComponentChild[];
  [key: string]: any;
}

/**
 * Component child types
 */
export type ComponentChild =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | ComponentChild[]
  | (() => ComponentChild)
  | import('lit').TemplateResult
  | (() => any)
  | any;

/**
 * A component is a function of its props — annotate it to type `props`:
 *
 *   const MyComp: Component<{ name: string }> = (props) => <h1>{props.name}</h1>;
 *
 * `props` is typed as `P` (required), the return is anything renderable. A zero-arg `() => …`
 * component is still assignable (fewer params is fine). `FxComponent`/`FxC` are short brand
 * aliases. For the loose "function OR a built node" shape some internals pass around, use
 * `ComponentOrElement`.
 */
export type ComponentFn<P = ComponentProps> = (props: P) => ComponentChild;
export type Component<P = ComponentProps> = ComponentFn<P>;

/** Fluixi-branded aliases of {@link Component}. `FxC` is the short form. */
export type FxComponent<P = ComponentProps> = Component<P>;
export type FxC<P = ComponentProps> = Component<P>;

/** A component function OR an already-rendered child (the loose, internal "renderable" shape). */
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
