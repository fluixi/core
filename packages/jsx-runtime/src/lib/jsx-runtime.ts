/**
 * @fileoverview Comprehensive JSX Runtime with Lit-HTML and Native JSX Support
 * @module @awc/jsx-runtime
 *
 * This runtime provides:
 * - Fine-grained reactive JSX similar to SolidJS
 * - Support for both lit-html templates and native JSX
 * - Seamless integration with signal and store systems
 * - Optimized DOM updates
 */

import { svg, TemplateResult, nothing, SVGTemplateResult } from 'lit';

import {
  insert,
  spread as domSpread,
  setAttribute,
  setClassName,
  setStyle,
  handleRef,
  isAccessor,
  isStoreProxy,
  createRenderEffect,
  delegateEvents,
  isSVGElement,
  spread,
  html,
  asComponent,
  checkRenderType,
  asProvider
} from '@awc/dom';

import { createMemo, createSignal, isMemo, isSignal, untrack } from '@awc/reactive';

// ============================================================================
// Types
// ============================================================================

export type JSXElement =
  | TemplateResult
  | SVGTemplateResult
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | JSXElement[];

export type JSXComponent<P = any> = (props: P) => JSXElement;

export interface JSXProps {
  children?: JSXElement;
  ref?: any;
  [key: string]: any;
}

export type RefCallback<T> = (instance: T) => void;
export type RefObject<T> = { current: T | null };

// ============================================================================
// Constants
// ============================================================================

export const Fragment = Symbol.for('kettle.fragment');

const isSSR = typeof window === 'undefined';

// ============================================================================
// Helper Functions
// ============================================================================

function isTemplateResult(
  value: any
): value is TemplateResult | SVGTemplateResult {
  return (
    value &&
    (value['_$litType$'] !== undefined ||
      value['_$litDirective$'] !== undefined)
  );
}

function normalizeChildren(children: any): any {
  if (children === undefined || children === null || children === false) {
    return null;
  }

  if (Array.isArray(children)) {
    // return children.map(normalizeChildren).flat();
    const flattened = children.map(normalizeChildren).flat();

    // If any child is a function, wrap the array in a computation
    if (flattened.some((c) => typeof c === 'function')) {
      return () =>
        flattened.map((child) => {
          if (typeof child === 'function') {
            // let res = child();
            // while (typeof res === 'function') {
            //   res = res();
            // }
            return child();
          }
          return child;
        });
    }

    return flattened;
  }

  return children;
}

function createComponent(Comp: any, props: any): any {
  // Use the registered createComponent from @awc/kettlejs (lifecycle-aware)
  // if available, otherwise fall back to simple untracked execution
  const registered = (globalThis as any).__createComponent;
  if (registered) {
    // console.log('untracking', registered)
    return  registered(Comp, props);
  }
  return untrack(() => {
    return Comp(props)
  });
}

const $ROUTES = Symbol.for('kettle-routes');
const $ROUTER = Symbol.for('kettle-router');
const $OUTLET = Symbol.for('kettle-outlet');

// ============================================================================
// JSX Factory
// ============================================================================
/**
 * Main JSX factory function
 */
export function jsx(type: any, props: any, key?: string): JSXElement {
  // Handle null/undefined type
  if (type == null) {
    return null;
  }
  // console.log('jsx type', type);

  // Normalize props
  const p = props || {};
  if (key !== undefined) {
    p.key = key;
  }

  // Handle Fragment
  if (type === Fragment) {
    // console.log('Normalize', normalized())
    return asComponent(normalizeChildren(p.children));
  }
  // Handle component functions
  if (typeof type === 'function') {
    const {type: renderType} = checkRenderType(type)

    // Check for Context Provider
    if ((type as any).$$typeof === Symbol.for('react.provider') || renderType === 'provider') {
      console.log('rendering provider', type)
      // return asProvider(()=>type(p));
      return type(p);
    }
    if (isSSR) {
      return { type, props: p } as any;
    }

    const thunk = asComponent(()=> createComponent(type, p));
      (thunk as any).jsx = true
    // Mark the outer wrapper as a component too, so insert() can distinguish
    // component thunks from reactive accessors like () => store.text
    return asComponent(() => thunk) as any as JSXElement;
  }
  // Handle string tags (native elements)
  if (typeof type === 'string') {
    return createNativeElement(type, p);
  }

  return null;
}

/**
 * JSX factory for multiple children
 */
export const jsxs = jsx;

// ============================================================================
// Element Creation
// ============================================================================

function createNativeElement(tag: string, props: any): any {
  if (isSSR) {
    return { type: tag, props: props || {} };
  }

  const isSVG = isSVGElement(tag);
  const element = isSVG
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);

  applyProps(element, props, isSVG);

  return element;
}

