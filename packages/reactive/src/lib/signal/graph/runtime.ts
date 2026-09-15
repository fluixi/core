/**
 * L1 — the runtime layer the TC39 proposal deliberately OMITS, rebuilt on top of
 * the L0 graph core (./core.ts). TC39 ships only State/Computed/Watcher; everything
 * a framework needs — ownership/disposal, a scheduler, batching, and effects — is
 * left to userland. This module is that userland, expressed once, cleanly:
 *
 *   - Owner tree:   createRoot / onCleanup / getOwner / runWithOwner  (no graph entanglement)
 *   - Scheduler:    a microtask-batched effect queue + flushSync / batch
 *   - effect():     re-running side effect built on a Computed + a Watcher + an owner
 *
 * It is intentionally NOT wired into the package's public exports yet (those names
 * clash with the legacy createEffect/createRoot/onCleanup/batch). It is the staged
 * replacement: once proven, the legacy public API re-points onto this. Effects are
 * built on `Signal.subtle.Watcher` exactly as the proposal intends — the watcher's
 * notify only schedules; the actual re-run (a tracked recompute) happens on flush.
 */
import { Computed, Watcher } from './core.js';
import { G } from './state.js';
import {
  reportReactiveContext,
  reportReactiveContextCreated,
  reportReactiveDispose,
  reportReactiveNode,
} from './observe.js';

// ── Ownership (TC39 has none) ────────────────────────────────────────────────
export interface Owner {
  cleanups: Array<() => void> | null;
  owned: Owner[] | null;
  parent: Owner | null;
  /** Context values provided at this scope — useContext walks up the parent chain. */
  contexts: Map<symbol, unknown> | null;
  /** Set once disposeOwner has torn this scope down; guards deferred work (e.g. a
   * queued onMount) from running against — and resurrecting — a dead owner. */
  disposed?: boolean;
}

/**
 * A child scope of `parent`, attached so the parent's teardown disposes it too.
 *
 * For a derivation that re-runs: context still resolves up the chain from the
 * creation-time owner, while anything registered during a run belongs to this
 * scope and can be torn down before the next one — instead of accumulating on
 * the enclosing scope and only running when that finally dies.
 */
export function createChildOwner(parent: Owner | null): Owner {
  const owner = makeOwner(parent);
  if (parent) (parent.owned ??= []).push(owner);
  return owner;
}

/**
 * Tear down a scope's children and cleanups.
 *
 * `final: false` keeps the scope itself alive and reusable — what a re-running
 * derivation needs between runs.
 */
export function disposeScope(owner: Owner, final = true): void {
  disposeOwner(owner, final);
}

/** True once `owner` has been disposed. Deferred work should bail rather than run. */
export function isOwnerDisposed(owner: Owner | null): boolean {
  return !!owner && owner.disposed === true;
}

// Owner / scheduler / boundary-hook state all live on the shared globalThis-backed G
// (see ./state.ts) so duplicate module copies share one graph.

function makeOwner(parent: Owner | null): Owner {
  return { cleanups: null, owned: null, parent, contexts: null };
}

// ── Context (TC39 has none — lives on the owner tree) ────────────────────────
export interface Context<T> {
  id: symbol;
  defaultValue: T | undefined;
  /** Component that stamps `value` for descendants: `<Ctx.Provider value=… >children</…>`. */
  // Returns `any` (not `unknown`) so a component whose body is `return Ctx.Provider(…)`
  // — e.g. <Router> — stays a valid JSX component. `unknown` is not assignable to the
  // JSX element type, which surfaced as TS2786 "X cannot be used as a JSX component".
  Provider: (props: { value: T; children?: unknown; debug?: boolean }) => any;
}

export function createContext<T>(defaultValue?: T, name?: string): Context<T> {
  // Named so a watcher can tell two of them apart. Nothing else reads the description.
  const id = Symbol(name ?? 'context');
  reportReactiveContextCreated(id);
  const Provider = (props: { value: T; children?: unknown; debug?: boolean }): any => {
    // Stamp the value on a DEDICATED child owner, then read `children` under it — never
    // on the current owner directly. Two sibling <Ctx.Provider> elements used inline (no
    // wrapping component) run under the SAME ambient owner, so stamping there lets the
    // second clobber the first's entry — every descendant then resolves the last value.
    // A child scope isolates each Provider; because createMemo captures the owner at
    // creation, the children memos built while reading `props.children` here capture this
    // scope and resolve the right value even when rendered lazily (Portal/Show/For).
    reportReactiveContext(id, 'provide', props.value);
    const parent = G.owner;
    const owner = makeOwner(parent);
    (owner.contexts = new Map()).set(id, props.value);
    if (parent) (parent.owned ??= []).push(owner);
    G.owner = owner;
    try {
      return props.children;
    } finally {
      G.owner = parent;
    }
  };
  return { id, defaultValue, Provider };
}

