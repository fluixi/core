import { Accessor, createMemo, createSignal, createRoot, onCleanup } from '@fluixi/reactive/signal';

export interface ErrorBoundaryProps {
  /** Rendered when an error is caught. Receives the error as argument. */
  fallback: any | ((err: unknown, reset: () => void) => any);
  /** The children to try rendering. */
  children: any;
}

/**
 * Catches synchronous errors thrown during child rendering.
 *
 * When a child throws, renders `fallback` instead.  `fallback` can be a
 * static value or a function `(err, reset) => UI` — calling `reset()` clears
 * the error state and retries rendering the children.
 *
 * Returns a memo — works in both JSX and `html` templates.
 *
 * Note: Only catches errors thrown synchronously during the render phase
 * (memo evaluation).  Async errors inside effects are not caught here.
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
  const [error, setError] = createSignal<unknown>(null);

  const reset = () => setError(null);

  return createMemo(() => {
    const err = error();

    if (err !== null) {
      return typeof props.fallback === 'function'
        ? props.fallback(err, reset)
        : props.fallback;
    }

    try {
      const content =
        typeof props.children === 'function' ? props.children() : props.children;
      return content;
    } catch (e) {
      // Caught a synchronous render error — switch to fallback.
      setError(e);
      return typeof props.fallback === 'function'
        ? props.fallback(e, reset)
        : props.fallback;
    }
  }, undefined, { name: 'ErrorBoundary' });
}