function applyProps(element: Element, props: any, isSVG: boolean): void {
  for (const key in props) {
    if (key === 'children') continue;

    const value = props[key];
    // if (element instanceof HTMLInputElement) {
    //   console.log('apply props', key, value);
    // }

    // Ref handling
    if (key === 'ref') {
      handleRef(element, value);
      continue;
    }

    // Event handlers
    // if (key.startsWith('on')) {
    //   const eventName = key.slice(2).toLowerCase();
    //   // Using direct addEventListener instead of delegation for now to ensure compatibility
    //   // or check if delegateEvents is set up globally
    //   element.addEventListener(eventName, value);
    //   continue;
    // }
    if (key.startsWith('on')) {
      createRenderEffect(() => {
        console.log('render effect on', props)
        const value = props[key];
        const eventName = key.slice(2).toLowerCase();
        if (typeof value === 'function') {
          element.addEventListener(eventName, value);
        }
        // console.log('on on', element, value, eventName);
      });
      continue;
    }
    // Styles
    if (key === 'style') {
      setStyle(element as HTMLElement, value);
      continue;
    }

    // Classes
    if (key === 'class' || key === 'className' || key === 'classList') {
      setClassName(element, value);
      continue;
    }

    // Spread props
    if (key === 'spread') {
      domSpread({ element, props: value, isSVG, skipChildren: true });
      continue;
    }

    // Attributes/Properties
    // Use insert logic for reactive values if function
    if (typeof value === 'function' && !isAccessor(value)) {
      // Wrap in effect to track dependencies
      createRenderEffect(() => {
        try {
          setAttribute(element, key, value());
        } catch (e) {
          // If value() fails or is not a function, fallback
          setAttribute(element, key, value);
        }
      });
    } else {
      if (typeof value !== 'function') {
        setAttribute(element, key, value);
      }
    }
  }

  // Handle children
  if (props.children !== undefined) {
    const children = normalizeChildren(props.children);
    insert(element, children);
  }
}
function needsReactive(value: any): boolean {
  const isAcc = isAccessor(value);
  const isProxy = isStoreProxy(value);
  const isFunc = typeof value === 'function' && value.length === 0;

  return isAcc || isProxy || isFunc;
}

function resolve<T>(value: T | (() => T)): any {
  // Handle signal accessors
  if (typeof value === 'function' && (value as any).length === 0) {
    return (value as () => T)();
  }
  // Store proxies are accessed directly - the tracking happens in the proxy get trap
  return value;
}

// function applyProps(
//   element: Element,
//   props: Record<string, any>,
//   isSVG = false
// ): void {
//   for (const key in props) {
//     // Check if this is a reactive getter property (from mergeProps)
//     const descriptor = Object.getOwnPropertyDescriptor(props, key);
//     const isReactiveGetter = descriptor && typeof descriptor.get === 'function';

//     if (key === 'children') {
//       console.log('children props', isReactiveGetter);
//     }
//     // For reactive getters, wrap property access in an effect
//     if (isReactiveGetter) {
//       // Handle special cases with reactive getters
//       if (key === 'ref') {
//         createRenderEffect(() => {
//           const value = props[key];
//           if (typeof value === 'function') {
//             value(element as Element);
//           } else if (value && typeof value === 'object' && 'current' in value) {
//             (value as any).current = element as Element;
//           }
//         });
//         continue;
//       }

//       if (key === 'children') {
//         continue;
//       }

//       if (key === 'class' || key === 'className') {
//         createRenderEffect(() => {
//           setClassName(element, props[key]);
//         });
//         continue;
//       }

//       if (key === 'style') {
//         createRenderEffect(() => {
//           setStyle(element as any, props[key]);
//         });
//         continue;
//       }

//       if (key.startsWith('on')) {
//         createRenderEffect(() => {
//           const value = props[key];
//           const eventName = key.slice(2).toLowerCase();
//           if (typeof value === 'function') {
//             element.addEventListener(eventName, value);
//           }
//         });
//         continue;
//       }

//       if (key === 'innerHTML' || key === 'innerText' || key === 'textContent') {
//         createRenderEffect(() => {
//           (element as any)[key] = props[key];
//         });
//         continue;
//       }

//       // Regular properties/attributes with reactive getter
//       const shouldBeProperty =
//         JSX_PROPERTIES.has(key) || (!isSVG && key in element);
//       if (shouldBeProperty) {
//         createRenderEffect(() => {
//           setProperty(element, key, props[key]);
//         });
//       } else {
//         createRenderEffect(() => {
//           setAttribute(element, key, props[key], isSVG);
//         });
//       }
//       continue;
//     }

//     // Non-reactive property handling (original code)
//     const value = props[key];

//     // Skip null/undefined
//     if (value == null) continue;

//     // Handle special cases
//     if (key === 'ref') {
//       if (typeof value === 'function') {
//         value(element as Element);
//       } else if (value && typeof value === 'object' && 'current' in value) {
//         (value as any).current = element as Element;
//       }
//       continue;
//     }

//     if (key === 'children') {
//       continue;
//     }

