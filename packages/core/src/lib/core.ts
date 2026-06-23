/**
 * @fileoverview Fluixi - A reactive framework for lit-html inspired by SolidJS
 * @module @fluixi/core
 * @version 0.0.1
 *
 * Fluixi is a modern reactive framework that combines the power of lit-html
 * with fine-grained reactivity from @fluixi/reactive, inspired by SolidJS's design.
 *
 * @example
 * ```typescript
 * import { createSignal, render, html } from '@fluixi/core';
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
} from '@fluixi/reactive/signal';
// } from '@fluixi/core/rx';

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

// Isomorphic request state (server-resolved → serialized → client-seeded). Public
// barrel is lib/core.ts (src/index.ts re-exports it), so the export must live here.
export {
  createIsomorphicState,
  createIsomorphicStore,
  type IsomorphicState,
  type IsomorphicOptions,
  type IsomorphicStore,
  type IsomorphicStoreOptions,
} from './isomorphic.js';

// Universal env utilities — isomorphic storage + safe browser-global access, so app
// modules import these instead of touching localStorage/window/document directly.
export {
  isServer,
  isClient,
  storage,
  createMemoryStorage,
  env,
  clientOnly,
} from './env/index.js';

// Theme store — detect → persist → apply → toggle + no-flash head script.
export { createTheme, type Theme, type ThemeOptions } from './theme/index.js';

export * from '@fluixi/utils';
// import { createContext, Provider, useContext } from './context/index.js';
// import { createContext, useContext } from './render/component.js';
// import { createResource } from './resources/index.js';
import {
  Link,
  Router,
  useNavigate,
  useRouter,
} from './router-next/index.js';
import { ensureIntegration } from './render/component.js';

// Lit lives in @fluixi/lit — import html/svg/nothing/LitElement from there directly.
// The core @fluixi/core entry no longer pulls lit (keeps it out of SSR bundles).

// createReactiveJSX (a deprecated legacy adapter) lived here but pulled the jsx-runtime
// `.` entry into the core graph. It's gone — compiled JSX uses the jsx-runtime subpath
// directly, and nothing in the framework needs the adapter.
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
} from '@fluixi/dom';
// Lit renderer symbols ($show/$match/portal helpers/html/litrx/…) live in @fluixi/lit —
// import them from there. They are intentionally NOT re-exported here so the core
// entry stays lit-free (and out of server bundles).

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
  Island,
  hydrateIslands,
  type IslandProps,
  type IslandRegistry,
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
} from '@fluixi/lit';

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

// Router — from router-next (the framework-agnostic router). The old lit-based router
// (./router) has been removed: it imported `html` from @fluixi/lit, which dragged lit
// (extends HTMLElement at module init) into the core/SSR graph. router-next is the
// only router now; `<Router routes={...}/>` replaces the old `<Routes>`/`<Route>` JSX.
export {
  Router,
  Link,
  useRouter,
  useLocation,
  useNavigate,
  useParams,
} from './router-next/index.js';

export type {
  RouterLocation as Location,
  RouteDefinition,
  NavigateOptions,
} from './router-next/index.js';

// Web Component support moved to @fluixi/element (now in the wc-element repo).
// Import { defineElement, FluixiElement, createComponent, ... } from '@fluixi/element'.

/**
 * Framework version
 */
export const VERSION = '0.0.1';

/**
 * Framework name
 */
export const FRAMEWORK_NAME = 'Fluixi';

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

  // Meta
  VERSION,
  FRAMEWORK_NAME,
};

ensureIntegration('fluixi element main')
