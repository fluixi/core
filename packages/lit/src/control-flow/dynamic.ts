// import { Accessor, createEffect } from '@fluixi/reactive';
// import {
//   ChildPart,
//   directive,
//   Directive,
//   PartInfo,
//   PartType,
// } from 'lit/directive.js';

// class DynamicDirective extends Directive {
//   private dispose?: () => void;
//   private part!: ChildPart;

//   constructor(info: PartInfo) {
//     super(info);
//     if (info.type !== PartType.CHILD) {
//       throw new Error('dynamic() can only be used in child expressions');
//     }
//   }

//   render(_component: Accessor<any> | any, _props?: Accessor<any> | any) {
//     const compAccessor =
//       typeof _component === 'function' ? _component : () => _component;

//     const propsAccessor =
//       typeof _props === 'function' ? _props : () => _props ?? {};

//     if (this.dispose) this.dispose();

//     this.dispose = createEffect(() => {
//       const Comp = compAccessor();
//       const props = propsAccessor();

//       const result = typeof Comp === 'function' ? Comp(props) : Comp;

//       this.part?._$setValue(result);
//     });

//     const Comp = compAccessor();
//     return typeof Comp === 'function' ? Comp(propsAccessor()) : Comp;
//   }

//   override update(
//     part: ChildPart,
//     args: [component: Accessor<any> | any, props?: Accessor<any> | any]
//   ) {
//     this.part = part;
//     return this.render(...args);
//   }

//   disconnected() {
//     this.dispose?.();
//     this.dispose = undefined;
//   }
// }

// /**
//  * Usage example
//  * ```ts
//  * ${dynamic(
//  *  () => Comp,
//  *  () => ({ foo: x })
//  * )}
//  * ```
//  */
// export const $dynamic = directive(DynamicDirective);

/**
 * @fileoverview Dynamic component for rendering components dynamically in Fluixi
 * @module @fluixi/core/control-flow/Dynamic
 */

import { html, TemplateResult, nothing } from 'lit';
import { createEffect, createSignal, type Accessor } from '@fluixi/reactive';
import type { ComponentOrElement as Component, ComponentProps, ComponentFn } from '@fluixi/dom';
import { normalizeAccessor, renderContent, childToTemplate } from './utils.js';
import { buildElementTemplate } from '../templates/helpers.js';

/**
 * Props for the Dynamic component
 * @template P - Props type for the dynamic component
 */
export interface $DynamicProps<P extends ComponentProps = ComponentProps> {
  /**
   * Component to render dynamically
   * Can be a component function, string tag name, or accessor returning either
   */
  component:
    | Component<P>
    | string
    | Accessor<Component<P> | string | null | undefined>
    | null
    | undefined;

  /**
   * Props to pass to the dynamic component
   */
  props?: P;

  /**
   * Children to pass to the dynamic component
   */
  children?: Component<ComponentProps>;
}

/**
 * Checks if a value is a valid HTML tag name
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a string tag name
 */
function isTagName(value: any): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Checks if a value is a component function
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a function
 */
function isComponentFunction(value: any): value is ComponentFn {
  return typeof value === 'function';
}

/**
 * Dynamic component for rendering components dynamically
 *
 * Allows you to render different components based on runtime conditions.
 * Useful for polymorphic components, plugin systems, or dynamic layouts.
 *
 * @template P - Props type for the dynamic component
 * @param {$DynamicProps<P>} props - Component props
 * @returns {TemplateResult | typeof nothing} Rendered template
 *
 * @example
 * ```typescript
 * // Render different components based on state
 * const MyComponent = () => {
 *   const [viewMode, setViewMode] = createSignal<'list' | 'grid'>('list');
 *
 *   const ListView = () => html`<div class="list-view">List View</div>`;
 *   const GridView = () => html`<div class="grid-view">Grid View</div>`;
 *
 *   return html`
 *     <div>
 *       <button @click=${() => setViewMode('list')}>List</button>
 *       <button @click=${() => setViewMode('grid')}>Grid</button>
 *
 *       ${Dynamic({
 *         component: () => viewMode() === 'list' ? ListView : GridView
 *       })}
 *     </div>
 *   `;
 * };
 * ```
 *
 * @example
 * ```typescript
 * // With props
 * interface ButtonProps extends ComponentProps {
 *   variant: 'primary' | 'secondary';
 *   label: string;
 * }
 *
 * const PrimaryButton = (props: ButtonProps) => html`
 *   <button class="btn-primary">${props.label}</button>
 * `;
 *
 * const SecondaryButton = (props: ButtonProps) => html`
 *   <button class="btn-secondary">${props.label}</button>
 * `;
 *
 * const MyComponent = () => {
 *   const [variant, setVariant] = createSignal<'primary' | 'secondary'>('primary');
 *
 *   return html`
 *     ${Dynamic({
 *       component: () => variant() === 'primary' ? PrimaryButton : SecondaryButton,
 *       props: { variant: variant(), label: 'Click me' }
 *     })}
 *   `;
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Render native elements dynamically
 * const Heading = (props: { level: number; text: string }) => {
 *   return html`
 *     ${Dynamic({
 *       component: () => `h${props.level}`,
 *       children: props.text
 *     })}
 *   `;
 * };
 *
 * // Usage: Heading({ level: 1, text: 'Title' })
 * // Renders: <h1>Title</h1>
 * ```
 *
 * @example
 * ```typescript
 * // Plugin system
 * interface PluginComponent {
 *   name: string;
 *   component: Component;
 * }
 *
 * const PluginHost = (props: { plugins: PluginComponent[]; activePlugin: string }) => {
 *   const activeComponent = () => {
 *     const plugin = props.plugins.find(p => p.name === props.activePlugin);
 *     return plugin?.component || null;
 *   };
 *
 *   return html`
 *     ${Dynamic({
 *       component: activeComponent
 *     })}
 *   `;
 * };
 * ```
 */