//     // Handle className/class
//     if (key === 'class' || key === 'className') {
//       if (needsReactive(value)) {
//         createRenderEffect(() => {
//           setClassName(element, resolve(value));
//         });
//       } else {
//         setClassName(element, value);
//       }
//       continue;
//     }

//     // Handle style
//     if (key === 'style') {
//       if (needsReactive(value)) {
//         createRenderEffect(() => {
//           setStyle(element as any, resolve(value));
//         });
//       } else {
//         setStyle(element as any, value);
//       }
//       continue;
//     }

//     // Handle events
//     if (key.startsWith('on')) {
//       const eventName = key.slice(2).toLowerCase();
//       if (typeof value === 'function') {
//         element.addEventListener(eventName, value);
//       }
//       continue;
//     }

//     // Handle innerHTML
//     if (key === 'innerHTML' || key === 'innerText' || key === 'textContent') {
//       if (needsReactive(value)) {
//         createRenderEffect(() => {
//           (element as any)[key] = resolve(value);
//         });
//       } else {
//         (element as any)[key] = value;
//       }
//       continue;
//     }

//     // Handle properties vs attributes
//     const shouldBeProperty =
//       JSX_PROPERTIES.has(key) || (!isSVG && key in element);

//     if (shouldBeProperty) {
//       if (needsReactive(value)) {
//         createRenderEffect(() => {
//           setProperty(element, key, resolve(value));
//         });
//       } else {
//         setProperty(element, key, value);
//       }
//     } else {
//       if (needsReactive(value)) {
//         createRenderEffect(() => {
//           setAttribute(element, key, resolve(value), isSVG);
//         });
//       } else {
//         setAttribute(element, key, value, isSVG);
//       }
//     }
//   }
// }
// ============================================================================
// Additional Exports
// ============================================================================

export function createElement(
  type: any,
  props: any,
  ...children: any[]
): JSXElement {
  const p = { ...props };
  if (children.length > 0) {
    p.children = children.length === 1 ? children[0] : children;
  }
  return jsx(type, p);
}

export function isValidElement(object: any): boolean {
  return typeof object === 'object' && object !== null && 'type' in object;
}

export function cloneElement(
  element: any,
  props: any,
  ...children: any[]
): any {
  // Simplified clone
  return jsx(element.type, {
    ...element.props,
    ...props,
    children: children.length ? children : element.props.children,
  });
}

export function createRef<T>(initialValue?: T) {
  return { current: initialValue || null };
}

export function forwardRef(fn: Function) {
  return (props: any) => fn(props, props.ref);
}

// Server-side rendering helpers (stubs for client runtime)
export async function renderToString(element: JSXElement): Promise<string> {
  // Use @lit-labs/ssr or implementation from server module
  throw new Error('renderToString should be imported from server module');
}

export function createPortal(children: JSXElement, container: Element) {
  // Use @awc/dom createPortal
  return insert(container, children as any);
}

export { html, svg, nothing };

/**
 * Merge props while preserving store proxy reactivity
 * This function properly handles store proxies by NOT using Object.assign
 * which would break reactivity by creating snapshots
 */
export function mergeProps(
  ...sources: Array<Record<string, any>>
): Record<string, any> {
  const merged: Record<string, any> = {};
  const trackedKeys = new Set<string>();

  for (const source of sources) {
    if (!source) continue;

    // Check if source is a store proxy
    const isProxy = isStoreProxy(source);

    if (isProxy) {
      // For store proxies, we need to create reactive getters
      // that access the proxy properties on-demand
      const keys = Object.keys(source);

      for (const key of keys) {
        // Skip numeric keys for array stores
        if (!isNaN(Number(key))) continue;

        if (!trackedKeys.has(key)) {
          trackedKeys.add(key);

          // Create a getter that accesses the store proxy reactively
          Object.defineProperty(merged, key, {
            enumerable: true,
            configurable: true,
            get() {
              // Access through the proxy to maintain reactivity
              return source[key];
            },
          });
        }
      }
    } else {
      // For plain objects, just copy properties
      for (const key in source) {
        if (!trackedKeys.has(key)) {
          trackedKeys.add(key);
          merged[key] = source[key];
        }
      }
    }
  }

  return merged;
}

export function splitProps<T extends Record<string, any>, K extends keyof T>(
  props: T,
  ...keys: K[][]
): [...{ [P in K]: T[P] }[], Omit<T, K>] {
  const result: any[] = [];
  const usedKeys = new Set<keyof T>();

  // Create groups
  for (const group of keys) {
    const obj: any = {};
    for (const key of group) {
      if (key in props) {
        obj[key] = props[key];
        usedKeys.add(key);
      }
    }
    result.push(obj);
  }

  // Create remaining props object
  const remaining: any = {};
  for (const key in props) {
    if (!usedKeys.has(key)) {
      remaining[key] = props[key];
    }
  }
  result.push(remaining);

  return result as any;
}
export { delegateEvents, handleRef, isSVGElement, spread };
