/**
 * @fileoverview Main entry point for @fluixi/dom package
 * @module @fluixi/dom
 *
 * This package provides a comprehensive reactive DOM runtime with fine-grained updates
 * similar to SolidJS's dom-expressions. It includes:
 * - Core DOM manipulation utilities
 * - Reactive rendering with signal/store support
 * - Control flow components (Show, For, Switch, etc.)
 * - Event delegation
 * - Template caching and optimization
 * - Integration with signal and store systems
 */

// Core imperative runtime + Solid-style control flow (flow/). The lit renderer
// (templates, directives, lit control-flow) is intentionally NOT re-exported
// here so the core barrel stays lit-free and separable — import it from
// '@fluixi/lit' (and its subpaths). This also removes the Show/For name
// collision that arose from re-exporting both flow/ and lit/control-flow/.
export * from './dom/index.js';
export * from './dom/integration.js';
export * from './shared/types.js';
export * from './component/index.js';
export * from './flow/index.js';

export type {
  SignalSystem,
  StoreSystem,
  ComponentObserver,
} from './dom/types.js';

// Reactive primitives live in @fluixi/reactive/signal. @fluixi/dom re-exports them
// straight from the core (no integration-bridge wrappers) so existing
// `import { createSignal } from '@fluixi/dom'` consumers keep working unchanged.
// The integration bridge now only carries framework-provided glue (createComponent).
export {
  createSignal, createEffect, createMemo, createRenderEffect,
  createRoot, createComputed, createResource, createDeferred,
  onCleanup, batch, untrack, getOwner, runWithOwner, setOwner,
  childrens as resolveChildren, createContext, useContext, isSignal,
  getSuspenseContext, getSuspenseListContext, resumeEffects, devComponent,
  getSharedConfig,
} from '@fluixi/reactive/signal';
export { createStore } from '@fluixi/reactive/store';

import { initializeIntegration, autoInitialize, intergartionInitialized } from './dom/integration.js';
import * as runtime from './dom/index.js';
import {
  createSignal, createEffect, createMemo, createRenderEffect,
  createRoot, createComputed, createResource, createDeferred,
  onCleanup, batch, untrack, getOwner, runWithOwner, setOwner,
  childrens, createContext, useContext, isSignal,
  getSuspenseContext, getSuspenseListContext, resumeEffects, devComponent,
  getSharedConfig,
} from '@fluixi/reactive/signal';
import { isStore, isStoreProxy, createStore } from '@fluixi/reactive/store';

// Initialize integration directly from reactive imports — works in both
// ESM dev (Vite source loading) and CJS bundles without relying on require().
if (!intergartionInitialized()) {
  console.log('initializations')
  initializeIntegration({
    signalSystem: {
      createSignal, createEffect, createMemo, createRenderEffect,
      createRoot, createComputed, createResource, createDeferred,
      onCleanup, batch, untrack, getOwner, runWithOwner, setOwner,
      resolveChildren: childrens, createContext, useContext, isSignal,
      getSuspenseContext, getSuspenseListContext, resumeEffects, devComponent,
      createComponent: null as any,
      getSharedConfig: null as any,
    } as any,
    storeSystem: {
      isStore,
      isStoreProxy,
      unwrap: (v: any) => v,
    },
  });
}

export default {
  ...runtime,
  // Reactive primitives now come straight from the core (not the integration bridge),
  // so the default export still carries them for `import DOM from '@fluixi/dom'` consumers.
  createSignal, createEffect, createMemo, createRenderEffect,
  createRoot, createComputed, createResource, createDeferred,
  onCleanup, batch, untrack, getOwner, runWithOwner, setOwner,
  resolveChildren: childrens, createContext, useContext, isSignal,
  getSuspenseContext, getSuspenseListContext, resumeEffects, devComponent,
  getSharedConfig, createStore,
  initializeIntegration,
  autoInitialize,
};
