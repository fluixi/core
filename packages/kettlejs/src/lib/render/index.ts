/**
 * @fileoverview Client-Side Rendering for KettleJS
 * @module @awc/kettlejs/render
 *
 * Implements Section 7 of GEMINI.md: RENDERING (CLIENT)
 * - Real DOM
 * - Fine-grained mutation
 *
 * Following SolidJS structure: render logic separated from component creation
 */

import { createRoot } from '@awc/reactive/signal';
import {
  render as domRender,
  isDOMNode,
  delegateEvents,
  registerLitRender,
} from '@awc/dom';
import { render as litRender } from 'lit';
import {
  createLifecycleContext,
  withLifecycle,
  executeMountCallbacks,
  executeCleanups,
  ensureIntegration,
} from './component.js';

// Register Lit's render function with the DOM runtime
// This allows reactive updates to properly render Lit templates
if (typeof window !== 'undefined') {
  registerLitRender(litRender);
}

const isServer = typeof window === 'undefined';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Render options
 */
export interface RenderOptions {
  /**
   * Whether to hydrate existing content
   */
  hydrate?: boolean;

  /**
   * Marker for hydration boundaries
   */
  marker?: Node;

  /**
   * Callback when disposed
   */
  onDispose?: () => void;
}

// ============================================================================
// SECTION 7 — RENDERING (CLIENT)
// ============================================================================

/**
 * Render a component into a DOM element
 *
 * Section 7 — CLIENT:
 * - Real DOM (no Virtual DOM)
 * - Fine-grained mutation (no reconciliation)
 *
 * Section 1: Component executes once during render
 * Section 5: Creates reactive owner (root)
 *
 * @param {() => any} code - Component or function to render
 * @param {HTMLElement} container - Target DOM element
 * @param {RenderOptions} options - Render options
 * @returns {() => void} Dispose function
 *
 * @example
 * ```typescript
 * import { render } from '@awc/kettlejs';
 * import { createSignal } from '@awc/reactive';
 * import { html } from 'lit';
 *
 * const App = () => {
 *   const [count, setCount] = createSignal(0);
 *   return html`
 *     <button @click=${() => setCount(count() + 1)}>
 *       Count: ${count()}
 *     </button>
 *   `;
 * };
 *
 * const dispose = render(App, document.getElementById('app'));
 * ```
 */
export function render(
  code: () => any,
  container: HTMLElement,
  options: RenderOptions = {}
): () => void {
  ensureIntegration();

  if (isServer) {
    throw new Error(
      'render() is for client-side only. Use renderToString() on server.'
    );
  }

  if (!container) {
    throw new Error('Container element is required');
  }
  console.log('render start');

  let disposed = false;
  let disposer: (() => void) | undefined;
  let domDisposer: (() => void) | undefined;
  let lifecycleCtx: any;

  // Section 5: Create reactive root (Owner)
  // Section 7: Real DOM with fine-grained updates
  createRoot((dispose) => {
    disposer = () => {
      if (disposed) return;
      disposed = true;

      // Clean up DOM
      if (domDisposer) {
        domDisposer();
      }

      // Execute cleanups
      if (lifecycleCtx) {
        executeCleanups(lifecycleCtx);
      }

      // User cleanup
      if (options.onDispose) {
        options.onDispose();
      }

      // Dispose reactive root
      dispose();
    };

    // Create lifecycle context for mount/cleanup hooks
    lifecycleCtx = createLifecycleContext(null as any);

    // Section 1: Execute code function once
    let result = withLifecycle(
      lifecycleCtx,
      typeof code === 'function'
        ? code
        : () => {
            return code;
          }
    );
    // console.log('rendering', result, lifecycleCtx);

    // Section 7: Insert into real DOM with fine-grained updates
    // If result is a function (reactive accessor from Suspense), pass directly to domRender
    // domRender will handle reactive functions with createRenderEffect
    if (typeof result === 'function') {
      // Reactive function - let domRender handle it
      domDisposer = domRender(result, container, lifecycleCtx);
      console.log('render dispose', domDisposer);
    } else if (isLitTemplateResult(result)) {
      // Lit template result
      if (options.hydrate) {
        console.warn('Hydration should use hydrateRoot from server module');
      }
      domDisposer = domRender(result, container, lifecycleCtx);
      // litRender(result, container);
    } else if (isDOMNode(result)) {
      // Direct DOM node
      container.textContent = '';
      container.appendChild(result);
    } else {
      // Use domRender for everything else (arrays, JSX, primitives, etc.)
      domDisposer = domRender(result, container, lifecycleCtx);
    }

    // Execute mount callbacks after DOM is ready
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        if (!disposed && lifecycleCtx) {
          executeMountCallbacks(lifecycleCtx);
        }
      });
    } else {
      // Fallback for environments without RAF
      Promise.resolve().then(() => {
        if (!disposed && lifecycleCtx) {
          executeMountCallbacks(lifecycleCtx);
        }
      });
    }
  });

  return () => {
    if (disposer) {
      disposer();
      disposer = undefined;
    }
  };
}

