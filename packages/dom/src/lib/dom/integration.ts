/**
 * @fileoverview Integration Module for Reactive Systems
 * @module @fluixi/dom/integration
 *
 * This module provides integration between the signal/store systems
 * and the DOM runtime, enabling fine-grained reactive updates without
 * tight coupling between packages.
 */

import { Accessor, Computation, ComputationFn, Context, EffectFn, EffectOptions, MemoOptions, 
  RootOwner, SignalTuple, SignalOptions, 
  SuspenseContextType, SuspenseListContextType, 
  type createStore as signalStore, type createDeferred as signalDeferred, 
  createComputed as signalComputed, setOwner as setSignalOwner } from '@fluixi/reactive';
import { CreateComponentReturnType, SignalSystem, StoreSystem } from './types.js';
// Reactive primitives are NOT bridged anymore — they live in the signal core and are
// imported directly here only for this module's own internal helpers (createReactiveBinding,
// the default-export object, status logging). The public re-export of these primitives from
// `@fluixi/dom` happens in the package barrel (lib/index.ts), straight from the core.
import {
  createEffect, batch, createMemo, untrack, getOwner, runWithOwner, createRoot, onCleanup,
} from '@fluixi/reactive/signal';

// ============================================================================
// Types
// ============================================================================

export interface IntegrationOptions {
  /**
   * SignalTuple system to integrate
   */
  signalSystem?: SignalSystem;

  /**
   * Store system to integrate
   */
  storeSystem?: StoreSystem;

  /**
   * Enable automatic wrapping of reactive values
   */
  autoWrap?: boolean;

  /**
   * Enable dev mode features
   */
  development?: boolean;
  
}

// ============================================================================
// State
// ============================================================================

// Shared state stored on globalThis so all bundle instances of this module share one reference.
// Without this, each pre-bundled chunk (e.g. @awc_fluixi.js, @awc_jsx-runtime.js) would
// get its own isolated copy of these variables and call initializeIntegration() independently.
const _integrationStateKey = '__fx_dom_integration__';
const _state: { sys: SignalSystem | null; store: StoreSystem | null; ok: boolean } =
  ((globalThis as any)[_integrationStateKey] ??= { sys: null, store: null, ok: false });


export const intergartionInitialized = () => _state.ok;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize integration with signal and store systems
 */
export function initializeIntegration(options: IntegrationOptions = {}): void {
  const { signalSystem, storeSystem } = options;

  if (!_state.ok) {
    // First call: set directly
    if (signalSystem) _state.sys = signalSystem;
    if (storeSystem)  _state.store  = storeSystem;
    _state.ok = true;
  } else {
    // Subsequent calls: merge — only overwrite null/undefined slots so that
    // the first full initialisation is never discarded, but missing pieces
    // (e.g. createComponent from fluixi) can be patched in later.
    if (signalSystem && _state.sys) {
      for (const key of Object.keys(signalSystem) as (keyof typeof signalSystem)[]) {
        if (signalSystem[key] != null && _state.sys[key] == null) {
          (_state.sys as any)[key] = signalSystem[key];
        }
      }
    } else if (signalSystem) {
      _state.sys = signalSystem;
    }
    if (storeSystem) _state.store = storeSystem;
  }
}

export const registerCreateComponent = (createComponent: (fn: () => any, props?: any) => any) => {
  _state.sys!.createComponent = createComponent;
}

/**
 * Reset integration (useful for testing)
 */
export function resetIntegration(): void {
  _state.sys = null;
  _state.store = null;
  _state.ok = false;
}

/**
 * Check if integration is initialized
 */
export function isIntegrationInitialized(): boolean {
  return _state.ok;
}

// ============================================================================
// SignalTuple System Access
// ============================================================================

/**
 * Get the current signal system
 */
export function getSignalSystem(): SignalSystem | null {
  return _state.sys;
}

export function createComponent<T extends (props?: any) => any, U = any>(Comp: T, props?: U | undefined): CreateComponentReturnType<T, U> {
  if (_state.sys?.createComponent) return _state.sys.createComponent(Comp, props);
  return (() => Comp(props)) as any;
}


// ============================================================================
// Store System Access
// ============================================================================

/**
 * Get the current store system
 */
