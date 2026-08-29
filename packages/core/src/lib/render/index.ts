/**
 * @fileoverview Client-Side Rendering for Fluixi
 * @module @fluixi/core/render
 *
 * Client-side rendering:
 * - Real DOM
 * - Fine-grained mutation
 *
 * Following SolidJS structure: render logic separated from component creation
 */

import { createRoot } from '@fluixi/reactive/signal';
import { stampVersions, warnOnVersionSkew } from './versions.js';
import {
  isDOMNode,
  delegateEvents,
  insert,
} from '@fluixi/dom';
import {
  ensureIntegration,
} from './component.js';

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
 * import { render } from '@fluixi/core';
 * import { createSignal } from '@fluixi/reactive';
 *
 * const App = () => {
 *   const [count, setCount] = createSignal(0);
 *   return <button onClick={() => setCount(count() + 1)}>Count: {count()}</button>;
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
  ensureIntegration('render');
  delegateEvents(['click', 'input', 'change', 'submit']);

  if (isServer) {
    throw new Error(
      'render() is for client-side only. Use renderToString() on server.'
    );
  }

  if (!container) {
    throw new Error('Container element is required');
  }
  let disposer: (() => void) | undefined;

  // domRender(code, container)
  createRoot((dispose) => {
    disposer = dispose;
    // Section 1: Execute code function once — Providers run here with Owner = root
    // so "also stamp" in createProvider sets context on root.contexts, making
    // it reachable from every render effect created by insert() below.
    const result = typeof code === 'function' ? code() : code;

    // Section 7: Insert into real DOM using the SAME root as code() so that
    // render effects share the Owner chain with Provider context nodes.
    // Using domRender() would create a second createRoot, severing the chain.
    container.textContent = '';
    // Which build is running, on the element and as `window.Fluixi`. `fluixi-js="v1"`
    // said only that Fluixi was involved; a bug report needs the actual versions.
    stampVersions(container);
    warnOnVersionSkew();
    // Wrap the (already-computed) result in a STABLE thunk so insert() creates a
    // top-level render effect. Without this, a static array result — e.g. the
    // imperative backend's `[createMemo(() => createComponent(App)), " "]` — is
    // flattened ONCE with no enclosing effect, so the nested memos are read
    // untracked and reactive boundaries deep in the tree (Suspense fallback ->
    // content, Outlet, Show/For) never update. The thunk returns the same result
    // each run, so code()/Providers are not re-executed (context stays on root).
    insert(container, () => result as any);
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
 * import { portal } from '@fluixi/core';
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
 * import { initDelegation } from '@fluixi/core';
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
  // Show,
  type SuspenseProps,
  type SuspenseListProps,
  // type ShowProps,
  isNode,
  isLitResult,
  isPromise,
  isJSXElement,
} from './suspense.js';

export {lazy} from "./lazy.js"
export type {LazyOptions, LazyComponent} from "./lazy.js"
export {deferred} from "./deferred.js"
export type {DeferredOptions, LoadStrategy} from "./deferred.js"

export { Await } from './await.js';
export type { AwaitProps } from './await.js';

export type {
  Component,
  ComponentProps,
  LifecycleCallback,
  RefObject,
} from './component.js';
