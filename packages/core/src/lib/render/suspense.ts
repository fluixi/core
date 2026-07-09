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
  const children = provideSuspense(boundary, () => props.children);

  // Instantiate the children now, in their own effect under the boundary. A suspended
  // resource read inside them throws here synchronously — a sibling of the output memo
  // below — so the increment reschedules the output cleanly (matching the canary). If we
  // only rendered children through the output's return, the resource read would be nested
  // inside the output's own insert effect, which then never re-runs to show the fallback.
  provideSuspense(boundary, () => {
    createRenderEffect(() => {
      const c = children;
      if (Array.isArray(c)) {
        for (const x of c) if (typeof x === 'function' && isSignal(x)) x();
      } else if (typeof c === 'function' && isSignal(c)) {
        c();
      }
    });
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
