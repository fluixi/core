/**
 * @fileoverview JSX Runtime with Reactive DOM Support
 * @module @awc/jsx-runtime
 *
 * Production-grade JSX runtime for the KettleJS reactive system.
 * Key design: event handlers stored as $$eventname properties on DOM nodes
 * (SolidJS delegation pattern) for reliable bubbling and preventDefault support.
 */

import { svg, TemplateResult, nothing, SVGTemplateResult } from 'lit';

import {
  insert,
  setAttribute,
  setClassName,
  setStyle,
  handleRef,
  isAccessor,
  createRenderEffect,
  delegateEvents,
  isSVGElement,
  spread,
  html,
  asComponent,
  checkRenderType,
  makeArrayFlat,
  isRoutes,
  isRouter,
  isSuspense,
  isDelegatedEvent,
  removeDelegatedEventListener,
  addDelegatedEventListener,
  applyProps as domProps
} from '@awc/dom';

import { untrack, createSignal, createMemo,  resolveChildren } from '@awc/dom';

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

// Track which event names we've registered globally (mirrors delegatedSet in runtime)
const globalDelegatedSet = new Set<string>();

// ============================================================================
// Helper: createComponent
// ============================================================================

function createComponent(Comp: any, props: any, options?: any): any {
  const registered = (globalThis as any).__createComponent;
  if (registered) return registered(Comp, props, options);
  return untrack(() => Comp(props));
}

// ============================================================================
// Helper: normalizeChildren
// ============================================================================

function normalizeChildren(children: any): any {
  if (children === undefined || children === null || children === false) return null;

  if (Array.isArray(children)) {
    const flattened = children.map(normalizeChildren).flat();
    // return makeArrayFlat(
    //   flattened.filter(
    //     (f: any) =>
    //       f != null && f !== false && !(typeof f === 'string' && f.trim().length === 0)
    //   )
    // );
    return flattened
    // .filter(
    //   (f: any) =>
    //     f != null && f !== false && !(typeof f === 'string' && f.trim().length === 0)
    // )
  }

  return children;
}

// ============================================================================
// JSX Factory
// ============================================================================

/**
 * Main JSX factory function.
 * - String tags → native DOM element
 * - Function tags → component (wrapped in createMemo for reactivity)
 * - Fragment → children array
 */
export function jsx(type: any, props: any, key?: string): JSXElement {
  // console.log('jsx runtime', type, props)
  if (type == null) return null;

  const p = props || {};
  if (key !== undefined) p.key = key;

  // Handle Fragment
  if (type === Fragment) {
    // return resolveChildren(()=>asComponent(normalizeChildren(p.children))) as any;
    return createMemo(()=>asComponent(normalizeChildren(p.children))) as any;
  }

  // Handle component functions
  if (typeof type === 'function') {
    const { type: renderType } = checkRenderType(type);

    // Context Provider — call directly without memo wrapper
    if (
      (type as any).$$typeof === Symbol.for('react.provider') ||
      renderType === 'provider'
    ) {
      // alert('jsx provider')
      return  type(p);
    }

    if (isSSR) return { type, props: p } as any;

    // Wrap component in createMemo so it's reactive
    // return createComponent(type, p) as any as JSXElement;
    return createMemo(() => createComponent(type, p), undefined, {name: 'jsx component'}) as any as JSXElement;
  }

  // Handle string tags (native elements)
  if (typeof type === 'string' && type.trim().length > 0) {
    return createNativeElement(type, p);
  }

  return null;
}

export const jsxs = jsx;

export function jsxDEV(type: any, props: any, key?: string, _isStaticChildren?: boolean): JSXElement {
  return jsx(type, props, key);
}

// ============================================================================
// Native Element Creation
// ============================================================================

function createNativeElement(tag: string, props: any): any {
  if (isSSR) return { type: tag, props: props || {} };

  const isSVG = isSVGElement(tag);
  const element = isSVG
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);

  // console.log('apply', element.tagName)
  applyProps(element, props, isSVG);

  return element;
}

// ============================================================================
// applyProps — applies JSX props to a DOM element
//
// CRITICAL: Event handlers are stored as $$eventname properties on elements.
// The global delegated listener reads node.$$click directly — no Map lookups.
// This correctly handles e.preventDefault() and stopPropagation().
// ============================================================================

