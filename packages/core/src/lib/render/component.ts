/**
 * @fileoverview Component Creation for Fluixi
 * @module @fluixi/core/render/component
 *
 * Implements Section 2 of GEMINI.md: createComponent (CRITICAL)
 *
 * This module provides ONLY component creation logic.
 * Following SolidJS structure, this does NOT include:
 * - Context (managed by reactive system)
 * - Rendering (moved to render/index.ts)
 * - SSR (moved to server/)
 */

import {
  initializeIntegration,
  registerBatch,
  registerEffectCreator,
  registerCreateComponent,
  asComponent,
  CreateComponentReturnType,
  intergartionInitialized,
} from '@fluixi/dom';
import {
  untrack,
  onCleanup,
  getOwner,
  createEffect,
  createMemo,
  createSignal,
  isSignal,
  batch,
  createRoot,
  runWithOwner,
  createComputed,
  // createContext as createReactiveContext,
  // useContext as useReactiveContext,
  devComponent,
  __DEV__,
  createRenderEffect,
  trackPromise,
  childrens,
  createResource,
  createContext,
  useContext,
  getSuspenseContext,
  getSuspenseListContext,
  resumeEffects,
  createDeferred,
  getSharedConfig as getSignalSharedConfig,
} from '@fluixi/reactive/signal';

import {createStore} from "@fluixi/reactive/store";
// } from '@fluixi/core/rx';

// Note: Owner type from @fluixi/reactive/signal
type Owner = any;

// ============================================================================
// SHARED CONFIG (like SolidJS)
// ============================================================================

interface SharedConfig {
  context: Owner | null;
  owner: Owner | null;
}

const sharedConfig: SharedConfig = {
  context: null,
  owner: null,
};

/**
 * Get shared reactive config
 * Used for maintaining reactive context across components
 * @internal
 */
export function getSharedConfig(): SharedConfig {
  return sharedConfig;
}

/**
 * Set current owner in shared config
 * @internal
 */
export function setOwner(owner: Owner | null): void {
  sharedConfig.owner = owner;
  sharedConfig.context = owner;
}

/**
 * Get current owner from shared config
 * @internal
 */
export function getContextOwner(): Owner | null {
  return sharedConfig.context || sharedConfig.owner;
}

// ============================================================================
// GLOBAL STATE
// ============================================================================

/**
 * Development mode flag
 */
export const DEV =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Component props type
 */
// export interface ComponentProps {
//   children?: any;
//   [key: string]: any;
// }

// /**
//  * Component function type
//  */
// export type Component<P = ComponentProps, Return = any> = (props?: P) => Return;



/**
 * Lifecycle callback type
 */
export type LifecycleCallback = {
  mounted?: boolean;
  (): void | (() => void);
};

/**
 * Ref object type
 */
export interface RefObject<T> {
  current: T;
}

// ============================================================================
// OWNER-BASED LIFECYCLE COORDINATION
// ============================================================================
// Every component has a reactive Owner (from devComponent or createRoot).
// onMount and useEffect attach callbacks to the Owner via a Symbol-keyed
// property. A single queueMicrotask per Owner flushes them in order:
//   1. All onMount callbacks run first
//   2. Then all useEffect callbacks are created as reactive effects
// This works regardless of whether the component goes through $component,
// the JSX runtime, or is called directly — as long as there's an Owner.

const _LIFECYCLE = Symbol.for('fluixi-lifecycle');

interface OwnerLifecycle {
  mounts: Array<() => void | (() => void)>;
  effects: Array<() => void | (() => void)>;
  scheduled: boolean;
}

/**
 * Get or create a lifecycle bucket on the current Owner.
 * Returns null if there is no reactive Owner.
 */
function getOwnerLifecycle(): OwnerLifecycle | null {
  const owner = getOwner() as any;
  if (!owner) return null;

  if (!owner[_LIFECYCLE]) {
    const lc: OwnerLifecycle = { mounts: [], effects: [], scheduled: false };
    owner[_LIFECYCLE] = lc;
  }
  return owner[_LIFECYCLE];
}

/**
 * Schedule a microtask to flush the lifecycle for the current Owner.
 * Only schedules once per Owner — subsequent calls are no-ops.
 */
function scheduleLifecycleFlush(lc: OwnerLifecycle): void {
  if (lc.scheduled) return;
  lc.scheduled = true;

  // Capture the owner now; by microtask time it will have been restored.
  const owner = getOwner();

  queueMicrotask(() => {
    runWithOwner(owner, () => {
      // 1. Run ALL onMount callbacks first
      for (const cb of lc.mounts) {
        try {
          const cleanup = cb();
          if (typeof cleanup === 'function') {
            onCleanup(cleanup);
          }
        } catch (e) {
          console.error('Error in onMount callback:', e);
        }
      }

      // 2. THEN create effects for useEffect callbacks
      for (const cb of lc.effects) {
        let cleanup: (() => void) | void;
        createEffect(() => {
          if (cleanup) cleanup();
          cleanup = cb();
        });
        onCleanup(() => {
          if (cleanup) cleanup();
        });
      }

      // Clear
      lc.mounts = [];
      lc.effects = [];
    });
  });
}