/** Read the nearest provided value for `context`, or its default. */
export function useContext<T>(context: { id: symbol; defaultValue?: T }): T | undefined {
  let o = G.owner;
  while (o) {
    if (o.contexts && o.contexts.has(context.id)) {
      const found = o.contexts.get(context.id) as T;
      reportReactiveContext(context.id, 'read', found);
      return found;
    }
    o = o.parent;
  }
  reportReactiveContext(context.id, 'read', context.defaultValue);
  return context.defaultValue;
}

/** Read `context` starting from a specific owner chain (not the current scope). */
export function readContextFrom<T>(owner: Owner | null, context: Context<T>): T | undefined {
  let o = owner;
  while (o) {
    if (o.contexts && o.contexts.has(context.id)) return o.contexts.get(context.id) as T;
    o = o.parent;
  }
  return context.defaultValue;
}

/** Run `fn` in a child scope that provides `value` for `context`. */
export function provide<T, R>(context: Context<T>, value: T, fn: () => R): R {
  const owner = makeOwner(G.owner);
  (owner.contexts = new Map()).set(context.id, value);
  if (G.owner) (G.owner.owned ??= []).push(owner);
  const prev = G.owner;
  G.owner = owner;
  try {
    return fn();
  } finally {
    G.owner = prev;
  }
}

// ── Suspend / error hooks (injected by the boundary layers; L1 stays decoupled) ──
/** Register how a thrown promise (a suspended read) is reported to a boundary. */
export function setSuspendHandler(
  fn: ((promise: Promise<unknown>, owner: Owner | null) => void) | null,
): void {
  G.onSuspend = fn;
}

/** Report a suspended read (thrown promise) to the nearest boundary from the current owner. */
export function reportSuspend(promise: Promise<unknown>): boolean {
  if (G.onSuspend) {
    G.onSuspend(promise, G.owner);
    return true;
  }
  return false;
}

/** Register how a thrown error is routed to an error boundary. Return true if handled. */
export function setErrorHandler(
  fn: ((error: unknown, owner: Owner | null) => boolean) | null,
): void {
  G.onError = fn;
}

export function getOwner(): Owner | null {
  return G.owner;
}

/** Set the current owner directly, returning the previous one. (Framework render glue.) */
export function setOwner(owner: Owner | null): Owner | null {
  const prev = G.owner;
  G.owner = owner;
  return prev;
}

export function runWithOwner<T>(owner: Owner | null, fn: () => T): T {
  const prev = G.owner;
  G.owner = owner;
  try {
    return fn();
  } finally {
    G.owner = prev;
  }
}

/** Register a teardown for the current owner scope. */
export function onCleanup(fn: () => void): void {
  if (!G.owner) return; // no owner → not retained, runs never (matches Solid)
  // A disposed owner is dead: pushing here would recreate its (nulled) cleanups
  // array and never run — a leak. Run the teardown immediately instead, so a
  // teardown registered from deferred work (a queued onMount) still fires.
  if (G.owner.disposed) { fn(); return; }
  (G.owner.cleanups ??= []).push(fn);
}

// `final` distinguishes a permanent teardown (the scope is gone — mark it disposed so
// deferred work bails) from an effect's between-runs cleanup (the owner is REUSED for
// the next run, so it must NOT be marked disposed). Children are always torn down
// permanently — only the effect's own owner survives a re-run.
function disposeOwner(owner: Owner, final = true): void {
  if (owner.disposed) return;
  if (owner.owned) {
    for (let i = owner.owned.length - 1; i >= 0; i--) disposeOwner(owner.owned[i]);
    owner.owned = null;
  }
  if (owner.cleanups) {
    for (let i = owner.cleanups.length - 1; i >= 0; i--) owner.cleanups[i]();
    owner.cleanups = null;
  }
  if (final) owner.disposed = true;
}

/** Create a root reactive scope with explicit disposal (TC39 has no ownership). */
export function createRoot<T>(fn: (dispose: () => void) => T): T {
  const owner = makeOwner(G.owner);
  if (G.owner) (G.owner.owned ??= []).push(owner);
  const prev = G.owner;
  G.owner = owner;
  try {
    return fn(() => disposeOwner(owner));
  } finally {
    G.owner = prev;
  }
}

// ── Scheduler (TC39 has none) — state on G (see ./state.ts) ───────────────────
export function setScheduler(fn: ((run: () => void) => void) | null): void {
  G.hostSchedule = fn ?? ((run) => void Promise.resolve().then(run));
}