/**
 * Type guard for Lit template results
 * @internal
 */
function isLitTemplateResult(value: any): boolean {
  return (
    value &&
    typeof value === 'object' &&
    (value['_$litType$'] !== undefined ||
      value['_$litDirective$'] !== undefined)
  );
}

// ============================================================================
// PORTAL RENDERING
// ============================================================================

/**
 * Render into a different part of the DOM tree
 *
 * @param {() => any} code - Component to render
 * @param {HTMLElement} target - Target element (outside current tree)
 * @param {RenderOptions} options - Render options
 * @returns {() => void} Dispose function
 *
 * @example
 * ```typescript
 * import { portal } from '@awc/kettlejs';
 *
 * const Modal = () => {
 *   return portal(
 *     () => html`<div class="modal">Content</div>`,
 *     document.body
 *   );
 * };
 * ```
 */
export function portal(
  code: () => any,
  target: HTMLElement,
  options: RenderOptions = {}
): () => void {
  const container = document.createElement('div');
  container.setAttribute('data-portal', 'true');
  target.appendChild(container);

  const dispose = render(code, container, options);

  return () => {
    dispose();
    if (target.contains(container)) {
      target.removeChild(container);
    }
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if a value can be rendered
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if renderable
 */
export function isRenderable(value: any): boolean {
  if (value == null) return true;
  if (typeof value === 'function') return true;
  if (isDOMNode(value)) return true;
  if (isLitTemplateResult(value)) return true;
  if (Array.isArray(value)) return true;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }
  return false;
}

/**
 * Initialize event delegation
 * Should be called once when app starts
 *
 * @example
 * ```typescript
 * import { initDelegation } from '@awc/kettlejs';
 *
 * initDelegation();
 * render(App, document.getElementById('app'));
 * ```
 */
export function initDelegation(): void {
  if (isServer) return;
  delegateEvents(['click', 'input', 'change', 'submit']);
}

/**
 * Cleanup event delegation
 * Should be called when app unmounts
 */
export function cleanupDelegation(): void {
  if (isServer) return;
  // Clear delegated events manually if needed
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export component creation
export {
  createComponent,
  onMount,
  onUnmount,
  useEffect,
  useRef,
  useReducer,
  useMemo,
  useEventListener,
  useCallback,
  onCleanup,
  batch,
  createMemo,
  createEffect,
  getOwner,
  runWithOwner,
  isDev,
  devOnly,
  DEV,
  getSharedConfig,
  $component,
} from './component.js';

export {
  Suspense,
  SuspenseList,
  Show,
  type SuspenseProps,
  type SuspenseListProps,
  type ShowProps,
  isNode,
  isLitResult,
  isPromise,
  isJSXElement,
} from './suspense.js';

export {lazy} from "./lazy.js"
export type {LazyOptions, LazyComponent} from "./lazy.js"

export type {
  Component,
  ComponentProps,
  LifecycleCallback,
  RefObject,
} from './component.js';
