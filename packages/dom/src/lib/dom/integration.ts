/**
 * @fileoverview Integration Module for Reactive Systems
 * @module @awc/dom/integration
 *
 * This module provides integration between the signal/store systems
 * and the DOM runtime, enabling fine-grained reactive updates without
 * tight coupling between packages.
 */

import { Accessor, Computation, ComputationFn, Context, EffectFn, EffectOptions, MemoOptions, 
  RootOwner, Signal, SignalOptions, 
  SuspenseContextType, SuspenseListContextType, 
  type createStore as signalStore, type createDeferred as signalDeferred, 
  createComputed as signalComputed, setOwner as setSignalOwner } from '@awc/reactive';
import { CreateComponentReturnType, DevComponent, Resource, SignalSystem, StoreSystem } from './types.js';

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

// Shared state stored on globalThis so all bundle instances of this module share one reference.
// Without this, each pre-bundled chunk (e.g. @awc_kettlejs.js, @awc_jsx-runtime.js) would
// get its own isolated copy of these variables and call initializeIntegration() independently.
const _integrationStateKey = '__awc_dom_integration__';
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
    // (e.g. createComponent from kettlejs) can be patched in later.
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
// Signal System Access
// ============================================================================

/**
 * Get the current signal system
 */
export function getSignalSystem(): SignalSystem | null {
  return _state.sys;
}

/**
 * Create an effect using the integrated signal system
 */
export function createEffect(fn: EffectFn, value?: any, options?: EffectOptions): () => void {
  if (_state.sys?.createEffect) return _state.sys.createEffect(fn, value, options);
  console.log('create effect not found');
  return () => fn();
}
function _devComponent(fn: Parameters<DevComponent>[0]): ReturnType<DevComponent> {
  if (_state.sys?.devComponent) return _state.sys.devComponent(fn);
  console.log('devComponent not found');
  return () => fn();
}
export const devComponent = _devComponent as DevComponent;
function _createResource(...params: any[]): ReturnType<Resource> {
  if (_state.sys?.createResource) return (_state.sys.createResource as any)(...params);
  throw new Error('create resource not found');
}
export const createResource = _createResource as Resource;

export function createRenderEffect<T>(fn: (prev: T) => T, value?: T | undefined, options?: EffectOptions | undefined): () => void {
  if (_state.sys?.createRenderEffect) return _state.sys.createRenderEffect(fn, value, options);
  console.log('create render effect not found');
  return (() => fn(value as T)) as any;
}
export function createContext<T>(defaultValue?: T | undefined): {
    Provider: (props: { value: T; children: any; debug?: boolean | undefined }) => any;
    defaultValue: T | undefined;
    id: symbol;
  } {
  if (_state.sys?.createContext) return _state.sys.createContext(defaultValue);
  console.log('create context not found');
  return null as any;
}
export function useContext<T>(context: { id: symbol; defaultValue?: T }): T | undefined {
  if (_state.sys?.useContext) return _state.sys.useContext(context);
  console.log('use context not found');
  return null as any;
}
export function resolveChildren(value: any): Accessor<any> {
  if (_state.sys?.resolveChildren) return _state.sys.resolveChildren(value);
  console.log('resolve children not found');
  return () => value;
}
export function createComponent<T extends (props?: any) => any, U = any>(Comp: T, props?: U | undefined): CreateComponentReturnType<T, U> {
  if (_state.sys?.createComponent) return _state.sys.createComponent(Comp, props);
  console.log('create component not found');
  return (() => Comp(props)) as any;
}
export function createSignal<T>(initialValue: T, options?: SignalOptions<T> | undefined): Signal<T> {
  if (_state.sys?.createSignal) return _state.sys.createSignal(initialValue, options);
  console.log('create signal not found');
  return [() => initialValue, () => {}];
}
// export function resolveChildren(initialValue: any): ()=>any {
//   if (_state.sys?.resolveChildren) {
//     return _state.sys.resolveChildren(initialValue);
//   }

//   // Fallback to internal implementation
//   console.log('resolve children not found')
//   return () => initialValue;
//   // return internalCreateRenderEffect(fn);
// }

/**
 * Batch updates using the integrated signal system
 */
export function batch(fn: () => void): void {
  if (_state.sys?.batch) {
    _state.sys.batch(fn);
  } else {
    console.log('batch not found')

    // Fallback: just execute
    fn();
  }
}

