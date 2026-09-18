/**
 * The reactive graph's mutable state, kept as a single object cached on globalThis.
 *
 * Why, tracking/scheduling reads module-global state ("who's the current consumer?",
 * "what owner are we under?", "the effect queue"). If a production bundle emits more
 * than one copy of this module (a common cross-package hazard: see @fluixi/dom's
 * integration bridge), plain `let`s would be duplicated: an effect would set copy A's
 * consumer while a signal read checks copy B's -> no subscription -> reactivity silently
 * lost (works in dev, breaks in prod). Caching the state on globalThis means every copy
 * of this module reads/writes the same object, so the graph stays unified no matter how
 * many times the module is bundled, no integration bridge required.
 *
 * This is strictly more robust than SolidJS, which keeps this state in module `let`s and
 * relies on dedup + a "multiple instances" warning. Node-ref fields are loosely typed
 * (`any`) to avoid import cycles with core.ts/runtime.ts; the public API stays fully typed.
 *
 * Sharing is deliberate, and a standalone web component makes it load-bearing: several
 * independent bundles can land on one page, each carrying its own copy of this module, and they
 * have to end up on one graph or an effect in one will not see a signal from another.
 *
 * Two consequences that the original `??=` got wrong once more than one version is in play.
 * The first copy to run used to define the whole object, so a field added in a later
 * release stayed absent for every copy, including the one that expected it. Fields are
 * backfilled now instead. And nothing recorded which builds had joined, so a genuine
 * mismatch was invisible; `joinedVersions()` reports it, and @fluixi/dom's version-skew
 * warning is where that surfaces.
 */

import { VERSION } from '../../../version.generated.js';

export interface GraphState {
  /** The computation currently evaluating: reads inside it subscribe to it. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  consumer: any;
  /** When true, reads don't subscribe (untrack / peek). */
  untracked: boolean;
  /** The current owner scope (ownership/disposal/context). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  owner: any;
  /** Pending effects awaiting flush. */
  queue: Array<{ queued: boolean; disposed: boolean; run(): void }>;
  /**
   * Effects are queued and a flush is pending.
   *
   * Not a microtask on the shipped path: `compat.ts` installs a no-op host scheduler
   * and flushes explicitly after a write, so this says a drain is owed rather than
   * that one is booked.
   */
  scheduled: boolean;
  /** A flush is in progress (re-entrancy guard). */
  flushing: boolean;
  /** Depth of active batch() calls; >0 defers flushing. */
  batchDepth: number;
  /**
   * How a pending drain gets run. `compat.ts` sets it to a no-op because it owns the
   * flush points itself; `setScheduler(null)` restores the microtask default. SSR and
   * tests override it too.
   */
  hostSchedule: (run: () => void) => void;
  /** Boundary hooks (injected by the Suspense / error-boundary layers). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuspend: ((promise: Promise<unknown>, owner: any) => void) | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: ((error: unknown, owner: any) => boolean) | null;
  /** A tool watching the graph (see observe.ts). Here for the same reason the rest is. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  observer: any;
}

const KEY = '__fluixi_signal_next_state__';
const VERSIONS_KEY = '__fluixi_signal_builds__';

const defaultSchedule = (run: () => void): void => {
  if (typeof queueMicrotask === 'function') queueMicrotask(run);
  else void Promise.resolve().then(run);
};

function defaults(): GraphState {
  return {
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
    observer: null,
  } satisfies GraphState;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const realm = globalThis as any;

function claim(): GraphState {
  const existing = realm[KEY] as GraphState | undefined;
  if (!existing) return (realm[KEY] = defaults());
  // A copy from an earlier release created the object without the fields a later one
  // reads. `in` rather than `??`, so a field whose default is null is not rewritten
  // every time another copy loads.
  const fresh = defaults();
  const target = existing as unknown as Record<string, unknown>;
  for (const field of Object.keys(fresh)) {
    if (!(field in existing)) target[field] = fresh[field as keyof GraphState];
  }
  return existing;
}

export const G: GraphState = claim();

// Which builds of this module reached the shared graph, in the order they loaded.
// One entry is the normal case. More than one distinct version means two releases are
// driving the same graph, which is worth saying out loud but not worth refusing: the
// alternative is a page where half the components are inert.
(realm[VERSIONS_KEY] ??= []).push(VERSION);

/** Every `@fluixi/reactive` build that has joined the shared graph, deduplicated. */
export function joinedVersions(): string[] {
  return [...new Set((realm[VERSIONS_KEY] ?? []) as string[])];
}
