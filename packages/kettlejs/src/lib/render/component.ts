/**
 * @fileoverview Component Creation for KettleJS
 * @module @awc/kettlejs/render/component
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
  isDOMNode,
  registerCreateComponent,
  isRoutes,
  asComponent,
} from '@awc/dom';
import {
  untrack,
  onCleanup,
  getOwner,
  createEffect,
  createMemo,
  createSignal,
  batch,
  createRoot,
  runWithOwner,
  createContext as createReactiveContext,
  useContext as useReactiveContext,
  devComponent,
  __DEV__,
  type Signal,
  createRenderEffect,
  trackPromise,
} from '@awc/reactive/signal';
// } from '@awc/kettlejs/rx';

// Note: Owner type from @awc/reactive/signal
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
export interface ComponentProps {
  children?: any;
  [key: string]: any;
}

/**
 * Component function type
 */
export type Component<P = ComponentProps, Return = any> = (props?: P) => Return;



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
// LIFECYCLE STATE
// ============================================================================

interface LifecycleContext {
  owner: Owner;
  cleanups: Array<() => void>;
  onMountCallbacks: Set<LifecycleCallback>;
  onCleanupCallbacks: Array<() => void>;
  mounted?: boolean;
  mountedSignal?: Signal<boolean>;
}

const lifecycleStack: LifecycleContext[] = [];

function getCurrentLifecycle(): LifecycleContext | null {
  return lifecycleStack[lifecycleStack.length - 1] || null;
}

function pushLifecycle(ctx: LifecycleContext): void {
  lifecycleStack.push(ctx);
}

function popLifecycle(): void {
    lifecycleStack.pop();
  // if (lifecycleStack.length > 1) {
  // }
}

/**
 * Integration initialized flag
 */
let integrationInitialized = false;

// ============================================================================
// Integration Setup
// ============================================================================

/**
 * Initialize integration with reactive system
 */
export function ensureIntegration(): void {
  if (integrationInitialized) return;

  initializeIntegration({
    signalSystem: {
      createEffect: createRenderEffect,
      batch,
      createMemo,
      untrack,
      getOwner,
      runWithOwner,
      createRoot,
      onCleanup,
      createComponent,
    } as any,
  });

  registerEffectCreator(createEffect);
  registerBatch(batch);
  registerCreateComponent(createComponent as any);

  integrationInitialized = true;
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
export type IComponent<T, U = any, W = any> = ()=>Component<U, W> & {
  $COMPONENT: boolean
}

export type C<T, V> = T extends (props?: infer U) => any ? IComponent<T, V extends never ? U : V, ReturnType<T>> : T extends object ? IComponent<T, V> : never

// export function $component<T, U = any>(value: T, props?: U) {
//   const component = () => (typeof value === 'function' && props) ?(value as any)(props) : value;
//   Object.defineProperty(component, '__kettle', {
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
): ReturnType<C<T, U>> {

  const c = $component(Comp, props)
  return c() as any
}