export function $dynamic<P extends ComponentProps = ComponentProps>(
  props: $DynamicProps<P>
): TemplateResult | typeof nothing {
  const [current, setCurrent] = createSignal<Component>(nothing as any);

  createEffect(() => {
    const componentAccessor = normalizeAccessor(props.component);
    const component = componentAccessor();

    if (!component) {
      setCurrent(nothing as any);
      return;
    }

    // Prepare children
    const children =
      props.children !== undefined ? renderContent(props.children) : undefined;

    // Merge props with children
    const componentProps: any = {
      ...(props.props || {}),
    };

    if (children !== undefined) {
      componentProps.children = children;
    }

    // Render based on component type
    if (isTagName(component)) {
      // Native HTML element
      setCurrent(createNativeElement(component, componentProps));
    } else if (isComponentFunction(component)) {
      // Component function
      const result = component(componentProps as P);
      setCurrent(result);
    } else {
      console.warn('Dynamic: Invalid component type', component);
      setCurrent(nothing as any);
    }
  });

  return childToTemplate(current());
}

/**
 * Creates a native HTML element with props
 * @param {string} tagName - HTML tag name
 * @param {any} props - Props to apply to the element
 * @returns {TemplateResult} Lit template
 */
function createNativeElement(tagName: string, props: any): TemplateResult {
  const { children, ...attributes } = props;
  return buildElementTemplate(tagName, attributes, children);

  // // Build attribute directives
  // const attrEntries = Object.entries(attributes);
  // const attrStrings: string[] = [];
  // const attrValues: any[] = [];

  // for (const [key, value] of attrEntries) {
  //   if (key.startsWith('on') && typeof value === 'function') {
  //     // Event handler
  //     const eventName = key.slice(2).toLowerCase();
  //     attrStrings.push(`@${eventName}="`);
  //     attrValues.push(value);
  //     attrStrings.push(`"`);
  //   } else if (key === 'class' || key === 'className') {
  //     // Class handling
  //     attrStrings.push('class="');
  //     attrValues.push(value);
  //     attrStrings.push('"');
  //   } else if (key === 'style' && typeof value === 'object' && value !== null) {
  //     // Style object
  //     const styleStr = Object.entries(value)
  //       .map(([k, v]) => `${k}: ${v}`)
  //       .join('; ');
  //     attrStrings.push('style="');
  //     attrValues.push(styleStr);
  //     attrStrings.push('"');
  //   } else if (value !== undefined && value !== null && value !== false) {
  //     // Regular attribute
  //     attrStrings.push(`${key}="`);
  //     attrValues.push(value);
  //     attrStrings.push(`"`);
  //   }
  // }

  // // Create template
  // const openTag = `<${tagName}${
  //   attrStrings.length > 0 ? ' ' : ''
  // }${attrStrings.join('')}>`;
  // const closeTag = `</${tagName}>`;

  // if (children !== undefined && children !== null && children !== false) {
  //   return html`${openTag}${childToTemplate(children)}${closeTag}` as any;
  // }

  // return html`${openTag}${closeTag}` as any;
}

