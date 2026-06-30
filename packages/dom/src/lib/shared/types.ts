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
 * A component is a function of its props. Mirrors Solid's `Component<P>` so you can annotate:
 *
 *   const MyComp: Component<{ name: string }> = (props) => <h1>{props.name}</h1>;
 *
 * `props` is typed as `P` (required), the return is anything renderable. A zero-arg `() => …`
 * component is still assignable (fewer params is fine). For the loose "function OR a built node"
 * shape some internals pass around, use `ComponentOrElement`.
 */
export type ComponentFn<P = ComponentProps> = (props: P) => ComponentChild;
export type Component<P = ComponentProps> = ComponentFn<P>;

/** A component function OR an already-rendered child (the loose, internal "renderable" shape). */
export type ComponentOrElement<P = ComponentProps> = ComponentFn<P> | ComponentChild;

/** Props plus optional `children` — for a component that renders its children. */
export type ParentProps<P = {}> = P & { children?: ComponentChild };
/** A component that takes `children` (e.g. a layout/provider). */
export type ParentComponent<P = {}> = Component<ParentProps<P>>;

/** Props that explicitly take NO children. */
export type VoidProps<P = {}> = P & { children?: never };
/** A component that renders no children. */
export type VoidComponent<P = {}> = Component<VoidProps<P>>;

/** Props with a REQUIRED `children` of type `C` (e.g. control-flow components). */
export type FlowProps<P = {}, C = ComponentChild> = P & { children: C };
/** A component whose `children` is required (e.g. `<For>`/`<Show>`-style). */
export type FlowComponent<P = {}, C = ComponentChild> = Component<FlowProps<P, C>>;