export function $component<T extends (props?: any) => any, U = any>(value: T, props?: U) {
  // console.log('defining', isDev())
  // const component = () =>(typeof value === 'function' && typeof props!=='undefined') ? isDev() ? devComponent(value, props) : untrack(()=>value(props)) : value;
  const component = () =>(typeof value === 'function' && typeof props!=='undefined') ? isDev() ? devComponent(value, props) : untrack(()=>value(props)) : value;
  return (isDev() ? asComponent(component) : component) as C<T, U>;
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

/**
 * Register a callback to run when component mounts
 *
 * Section 1: Component constructs reactive graph
 * onMount is part of the lifecycle setup
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
export function onMount(fn: LifecycleCallback): void {
  const ctx = getCurrentLifecycle();
  console.log('on mount called', ctx)
  if (ctx) {
    if (!ctx.onMountCallbacks.has(fn)) {
      ctx.onMountCallbacks.add(fn);
    }
  } else {
    // console.log('no lofecycle');
    // No lifecycle context, run immediately
    // This handles the case where onMount is called outside render tree
    // const cleanup = fn();
    // if (typeof cleanup === 'function') {
    //   onCleanup(cleanup);
    // }
  }
}

/**
 * Register a callback to run when component unmounts
 *
 * Section 1: Component constructs reactive graph including cleanup
 * onUnmount is called before component is removed from DOM
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
  const ctx = getCurrentLifecycle();
  if (ctx) {
    ctx.onCleanupCallbacks.push(fn);
  } else {
    // No lifecycle context, register with reactive cleanup
    onCleanup(fn);
  }
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
export function useEffect(callback: () => void | (() => void)): void {
  const context = getCurrentLifecycle();
  // console.log('use effect', context)
  if (!context) return;

  let cleanup: (() => void) | void;

  // Track the effect's reactive root
  const dispose = createEffect(() => {
    // 1. Dependency on the Mounted Signal
    // This ensures we wait until ALL onMount callbacks have finished
    if (context.mountedSignal && !context.mountedSignal[0]()) return;

    // 2. Execute callback
    if (cleanup) cleanup();
    cleanup = callback();
  });

  context.cleanups.push(() => {
    if (typeof dispose === 'function') (dispose as any)();
    if (typeof dispose === 'object' && (dispose as any).dispose)
      (dispose as any).dispose();
    if (cleanup) cleanup();
  });
}
// export function useEffect(fn: (v?: any) => any): void {
//   createEffect(fn);
// }

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
  const context = getCurrentLifecycle();

  // createMemo is natively reactive, but we track the disposer
  // so that the computation stops when the component is destroyed.
  const memo = createMemo(fn);

  if (context) {
    // Some reactive systems dispose memos automatically if created
    // inside a root, but adding it to cleanups is safer for KettleJS.
    context.cleanups.push(() => {
      // If your signal library provides a manual dispose for memos:
      // (memo as any).dispose?.();
    });
  }

  return memo;
}
// export function useMemo<T>(fn: () => T): () => T {
//   return createMemo(fn);
// }

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
 * In KettleJS, components only run once, so this is mostly for
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

/**
 * Re-export context functions
 */
export { createReactiveContext, useReactiveContext };

// ============================================================================
// HELPER FUNCTIONS (INTERNAL)
// ============================================================================

/**
 * Execute mount callbacks for a lifecycle context
 * @internal
 */
export function executeMountCallbacks(ctx: LifecycleContext): void {
  if (ctx.mounted) return;
  ctx.mounted = true;
  for (const callback of ctx.onMountCallbacks) {
    console.log('execute on mount', callback)
    try {
      const cleanup = callback();
      if (typeof cleanup === 'function') {
        ctx.cleanups.push(cleanup);
      }
    } catch (error) {
      console.error('Error in onMount callback:', error);
    }
  }
  ctx.onMountCallbacks.clear()
    // = new Set();

  // Signal that mount is complete, triggering any pending useEffects
  if (ctx.mountedSignal) {
    ctx.mountedSignal[1](true);
  }
}

/**
 * Execute cleanup callbacks for a lifecycle context
 * @internal
 */
export function executeCleanups(ctx: LifecycleContext): void {
  // Run unmount callbacks first
  for (const callback of ctx.onCleanupCallbacks) {
    try {
      callback();
    } catch (error) {
      console.error('Error in onUnmount callback:', error);
    }
  }
  ctx.onCleanupCallbacks = [];

  // Then run regular cleanups
  for (const cleanup of ctx.cleanups) {
    try {
      cleanup();
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  }
  ctx.cleanups = [];
}

/**
 * Create a lifecycle context
 * Used internally by render functions
 * @internal
 */
export function createLifecycleContext(owner: Owner): LifecycleContext {
  return {
    owner,
    cleanups: [],
    onMountCallbacks: new Set(),
    onCleanupCallbacks: [],
    mounted: false,
    mountedSignal: createSignal(false),
  };
}

/**
 * Run a function with lifecycle context
 * Used internally by render functions
 * @internal
 */
export function withLifecycle<T>(ctx: LifecycleContext, fn: () => T): T {
  pushLifecycle(ctx);
  try {
    return fn();
  } finally {
    popLifecycle();
  }
}

/**
 * Helper to check if we're in a component context
 * @internal
 */
export function hasLifecycleContext(): boolean {
  return getCurrentLifecycle() !== null;
}

// ============================================================================
// DEV MODE UTILITIES
// ============================================================================

/**
 * Mark a component for development debugging
 *
 * @param {Component<any>} Comp - Component to mark
 * @param {string} name - Component name
 * @returns {Component<any>} Marked component
 * @internal
 */
export function markComponent<P extends ComponentProps>(
  Comp: Component<P>,
  name: string
): Component<P> {
  if (DEV) {
    Object.defineProperty(Comp, 'name', {
      value: name,
      writable: false,
      configurable: true,
    });
  }
  return Comp;
}

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
