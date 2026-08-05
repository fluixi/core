/**
 * @fileoverview JSX Runtime with Reactive DOM Support
 * @module @fluixi/jsx
 *
 * Production-grade JSX runtime for the Fluixi reactive system.
 * Key design: event handlers stored as $$eventname properties on DOM nodes
 * (SolidJS delegation pattern) for reliable bubbling and preventDefault support.
 */

import {
  insert,
  setAttribute,
  setClassName,
  setStyle,
  handleRef,
  isAccessor,
  delegateEvents,
  isSVGElement,
  spread,
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
} from '@fluixi/dom';

import { createComponent, createDynamicElement } from '@fluixi/dom';
import { createSignal, createMemo, createRenderEffect, readChildren } from '@fluixi/reactive/signal';

// ============================================================================
// Types
// ============================================================================

export type JSXElement =
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

export const Fragment = Symbol.for('fluixi.fragment');

const isSSR = typeof window === 'undefined';

// Track which event names we've registered globally (mirrors delegatedSet in runtime)
const globalDelegatedSet = new Set<string>();

// ============================================================================
// Helper: createComponent
//
// Both backends now instantiate components through the framework's registered
// createComponent (imported from @fluixi/dom; fluixi registers it via
// registerCreateComponent). That path runs the component untracked AND applies
// the proper owner/lifecycle handling + asComponent stamping — so the jsx and
// imperative backends share one component-instantiation path. The dom shim
// falls back to `() => Comp(props)` only when no system is registered.
// ============================================================================

// ============================================================================
// Helper: normalizeChildren
// ============================================================================

function normalizeChildren(children: any): any {
  if (children === undefined || children === null || children === false) return null;

  if (Array.isArray(children)) {
    return children.map(normalizeChildren).flat();
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
  if (type == null) return null;

  const p = props || {};
  if (key !== undefined) p.key = key;

  if (type === Fragment) {
    return createMemo(() => asComponent(normalizeChildren(p.children))) as any;
  }

  if (typeof type === 'function') {
    const { type: renderType } = checkRenderType(type);

    // Context Provider is called directly — no memo wrapper.
    if (
      (type as any).$$typeof === Symbol.for('react.provider') ||
      renderType === 'provider'
    ) {
      return type(p);
    }

    if (isSSR) return { type, props: p } as any;

    // Wrap in a memo so the component is reactive.
    return createMemo(() => createComponent(type, p), undefined, { name: 'jsx component' }) as any as JSXElement;
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
  // Element construction lives in @fluixi/dom: html`` and JSX compile to the same
  // dom calls, and a polymorphic `as` needs the same factory without depending on
  // this package. One implementation, so the two paths can't drift.
  return createDynamicElement(tag, props);
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
// when this module is resolved via jsxImportSource: "@fluixi/core"
// Note: './jsx.d.js' resolves to jsx.d.ts (declaration file with JSX types),
// not jsx.ts (the React bridge file).
export type { JSX } from './jsx.d.js';