/**
 * Creates a Dynamic component with fixed props
 *
 * Useful for creating specialized dynamic components with preset configurations.
 *
 * @template P - Props type
 * @param {Partial<P>} fixedProps - Props that are always applied
 * @returns {(props: $DynamicProps<P>) => TemplateResult | typeof nothing} Dynamic component with fixed props
 *
 * @example
 * ```typescript
 * // Create a dynamic button with fixed styling
 * const StyledDynamic = createFixedDynamic({ class: 'styled-component' });
 *
 * const MyComponent = () => {
 *   return html`
 *     ${StyledDynamic({
 *       component: Button,
 *       props: { label: 'Click me' }
 *     })}
 *   `;
 * };
 * ```
 */
export function createFixedDynamic<P extends ComponentProps = ComponentProps>(
  fixedProps: Partial<P>
): (props: $DynamicProps<P>) => TemplateResult | typeof nothing {
  return (props: $DynamicProps<P>) => {
    return $dynamic({
      ...props,
      props: {
        ...fixedProps,
        ...props.props,
      } as P,
    });
  };
}

/**
 * Creates a polymorphic component that can render as different elements
 *
 * @template P - Props type
 * @param {Component<P>} defaultComponent - Default component to render
 * @returns {(props: P & { as?: Component | string }) => TemplateResult | typeof nothing} Polymorphic component
 *
 * @example
 * ```typescript
 * interface TextProps extends ComponentProps {
 *   children: string;
 *   variant?: 'body' | 'heading';
 * }
 *
 * const TextBase = (props: TextProps) => html`
 *   <span class=${props.variant || 'body'}>${props.children}</span>
 * `;
 *
 * const Text = createPolymorphic(TextBase);
 *
 * // Usage:
 * // Renders as default (span)
 * Text({ children: 'Hello' })
 *
 * // Renders as h1
 * Text({ as: 'h1', children: 'Heading' })
 *
 * // Renders as custom component
 * Text({ as: CustomComponent, children: 'Custom' })
 * ```
 */
export function createPolymorphic<P extends ComponentProps>(
  defaultComponent: Component<P> | string
): (
  props: P & { as?: Component<P> | string }
) => TemplateResult | typeof nothing {
  return (props: P & { as?: Component<P> | string }) => {
    const { as, ...restProps } = props;

    return $dynamic({
      component: as || defaultComponent,
      props: restProps as P,
    });
  };
}

/**
 * Props for the DynamicSwitch component
 */
export interface $DynamicSwitchProps<T = string> {
  /**
   * Current value to match against
   */
  value: T | Accessor<T>;

  /**
   * Map of values to components
   */
  cases: Map<T, Component | string> | Record<string, Component | string>;

  /**
   * Default component when no case matches
   */
  default?: Component | string;

  /**
   * Props to pass to the rendered component
   */
  props?: ComponentProps;
}

/**
 * Dynamic component with switch/case logic
 *
 * Renders different components based on a value, similar to a switch statement.
 *
 * @template T - Type of the switch value
 * @param {$DynamicSwitchProps<T>} props - Component props
 * @returns {TemplateResult | typeof nothing} Rendered template
 *
 * @example
 * ```typescript
 * const StatusView = () => {
 *   const [status, setStatus] = createSignal<'loading' | 'success' | 'error'>('loading');
 *
 *   const LoadingComponent = () => html`<div>Loading...</div>`;
 *   const SuccessComponent = () => html`<div>Success!</div>`;
 *   const ErrorComponent = () => html`<div>Error!</div>`;
 *
 *   return html`
 *     ${DynamicSwitch({
 *       value: status,
 *       cases: {
 *         loading: LoadingComponent,
 *         success: SuccessComponent,
 *         error: ErrorComponent
 *       },
 *       default: () => html`<div>Unknown status</div>`
 *     })}
 *   `;
 * };
 * ```
 */
export function $dynamicSwitch<T = string>(
  props: $DynamicSwitchProps<T>
): TemplateResult | typeof nothing {
  const [component, setComponent] = createSignal<Component | string | null>(
    null
  );

  createEffect(() => {
    const valueAccessor = normalizeAccessor(props.value);
    const currentValue = valueAccessor();

    let matchedComponent: Component | string | null = null;

    if (props.cases instanceof Map) {
      matchedComponent = props.cases.get(currentValue) || null;
    } else {
      matchedComponent = props.cases[currentValue as any] || null;
    }

    if (!matchedComponent && props.default) {
      matchedComponent = props.default;
    }

    setComponent(matchedComponent);
  });

  return $dynamic({
    component: component,
    props: props.props,
  });
}
