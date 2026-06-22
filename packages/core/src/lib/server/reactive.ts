/**
 * @fileoverview Server Reactive Primitives for Fluixi
 * @module @fluixi/core/server/reactive
 *
 * Maps reactive primitives for server-side execution
 * Following SolidJS pattern of server-specific reactive behavior
 *
 * Section 4 of GEMINI.md: SERVER MODE
 * - Signals read-only snapshot
 * - Effects run once
 * - No scheduling
 * - No subscriptions
 */

import type {
  SignalTuple,
  Accessor,
  Setter,
  SignalOptions,
  RootOwner,
  Context,
} from '@fluixi/reactive/signal';

// ============================================================================
// SERVER SIGNAL
// ============================================================================

/**
 * Server createSignal - Returns snapshot value
 *
 * Section 4: Signals read-only snapshot on server
 * No reactivity, no tracking, just initial value
 *
 * @template T
 * @param {T} value - Initial value
 * @param {SignalOptions<T>} options - SignalTuple options (ignored on server)
 * @returns {SignalTuple<T>} Tuple of [getter, setter]
 *
 * @example
 * ```typescript
 * // On server, this returns a static snapshot
 * const [count, setCount] = createSignal(0);
 * console.log(count()); // 0
 * setCount(1); // Updates value but triggers no effects
 * console.log(count()); // 1
 * ```
 */
export function createSignal<T>(
  value: T,
  options?: SignalOptions<T>
): SignalTuple<T> {
  // Server: Simple read/write, no reactivity
  let current = value;

  const read: Accessor<T> = (() => current) as unknown as Accessor<T>;
  const write: Setter<T> = (newValue: any) => {
    if (typeof newValue === 'function') {
      current = (newValue as (prev: T) => T)(current);
    } else {
      current = newValue;
    }
    return current;
  };

  return [read, write];
}

// ============================================================================
// SERVER EFFECT
// ============================================================================

/**
 * Server createEffect - Runs once, no tracking
 *
 * Section 4: Effects run once on server, no scheduling
 * Execute immediately and return no-op disposer
 *
 * @param {(v?: any) => any} fn - Effect function
 * @param {any} value - Initial value (optional)
 * @param {any} options - Effect options (ignored on server)
 * @returns {{ dispose: () => void }} Disposer object
 *
 * @example
 * ```typescript
 * // On server, runs once immediately
 * createEffect(() => {
 *   console.log('This runs once');
 * });
 * ```
 */
export function createEffect(
  fn: (v?: any) => any,
  value?: any,
  options?: any
): { dispose: () => void } {
  // Server: Run once, no tracking, no scheduling
  try {
    fn(value);
  } catch (error) {
    console.error('[Fluixi Server] Effect error:', error);
  }

  // Return no-op disposer
  return { dispose: () => {} };
}

// ============================================================================
// SERVER MEMO
// ============================================================================

/**
 * Server createMemo - Compute once, return static accessor
 *
 * Section 4: No tracking on server, single evaluation
 * Memoizes value at creation time
 *
 * @template T
 * @param {(v?: T) => T} fn - Computation function
 * @param {T} value - Initial value (optional)
 * @param {any} options - Memo options (ignored on server)
 * @returns {Accessor<T>} Static accessor
 *
 * @example
 * ```typescript
 * const [count] = createSignal(5);
 * const doubled = createMemo(() => count() * 2);
 * console.log(doubled()); // 10 (computed once)
 * ```
 */
export function createMemo<T>(
  fn: (v?: T) => T,
  value?: T,
  options?: any
): Accessor<T> {
  console.log('memo there')
  // Server: Compute once, no reactivity
  const computed = fn(value);
  return (() => computed) as Accessor<T>;
}

// ============================================================================
// SERVER ROOT
// ============================================================================

/**
 * Server createRoot - Creates owner but no reactive tracking
 *
 * Section 5: Owners exist on server for tree structure
 * Needed for context and cleanup, but no reactive tracking
 *
 * @template T
 * @param {(dispose: () => void) => T} fn - Root function
 * @returns {T} Function result
 *
 * @example
 * ```typescript
 * const result = createRoot((dispose) => {
 *   // Server: Executes once, maintains owner tree
 *   return <App />;
 * });
 * ```
 */
