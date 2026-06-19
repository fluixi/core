/**
 * @fileoverview Main entry point for @fluixi/jsx package
 * @module @fluixi/jsx
 *
 * This package provides a comprehensive JSX runtime with:
 * - Fine-grained reactive updates similar to SolidJS
 * - Support for both lit-html templates and native JSX
 * - Seamless integration with signal and store systems
 * - Optimized DOM updates with compilation support
 */

// ============================================================================
// Core JSX Runtime
// ============================================================================

export {
  // JSX factory functions
  jsx,
  jsxs,
  Fragment,

  // Element creation
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  cloneElement,

  // Rendering
  renderToString,
  // delegateEvents,
  // handleRef,
} from './jsx-runtime.js';
export { jsxDEV } from './jsx-dev-runtime.js';

export type {
  JSXElement,
  JSXComponent,
  JSXProps,
  RefCallback,
  RefObject,
} from './jsx-runtime.js';

// ============================================================================
// Compiler Utilities
// ============================================================================

// Build-time compiler utilities live in @fluixi/compiler (Node.js only):
//   import { createVitePlugin } from '@fluixi/compiler/integrations'

// ============================================================================
// Legacy API (for backward compatibility)
// ============================================================================

// Re-export old runtime for compatibility
export { ReactiveDOM, delegateEvents } from '@fluixi/dom';
// Lit helpers ($, $if, litrx) live in @fluixi/lit — import them from there directly.
// Not re-exported here so the jsx-runtime entry stays lit-free (keeps lit, which extends
// HTMLElement at module init, out of SSR/prod server bundles).

// Legacy JSX config
export interface ReactiveJSXConfig {
  signalSystem: any;
}

export interface ReactiveJSXAPI<Element = any> {
  jsx: typeof jsx;
  jsxs: typeof jsxs;
  jsxDEV: typeof jsxDEV;
  Fragment: typeof Fragment;
  render: (element: any, container: Element) => void;
  batch: (fn: () => void) => void;
}

import { jsxDEV } from './jsx-dev-runtime.js';
import {
  jsx,
  jsxs,
  Fragment,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  cloneElement,
  renderToString,
  // createPortal,
} from './jsx-runtime.js';

export { mergeProps } from './jsx-runtime.js';
import { createPortal, initializeIntegration, render, runtimeBatch } from '@fluixi/dom';

/**
 * Create a reactive JSX API with custom configuration
 * @deprecated Use direct imports instead
 */
export function createReactiveJSX(config: ReactiveJSXConfig): ReactiveJSXAPI {
  // Initialize integration with signal system
  initializeIntegration({
    signalSystem: config.signalSystem,
  });

  return {
    jsx,
    jsxs,
    jsxDEV,
    Fragment,
    render: (element: any, container: any) => {
      if (!container) return;

      runtimeBatch(() => {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        if (element instanceof Node) {
          container.appendChild(element);
        } else if (Array.isArray(element)) {
          element.forEach((el) => {
            if (el instanceof Node) {
              container.appendChild(el);
            }
          });
        }
      });
    },
    batch: runtimeBatch,
  };
}

// ============================================================================
// Component Helpers
// ============================================================================

/**
 * Helper to create JSX-compatible components
 */
export function jsxComponent<P = any>(
  fn: (props: P) => JSX.Element
): (props: P) => JSX.Element {
  return fn;
}

/**
 * Helper to create JSX-compatible functional components with props validation
 */
export function defineComponent<P = any>(
  name: string,
  fn: (props: P) => JSX.Element
): (props: P) => JSX.Element {
  Object.defineProperty(fn, 'name', { value: name });
  return fn;
}

/**
 * Memo wrapper for components
 */
export function memo<P = any>(
  component: (props: P) => JSX.Element,
  equals?: (prev: P, next: P) => boolean
): (props: P) => JSX.Element {
  let lastProps: P | undefined;
  let lastResult: JSX.Element | undefined;

  return (props: P) => {
    if (lastProps !== undefined) {
      if (equals ? equals(lastProps, props) : shallowEqual(lastProps, props)) {
        return lastResult!;
      }
    }

    lastProps = props;
    lastResult = component(props);
    return lastResult;
  };
}

function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}

// ============================================================================
// Render Function
// ============================================================================

/**
 * Hydrate a server-rendered element
 */
export function hydrate(element: JSX.Element, container: Element): () => void {
  // For now, just render (full hydration would be more complex)
  return render(element, container);
}

export {
  getJSX,
  loadReact,
  ensureReactInit,
  type ComponentChild,
} from './jsx.js';

// ============================================================================
// Re-export JSX namespace types
// ============================================================================

export type {JSX} from './jsx.d.js';
export type {FluixiElements} from './jsx.d.js';

// ============================================================================
// Default Export
// ============================================================================

export default {
  jsx,
  jsxs,
  jsxDEV,
  Fragment,
  createElement: createElement,
  createRef: createRef,
  forwardRef: forwardRef,
  isValidElement: isValidElement,
  cloneElement: cloneElement,
  renderToString: renderToString,
  createPortal: createPortal,
  render,
  hydrate,
  memo,
  jsxComponent,
  defineComponent,
  createReactiveJSX,
};