function enqueue(e: EffectNode): void {
  if (e.queued) return;
  e.queued = true;
  G.queue.push(e);
  if (!G.scheduled && G.batchDepth === 0) {
    G.scheduled = true;
    G.hostSchedule(flushSync);
  }
}

/** Drain all pending effects now (synchronously). */
export function flushSync(): void {
  G.scheduled = false;
  // Re-entrancy guard: an effect that writes a signal during its run re-enqueues;
  // the running loop below picks that up, so a nested flushSync must be a no-op
  // (otherwise the same G.queue drains twice).
  if (G.flushing) return;
  G.flushing = true;
  let guard = 0;
  try {
    while (G.queue.length) {
      if (++guard > 100000) throw new Error('[fluixi] effect flush did not settle (cycle?)');
      const batchOf = G.queue;
      G.queue = [];
      for (const e of batchOf) {
        e.queued = false;
        if (!e.disposed) e.run();
      }
    }
  } finally {
    G.flushing = false;
  }
}

/**
 * Run pending effects after a write completes — but only at the top level (not
 * inside a batch). A single write thus marks the WHOLE graph dirty first, then
 * flushes once (legacy-equivalent synchronous effects, glitch-free). The `G.flushing`
 * guard makes a write inside an effect a no-op here (the running loop drains it).
 */
export function afterWrite(): void {
  if (G.batchDepth === 0) flushSync();
}

/** Group writes so dependent effects flush once, at the end. */
export function batch<T>(fn: () => T): T {
  G.batchDepth++;
  try {
    return fn();
  } finally {
    if (--G.batchDepth === 0) flushSync();
  }
}

// ── effect() — built on Computed + Watcher + Owner ───────────────────────────
class EffectNode {
  private readonly computed: Computed<void>;
  private readonly watcher: Watcher;
  private readonly owner: Owner;
  queued = false;
  disposed = false;

  constructor(fn: () => void | (() => void), report = false) {
    this.owner = makeOwner(G.owner);
    // Tie disposal to the creating scope: when the parent owner tears down it must
    // fully dispose this effect (unwatch + body cleanups), not just run the body
    // cleanups. Register dispose() as a parent cleanup rather than as an owned tree.
    if (G.owner) (G.owner.cleanups ??= []).push(() => this.dispose());

    // The Computed runs the user fn inside a tracking scope + this effect's owner,
    // so reads subscribe and onCleanup/nested roots attach here.
    this.computed = new Computed<void>(() => {
      // teardown previous run's cleanups before re-running — NOT final: the owner is
      // reused for this run, so it must stay alive (only its children are disposed).
      disposeOwner(this.owner, false);
      runWithOwner(this.owner, () => {
        const r = fn();
        if (typeof r === 'function') (this.owner.cleanups ??= []).push(r);
      });
    });

    // Before the first run, so a watcher counts that run like every later one. A render
    // effect is reported too, marked as plumbing: it is not worth drawing, but a node made
    // inside one has to be able to find its way back to the component that caused it.
    reportReactiveNode({ kind: 'effect', node: this.computed, handle: this, internal: !report });

    // The watcher only schedules; the recompute happens on flush.
    this.watcher = new Watcher(() => enqueue(this));
    this.run(); // initial synchronous run (Solid semantics)
    this.watcher.watch(this.computed);
  }

  run(): void {
    if (this.disposed) return;
    this.watcher.getPending(); // clear pending; reading re-arms the watcher
    try {
      this.computed.get(); // recompute if dirty (re-runs the effect body)
    } catch (e) {
      // A suspended read (createResource while pending) throws its promise. Report
      // it to the nearest Suspense boundary; the effect re-runs via normal
      // reactivity once the resource's state signal changes. Other errors propagate.
      if (e && typeof (e as { then?: unknown }).then === 'function' && G.onSuspend) {
        G.onSuspend(e as Promise<unknown>, this.owner);
        return;
      }
      // Route a real error to the nearest error boundary; rethrow if none handled it.
      if (G.onError && G.onError(e, this.owner)) return;
      throw e;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    reportReactiveDispose(this.computed);
    this.watcher.unwatch(this.computed);
    disposeOwner(this.owner);
  }
}

/** A re-running side effect. Runs once now, then again (G.scheduled) when deps change. */
export function effect(fn: () => void | (() => void), report = false): () => void {
  // Reported only when the caller says so. Every DOM binding is a render effect through this
  // same factory, and a graph holding one node per text node is not a graph anyone reads.
  const node = new EffectNode(fn, report);
  return () => node.dispose();
}
