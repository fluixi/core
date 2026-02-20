/**
 * @fileoverview Integration Module for Reactive Systems
 * @module @awc/dom/integration
 *
 * This module provides integration between the signal/store systems
 * and the DOM runtime, enabling fine-grained reactive updates without
 * tight coupling between packages.
 */

import { RootOwner } from '@awc/reactive';
import {
  createRenderEffect as internalCreateRenderEffect,
  registerEffectCreator,
  registerBatch,
  runtimeBatch as internalBatch,
  registerCreateComponent,
} from './runtime.js';
import { SignalSystem, StoreSystem } from './types.js';

// ============================================================================
// Types
// ============================================================================

export interface IntegrationOptions {
  /**
   * Signal system to integrate
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

let currentSignalSystem: SignalSystem | null = null;
let currentStoreSystem: StoreSystem | null = null;
let isInitialized = false;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize integration with signal and store systems
 */
export function initializeIntegration(options: IntegrationOptions = {}): void {
  if (isInitialized && !options.development) {
    console.warn('DOM integration already initialized. Skipping...');
    return;
  }

  const { signalSystem, storeSystem } = options;

  if (signalSystem) {
    currentSignalSystem = signalSystem;

    // Register effect creator with the runtime
    if (signalSystem.createEffect) {
      registerEffectCreator(signalSystem.createEffect);
    }

    // Register batch function with the runtime
    if (signalSystem.batch) {
      registerBatch(signalSystem.batch);
    }
    if (signalSystem.createComponent) {
      registerCreateComponent(signalSystem.createComponent);
    }
  }

  if (storeSystem) {
    currentStoreSystem = storeSystem;
  }

  isInitialized = true;
}

/**
 * Reset integration (useful for testing)
 */
export function resetIntegration(): void {
  currentSignalSystem = null;
  currentStoreSystem = null;
  isInitialized = false;
}

/**
 * Check if integration is initialized
 */
export function isIntegrationInitialized(): boolean {
  return isInitialized;
}

// ============================================================================
// Signal System Access
// ============================================================================

/**
 * Get the current signal system
 */
export function getSignalSystem(): SignalSystem | null {
  return currentSignalSystem;
}

/**
 * Create an effect using the integrated signal system
 */
export function createEffect(fn: () => void): () => void {
  if (currentSignalSystem?.createEffect) {
    return currentSignalSystem.createEffect(fn);
  }

  // Fallback to internal implementation
  return internalCreateRenderEffect(fn);
}
export function createComponent(fn: () => any, props: any): () => void {
  if (currentSignalSystem?.createComponent) {
    return currentSignalSystem.createComponent(fn as any, props);
  }

  // Fallback to internal implementation
  return internalCreateRenderEffect(fn);
}

/**
 * Batch updates using the integrated signal system
 */
export function batch(fn: () => void): void {
  if (currentSignalSystem?.batch) {
    currentSignalSystem.batch(fn);
  } else {
    internalBatch(fn);
  }
}

/**
 * Create a memo using the integrated signal system
 */
export function createMemo<T>(fn: () => T): () => T {
  if (currentSignalSystem?.createMemo) {
    return currentSignalSystem.createMemo(fn);
  }

  // Fallback: just return the function
  let cached: T;
  let computed = false;

  return () => {
    if (!computed) {
      cached = fn();
      computed = true;
    }
    return cached;
  };
}

/**
 * Untrack a computation
 */
export function untrack<T>(fn: () => T): T {
  if (currentSignalSystem?.untrack) {
    return currentSignalSystem.untrack(fn);
  }

  // Fallback: just execute
  return fn();
}

/**
 * Get the current reactive owner
 */
export function getOwner(): RootOwner | null {
  if (currentSignalSystem?.getOwner) {
    return currentSignalSystem.getOwner();
  }
  return null;
}

/**
 * Run with a specific owner
 */
export function runWithOwner<T>(owner: any, fn: () => T): T {
  if (currentSignalSystem?.runWithOwner) {
    return currentSignalSystem.runWithOwner(owner, fn);
  }

  // Fallback: just execute
  return fn();
}

/**
 * Create a root computation context
 */
export function createRoot<T>(fn: (dispose: () => void) => T): T {
  if (currentSignalSystem?.createRoot) {
    return currentSignalSystem.createRoot(fn);
  }

  // Fallback: execute with noop dispose
  return fn(() => {});
}

/**
 * Add a cleanup function
 */
export function onCleanup(fn: () => void): void {
  if (currentSignalSystem?.onCleanup) {
    currentSignalSystem.onCleanup(fn);
  }
}

// ============================================================================
// Store System Access
// ============================================================================

/**
 * Get the current store system
 */
export function getStoreSystem(): StoreSystem | null {
  return currentStoreSystem;
}

/**
 * Check if a value is a store
 */
export function isStore(value: any): boolean {
  if (currentStoreSystem?.isStore) {
    return currentStoreSystem.isStore(value);
  }
  return false;
}

/**
 * Unwrap a store to get its raw value
 */
export function unwrap<T>(value: T): T {
  if (currentStoreSystem?.unwrap) {
    return currentStoreSystem.unwrap(value);
  }
  return value;
}

/**
 * Check if a value is a store proxy
 */
export function isStoreProxy(value: any): boolean {
  if (currentStoreSystem?.isStoreProxy) {
    return currentStoreSystem.isStoreProxy(value);
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
  if (currentStoreSystem?.subscribe) {
    return currentStoreSystem.subscribe(store, callback);
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
  // Signal accessor
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
// Auto-initialization
// ============================================================================

/**
 * Attempt to auto-initialize with available systems
 */
export function autoInitialize(): void {
  if (isInitialized) return;

  // Try to find signal system in global scope
  const globalAny = globalThis as any;

  if (globalAny.__reactiveSignalSystem) {
    initializeIntegration({
      signalSystem: globalAny.__reactiveSignalSystem,
      storeSystem: globalAny.__reactiveStoreSystem,
    });
    return;
  }

  // Try to import from packages
  try {
    // Dynamic import approach
    if (typeof require !== 'undefined') {
      try {
        const signalModule = require('@awc/reactive/signal');
        const storeModule = require('@awc/reactive/store');
        console.log('loading from packages');
        initializeIntegration({
          signalSystem: {
            createEffect: signalModule.createEffect,
            batch: signalModule.batch,
            createMemo: signalModule.createMemo,
            untrack: signalModule.untrack,
            getOwner: signalModule.getOwner,
            runWithOwner: signalModule.runWithOwner,
            createRoot: signalModule.createRoot,
            onCleanup: signalModule.onCleanup,
            createComponent: null as any,
          },
          storeSystem: {
            isStore: storeModule.isStore,
            unwrap: storeModule.unwrap,
            isStoreProxy: storeModule.isStoreProxy,
          },
        });
      } catch (e) {
        // Module not available, continue
      }
    }
  } catch (e) {
    // Import failed, continue without integration
  }
}

// ============================================================================
// Global Registration
// ============================================================================

/**
 * Register signal system globally
 */
export function registerSignalSystem(system: SignalSystem): void {
  (globalThis as any).__reactiveSignalSystem = system;

  if (!isInitialized) {
    initializeIntegration({ signalSystem: system });
  }
}

/**
 * Register store system globally
 */
export function registerStoreSystem(system: StoreSystem): void {
  (globalThis as any).__reactiveStoreSystem = system;

  if (!isInitialized) {
    initializeIntegration({ storeSystem: system });
  } else if (currentStoreSystem === null) {
    currentStoreSystem = system;
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
    initialized: isInitialized,
    hasSignalSystem: currentSignalSystem !== null,
    hasStoreSystem: currentStoreSystem !== null,
    signalFeatures: currentSignalSystem
      ? {
          hasEffect: !!currentSignalSystem.createEffect,
          hasBatch: !!currentSignalSystem.batch,
          hasMemo: !!currentSignalSystem.createMemo,
          hasUntrack: !!currentSignalSystem.untrack,
          hasOwner: !!currentSignalSystem.getOwner,
          hasRoot: !!currentSignalSystem.createRoot,
        }
      : null,
    storeFeatures: currentStoreSystem
      ? {
          hasIsStore: !!currentStoreSystem.isStore,
          hasUnwrap: !!currentStoreSystem.unwrap,
          hasProxy: !!currentStoreSystem.isStoreProxy,
          hasSubscribe: !!currentStoreSystem.subscribe,
        }
      : null,
  };
}

/**
 * Print integration status to console
 */
export function logIntegrationStatus(): void {
  const status = getIntegrationStatus();
  console.group('🔗 DOM Integration Status');
  console.log('Initialized:', status.initialized);
  console.log('Signal System:', status.hasSignalSystem ? '✓' : '✗');
  console.log('Store System:', status.hasStoreSystem ? '✓' : '✗');

  if (status.signalFeatures) {
    console.group('Signal Features');
    console.table(status.signalFeatures);
    console.groupEnd();
  }

  if (status.storeFeatures) {
    console.group('Store Features');
    console.table(status.storeFeatures);
    console.groupEnd();
  }

  console.groupEnd();
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
  autoInitialize,
  registerSignalSystem,
  registerStoreSystem,
  getIntegrationStatus,
  logIntegrationStatus,
};
