/**
 * @fileoverview KettleJS - A reactive framework for lit-html inspired by SolidJS
 * @module @fluixi/kettlejs
 * @version 0.0.1
 *
 * KettleJS is a modern reactive framework that combines the power of lit-html
 * with fine-grained reactivity from @fluixi/reactive, inspired by SolidJS's design.
 *
 * @example
 * ```typescript
 * import { createSignal, render, html } from '@fluixi/kettlejs';
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
  createResource,
  createRoot,
  createComputed,
  createRenderEffect,
  onCleanup,
  getOwner,
  runWithOwner,
  batch,
  untrack,
  createDeferred,
  setOwner,
  getSharedConfig,
} from '@fluixi/dom';
// } from '@fluixi/kettlejs/rx';

import {
  readSignal as read,
  reduceSignal as reduce,
  createDebounce,
  createSelector,
} from '@fluixi/reactive/signal';


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

export * from '@fluixi/utils';
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

export { createReactiveJSX } from '@fluixi/jsx-runtime';
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
} from '@fluixi/dom';

// import {For as _For} from "@fluixi/dom"
// export interface ForProps<T, U = any> {
//   /** Reactive array to iterate over — static, readonly, accessor, or signal. */
//   each: ReadonlyArray<T> | (() => ReadonlyArray<T> | null | undefined) | Accessor<ReadonlyArray<T>> | null | undefined | false;
//   /** Rendered when the array is empty or nullish. */
//   fallback?: any;
//   /**
//    * Render function called once per unique item (keyed by reference).
//    * `index` is a reactive accessor — updates when the item moves position.
//    *
//    * JSX:    <For each={() => store.items}>{(item, index) => <li>{item.name}</li>}</For>
//    * lit:    For({ each: items, children: (item, index) => html`<li>${item.name}</li>` })
//    */
//   children?: (item: T, index: Accessor<number>) => U;
// }
// export const For = <T>(props: ForProps<T>) => _For(props as any) as JSX.Element;
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
} from '@fluixi/dom';

// Re-export reactive primitives from @fluixi/reactive

export { createStore, untrackStore, unwrap, Store } from '@fluixi/reactive/store';

export type {
  Accessor,
  Setter,
  Signal,
  SignalOptions,
  MemoOptions,
  Resource,
  ReadSignal,
} from '@fluixi/reactive/signal';

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
} from '@fluixi/dom';

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

// Web Component support (re-exported from @fluixi/element)
export {
  defineElement,
  wrapElement,
  KettleElement,
  KettleLitElement,
  KettleController,
  createComponent as createJsxComponent,
} from '@fluixi/element';

export type * from '@fluixi/element/types';

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
  createDebounce,
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
  read,
  reduce,
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
  read,
  reduce,

  // Lit
  html,
  nothing,

  // Meta
  VERSION,
  FRAMEWORK_NAME,
};

ensureIntegration('kettle element main')