export function createRoot<T>(fn: (dispose: () => void) => T): T {
  // Server: Execute function with no-op disposer
  // Owner tree maintained for context/cleanup
  const cleanups: Array<() => void> = [];

  const dispose = () => {
    cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.error('[Fluixi Server] Cleanup error:', error);
      }
    });
    cleanups.length = 0;
  };

  try {
    return fn(dispose);
  } catch (error) {
    dispose();
    throw error;
  }
}

// ============================================================================
// SERVER BATCH
// ============================================================================

/**
 * Server batch - Execute immediately, no batching
 *
 * Section 4: No scheduling on server
 * Just runs the function synchronously
 *
 * @template T
 * @param {() => T} fn - Function to batch
 * @returns {T} Function result
 *
 * @example
 * ```typescript
 * batch(() => {
 *   setCount(1);
 *   setName('Alice');
 * }); // Executes immediately
 * ```
 */
export function batch<T>(fn: () => T): T {
  // Server: No batching needed, just run
  return fn();
}

// ============================================================================
// SERVER UNTRACK
// ============================================================================

/**
 * Server untrack - Execute function (already untracked)
 *
 * Section 4: No tracking on server anyway
 * This is a no-op but exists for API compatibility
 *
 * @template T
 * @param {() => T} fn - Function to run untracked
 * @returns {T} Function result
 *
 * @example
 * ```typescript
 * untrack(() => {
 *   return signal(); // Not tracked (but nothing is on server)
 * });
 * ```
 */
export function untrack<T>(fn: () => T): T {
  // Server: Already untracked, just run
  return fn();
}

// ============================================================================
// SERVER CLEANUP
// ============================================================================

let currentCleanups: Array<() => void> | null = null;

/**
 * Server onCleanup - Register cleanup function
 *
 * Section 5: Cleanup still needed for SSR resource management
 * Stores cleanup for execution when root disposes
 *
 * @param {() => void} fn - Cleanup function
 *
 * @example
 * ```typescript
 * createRoot((dispose) => {
 *   onCleanup(() => {
 *     console.log('Cleanup on dispose');
 *   });
 *   return result;
 * });
 * ```
 */
export function onCleanup(fn: () => void): void {
  if (currentCleanups) {
    currentCleanups.push(fn);
  }
}

// ============================================================================
// SERVER OWNER
// ============================================================================

let currentOwner: RootOwner | null = null;

/**
 * Server getOwner - Get current reactive owner
 *
 * Section 5: Owner tree maintained on server for context
 *
 * @returns {RootOwner | null} Current owner or null
 */
export function getOwner(): RootOwner | null {
  return currentOwner;
}

/**
 * Server runWithOwner - Run function with specific owner
 *
 * Section 5: Owner switching for proper context nesting
 *
 * @template T
 * @param {RootOwner | null} owner - Owner to run with
 * @param {() => T} fn - Function to run
 * @returns {T} Function result
 */
export function runWithOwner<T>(owner: RootOwner | null, fn: () => T): T {
  const prev = currentOwner;
  currentOwner = owner;
  try {
    return fn();
  } finally {
    currentOwner = prev;
  }
}

// ============================================================================
// SERVER CONTEXT
// ============================================================================

const contextMap = new Map<symbol, any>();

/**
 * Server createContext - Create context with default value
 *
 * Section 9: Context lookup-based, no subscriptions on server
 *
 * @template T
 * @param {T} defaultValue - Default context value
 * @returns {Context<T>} Context object
 *
 * @example
 * ```typescript
 * const ThemeContext = createContext('light');
 * ```
 */
export function createContext<T>(defaultValue?: T): Context<T> {
  const id = Symbol('context');

  const Provider = (props: { value: T; children?: any }) => {
    // Server: Store value in context map
    const prevValue = contextMap.get(id);
    contextMap.set(id, props.value);

    try {
      return props.children;
    } finally {
      // Restore previous value
      if (prevValue !== undefined) {
        contextMap.set(id, prevValue);
      } else {
        contextMap.delete(id);
      }
    }
  };

  return {
    id,
    Provider,
    defaultValue: defaultValue as T,
  } as Context<T>;
}

/**
 * Server useContext - Retrieve context value
 *
 * Section 9: No subscriptions on server, just lookup
 *
 * @template T
 * @param {Context<T>} context - Context to use
 * @returns {T} Context value
 *
 * @example
 * ```typescript
 * const theme = useContext(ThemeContext);
 * ```
 */
export function useContext<T>(context: Context<T>): T {
  // Server: Simple lookup, no subscription
  const value = contextMap.get(context!.id);
  return value !== undefined ? value : context.defaultValue!;
}

