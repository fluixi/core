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

// ── Ownership (TC39 has none) ────────────────────────────────────────────────
export interface Owner {
  cleanups: Array<() => void> | null;
  owned: Owner[] | null;
  parent: Owner | null;
  /** Context values provided at this scope — useContext walks up the parent chain. */
  contexts: Map<symbol, unknown> | null;
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
}

export function createContext<T>(defaultValue?: T): Context<T> {
  return { id: Symbol('context'), defaultValue };
}

/** Read the nearest provided value for `context`, or its default. */
export function useContext<T>(context: Context<T>): T | undefined {
  let o = G.owner;
  while (o) {
    if (o.contexts && o.contexts.has(context.id)) return o.contexts.get(context.id) as T;
    o = o.parent;
  }
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
  (G.owner.cleanups ??= []).push(fn);
}

function disposeOwner(owner: Owner): void {
  if (owner.owned) {
    for (let i = owner.owned.length - 1; i >= 0; i--) disposeOwner(owner.owned[i]);
    owner.owned = null;
  }
  if (owner.cleanups) {
    for (let i = owner.cleanups.length - 1; i >= 0; i--) owner.cleanups[i]();
    owner.cleanups = null;
  }
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

  constructor(fn: () => void | (() => void)) {
    this.owner = makeOwner(G.owner);
    // Tie disposal to the creating scope: when the parent owner tears down it must
    // fully dispose this effect (unwatch + body cleanups), not just run the body
    // cleanups. Register dispose() as a parent cleanup rather than as an owned tree.
    if (G.owner) (G.owner.cleanups ??= []).push(() => this.dispose());

    // The Computed runs the user fn inside a tracking scope + this effect's owner,
    // so reads subscribe and onCleanup/nested roots attach here.
    this.computed = new Computed<void>(() => {
      // teardown previous run's cleanups before re-running
      disposeOwner(this.owner);
      runWithOwner(this.owner, () => {
        const r = fn();
        if (typeof r === 'function') (this.owner.cleanups ??= []).push(r);
      });
    });

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
    this.watcher.unwatch(this.computed);
    disposeOwner(this.owner);
  }
}

/** A re-running side effect. Runs once now, then again (G.scheduled) when deps change. */
export function effect(fn: () => void | (() => void)): () => void {
  const node = new EffectNode(fn);
  return () => node.dispose();
}