/**
 * Integration initialized flag
 */
// let integrationInitialized = false;

// ============================================================================
// Integration Setup
// ============================================================================

/**
 * Initialize integration with reactive system
 */
export function ensureIntegration(from?: string): void {
  // Always call initializeIntegration — it now merges rather than replaces,
  // so calling it multiple times is safe. createComponent lives here (not in
  // @fluixi/dom) so it must be patched in every time until fully registered.
  initializeIntegration({
    signalSystem: {
      createEffect,
      createRenderEffect,
      createRoot,
      createMemo,
      createSignal,
      resolveChildren: childrens,
      batch,
      untrack,
      getOwner,
      runWithOwner,
      onCleanup,
      createComponent,
      devComponent,
      createResource,
      createContext,
      useContext,
      getSuspenseContext,
      getSuspenseListContext,
      createComputed,
      resumeEffects,
      isSignal,
      createStore,
      createDeferred,
      getSharedConfig: getSignalSharedConfig,
      setOwner,
    } as any,
  });

  registerEffectCreator(createEffect);
  registerBatch(batch);
  registerCreateComponent(createComponent as any);

}

// ============================================================================
// SECTION 2 — createComponent (CRITICAL)
// ============================================================================

/**
 * Create and execute a component
 *
 * Section 2 — createComponent responsibilities:
 * - Create Owner ✓
 * - Untrack execution ✓
 * - Capture output ✓
 * - Lazy children ✓
 * - Context propagation ✓ (via sharedConfig)
 * - Cleanup attachment ✓
 *
 * Section 1: Components execute once, never re-execute
 *
 * @template P - Props type
 * @param {Component<P>} Comp - Component function
 * @param {P} props - Component props
 * @returns {any} Component output
 *
 * @example
 * ```typescript
 * const MyComponent = (props: { name: string }) => {
 *   return html`<div>Hello ${props.name}</div>`;
 * };
 *
 * const result = createComponent(MyComponent, { name: 'World' });
 * ```
 */
// export function $component<T, U = any>(value: T, props?: U) {
//   const component = () => (typeof value === 'function' && props) ?(value as any)(props) : value;
//   Object.defineProperty(component, '__fluixi', {
//     enumerable: true,
//     configurable: true,
//     value: true,
//   });
//    // (component as any).$COMPONENT = true;
//   return asComponent(component) as C<T, U>;
// }
//
export function createComponent<T extends (props?: any) => any, U = any>(
  Comp: T,
  props?: U
): CreateComponentReturnType<T, U> {
  return $component(Comp, props)
  // const c = $component(Comp, props)
  // // return c() as any
  // return  c as any
}

const cached = new WeakMap<any, any>()

