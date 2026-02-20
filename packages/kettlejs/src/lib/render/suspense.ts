/**
 * @fileoverview Suspense Component — SolidJS-aligned architecture
 * @module @awc/kettlejs/render/suspense
 *
 * Counter-based state machine: resources self-register via SuspenseContext,
 * increment on fetch start, decrement on resolve. No signal writes inside memos.
 */

import {
  createSignal,
  createMemo,
  createEffect,
  isSignal,
  isResource,
  untrack,
  batch,
  useContext,
  getOwner,
  getSuspenseContext,
  getSuspenseListContext,
  resumeEffects,
  type Accessor,
  type SuspenseContextType,
  type SuspenseListContextType,
  type SuspenseListRegisteredState,
  createResource,
  trackPromise,
} from '@awc/reactive/signal';
import { createComponent } from './component.js';
import { isComponent, isProvider } from '@awc/dom';

// ============================================================================
// TYPES
// ============================================================================

export interface SuspenseProps {
  /** Content to show while async dependencies are loading */
  fallback?: any;
  /** Actual content to render */
  children?: any;
  id?: string;
}

export interface SuspenseListProps {
  children: any;
  revealOrder?: 'forwards' | 'backwards' | 'together';
  tail?: 'collapsed' | 'hidden';
}

export const $SUSPENSE = Symbol.for('suspense');

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if value is a DOM Node
 */
function isNode(value: any): value is Node {
  if (typeof window === 'undefined') return false;
  if (typeof Node === 'function' && value instanceof Node) return true;
  return !!(
    value &&
    typeof value === 'object' &&
    typeof value.nodeType === 'number'
  );
}

/**
 * Check if value is a Lit TemplateResult
 */
function isLitResult(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  return !!(
    typeof value['_$litType$'] !== 'undefined' ||
    typeof value['_$litDirective$'] !== 'undefined' ||
    (Array.isArray(value.strings) && Array.isArray(value.values))
  );
}

/**
 * Check if value is a Promise
 */
function isPromise<T = any>(value: any): value is Promise<T> {
  return !!(
    (value &&
    typeof value === 'object' &&
    typeof value.then === 'function') || value instanceof Promise
  );
}

/**
 * Check if value is a JSX element (has type and props)
 */
function isJSXElement(value: any): boolean {
  return !!(
    value &&
    typeof value === 'object' &&
    'type' in value &&
    'props' in value
  );
}

// ============================================================================
// SUSPENSE COMPONENT
// ============================================================================

/**
 * Suspense component — wraps children with async boundary.
 * Provides SuspenseContext so resources can self-register.
 *
 * Architecture:
 *   - Creates a counter-based SuspenseContextType
 *   - Provides it via getSuspenseContext().Provider
 *   - Resources call ctx.increment() on fetch, ctx.decrement() on resolve
 *   - inFallback signal drives the output memo
 *   - Output memo is PURE — no signal writes
 *
 * @example
 * ```tsx
 * <Suspense fallback={<Loading />}>
 *   <AsyncComponent />
 * </Suspense>
 * ```
 */
export function Suspense(props: SuspenseProps): any {
  return createComponent(SuspenseImpl, props);
}

