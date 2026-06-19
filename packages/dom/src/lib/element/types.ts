/**
 * @fileoverview Advanced types for @fluixi/element
 * @module @fluixi/dom/element/types
 */

// ============================================================================
// Prop type inference
// ============================================================================

export type PropTypeConstructor =
  | typeof String
  | typeof Number
  | typeof Boolean
  | typeof Object
  | typeof Array;

export interface PropDefinition<T = unknown> {
  type?: PropTypeConstructor;
  default?: T;
  attribute?: string | false;
}

/** Resolve the TS type from a PropDefinition's `type` constructor */
export type InferPropType<D extends PropDefinition> = D extends PropDefinition<
  infer Def
>
  ? D['type'] extends typeof String
    ? string
    : D['type'] extends typeof Number
    ? number
    : D['type'] extends typeof Boolean
    ? boolean
    : D['type'] extends typeof Array
    ? unknown[]
    : D['type'] extends typeof Object
    ? Record<string, unknown>
    : Def extends undefined
    ? unknown
    : Def
  : unknown;

/** Signal tuple: [accessor, setter] — matches createSignal return */
export type SignalTuple<T> = [
  get: () => T,
  set: (v: T | ((prev: T) => T)) => void
];

/** Map prop defs to signal tuples with correct types */
export type PropsSignals<T extends Record<string, PropDefinition>> = {
  [K in keyof T]: SignalTuple<InferPropType<T[K]>>;
};

/** Render function for defineElement — fully typed props and event context */
export type ElementRenderFn<
  T extends Record<string, PropDefinition>,
  E extends Record<string, EventDefinition> = Record<string, EventDefinition>
> = (props: PropsSignals<T>, ctx: ElementRenderContext<E>) => unknown;

// ============================================================================
// Event type inference
// ============================================================================

export interface EventDefinition<T = unknown> {
  detail?: T;
}

/** Map event defs to typed onXxx handlers */
export type ElementEventHandlers<E extends Record<string, EventDefinition>> = {
  [K in keyof E as K extends string ? `on${Capitalize<K>}` : never]?: (
    event: CustomEvent<E[K] extends EventDefinition<infer D> ? D : unknown>
  ) => void;
};

/** Context object passed as second argument to defineElement render callback */
export interface ElementRenderContext<
  E extends Record<string, EventDefinition>
> {
  emit: <K extends string & keyof E>(
    name: K,
    ...args: E[K] extends EventDefinition<infer D>
      ? D extends undefined
        ? []
        : [detail: D]
      : [detail?: unknown]
  ) => void;
}

// ============================================================================
// Lifecycle callbacks
// ============================================================================

export interface ElementLifecycleCallbacks {
  connectedCallback?: (host: HTMLElement) => void;
  disconnectedCallback?: (host: HTMLElement) => void;
  adoptedCallback?: (host: HTMLElement) => void;
  formAssociatedCallback?: (
    host: HTMLElement,
    form: HTMLFormElement | null
  ) => void;
  formDisabledCallback?: (host: HTMLElement, disabled: boolean) => void;
  formResetCallback?: (host: HTMLElement) => void;
  formStateRestoreCallback?: (
    host: HTMLElement,
    state: unknown,
    mode: 'restore' | 'autocomplete'
  ) => void;
  onAttributeChange?: (
    host: HTMLElement,
    name: string,
    oldVal: string | null,
    newVal: string | null
  ) => void;
}

// ============================================================================
// Options
// ============================================================================

export interface DefineElementOptions<
  P extends Record<string, PropDefinition> = Record<string, PropDefinition>,
  E extends Record<string, EventDefinition> = Record<string, EventDefinition>
> {
  shadow?: 'open' | 'closed' | 'none';
  styles?: string | CSSStyleSheet | (string | CSSStyleSheet)[];
  props?: P;
  events?: E;
  formAssociated?: boolean;
  lifecycle?: ElementLifecycleCallbacks;
}

