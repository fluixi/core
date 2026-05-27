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
  createRenderEffect,
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
} from '@awc/reactive/signal';
import { createComponent } from './component.js';
import { asSuspense, isComponent, isProvider } from '@awc/dom';

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
    (value && typeof value === 'object' && typeof value.then === 'function') ||
    value instanceof Promise
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
      const inF = untrack(inFallback)
      // console.log('routeMatch suspense incre', props)
      counter++;
      if (!inF) setInFallback(true);
    },
    decrement: () => {
      // console.log('suspense decrement')
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

  // Stamp SuspenseContext on the current owner so that reactive primitives
  // created in this scope (createResource, lazy memos) can find it via
  // useContext. The re-eval below handles the case where a lazy memo was
  // already evaluated before SuspenseImpl ran (JS argument order).
  const _owner = getOwner();
  if (_owner) {
    if (!_owner.contexts) _owner.contexts = new Map();
    _owner.contexts.set(SuspenseCtx.id, store);
  }

  // Check for SuspenseList parent coordination
  const SuspenseListCtx = getSuspenseListContext();
  const listCtx = useContext(SuspenseListCtx);
  let listState: SuspenseListRegisteredState | undefined;
  if (listCtx) {
    listState = listCtx.register(inFallback);
  }

  const children = props.children;

  // Pre-instantiate component thunks ONCE here in component scope.
  // The SuspenseCtx is already set on the owner above, so createResource
  // calls inside lazy/async children will find it via useContext.
  //
  // IMPORTANT: Do NOT call thunks inside the output memo below — that would
  // recreate the entire component tree on every inFallback toggle, causing
  // the infinite insert loop the user reported.
  function instantiateOnce(val: any): any {
    if (val == null || typeof val === 'boolean') return null;
    if (typeof val === 'function' && isComponent(val) && !isSignal(val)) {
      return val();
    }
    return val;
  }

  const resolvedChildren = children;
  // const resolvedChildren = instantiateOnce(children);
  const resolvedFallback = instantiateOnce(props.fallback ?? null);

  // Re-eval: use a reactive render effect to track the top-level children signal.
  // On every run (initial + whenever children changes), unwrap the signal chain
  // inside untrack so reaching a lazy memo — calling it from within this RE ensures
  // prevOwner = RE_comp whose .owner = c_devComp_susp_impl which has SuspenseCtx.
  //
  // Scenario 1 — simple lazy (test 1): resolvedChildren IS the lazy memo.
  //   Initial RE call: view.read() runs fn → resource() throws → caught by
  //   view.read() with prevOwner = RE_comp → walk → SuspenseCtx → increment.
  //
  // Scenario 2 — Router + lazy (test 2): resolvedChildren = routeContent (undefined
  //   initially, no route matched yet). After Router calls _setActiveRouter(ctx),
  //   routeContent becomes DIRTY → RE re-runs synchronously (pure=false, Updates=null)
  //   → routeStates re-evaluates → createLevelState → lazy view created →
  //   untrack loop calls view() → throw caught with prevOwner = RE_comp →
  //   SuspenseCtx found → increment.
  if (typeof resolvedChildren === 'function' && isSignal(resolvedChildren)) {
    createRenderEffect(() => {
      const v = resolvedChildren();  // tracked: RE subscribes to children signal
      untrack(() => {
        try {
          let val: any = v;
          while (typeof val === 'function' && isSignal(val)) {
            val = val();
          }
        } catch (_) {}
      });
    });
  }

  // If children evaluated to a raw promise, track it with the counter.
  const [resolvedContent, setResolvedContent] = createSignal<any>(undefined);
  const childrenIsPromise = isPromise(children);
  if (childrenIsPromise) {
    store.increment();
    (children as Promise<any>).then(
      (v) => {
        setResolvedContent(() => v);
        store.decrement();
      },
      () => {
        store.decrement();
      }
    );
  }

  // Output memo — PURE: no signal writes, no component instantiation.
  // Returns pre-resolved values so the DOM runtime just swaps DOM nodes.
  const output = createMemo(
    () => {
      const showFallback = listState ? listState.showFallback() : inFallback();
      if (showFallback) {
        return resolvedFallback;
      }
      if (childrenIsPromise) {
        return resolvedContent();
      }
      return resolvedChildren;
    },
    undefined,
    { name: 'suspenseOutputMemo' }
  );

  // Context already set on owner manually above — no need for Provider wrapper.
  // Returning the output memo directly so the DOM runtime can track it.
  return output;
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
      const allResolved = registrations.every((r) => !r.inFallback());
      registrations.forEach((r) => {
        r.setShowContent(allResolved);
        r.setShowFallback(!allResolved);
      });
    } else {
      const items =
        revealOrder === 'backwards'
          ? [...registrations].reverse()
          : registrations;
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
      createEffect(() => {
        inFallback();
        coordinateReveal();
      });
      return { showContent, showFallback };
    },
  };

  return SuspenseListCtx.Provider({
    value: listContext,
    children: props.children,
  });
}

asSuspense(Suspense)
Object.defineProperty(Suspense, '__suspense', {
  value: true,
  enumerable: true,
});

// ============================================================================
// SHOW WHEN LOADED
// ============================================================================



// ============================================================================
// EXPORTS
// ============================================================================

export { isNode, isLitResult, isPromise, isJSXElement };
