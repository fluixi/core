/**
 * Suspense on the TC39 boundary. A createResource read throws its promise while
 * pending; the effect running it reports that to the nearest boundary (stamped as
 * SuspenseContext on this component's owner), which flips inFallback. The output
 * memo swaps between fallback and children on that signal.
 */

import {
  type Accessor,
  createSignal,
  createMemo,
  createEffect,
  createRenderEffect,
  isSignal,
  readChildren,
  useContext,
  createContext,
  createSuspenseBoundary,
  provideSuspense,
  type SuspenseBoundary,
} from '@fluixi/reactive/signal';
import {
  asSuspense,
  isComponent,
  createComponent,
  runWithoutHydration,
} from '@fluixi/dom';

export interface SuspenseProps {
  fallback?: any;
  children?: any;
  id?: string;
}

export interface SuspenseListProps {
  children: any;
  revealOrder?: 'forwards' | 'backwards' | 'together';
  tail?: 'collapsed' | 'hidden';
}

export const $SUSPENSE = Symbol.for('suspense');

function isNode(value: any): value is Node {
  if (typeof window === 'undefined') return false;
  if (typeof Node === 'function' && value instanceof Node) return true;
  return !!(value && typeof value === 'object' && typeof value.nodeType === 'number');
}

function isLitResult(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  return !!(
    typeof value['_$litType$'] !== 'undefined' ||
    typeof value['_$litDirective$'] !== 'undefined' ||
    (Array.isArray(value.strings) && Array.isArray(value.values))
  );
}

function isPromise<T = any>(value: any): value is Promise<T> {
  return !!(
    (value && typeof value === 'object' && typeof value.then === 'function') ||
    value instanceof Promise
  );
}

function isJSXElement(value: any): boolean {
  return !!(value && typeof value === 'object' && 'type' in value && 'props' in value);
}

// Only one instance is needed — the list context just carries the coordinator object.
interface SuspenseListRegistration {
  showContent: Accessor<boolean>;
  showFallback: Accessor<boolean>;
}
interface SuspenseListCoordinator {
  register(inFallback: Accessor<boolean>): SuspenseListRegistration;
}
const SuspenseListContext = createContext<SuspenseListCoordinator | undefined>();

export function Suspense(props: SuspenseProps): any {
  return createComponent(SuspenseImpl, props);
}

function SuspenseImpl(props: SuspenseProps): any {
  const boundary: SuspenseBoundary = createSuspenseBoundary();

  // SuspenseList coordination, if any.
  const listCtx = useContext(SuspenseListContext);
  const listState = listCtx ? listCtx.register(boundary.inFallback) : undefined;

  function instantiateOnce(val: any): any {
    if (val == null || typeof val === 'boolean') return null;
    if (typeof val === 'function' && isComponent(val) && !isSignal(val)) return val();
    return val;
  }

  // Build the fallback off the hydration cursor — it isn't shown when the server
  // already rendered content, so it must not adopt (and duplicate) server nodes.
  const fallback = runWithoutHydration(() => instantiateOnce(props.fallback ?? null));

  // Read the children under the boundary so the memos they create capture its owner;
  // then a suspended resource read inside them throws to THIS boundary, not the parent.
  //
  // `readChildren`, not a bare `props.children` read: a component child arrives as a THUNK
  // that instantiates when called, so reading the prop alone hands back a function and the
  // component never runs here. It would then be instantiated later, downstream of the output
  // memo, where a suspend has no boundary that can re-run it — the failure that produced an
  // empty node on a client navigation into a not-yet-loaded lazy route: no fallback, no
  // content, no error. `readChildren` unwraps the thunks (so the lazy component runs under
  // this boundary), stops at signals so dynamic children stay reactive, and memoises the
  // result so the tracking effect below and the output render the same instantiation.
  const children = provideSuspense(boundary, () => readChildren(() => props.children));

  // Instantiate the children now, in their own effect under the boundary. A suspended
  // resource read inside them throws here synchronously — a sibling of the output memo
  // below — so the increment reschedules the output cleanly (matching the canary). If we
  // only rendered children through the output's return, the resource read would be nested
  // inside the output's own insert effect, which then never re-runs to show the fallback.
  //
  // Follow NESTED accessors, not just the outer one: the compiler wraps a dynamic child in
  // its own memo, and `readChildren` stops at signals on purpose so they stay reactive. Stop
  // at the outer read and a lazy component behind a condition is never instantiated here —
  // it runs later, downstream, where its suspend reaches no boundary. Reading a memo is
  // idempotent (it caches, and the output reads the same one), so following the chain costs
  // nothing and cannot duplicate the subtree.
  const track = (value: any, depth: number): void => {
    if (depth > 8) return;
    if (Array.isArray(value)) {
      for (const x of value) track(x, depth + 1);
    } else if (typeof value === 'function' && isSignal(value)) {
      track(value(), depth + 1);
    }
  };

  provideSuspense(boundary, () => {
    createRenderEffect(() => track(children, 0));
  });

  // A raw promise child: track it directly on the boundary.
  const [resolved, setResolved] = createSignal<any>(undefined);
  const childIsPromise = isPromise(children);
  if (childIsPromise) {
    boundary.increment();
    (children as Promise<any>).then(
      (v) => {
        setResolved(() => v);
        boundary.decrement();
      },
      () => boundary.decrement(),
    );
  }

  return createMemo(() => {
    const showFallback = listState ? listState.showFallback() : boundary.inFallback();
    if (process.env.FX_DEBUG) console.log('[s] output; showFallback:', showFallback);
    if (showFallback) return fallback;
    if (childIsPromise) return resolved();
    return children;
  });
}

export function SuspenseList(props: SuspenseListProps): any {
  return createComponent(SuspenseListImpl, props);
}

function SuspenseListImpl(props: SuspenseListProps): any {
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

  const coordinator: SuspenseListCoordinator = {
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

  return SuspenseListContext.Provider({
    value: coordinator,
    children: props.children,
  });
}

asSuspense(Suspense);
Object.defineProperty(Suspense, '__suspense', { value: true, enumerable: true });

export { isNode, isLitResult, isPromise, isJSXElement };
