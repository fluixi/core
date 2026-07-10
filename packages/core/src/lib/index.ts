/**
 * @fileoverview Fluixi - Solid-Compatible Fine-Grained UI Framework
 * @module @fluixi/core
 * @version 0.0.1
 *
 * A fine-grained reactive framework following SolidJS principles:
 * - Components execute once
 * - Fine-grained reactivity (no VDOM)
 * - Server-side rendering with hydration
 * - JSX and Lit-html support
 */

// ============================================================================
// REACTIVE PRIMITIVES (from @fluixi/reactive)
// ============================================================================

export {
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
// } from '@fluixi/core/rx';

export { createDebounce, createSelector } from '@fluixi/reactive/signal';
export {
  readSignal as read,
  reduceSignal as reduce,
} from '@fluixi/reactive/operators';

export type {
  Signal,
  Accessor,
  Setter,
  SignalOptions,
  RootOwner as Owner,
  Context,
  Resource,
} from '@fluixi/reactive/signal';
export type { ReadSignal } from '@fluixi/reactive/operators';

export { createStore, untrackStore,   Store, type StoreSetter} from '@fluixi/reactive/store';

// ============================================================================
// SECTION 2 — createComponent & LIFECYCLE
// ============================================================================

export {
  createComponent,
  onMount,
  onUnmount,
  lazy,
  // Hooks
  useEffect,
  useMemo,
  useRef,
  useReducer,
  useEventListener,
  useCallback,
  render,
  portal,
  isRenderable,
  initDelegation,
  cleanupDelegation,
  // Context API (Section 9) - from core for proper nesting
  Suspense,
  // Dev mode
  isDev,
  devOnly,
  DEV,
  // Internal
  getSharedConfig,
  $component,
} from './render/index.js';

export * from './context/index.js';

// Isomorphic request state (server-resolved → serialized → client-seeded).
export {
  createIsomorphicState,
  type IsomorphicState,
  type IsomorphicOptions,
} from './isomorphic.js';
import {Component, ComponentProps, LifecycleCallback, LazyComponent, RefObject, SuspenseProps} from './render/index.js';
export type {
  Component,
  ComponentProps,
  LifecycleCallback,
  LazyComponent,
  RefObject,
  SuspenseProps,
};

// ============================================================================
// SECTION 7 — RENDERING (CLIENT)
// ============================================================================

// export { render } from './core/index.js';

// export type { RenderOptions } from './render/index.js';

// ============================================================================
// LIT-HTML INTEGRATION
// ============================================================================

// Lit (html/svg/nothing/litRender/LitElement and the $-directives below) lives in
// @fluixi/lit — import it from there directly. It is NOT re-exported here: lit extends
// HTMLElement at module init, so re-exporting it dragged lit into SSR/prod server bundles
// (HTMLElement is not defined). Keeping this barrel lit-free keeps the core out of that.

// ============================================================================
// DOM UTILITIES (from @fluixi/dom)
// ============================================================================
// import {For as _For, ForProps, ForPropsKeyed, ForPropsUnkeyed} from "@fluixi/dom"
// export function For<T, U>(props: ForPropsKeyed<T, U>): Accessor<U[]>;
// export function For<T, U>(props: ForPropsUnkeyed<T, U>): Accessor<U[]>;
// export function For<T, U>(props: ForProps<T, U>): Accessor<U[]> { return _For(props as any); }

export {
  // Framework-agnostic reactive attribute maps (return Accessor<string>)
  classMap,
  styleMap,
  type ClassMapInput,
  type ClassCondition,
  type StyleMapInput,
  type StyleValue,
} from '@fluixi/dom';
export * from './control-flow.js';
// Lit-specific directives ($classMap/$styleMap/litrx) and lit control flow
// ($show/$for/$switch/$portal/$if/$each) live in @fluixi/lit — import from there.
// (Framework-agnostic classMap/styleMap above come from @fluixi/dom and stay here.)

export {
  // DOM Manipulation
  insert,
  spread,
  setAttribute,
  setProperty,
  addClass,
  removeClass,
  toggleClass,

  // Event Handling
  delegateEvents,

  // Utilities
  isDOMNode,
  isLitTemplateResult,
  hydrate,
} from '@fluixi/dom';

// ============================================================================
// JSX RUNTIME
// ============================================================================

export { jsx, jsxs, Fragment } from './jsx-runtime/index.js';

export type { JSXElement } from './jsx-runtime/index.js';

// ============================================================================
// FRAMEWORK METADATA
// ============================================================================

/**
 * Framework version
 */
export const VERSION = '0.0.1';

/**
 * Framework name
 */
export const FRAMEWORK_NAME = 'Fluixi';

/**
 * Get framework info
 */
export function getFrameworkInfo() {
  return {
    name: FRAMEWORK_NAME,
    version: VERSION,
    features: {
      ssr: true,
      hydration: true,
      jsx: true,
      litHtml: true,
      signals: true,
      fineGrained: true,
      lazy: true,
      hooks: true,
      devMode: true,
    },
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

import {
  createSignal as _createSignal,
  createEffect as _createEffect,
  createMemo as _createMemo,
  createRoot as _createRoot,
  batch as _batch,
  untrack as _untrack,
  onCleanup as _onCleanup,
} from '@fluixi/reactive/signal';

import {
  createComponent as _createComponent,
  onMount as _onMount,
  onUnmount as _onUnmount,
  // lazy as _lazy,
  useEffect as _useEffect,
  useMemo as _useMemo,
  useRef as _useRef,
  useReducer as _useReducer,
  useEventListener as _useEventListener,
  useCallback as _useCallback,
  ensureIntegration,
} from './render/component.js';

import {
  createContext as _createContext,
  useContext as _useContext,
} from './context/index.js';
// } from './core/component.js';

import { render as _render } from './render/index.js';
// './core/index.js';

// Web Component support moved to @fluixi/element (wc-element repo) — import from there.

export default {
  // Core
  createSignal: _createSignal,
  createEffect: _createEffect,
  createMemo: _createMemo,
  createRoot: _createRoot,
  batch: _batch,
  untrack: _untrack,
  onCleanup: _onCleanup,

  // Context (from component for proper support)
  createContext: _createContext,
  useContext: _useContext,

  // Components
  createComponent: _createComponent,
  onMount: _onMount,
  onUnmount: _onUnmount,
  // lazy: _lazy,

  // Hooks
  useEffect: _useEffect,
  useMemo: _useMemo,
  useRef: _useRef,
  useReducer: _useReducer,
  useEventListener: _useEventListener,
  useCallback: _useCallback,

  // Rendering
  render: _render,
  // portal: _portal,

  // Metadata
  VERSION,
  FRAMEWORK_NAME,
  getFrameworkInfo,
};


ensureIntegration('index')
