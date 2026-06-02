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

export * from './dom/index.js';
export * from './dom/integration.js';
export * from './shared/types.js';
export * from './lit/index.js';
export * from './component/index.js';
export * from './flow/index.js';

export type {
  SignalSystem,
  StoreSystem,
  ComponentObserver,
} from './dom/types.js';

import { initializeIntegration, autoInitialize, intergartionInitialized } from './dom/integration.js';
import * as runtime from './dom/index.js';
import {
  createSignal, createEffect, createMemo, createRenderEffect,
  createRoot, createComputed, createResource, createDeferred,
  onCleanup, batch, untrack, getOwner, runWithOwner, setOwner,
  childrens, createContext, useContext, isSignal,
  getSuspenseContext, getSuspenseListContext, resumeEffects, devComponent,
} from '@fluixi/reactive/signal';
import { isStore, isStoreProxy } from '@fluixi/reactive/store';

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
    },
    storeSystem: {
      isStore,
      isStoreProxy,
      unwrap: (v: any) => v,
    },
  });
}

export default {
  ...runtime,
  initializeIntegration,
  autoInitialize,
};