/**
 * Create a memo using the integrated signal system
 */
export function createMemo<T>(fn: ComputationFn<T>, value?: T, options?: MemoOptions<T>): Accessor<T>{
  if (_state.sys?.createMemo) {
    return _state.sys.createMemo(fn, value, options);
  }
  console.log('create memo not found')

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
  if (_state.sys?.untrack) return _state.sys.untrack(fn);
  console.log('untrack not found');
  return fn();
}

export function getOwner(): RootOwner | null {
  if (_state.sys?.getOwner) return _state.sys.getOwner();
  console.log('get owner not found');
  return null;
}

export function runWithOwner<T>(owner: any, fn: () => T): T {
  if (_state.sys?.runWithOwner) return _state.sys.runWithOwner(owner, fn);
  console.log('run with owner not found');
  return fn();
}

/**
 * Create a root computation context
 */
export function createRoot<T>(fn: (dispose: () => void) => T): T {
  if (_state.sys?.createRoot) {
    return _state.sys.createRoot(fn);
  }

  // Fallback: execute with noop dispose
  return fn(() => {});
}

/**
 * Add a cleanup function
 */
export function onCleanup(fn: () => void): void {
  if (_state.sys?.onCleanup) {
    _state.sys.onCleanup(fn);
  }
}
function _createStore(...params: any[]): void {
  if (_state.sys?.createStore) {
    (_state.sys.createStore as any)(...params as any);
  }
}
function _createDeferred(...params: any[]): void {
  if (_state.sys?.createDeferred) {
    (_state.sys.createDeferred as any)(...params as any);
  }
}
function _createComputed(...params: any[]): void {
  if (_state.sys?.createComputed) {
    (_state.sys.createComputed as any)(...(params as any));
  }
}
function _setOwner(...params: any[]): void {
  if (_state.sys?.setOwner) {
    (_state.sys.setOwner as any)(...(params as any));
  }
}
function _getSharedConfig(...params: any[]): void {
  if (_state.sys?.getSharedConfig) {
    (_state.sys.getSharedConfig as any)(...(params as any));
  }
}
export const createStore = _createStore as typeof signalStore;
export const createDeferred = _createDeferred as typeof signalDeferred;
export const createComputed = _createComputed as typeof signalComputed;
export const setOwner = _setOwner as typeof setSignalOwner;
export const getSharedConfig = _getSharedConfig as SignalSystem['getSharedConfig'];

// export function createComputed<T>(
//   fn: ComputationFn<T>,
//   value?: T,
//   options?: EffectOptions
// ): void {
//   if (_state.sys?.createComputed) {
//     _state.sys.createComputed(fn);
//   }
// }

export function resumeEffects(effects: Computation[]): void {
  if (_state.sys?.resumeEffects) {
    _state.sys.resumeEffects(effects);
    return;
  }
  console.log('resume effects not found')
}

export function getSuspenseContext(): Context<SuspenseContextType | undefined> {
  if (_state.sys?.getSuspenseContext) return _state.sys.getSuspenseContext();
  console.log('getSuspenseContext not found');
  return undefined as any;
}

export function getSuspenseListContext(): Context<SuspenseListContextType | undefined> {
  if (_state.sys?.getSuspenseListContext) return _state.sys.getSuspenseListContext();
  console.log('getSuspenseListContext not found');
  return undefined as any;
}

export function isSignal<T extends any>(value: any): value is Accessor<T> {
  if (_state.sys?.isSignal) return _state.sys.isSignal(value);
  console.log('isSignal not found');
  return false as any;
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
  if (_state.ok) return;

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
            resolveChildren: signalModule.childrens,
            devComponent: signalModule.devComponent,
            createResource: signalModule.createResource,
            createContext: signalModule.createContext,
            useContext: signalModule.useContext,
            isSignal: signalModule.isSignal,
            getSuspenseContext: signalModule.getSuspenseContext,
            getSuspenseListContext: signalModule.getSuspenseListContext,
            resumeEffects: signalModule.resumeEffects,
            createComputed: signalModule.createComputed,
            createStore: signalModule.createStore,
            createComponent: null as any,
            createDeferred: signalModule.createDeferred,
            setOwner: signalModule.setOwner,
            getSharedConfig: signalModule.getSharedConfig
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
