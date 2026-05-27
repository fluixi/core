/**
 * @fileoverview KettleJS - A reactive framework for lit-html inspired by SolidJS
 * @module @awc/kettlejs
 * @version 0.0.1
 *
 * KettleJS is a modern reactive framework that combines the power of lit-html
 * with fine-grained reactivity from @awc/reactive, inspired by SolidJS's design.
 *
 * @example
 * ```typescript
 * import { createSignal, render, html } from '@awc/kettlejs';
 *
 * const Counter = () => {
 *   const [count, setCount] = createSignal(0);
 *
 *   return html`
 *     <div>
 *       <p>Count: ${count()}</p>
 *       <button @click=${() => setCount(count() + 1)}>Increment</button>
 *     </div>
 *   `;
 * };
 *
 * render(Counter, document.getElementById('app')!);
 * ```
 */

import {
  createEffect,
  createMemo,
  createSignal,
  createRoot,
  createDeferred,
  createComputed,
  createRenderEffect,
  createSelector,
  onCleanup,
  getOwner,
  runWithOwner,
  batch,
  untrack,
  setOwner,
  getSharedConfig,
  createResource
  // Context,
} from '@awc/kettlejs/rx';
// } from '@awc/reactive/signal';

import {
  // batch,
  createComponent,
  // createRoot,
  onMount,
  onUnmount,
  // untrack,
  // } from './core/index.js';
} from './render/index.js';

import { createContext, useContext } from './context/index.js';
export * from './context/index.js';

export * from '@awc/utils';
// import { createContext, Provider, useContext } from './context/index.js';
// import { createContext, useContext } from './render/component.js';
// import { createResource } from './resources/index.js';
import {
  // createRouter,
  Link,
  Router,
  useNavigate,
  useRouter,
} from './router/index.js';
import { html, nothing } from 'lit';
import { ensureIntegration } from './render/component.js';

// Re-export lit-html essentials
export { svg, render as litRender, nothing } from 'lit';
export type { TemplateResult, SVGTemplateResult } from 'lit';

export { createReactiveJSX } from '@awc/jsx-runtime';
// Re-export reactive directives
export {
  query,
  queryAll,
  closest,
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  setAttribute,
  getAttribute,
  removeAttribute,
  setStyles,
  getStyle,
  createElement as domCreateElement,
  removeChildren,
  appendChildren,
  isVisible,
  scrollIntoView,
  getOffset,
  delegate,
  waitForElement,
  observeIntersection,
  observeResize,
  createKeyedFor,
  setGlobalPortalRoot,
  getGlobalPortalRoot,
  createFixedPortal,
  createFixedDynamic,
  createPolymorphic,
  $show,
  $match,
  $switch,
  $for,
  $index,
  $if,
  $portal,
  $globalPortal,
  $dynamic,
  $dynamicSwitch,
  $each,
  $,
  html,
  litrx,
} from '@awc/dom';

export {
  Show,
  For,
  Index,
  Switch,
  Match,
  Dynamic,
  ErrorBoundary,
  Portal,
  type ShowProps,
  type ForProps,
  type IndexProps,
  type SwitchProps,
  type MatchProps,
  type MatchNode,
  type DynamicProps,
  type ErrorBoundaryProps,
  type PortalProps,
  classMap,
  styleMap,
  $classMap,
  $styleMap
} from '@awc/dom';

// Re-export reactive primitives from @awc/reactive

export { createStore, unwrap, Store } from '@awc/reactive/store';

export type {
  Accessor,
  Setter,
  Signal,
  SignalOptions,
  MemoOptions,
} from '@awc/reactive/signal';

export {
  render,
  portal,
  isRenderable,
  initDelegation,
  cleanupDelegation,
  createComponent,
  onMount,
  onUnmount,
  useEffect,
  useRef,
  useReducer,
  useMemo,
  useEventListener,
  useCallback,
  getSharedConfig as getRenderSharedConfig,
  lazy,
  Suspense,
  SuspenseList,
  // Show,
  isNode,
  isLitResult,
  isJSXElement,
  $component,
  type RenderOptions,
  type SuspenseProps,
  type SuspenseListProps,
  // type ShowProps,
  type LazyOptions,
  type Component,
  type ComponentProps,
  type LifecycleCallback,
  type LazyComponent,
  type RefObject,
} from './render/index.js';

// export type {
//   Component,
//   ComponentProps,
//   ComponentChild,
//   LifecycleCallback,
// } from './core/index.js';

export type {
  // Show,
  // Match,
  // Switch,
  // For,
  // Index,
  // Portal,
  $ShowProps,
  $MatchProps,
  $SwitchProps,
  $ForProps,
  $IndexProps,
  $PortalProps,
  $DynamicProps,
  $DynamicSwitchProps,
} from '@awc/dom';

// Context API
// export {
//   // createContext,
//   // useContext,
//   Provider,
//   createContextWithProvider,
//   composeProviders,
//   createConsumer,
//   useProvide,
//   createScopedContext,
// } from './context/index.js';

// export type { Context, ProviderProps } from './context/index.js';

// Resources for async data
// export {
//   createResource,
//   createResources,
//   createResourceWithRetry,
//   createLazyResource,
// } from './resources/index.js';

// export type {
//   Resource,
//   ResourceState,
//   ResourceOptions,
//   ResourceFetcher,
//   ResourceSource,
// } from './resources/index.js';

// Router
export {
  // createRouter,
  Router,
  Link,
  useRouter,
  useLocation,
  useNavigate,
  useParams,
  // useQuery,
  // useIsActive,
} from './router/index.js';

export type {
  // RouteParams,
  // QueryParams,
  Location,
  RouteDefinition,
  // RouteProps,
  NavigateOptions,
  // RouterOptions,
} from './router/index.js';

// Web Component support (re-exported from @awc/element)
export {
  defineElement,
  wrapElement,
  KettleElement,
  KettleLitElement,
  KettleController,
} from '@awc/element';
export type * from '@awc/element';

/**
 * Framework version
 */
export const VERSION = '0.0.1';

/**
 * Framework name
 */
export const FRAMEWORK_NAME = 'KettleJS';

export {
  createEffect,
  createMemo,
  createSignal,
  createResource,
  createContext,
  createRoot,
  createDeferred,
  createComputed,
  createRenderEffect,
  createSelector,
  onCleanup,
  getOwner,
  runWithOwner,
  batch,
  untrack,
  useContext,
  setOwner,
  getSharedConfig,
};
/**
 * Default export - commonly used functions
 */
export default {
  // Core
  createComponent,
  // render,
  onMount,
  onUnmount,

  createEffect,
  createMemo,
  createSignal,
  createContext,
  createRoot,
  createDeferred,
  createComputed,
  createRenderEffect,
  createSelector,
  onCleanup,
  getOwner,
  runWithOwner,
  batch,
  untrack,
  useContext,
  setOwner,
  getSharedConfig,
  // Control Flow
  // Show,
  // For,
  // Switch,
  // Match,
  // Portal,
  // Dynamic,

  // Context
  // Provider,

  // Resources
  // createResource,

  // Router
  // createRouter,
  Router,
  Link,
  useRouter,
  useNavigate,

  // Lit
  html,
  nothing,

  // Meta
  VERSION,
  FRAMEWORK_NAME,
};

ensureIntegration()
