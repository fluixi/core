/**
 * The reactive graph's mutable state, kept as a SINGLE object cached on globalThis.
 *
 * Why: tracking/scheduling reads module-global state ("who's the current consumer?",
 * "what owner are we under?", "the effect queue"). If a production bundle emits more
 * than one copy of this module (a common cross-package hazard — see @fluixi/dom's
 * integration bridge), plain `let`s would be DUPLICATED: an effect would set copy A's
 * consumer while a signal read checks copy B's → no subscription → reactivity silently
 * lost (works in dev, breaks in prod). Caching the state on globalThis means every copy
 * of this module reads/writes the SAME object, so the graph stays unified no matter how
 * many times the module is bundled — no integration bridge required.
 *
 * This is strictly more robust than SolidJS, which keeps this state in module `let`s and
 * relies on dedup + a "multiple instances" warning. Node-ref fields are loosely typed
 * (`any`) to avoid import cycles with core.ts/runtime.ts; the public API stays fully typed.
 */

export interface GraphState {
  /** The computation currently evaluating — reads inside it subscribe to it. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  consumer: any;
  /** When true, reads don't subscribe (untrack / peek). */
  untracked: boolean;
  /** The current owner scope (ownership/disposal/context). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  owner: any;
  /** Pending effects awaiting flush. */
  queue: Array<{ queued: boolean; disposed: boolean; run(): void }>;
  /** A flush has been scheduled (microtask) but not yet run. */
  scheduled: boolean;
  /** A flush is in progress (re-entrancy guard). */
  flushing: boolean;
  /** Depth of active batch() calls; >0 defers flushing. */
  batchDepth: number;
  /** Host scheduler for the deferred flush (overridable: SSR/tests/compat). */
  hostSchedule: (run: () => void) => void;
  /** Boundary hooks (injected by the Suspense / error-boundary layers). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuspend: ((promise: Promise<unknown>, owner: any) => void) | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: ((error: unknown, owner: any) => boolean) | null;
}

const KEY = '__fluixi_signal_next_state__';

const defaultSchedule = (run: () => void): void => {
  if (typeof queueMicrotask === 'function') queueMicrotask(run);
  else void Promise.resolve().then(run);
};

export const G: GraphState =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((globalThis as any)[KEY] ??= {
    consumer: null,
    untracked: false,
    owner: null,
    queue: [],
    scheduled: false,
    flushing: false,
    batchDepth: 0,
    hostSchedule: defaultSchedule,
    onSuspend: null,
    onError: null,
  } satisfies GraphState);