export function $component<T extends (props?: any) => any, U = any>(value: T, props?: U) {
  // if(isComponent(value) || isRoutes(value) || isRouter(value)) {
  // //   if(!cached.has(value)){
  // //     cached.set(value, ()=>untrack(()=>value(props)))
  // //   }else{
      
  // //     console.log('skipp track', value)
  // //   }
  // //  return cached.get(value)()
  //   return untrack(() => value(props))
  // }
  const component = (typeof value === 'function')
    ? isDev() ? devComponent(value, props) : untrack(() => value(props))
    // ? isDev() ? devComponent(value, props) : devComponent(value, props)
    : value;
  // Only stamp $name and $COMPONENT on functions/objects — primitives (strings, numbers)
  // cannot have properties added in strict mode and would throw TypeError.
  // Also skip stamping reactive values (signals/memos) with $COMPONENT so the DOM
  // runtime doesn't misidentify them as static component thunks and cache them.
  if (component != null && (typeof component === 'function' || typeof component === 'object') && !isSignal(component)) {
    try { (component as any)['$name'] = value.name; } catch {}
    // Always mark with asComponent so isComponent() works reliably in both dev and
    // production browser environments.
    return asComponent(component) as CreateComponentReturnType<T, U>;
  }
  return component as CreateComponentReturnType<T, U>;
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

/**
 * Register a callback to run when component mounts
 *
 * SolidJS-aligned: uses createEffect to schedule the callback.
 * The effect runs once after the reactive graph is established,
 * tied to the current Owner for automatic cleanup.
 *
 * @param {LifecycleCallback} fn - Mount callback
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   onMount(() => {
 *     console.log('Component mounted');
 *     return () => console.log('Cleanup');
 *   });
 *
 *   return html`<div>Content</div>`;
 * };
 * ```
 */
export function onMount(fn: LifecycleCallback, reactive: boolean = true): void {
  const lc = getOwnerLifecycle();
  if (lc) {
    if(!reactive) {
      if(!lc.scheduled){
        fn();
      }
      return;
    }
    // Attach to Owner — will run BEFORE useEffect callbacks in the flush.
    lc.mounts.push(fn);
    scheduleLifecycleFlush(lc);
  } else {
    if(!reactive) {
      fn();
      return;
    }
    // No Owner (rare). Fall back to SolidJS pattern.
    createEffect(() => {
      const cleanup = untrack(fn);
      if (typeof cleanup === 'function') {
        onCleanup(cleanup);
      }
    });
  }
}

/**
 * Register a callback to run when component unmounts
 *
 * SolidJS-aligned: directly delegates to onCleanup which registers
 * with the current reactive Owner for automatic disposal.
 *
 * @param {() => void} fn - Unmount callback
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   onUnmount(() => {
 *     console.log('Component is unmounting');
 *   });
 *
 *   return html`<div>Content</div>`;
 * };
 * ```
 */
export function onUnmount(fn: () => void): void {
  onCleanup(fn);
}

/**
 * Register a cleanup function
 *
 * Section 1: Component constructs reactive graph including cleanup
 *
 * @param {() => void} fn - Cleanup function
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const timer = setInterval(() => console.log('tick'), 1000);
 *
 *   onCleanup(() => clearInterval(timer));
 *
 *   return html`<div>Timer running</div>`;
 * };
 * ```
 */
export { onCleanup };

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Create a reactive effect
 *
 * Effects run when their dependencies change
 * On server, effects run once
 *
 * @param {(v?: any) => any} fn - Effect function
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const [count, setCount] = createSignal(0);
 *
 *   useEffect(() => {
 *     console.log('Count changed:', count());
 *   });
 *
 *   return html`<button @click=${() => setCount(count() + 1)}>Click</button>`;
 * };
 * ```
 */
export function workingUseEffect(callback: () => void | (() => void), debug?: boolean): void {
  const lc = getOwnerLifecycle();
  // if(debug){
  // }
  console.log('setting effect', callback, lc)
  // if (lc) {
  //   // if(lc.scheduled) return;
  //   // Attach to Owner — will be created as an effect AFTER all onMount callbacks.
  //   lc.effects.push(callback);
  //   scheduleLifecycleFlush(lc);
  // } else {
  // }
  // No Owner (rare). Create the effect immediately.
    let cleanup: (() => void) | void;
  
    createRenderEffect(() => {
      if (cleanup) cleanup();
      cleanup = callback();
    });
  
    onCleanup(() => {
      // console.log('cleanup', cleanup)
      if (cleanup) cleanup();
    });
}
export function useEffect(callback: () => void | (() => void), debug?: boolean): void {
  const lc = getOwnerLifecycle();
  // if(debug){
  // }
  // console.log('setting effect', callback, lc)
  if (lc) {
    // if(lc.scheduled) return;
    // Attach to Owner — will be created as an effect AFTER all onMount callbacks.
    lc.effects.push(callback);
    scheduleLifecycleFlush(lc);
  } else {
    // No Owner (rare). Create the effect immediately.
    let cleanup: (() => void) | void;

    createEffect(() => {
      if (cleanup) cleanup();
      cleanup = callback();
    });

    onCleanup(() => {
      // console.log('cleanup', cleanup)
      if (cleanup) cleanup();
    });
  }
}


// export {createRenderEffect as useEffect}

/**
 * Create a memoized computed value
 *
 * @template T
 * @param {() => T} fn - Computation function
 * @returns {() => T} Memoized accessor
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const [count, setCount] = createSignal(0);
 *   const doubled = useMemo(() => count() * 2);
 *
 *   return html`<div>Doubled: ${doubled()}</div>`;
 * };
 * ```
 */
export function useMemo<T>(fn: () => T): () => T {
  // createMemo is natively reactive and disposed automatically
  // when its Owner is cleaned up. No lifecycle stack needed.
  return createMemo(fn);
}

/**
 * Create a ref object
 *
 * Refs persist across component re-renders (though components only run once)
 * Useful for storing DOM references and mutable values
 *
 * @template T
 * @param {T} initialValue - Initial value
 * @returns {RefObject<T>} Ref object
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const inputRef = useRef<HTMLInputElement>(null);
 *
 *   onMount(() => {
 *     inputRef.current?.focus();
 *   });
 *
 *   return html`<input ref=${inputRef} />`;
 * };
 * ```
 */