export function getStoreSystem(): StoreSystem | null {
  return _state.store;
}

/**
 * Check if a value is a store
 */
export function isStore(value: any): boolean {
  if (_state.store?.isStore) {
    return _state.store.isStore(value);
  }
  return false;
}

/**
 * Unwrap a store to get its raw value
 */
export function unwrap<T>(value: T): T {
  if (_state.store?.unwrap) {
    return _state.store.unwrap(value);
  }
  return value;
}

/**
 * Check if a value is a store proxy
 */
export function isStoreProxy(value: any): boolean {
  if (_state.store?.isStoreProxy) {
    return _state.store.isStoreProxy(value);
  }
  return false;
}

/**
 * Subscribe to store changes
 */
export function subscribeToStore(
  store: any,
  callback: (value: any) => void
): () => void {
  if (_state.store?.subscribe) {
    return _state.store.subscribe(store, callback);
  }

  // Fallback: return noop
  return () => {};
}

// ============================================================================
// Reactive Value Detection
// ============================================================================

/**
 * Check if a value is reactive (signal accessor or store proxy)
 */
export function isReactive(value: any): boolean {
  // Check for signal accessor
  if (
    typeof value === 'function' &&
    value.length === 0 &&
    typeof (value as any)._node !== 'undefined'
  ) {
    return true;
  }

  // Check for store
  if (isStore(value) || isStoreProxy(value)) {
    return true;
  }

  return false;
}

/**
 * Resolve a potentially reactive value
 */
export function resolveReactive<T>(value: T | (() => T)): T {
  // SignalTuple accessor
  if (typeof value === 'function' && (value as any).length === 0) {
    return (value as () => T)();
  }

  // Store (already a value)
  if (isStore(value) || isStoreProxy(value)) {
    return value as T;
  }

  return value as T;
}

/**
 * Create a reactive binding for a value
 */
export function createReactiveBinding<T>(
  getValue: () => T,
  onUpdate: (value: T) => void
): () => void {
  return createEffect(() => {
    const value = getValue();
    onUpdate(value);
  });
}


// ============================================================================
// Global Registration
// ============================================================================

/**
 * Register signal system globally
 */
export function registerSignalSystem(system: SignalSystem): void {
  (globalThis as any).__reactiveSignalSystem = system;

  if (!_state.ok) {
    initializeIntegration({ signalSystem: system });
  }
}

/**
 * Register store system globally
 */
export function registerStoreSystem(system: StoreSystem): void {
  (globalThis as any).__reactiveStoreSystem = system;

  if (!_state.ok) {
    initializeIntegration({ storeSystem: system });
  } else if (_state.store === null) {
    _state.store = system;
  }
}

// ============================================================================
// Development Helpers
// ============================================================================

/**
 * Get integration status for debugging
 */
export function getIntegrationStatus() {
  return {
    initialized: _state.ok,
    hasSignalSystem: _state.sys !== null,
    hasStoreSystem: _state.store !== null,
    signalFeatures: _state.sys
      ? {
          hasEffect: !!_state.sys.createEffect,
          hasBatch: !!_state.sys.batch,
          hasMemo: !!_state.sys.createMemo,
          hasUntrack: !!_state.sys.untrack,
          hasOwner: !!_state.sys.getOwner,
          hasRoot: !!_state.sys.createRoot,
        }
      : null,
    storeFeatures: _state.store
      ? {
          hasIsStore: !!_state.store.isStore,
          hasUnwrap: !!_state.store.unwrap,
          hasProxy: !!_state.store.isStoreProxy,
          hasSubscribe: !!_state.store.subscribe,
        }
      : null,
  };
}


// ============================================================================
// Exports
// ============================================================================

export default {
  initializeIntegration,
  resetIntegration,
  isIntegrationInitialized,
  getSignalSystem,
  getStoreSystem,
  createEffect,
  batch,
  createMemo,
  untrack,
  getOwner,
  runWithOwner,
  createRoot,
  onCleanup,
  isStore,
  unwrap,
  isStoreProxy,
  subscribeToStore,
  isReactive,
  resolveReactive,
  createReactiveBinding,
  registerSignalSystem,
  registerStoreSystem,
  getIntegrationStatus,
};