// ============================================================================
// SERVER COMPUTED
// ============================================================================

/**
 * Server createComputed - Alias for createEffect
 *
 * On server, computed values run once like effects
 *
 * @param {() => any} fn - Computation function
 * @returns {{ dispose: () => void }} Disposer
 */
export function createComputed(fn: () => any): { dispose: () => void } {
  return createEffect(fn);
}

// ============================================================================
// SERVER RENDER EFFECT
// ============================================================================

/**
 * Server createRenderEffect - Runs once for SSR rendering
 *
 * @param {() => any} fn - Render effect function
 * @returns {{ dispose: () => void }} Disposer
 */
export function createRenderEffect(fn: () => any): { dispose: () => void } {
  return createEffect(fn);
}

// ============================================================================
// SERVER DEFERRED
// ============================================================================

/**
 * Server createDeferred - No deferring on server
 *
 * @template T
 * @param {() => T} fn - Deferred computation
 * @returns {Accessor<T>} Accessor
 */
export function createDeferred<T>(fn: () => T): Accessor<T> {
  return createMemo(fn);
}

// ============================================================================
// SERVER SELECTOR
// ============================================================================

/**
 * Server createSelector - Returns static equality check
 *
 * @template T
 * @param {() => T} source - Source value
 * @returns {(key: T) => boolean} Selector function
 */
// ENVIRONMENT
export function createSelector<T>(source: () => T): (key: T) => boolean {
  const value = source();
  return (key: T) => key === value;
}

// ============================================================================
// SERVER RESOURCE
// ============================================================================

/**
 * Server createResource - Stub for resource creation
 *
 * @param source Source signal or value
 * @param fetcher Fetcher function
 * @param options Resource options
 */
export function createResource<T, S = true>(
  source: any,
  fetcher?: any,
  options?: any
): [() => T | undefined, { mutate: (v: T) => T; refetch: () => void }] {
  return [
    () => undefined,
    {
      mutate: (v: T) => v,
      refetch: () => {},
    },
  ];
}

// ============================================================================
// SERVER STORE
// ============================================================================

export type Store<T extends object> = { readonly [K in keyof T]: T[K] };
export type SetStoreFunction<T extends object> = {
  (patch: { [K in keyof T]?: T[K] | ((prev: T[K]) => T[K]) }): void;
  <K extends keyof T>(key: K, value: T[K] | ((prev: T[K]) => T[K])): void;
};

/**
 * Server createStore — plain object wrapper, no reactivity.
 * Mirrors the client API so shared code compiles on both sides.
 */
export function createStore<T extends object>(
  init: T
): [Store<T>, SetStoreFunction<T>] {
  const state: T = { ...init };

  function setStore(keyOrPatch: any, value?: any): void {
    if (
      typeof keyOrPatch === 'object' &&
      keyOrPatch !== null &&
      !Array.isArray(keyOrPatch)
    ) {
      for (const k of Object.keys(keyOrPatch)) {
        const v = keyOrPatch[k];
        (state as any)[k] = typeof v === 'function' ? v((state as any)[k]) : v;
      }
    } else {
      (state as any)[keyOrPatch] =
        typeof value === 'function' ? value((state as any)[keyOrPatch]) : value;
    }
  }

  return [state as Store<T>, setStore as SetStoreFunction<T>];
}

// ============================================================================
// SERVER TRANSITION
// ============================================================================

/**
 * Server startTransition - Execute immediately
 *
 * @param fn Transition function
 */
export function startTransition(fn: () => void): void {
  fn();
}

// ============================================================================
// ENVIRONMENT
// ============================================================================
// ENVIRONMENT
// ============================================================================

/**
 * Check if running on server
 */
export const isServer = true;

/**
 * Check if running on client
 */
export const isClient = false;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { SignalTuple, Accessor, Setter, SignalOptions, RootOwner, Context };

// ============================================================================
// COMPATIBILITY
// ============================================================================

/**
 * Server sharedConfig - Empty config object for compatibility
 */
export const sharedConfig = {
  context: null as RootOwner | null,
  owner: null as RootOwner | null,
};

/**
 * Set current reactive owner (for internal use)
 * @internal
 */
export function setOwner(owner: RootOwner | null): void {
  currentOwner = owner;
  sharedConfig.owner = owner;
  sharedConfig.context = owner;
}

/**
 * Get shared config (for compatibility)
 * @internal
 */
export function getSharedConfig() {
  return sharedConfig;
}