function SuspenseImpl(props: SuspenseProps): any {
  const SuspenseCtx = getSuspenseContext();

  const [inFallback, setInFallback] = createSignal(false);
  const effects: any[] = [];
  let counter = 0;

  const store: SuspenseContextType = {
    increment: () => {
      counter++;
      if (!untrack(inFallback)) setInFallback(true);
    },
    decrement: () => {
      counter--;
      if (counter <= 0) {
        counter = 0;
        batch(() => {
          store.resolved = true;
          resumeEffects(effects);
        });
        setInFallback(false);
      }
    },
    inFallback,
    effects,
    resolved: false,
  };

  // Set context on owner BEFORE evaluating children so createResource
  // inside lazy components finds SuspenseContext via useContext.
  const owner = getOwner();
  if (owner) {
    if (!(owner as any).contexts) (owner as any).contexts = new Map();
    (owner as any).contexts.set(SuspenseCtx.id, store);
  }

  // Check for SuspenseList parent coordination
  const SuspenseListCtx = getSuspenseListContext();
  const listCtx = useContext(SuspenseListCtx);
  let listState: SuspenseListRegisteredState | undefined;
  if (listCtx) {
    listState = listCtx.register(inFallback);
  }

  // Evaluate children ONCE in component scope (NOT inside a memo).
  // Flatten nested JSX arrays and resolve all thunks here so the DOM
  // runtime receives clean values (signals, DOM nodes, strings).
  // Signal writes from createResource/increment are safe in component scope.
  function unwrapChildren(val: any): any {
    if (val == null || val === false || val === true) return null;

    // Flatten arrays (JSX fragments produce nested arrays like [[thunk, " "], " "])
    if (Array.isArray(val)) {
      const flat: any[] = [];
      for (const item of val) {
        const resolved = unwrapChildren(item);
        if (Array.isArray(resolved)) {
          for (const r of resolved) {
            if (r != null) flat.push(r);
          }
        } else if (resolved != null) {
          flat.push(resolved);
        }
      }
      return flat;
    }

    // Unwrap function layers (thunks, $COMPONENT wrappers).
    // Stop at signals/memos/resources — those are reactive and the
    // DOM runtime must track them via effects.
    let result = val;
    while (typeof result === 'function' && !isSignal(result) && !isComponent(result)) {
      if (isProvider(result)) {
      console.log('is provider', result)

      }
      result = result();
    }

    // If unwrapping produced an array, flatten it too
    if (Array.isArray(result)) {
      return unwrapChildren(result);
    }

    return result;
  }
  console.log('suspense children', props.children)

  // const children = unwrapChildren(props.children);
  const children = props.children
  let resource: any;

  // If children evaluated to a raw promise, track it with the counter.
  // Store the resolved value in a signal so the output memo can read it.
  const [resolvedContent, setResolvedContent] = createSignal<any>(undefined);
  const childrenIsPromise = isPromise(children);
  if (isPromise(children)) {

    store.increment();
    // const [r] = createResource(() =>(children as Promise<any>).then(v=>v));
    // resource = r
    console.log('fn prom', resource);
    (children as Promise<any>).then(
      (v) => {
        console.log('promise', v)
    // setResolvedContent(v);
        setResolvedContent(()=>v);
        store.decrement();
      },
      () => {
        store.decrement();
      }
    );
  }

  // Output memo — PURE, no signal writes, no unwrapChildren calls.
  const output = createMemo(() => {
    const showFallback = listState ? listState.showFallback() : inFallback();
    if (showFallback) {
      const fb = props.fallback;
      return typeof fb === 'function' && !isLitResult(fb) && !isNode(fb) ? fb() : fb ?? null;
    }
      // console.log('fn child', resource)
    if (childrenIsPromise) {
      if (resource) {

      }

      return resolvedContent();
    }
    if (typeof children === 'function') {
      // children = children()
    }

    if (isResource(children)) {
      console.log('is resource')
    }

    // const [r] = createResource(() => children);
    // console.log('children', children)
    return children
    // typeof children === 'function' ? children() : children;
  }, undefined, {name: 'suspenseOutputMemo'});

  // Context already set on owner manually above — no need for Provider wrapper.
  // Returning the output memo directly so the DOM runtime can track it.
  return  output;
}

// ============================================================================
// SUSPENSE LIST
// ============================================================================

/**
 * SuspenseList coordinates the reveal order of multiple Suspense boundaries
 *
 * @example
 * ```tsx
 * <SuspenseList revealOrder="forwards">
 *   <Suspense fallback={<Skeleton />}><ProfileHeader /></Suspense>
 *   <Suspense fallback={<Skeleton />}><ProfileTimeline /></Suspense>
 *   <Suspense fallback={<Skeleton />}><ProfileFriends /></Suspense>
 * </SuspenseList>
 * ```
 */
export function SuspenseList(props: SuspenseListProps): any {
  return createComponent(SuspenseListImpl, props);
}

function SuspenseListImpl(props: SuspenseListProps): any {
  const SuspenseListCtx = getSuspenseListContext();
  const { revealOrder = 'together', tail } = props;

  const registrations: Array<{
    inFallback: Accessor<boolean>;
    setShowContent: (v: boolean) => void;
    setShowFallback: (v: boolean) => void;
  }> = [];

  function coordinateReveal() {
    if (revealOrder === 'together') {
      const allResolved = registrations.every(r => !r.inFallback());
      registrations.forEach(r => {
        r.setShowContent(allResolved);
        r.setShowFallback(!allResolved);
      });
    } else {
      const items = revealOrder === 'backwards' ? [...registrations].reverse() : registrations;
      let blocked = false;
      for (const r of items) {
        if (blocked || r.inFallback()) {
          blocked = true;
          r.setShowContent(false);
          r.setShowFallback(tail !== 'hidden');
        } else {
          r.setShowContent(true);
          r.setShowFallback(false);
        }
      }
    }
  }

  const listContext: SuspenseListContextType = {
    register: (inFallback) => {
      const [showContent, setShowContent] = createSignal(true);
      const [showFallback, setShowFallback] = createSignal(false);
      registrations.push({ inFallback, setShowContent, setShowFallback });
      createEffect(() => { inFallback(); coordinateReveal(); });
      return { showContent, showFallback };
    },
  };

  return SuspenseListCtx.Provider({ value: listContext, children: props.children });
}

Object.defineProperty(Suspense, '__suspense', {
  value: true,
  enumerable: true,
});

// ============================================================================
// SHOW WHEN LOADED
// ============================================================================

/**
 * Extract the resolved value type from Show's `when` prop.
 */
export type ShowValue<T> = NonNullable<T extends () => infer V ? V : T>;

export interface ShowProps<T> {
  when: T | undefined | null | false;
  fallback?: any;
  children: ShowValue<T> | ((item: ShowValue<T>) => any);
}

/**
 * Conditional rendering component that works with Suspense
 */
export function Show<T>(props: ShowProps<T>): any {
  return createMemo(() => {
    const value =
      typeof props.when === 'function' ? (props.when as () => T)() : props.when;
    if (value != null && value !== false) {
      const children = props.children;
      if (typeof children === 'function' && !isLitResult(children)) {
        return (children as (item: T) => any)(value as T);
      }
      return children;
    }
    return props.fallback ?? null;
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { isNode, isLitResult, isPromise, isJSXElement };