export function useRef<T>(initialValue: T): RefObject<T> {
  const ref: RefObject<T> = { current: initialValue };

  // Register cleanup to clear ref
  onCleanup(() => {
    ref.current = null as any;
  });

  return ref;
}

/**
 * Create a reducer for state management
 *
 * @template S - State type
 * @template A - Action type
 * @param {(state: S, action: A) => S} reducer - Reducer function
 * @param {S} initialState - Initial state
 * @returns {[() => S, (action: A) => void]} State accessor and dispatch function
 *
 * @example
 * ```typescript
 * type Action = { type: 'increment' } | { type: 'decrement' };
 *
 * const MyComponent = () => {
 *   const [state, dispatch] = useReducer(
 *     (state: number, action: Action) => {
 *       switch (action.type) {
 *         case 'increment': return state + 1;
 *         case 'decrement': return state - 1;
 *       }
 *     },
 *     0
 *   );
 *
 *   return html`
 *     <button @click=${() => dispatch({ type: 'increment' })}>
 *       Count: ${state()}
 *     </button>
 *   `;
 * };
 * ```
 */
export function useReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S
): [() => S, (action: A) => void] {
  const [state, setState] = createSignal(initialState);

  const dispatch = (action: A) => {
    setState(reducer(state(), action) as any);
  };

  return [state, dispatch];
}

/**
 * Attach an event listener with automatic cleanup
 *
 * @template K - Event type key
 * @param {EventTarget | RefObject<EventTarget | null>} target - Event target or ref
 * @param {K} event - Event name
 * @param {(event: Event) => void} handler - Event handler
 * @param {AddEventListenerOptions} options - Event listener options
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const divRef = useRef<HTMLDivElement>(null);
 *
 *   useEventListener(divRef, 'click', (e) => {
 *     console.log('Div clicked', e);
 *   });
 *
 *   useEventListener(window, 'resize', () => {
 *     console.log('Window resized');
 *   });
 *
 *   return html`<div ref=${divRef}>Click me</div>`;
 * };
 * ```
 */
export function useEventListener<K extends keyof WindowEventMap>(
  target: EventTarget | RefObject<EventTarget | null> | Window | Document,
  event: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
): void;
export function useEventListener(
  target: EventTarget | RefObject<EventTarget | null>,
  event: string,
  handler: (event: Event) => void,
  options?: AddEventListenerOptions
): void {
  useEffect(() => {
    // Resolve target from ref or direct value
    const element =
      target && 'current' in target
        ? (target as RefObject<EventTarget | null>).current
        : (target as EventTarget);

    if (!element) return;

    // Attach event listener
    element.addEventListener(event, handler as EventListener, options);

    // Return cleanup function
    return () => {
      element.removeEventListener(event, handler as EventListener, options);
    };
  });
}

/**
 * Create a callback function (memoization optimization)
 *
 * In Fluixi, components only run once, so this is mostly for
 * API compatibility and explicit intent
 *
 * @template T
 * @param {T} callback - Callback function
 * @returns {T} Callback function
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const handleClick = useCallback(() => {
 *     console.log('Clicked');
 *   });
 *
 *   return html`<button @click=${handleClick}>Click</button>`;
 * };
 * ```
 */
export function useCallback<T extends (...args: any[]) => any>(callback: T): T {
  // Components execute once, so callback is already stable
  // This is mainly for API compatibility with React-like patterns
  return callback;
}

/**
 * Batch update helper
 * Re-exported for convenience
 */
export { batch };

/**
 * Create a memo
 * Re-exported for convenience
 */
export { createMemo };

/**
 * Create an effect
 * Re-exported for convenience
 */
export { createEffect };

/**
 * Get current reactive owner
 * Re-exported for convenience
 */
export { getOwner };

/**
 * Run with specific owner
 * Re-exported for convenience
 */
export { runWithOwner };


// ============================================================================
// HELPER FUNCTIONS (INTERNAL)
// ============================================================================

/**
 * Helper to check if we're in a component context
 * @internal
 */
export function hasLifecycleContext(): boolean {
  return getOwner() !== null;
}

// ============================================================================
// DEV MODE UTILITIES
// ============================================================================


/**
 * Check if in development mode
 *
 * @returns {boolean} True if in development mode
 *
 * @example
 * ```typescript
 * if (isDev()) {
 *   console.log('Running in development mode');
 * }
 * ```
 */
export function isDev(): boolean {
  // return false
  return DEV;
}

/**
 * Development-only code execution
 *
 * @param {() => void} fn - Function to run in dev mode
 *
 * @example
 * ```typescript
 * devOnly(() => {
 *   console.log('This only runs in development');
 * });
 * ```
 */
export function devOnly(fn: () => void): void {
  if (DEV) {
    fn();
  }
}

export type { Component,
  ComponentProps} from "@fluixi/dom"


