/**
 * Error boundaries ported onto the TC39 core (additive; legacy untouched).
 *
 * Same shape as the Suspense port: a boundary is a context carrying an error sink.
 * When an effect under it throws a real, non-promise error, the runtime effect's run()
 * routes it here via the injected error handler, which records it on the nearest
 * boundary (reactively, so the UI can swap to a fallback) and reports it handled.
 */
import {
  createContext,
  readContextFrom,
  setErrorHandler,
  provide,
  type Owner,
} from './runtime.js';
import { createSignal } from './compat.js';

export interface ErrorBoundary {
  /** Reactive: the caught error, or undefined. */
  error(): unknown;
  /** Clear the error so children re-render (after a fix/retry). */
  reset(): void;
}

interface InternalBoundary extends ErrorBoundary {
  setError(e: unknown): void;
}

const ErrorContext = createContext<InternalBoundary | undefined>();

// Wire the runtime effect's error path to the nearest boundary. Registered once.
setErrorHandler((error: unknown, owner: Owner | null): boolean => {
  const boundary = readContextFrom(owner, ErrorContext);
  if (!boundary) return false; // no boundary -> not handled (rethrows)
  boundary.setError(error);
  return true;
});

/** Create a boundary's reactive state (caught error + reset). */
export function createErrorBoundary(): ErrorBoundary {
  const [error, setError] = createSignal<unknown>(undefined, { equals: false });
  const boundary: InternalBoundary = {
    error,
    reset: () => setError(() => undefined),
    setError: (e) => setError(() => e),
  };
  return boundary;
}

/** Run `fn` (the boundary's children) so thrown errors inside report to `boundary`. */
export function provideErrorBoundary<R>(boundary: ErrorBoundary, fn: () => R): R {
  return provide(ErrorContext, boundary as InternalBoundary, fn);
}

export { ErrorContext };
