/**
 * @module fluixi
 *
 * Fluixi compiles JSX and `html` templates into direct DOM calls over the fine-grained
 * reactivity in @fluixi/reactive. The template layer is our own and compiled.
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
  // The short API, same primitives, one object instead of a tuple.
  signal,
  memo,
  effect,
  resource,
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
} from '@fluixi/reactive/signal';

import {
  createDebounce,
  createDebouncedResource,
  createDebouncedSignal,
  createSelector,
} from '@fluixi/reactive/signal';
import {
  readSignal as read,
  reduceSignal as reduce,
} from '@fluixi/reactive/operators';

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

// Isomorphic request state (server-resolved -> serialized -> client-seeded). Public
// barrel is lib/core.ts (src/index.ts re-exports it), so the export must live here.
export {
  createIsomorphicState,
  createIsomorphicStore,
  type IsomorphicState,
  type IsomorphicOptions,
  type IsomorphicStore,
  type IsomorphicStoreOptions,
} from './isomorphic.js';

// Universal env utilities: safe browser-global access, so app modules import these
// instead of touching window/document directly. Storage is `@fluixi/core/storage`.
export {
  isServer,
  isClient,
  env,
  clientOnly,
} from './env/index.js';

// Theme store: detect -> persist -> apply -> toggle + no-flash head script.
export { createTheme, type Theme, type ThemeOptions } from './theme/index.js';
export { createColorScheme, type ColorScheme, type ColorSchemeChoice, type ColorSchemeOptions } from './theme/color-scheme.js';
export { ThemeProvider, ColorSchemeProvider, useTheme, useColorScheme } from './theme/provider.js';

// not re-exported from the main entry. `export * from '@fluixi/utils'` here put the
// whole utility library in every app's graph: 56% of a counter's bundle, 74% of its
// bytes, because a barrel re-export of a barrel cannot be shaken in practice. Import
// from `@fluixi/utils` directly, or from `@fluixi/core/utils` for the same surface.
import {
  Link,
  Router,
  useNavigate,
  useRouter,
} from './router/index.js';
import { ensureIntegration } from './render/component.js';

// html`` / svg`` template markers, the no-JSX authoring surface. They live in
// @fluixi/dom (compiled away by `format: 'html'`/`both`); re-exported here so
// `import { html } from '@fluixi/core'` works. Inert typed functions.
export { html, svg, css } from '@fluixi/dom';
export type { TemplateResult, Reactive, FluixiStyle } from '@fluixi/dom';

// createReactiveJSX (a deprecated legacy adapter) lived here but pulled the jsx-runtime
// `.` entry into the core graph. It's gone: compiled JSX uses the jsx-runtime subpath
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

// export interface ForProps<T, U = any> {
//   /** Reactive array to iterate over: static, readonly, accessor, or signal. */
//   each: ReadonlyArray<T> | (() => ReadonlyArray<T> | null | undefined) | Accessor<ReadonlyArray<T>> | null | undefined | false;
//   /** Rendered when the array is empty or nullish. */
//   fallback?: any;
//   /**
//    * Render function called once per unique item (keyed by reference).
//    * `index` is a reactive accessor: updates when the item moves position.
//    *
//    * JSX:    <For each={() => store.items}>{(item, index) => <li>{item.name}</li>}</For>
//    * html:   For({ each: items, children: (item, index) => html`<li>${item.name}</li>` })
//    */
//   children?: (item: T, index: Accessor<number>) => U;
// }
// export const For = <T>(props: ForProps<T>) => _For(props as any) as JSX.Element;
export {
  classMap,
  styleMap,
  Island,
  hydrateIslands,
  type IslandProps,
  type IslandRegistry,
  // Prop helpers (Solid-compatible): merge prop sources (later `undefined` falls through) and
  // split a reactive props object into groups + rest. The compiler emits mergeProps for JSX spreads.
  mergeProps,
  splitProps,
  // Component typing: annotate `const C: Component<Props> = (props) => ...` (or the FxComponent/FxC
  // brand aliases). FxParent adds optional `children`; FxVoid forbids them; FxFlow requires them.
  type ComponentFn,
  type ComponentChild,
  type ComponentOrElement,
  type FxComponent,
  type FxC,
  type FxParentProps,
  type FxParent,
  type FxVoidProps,
  type FxVoid,
  type FxFlowProps,
  type FxFlow,
} from '@fluixi/dom';

export * from "./control-flow.js"

// Re-export reactive primitives from @fluixi/reactive

export { createStore, untrackStore, unwrap, Store } from '@fluixi/reactive/store';

export type {
  Accessor,
  Setter,
  Signal,
  SignalOptions,
  MemoOptions,
  Resource,
} from '@fluixi/reactive/signal';
export type { ReadSignal } from '@fluixi/reactive/operators';

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
  lazy,
  deferred,
  Suspense,
  SuspenseList,
  Await,
  // Show,
  isNode,
  isJSXElement,
  $component,
  type RenderOptions,
  type SuspenseProps,
  type SuspenseListProps,
  type AwaitProps,
  // type ShowProps,
  type LazyOptions,
  type DeferredOptions,
  type LoadStrategy,
  type Component,
  type ComponentProps,
  type LifecycleCallback,
  type LazyComponent,
  type RefObject,
} from './render/index.js';

// Context API
// export type { Context, ProviderProps } from './context/index.js';

// Resources for async data
// Router, from router (the framework-agnostic router).
export {
  Router,
  Link,
  useRouter,
  useLocation,
  useNavigate,
  useParams,
} from './router/index.js';

export type {
  RouterLocation as Location,
  RouteDefinition,
  NavigateOptions,
} from './router/index.js';

// Web Component support moved to @fluixi/element (now in the wc-element repo).
// Import { defineElement, FluixiElement, createComponent, ... } from '@fluixi/element'.

import { VERSION } from '../version.generated.js';
export { VERSION };

export const FRAMEWORK_NAME = 'Fluixi';

export {
  signal,
  memo,
  effect,
  resource,
  createEffect,
  createMemo,
  createSignal,
  createResource,
  createContext,
  createRoot,
  createDeferred,
  createDebounce,
  createDebouncedSignal,
  createDebouncedResource,
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

