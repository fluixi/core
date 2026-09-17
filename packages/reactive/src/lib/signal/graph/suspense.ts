/**
 * Suspense ported onto the TC39 core (additive; legacy signal.ts untouched).
 *
 * A Suspense boundary is just a context carrying a pending counter. A suspended read
 * (createResource while pending throws its promise) bubbles to the runtime effect's run(),
 * which calls the injected suspend handler registered here — it finds the nearest
 * boundary (via the effect's owner chain) and increments it; the promise settling
 * decrements it. The effect itself re-runs through normal reactivity once the
 * resource's state signal changes, so the resolved content replaces the fallback.
 */
import {
  createContext,
  provide,
  readContextFrom,
  setSuspendHandler,
  type Owner,
} from './runtime.js';
import { createSignal } from './compat.js';

export interface SuspenseBoundary {
  increment(): void;
  decrement(): void;
  /** Reactive: true while any descendant read is still pending. */
  inFallback(): boolean;
}

const SuspenseContext = createContext<SuspenseBoundary | undefined>();

// Wire the runtime effect's suspend path to the nearest boundary. Registered once.
setSuspendHandler((promise: Promise<unknown>, owner: Owner | null) => {
  const boundary = readContextFrom(owner, SuspenseContext);
  if (!boundary) return; // no boundary above → let it stay pending (no crash)
  boundary.increment();
  promise.finally(() => boundary.decrement());
});

/** Create a boundary's reactive state (pending counter + inFallback). */
export function createSuspenseBoundary(): SuspenseBoundary {
  const [pending, setPending] = createSignal(0);
  let count = 0;
  return {
    increment: () => setPending((count += 1)),
    decrement: () => setPending((count -= 1)),
    inFallback: () => pending() > 0,
  };
}

/** Run `fn` (the boundary's children) under a Suspense scope, so suspended reads inside report to `boundary`. */
export function provideSuspense<R>(boundary: SuspenseBoundary, fn: () => R): R {
  return provide(SuspenseContext, boundary, fn);
}

export { SuspenseContext };