function applyProps(element: Element, props: any, isSVG: boolean): void {
  // console.log('apply props', element, props)
  for (const key in props) {
    if (key === 'children') continue;

    const value = props[key];
    domProps(element, props, isSVG)
    continue;
  
    // // Ref
    // if (key === 'ref') {
    //   handleRef(value, element);
    //   continue;
    // }
  
    // // Event handlers — use $$eventname property for delegation
    // if (key.startsWith('on') && key.length > 2 && key[2] === key[2].toUpperCase()) {
    //   // onXxx pattern — event handler
    //   const eventName = key.slice(2).toLowerCase();
    //   if (typeof value === 'function') {
    //     // Store handler directly on the element
    //     (element as any)[`$$${eventName}`] = value;
    //     // Ensure global listener is registered for this event
    //     if (!globalDelegatedSet.has(eventName)) {
    //       globalDelegatedSet.add(eventName);
    //       delegateEvents([eventName]);
    //     }
    //   }
    //   continue;
    // }
  
    // // Style
    // if (key === 'style') {
    //   if (typeof value === 'function') {
    //     createRenderEffect(() => setStyle(element as HTMLElement, value()));
    //   } else {
    //     setStyle(element as HTMLElement, value);
    //   }
    //   continue;
    // }
  
    // // Class / className / classList
    // if (key === 'class' || key === 'className' || key === 'classList') {
    //   if (typeof value === 'function') {
    //     createRenderEffect(() => setClassName(element, value()));
    //   } else {
    //     setClassName(element, value);
    //   }
    //   continue;
    // }
  
    // // innerHTML
    // if (key === 'innerHTML') {
    //   (element as any).innerHTML = value;
    //   continue;
    // }
  
    // // spread
    // if (key === 'spread') {
    //   spread({ element, props: value, isSVG, skipChildren: true });
    //   continue;
    // }
  
    // // Reactive attribute: function value → render effect
    // if (typeof value === 'function' && !isSignal(value)) {
    //   createRenderEffect(() => setAttribute(element, key, (value as Function)()));
    // } else {
    //   setAttribute(element, key, value, isSVG);
    // }
  }
  
  // Handle children
  if (props && props.children !== undefined) {
    const children = resolveChildren(()=>props.children);
    // props.children
    if (Array.isArray(children)) {
      // const asFn = children.some(c=>typeof c === 'function')
      // console.log('resolving children', children)
      // if(asFn){
        
      // }
      children.forEach((c: any) => {
        insert(element, c, (typeof c === 'function' ? null : undefined) as any);
      });
    } else {
      insert(element, children, (typeof children === 'function' ? null : undefined) as any);
      // insert(element, children);
    }
  }
}

// ============================================================================
// Additional Exports
// ============================================================================

export function createElement(type: any, props: any, ...children: any[]): JSXElement {
  const p = { ...props };
  if (children.length > 0) p.children = children.length === 1 ? children[0] : children;
  return jsx(type, p);
}

export function isValidElement(object: any): boolean {
  return typeof object === 'object' && object !== null && 'type' in object;
}

export function cloneElement(element: any, props: any, ...children: any[]): any {
  return jsx(element.type, {
    ...element.props,
    ...props,
    children: children.length ? children : element.props.children,
  });
}

export function createRef<T>(initialValue?: T) {
  return { current: initialValue || null };
}

/**
 * Create a reactive ref compatible with `ref={...}` JSX prop.
 * The `.current` property is backed by a signal for reactive tracking.
 */
export function useRef<T>(initialValue?: T) {
  const [get, set] = createSignal<T | null | undefined>(initialValue ?? null);
  return {
    get current() { return get(); },
    set current(v: T | null | undefined) { (set as any)(v); },
  };
}

/**
 * Merge multiple props objects reactively.
 * Getters from each source are preserved for reactive prop access.
 */
export function mergeProps<T extends object>(...sources: Partial<T>[]): T {
  const target = {} as T;
  for (const source of sources) {
    if (!source) continue;
    const descriptors = Object.getOwnPropertyDescriptors(source);
    Object.defineProperties(target, descriptors);
  }
  return target;
}

/**
 * Split props into two objects: one with the specified keys, one with the rest.
 */
export function splitProps<T extends object, K extends keyof T>(
  props: T,
  keys: K[]
): [Pick<T, K>, Omit<T, K>] {
  const picked = {} as Pick<T, K>;
  const rest = {} as Omit<T, K>;
  const keySet = new Set(keys as string[]);

  const descriptors = Object.getOwnPropertyDescriptors(props);
  for (const key in descriptors) {
    if (keySet.has(key)) {
      Object.defineProperty(picked, key, descriptors[key]);
    } else {
      Object.defineProperty(rest, key, descriptors[key]);
    }
  }

  return [picked, rest];
}


export function forwardRef(fn: Function) {
  return (props: any) => fn(props, props.ref);
}

export async function renderToString(element: JSXElement): Promise<string> {
  // Use @lit-labs/ssr or implementation from server module
  throw new Error('renderToString should be imported from server module');
}

// Re-export delegatedSet accessor for the runtime to check
export { globalDelegatedSet as delegatedSet };

// Re-export JSX namespace so TypeScript can find JSX.IntrinsicElements
// when this module is resolved via jsxImportSource: "@awc/kettlejs"
// Note: './jsx.d.js' resolves to jsx.d.ts (declaration file with JSX types),
// not jsx.ts (the React bridge file).
export type { JSX } from './jsx.d.js';
