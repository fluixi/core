import {
  Accessor,
  createContext,
  createEffect,
  createErrorBoundary,
  createMemo,
  provideErrorBoundary,
  untrack,
  useContext,
} from '@fluixi/reactive/signal';

/**
 * A value whose change means the content a boundary caught an error from is gone: a router
 * provides the route it has committed, so a boundary around the Outlet clears the failed page's
 * error when another page is shown. None outside a router.
 */
export const ErrorResetContext = createContext<Accessor<unknown> | undefined>(undefined);

export interface ErrorBoundaryProps {
  /** Rendered when an error is caught. Receives the error as argument. */
  fallback: any | ((err: unknown, reset: () => void) => any);
  /** The children to try rendering. */
  children: any;
}

/**
 * Catches errors thrown by the children: while they are built, and later, in any effect or
 * memo they created, such as a route's data that failed to load.
 *
 * When a child throws, renders `fallback` instead. `fallback` can be a static value or a
 * function `(err, reset) => UI`; calling `reset()` clears the error and renders the children
 * again. A thrown promise is not an error: it goes to the nearest Suspense.
 *
 * Returns a memo: works in both JSX and `html` templates.
 *
 * @example JSX
 * <ErrorBoundary fallback={(err, reset) => (
 *   <div>Error: {String(err)} <button onClick={reset}>Retry</button></div>
 * )}>
 *   <RiskyComponent />
 * </ErrorBoundary>
 *
 * @example html template
 * ErrorBoundary({
 *   fallback: (err, reset) => html`<button @click=${reset}>Retry</button>`,
 *   children: html`${riskyContent}`,
 * })
 */
export function ErrorBoundary(props: ErrorBoundaryProps): Accessor<any> {
  // The reactive graph's boundary: an effect under it that throws reports here, through the
  // owner chain, however long after the children were built.
  const boundary = createErrorBoundary() as ReturnType<typeof createErrorBoundary> & { setError(e: unknown): void };

  const isPromise = (e: unknown) => !!e && typeof (e as { then?: unknown }).then === 'function';
  const showFallback = (err: unknown) =>
    typeof props.fallback === 'function' ? props.fallback(err, boundary.reset) : props.fallback;
  // Recorded after the current run: a write made while the boundary's own memo, or the insert
  // reading it, is still running is not seen by that run, so nothing would re-render.
  const report = (e: unknown) => {
    if (isPromise(e)) throw e;
    queueMicrotask(() => boundary.setError(e));
    return null;
  };

  // A function among the children is evaluated by whoever inserts the boundary's output, so
  // outside its scope: guard it here, so its error comes back to this boundary.
  const guard = (content: unknown): unknown => {
    if (Array.isArray(content)) return content.map(guard);
    if (typeof content !== 'function') return content;
    const fn = content as () => unknown;
    return () => {
      try {
        return guard(fn());
      } catch (e) {
        return report(e);
      }
    };
  };

  // Outside the memo below, so it outlives the content the fallback replaced.
  const resetKey = useContext(ErrorResetContext);
  if (resetKey) {
    let first = true;
    createEffect(() => {
      resetKey();
      if (first) {
        first = false;
        return;
      }
      untrack(() => {
        if (boundary.error() !== undefined) boundary.reset();
      });
    });
  }

  return createMemo(() => {
    const err = boundary.error();
    if (err !== undefined) return showFallback(err);
    try {
      return provideErrorBoundary(boundary, () => {
        // Read once: a children getter builds its content on every read.
        const children = props.children;
        return guard(typeof children === 'function' ? children() : children);
      });
    } catch (e) {
      // Thrown while building: the fallback now, and the error kept for reset().
      report(e);
      return showFallback(e);
    }
  }, undefined, { name: 'ErrorBoundary' });
}