// ============================================================================
// Element instance & constructor types
// ============================================================================

/** Convert prop defs into the attribute interface for JSX / vanilla / lit */
export type ElementAttributes<P extends Record<string, PropDefinition>> = {
  [K in keyof P]?: InferPropType<P[K]> | (() => InferPropType<P[K]>);
};

/** HTMLElement with typed setProp/getProp */
export interface TypedFluixiElement<P extends Record<string, PropDefinition>>
  extends HTMLElement {
  setProp<K extends string & keyof P>(
    name: K,
    value: InferPropType<P[K]>
  ): void;
  getProp<K extends string & keyof P>(name: K): InferPropType<P[K]>;
}

/** Constructor type returned by defineElement — carries tag name + prop types + event types */
export interface FluixiElementConstructor<
  Tag extends string = string,
  P extends Record<string, PropDefinition> = Record<string, PropDefinition>,
  E extends Record<string, EventDefinition> = Record<string, EventDefinition>
> {
  new (): TypedFluixiElement<P>;
  observedAttributes: string[];
  readonly prototype: TypedFluixiElement<P>;
  readonly __tag: Tag;
  readonly __props: P;
  readonly __events: E;
}

// ============================================================================
// Global registration helper types
// ============================================================================

/**
 * Extract the JSX attributes interface from a FluixiElementConstructor.
 * Use in `declare global { interface HTMLElementTagNameMap }`.
 *
 * @example
 * ```ts
 * const MyCounter = defineElement('my-counter', ..., { props: { name: { type: String } } });
 * declare global {
 *   interface HTMLElementTagNameMap {
 *     'my-counter': FluixiElementInstance<typeof MyCounter>;
 *   }
 * }
 * ```
 */
export type FluixiElementInstance<T> = T extends FluixiElementConstructor<
  any,
  infer P
>
  ? TypedFluixiElement<P>
  : HTMLElement;

/**
 * Extract JSX-compatible attributes from a FluixiElementConstructor.
 * For use in JSX IntrinsicElements augmentation.
 *
 * @example
 * ```ts
 * declare module '@fluixi/jsx/jsx' {
 *   namespace JSX {
 *     interface IntrinsicElements {
 *       'my-counter': FluixiElementJSXAttributes<typeof MyCounter>;
 *     }
 *   }
 * }
 * ```
 */
export type FluixiElementJSXAttributes<T> = T extends FluixiElementConstructor<
  any,
  infer P,
  infer E
>
  ? ElementAttributes<P> & ElementEventHandlers<E> & FluixiHTMLAttributes
  : FluixiHTMLAttributes;

/** Base HTML attributes for custom elements in JSX */
export interface FluixiHTMLAttributes {
  id?: string;
  class?: string;
  className?: string;
  style?: string | Record<string, string | number>;
  slot?: string;
  hidden?: boolean;
  tabIndex?: number;
  title?: string;
  children?: unknown;
  ref?: ((el: HTMLElement) => void) | { current: HTMLElement | null };
  [key: `on${string}`]: ((event: Event) => void) | undefined;
  [key: `data-${string}`]: string | undefined;
}

// ============================================================================
// Type-level camelCase → kebab-case
// ============================================================================

/** Map to build HTML attribute keys from prop defs (uses attribute override or kebab-case) */
export type PropToAttribute<P extends Record<string, PropDefinition>> = {
  [K in keyof P as P[K] extends { attribute: false }
    ? never
    : P[K] extends { attribute: infer A extends string }
    ? A
    : K extends string
    ? CamelToKebab<K>
    : never]?: InferPropType<P[K]>;
};

/** CamelCase → kebab-case at the type level */
export type CamelToKebab<S extends string> = S extends `${infer C}${infer Rest}`
  ? C extends Uppercase<C>
    ? `-${Lowercase<C>}${CamelToKebab<Rest>}`
    : `${C}${CamelToKebab<Rest>}`
  : S;
