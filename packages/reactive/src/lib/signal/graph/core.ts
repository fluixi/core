/**
 * L0 — the TC39-shaped reactive graph core.
 *
 * Class-based primitives (`State`, `Computed`, `Watcher`) that own ONLY the
 * dependency graph: values, versions, source/observer edges, the lazy push-pull
 * state machine, and glitch-free pull evaluation. They know nothing about
 * ownership, scheduling, effects, suspense, or resources — those live in the L1
 * runtime that sits on top (see ../signal.ts). This is a re-shaping of the exact
 * algorithm the existing graph already runs (CLEAN/CHECK/DIRTY + version + the
 * `Listener`/observers edges), so behaviour is preserved; it's just relocated
 * onto classes whose shape matches the TC39 Signals proposal.
 *
 * The model is the "push the dirt, pull the value" scheme (Reactively / SolidJS /
 * the TC39 polyfill): a write PUSHES a maybe-dirty mark down to observers without
 * recomputing; a read PULLS, settling upstream lazily and recomputing only what
 * actually changed (equality-gated). Reads outside a tracking scope don't subscribe.
 */

import { G } from './state.js';

// Node states. CHECK = "a source may have changed — verify on read" (your STALE);
// DIRTY = "definitely recompute"; CLEAN = "cached value is current".
const CLEAN = 0;
const CHECK = 1;
const DIRTY = 2;
type NodeState = typeof CLEAN | typeof CHECK | typeof DIRTY;

// The current consumer + untrack flag live on the shared globalThis-backed state (G)
// so duplicate module copies share one graph. `consumer`/`untracked` proxy them.

/** A thing that can be depended upon: holds observers + a monotonic version. */
abstract class Source {
  /** Computeds (and watched leaves) that read this node. (was the signalObservers entry) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  observers: Set<Computed<any>> | null = null;
  /** Watchers eagerly observing this node, for effect scheduling (L1). */
  watchers: Set<Watcher> | null = null;
  /** Bumped whenever this node's value actually changes (equality-gated). */
  version = 0;

  /** Settle this node so a reader sees a current value/version. Overridden by Computed. */
  updateIfNecessary(): void {}

  /** Link the current consumer (if any) as an observer of this node. */
  protected track(): void {
    if (G.untracked) return;
    const consumer = G.consumer;
    if (!consumer) return;
    (this.observers ??= new Set()).add(consumer);
    (consumer.sources ??= new Set()).add(this);
  }
}

export class State<T> extends Source {
  private _value: T;
  private readonly _equals: (a: T, b: T) => boolean;

  constructor(value: T, options?: { equals?: ((a: T, b: T) => boolean) | false }) {
    super();
    this._value = value;
    this._equals = options?.equals === false ? () => false : options?.equals ?? Object.is;
  }

  get(): T {
    this.track();
    return this._value;
  }

  set(next: T): void {
    if (this._equals(this._value, next)) return;
    this._value = next;
    this.version++;
    // Push: direct observers are DIRTY, their transitive observers are CHECK.
    // Snapshot first — a synchronous scheduler can re-run an effect mid-propagation,
    // which re-subscribes (mutates `observers`); iterating the live Set would then
    // re-visit the re-added node forever. (Matches the legacy Array.from(observers).)
    if (this.observers) for (const o of [...this.observers]) o.markDirty(DIRTY);
    notifyWatchers(this);
  }

  /** Read without subscribing (peek). */
  peek(): T {
    return this._value;
  }
}

export class Computed<T> extends Source {
  private _value: T | undefined;
  private _error: unknown;
  private _threw = false;
  private _initialized = false;
  state: NodeState = DIRTY;
  /** Nodes this computation read on its last run. (was Computation.sources) */
  sources: Set<Source> | null = null;
  private readonly _fn: () => T;
  private readonly _equals: (a: T, b: T) => boolean;

  constructor(fn: () => T, options?: { equals?: ((a: T, b: T) => boolean) | false }) {
    super();
    this._fn = fn;
    this._equals = options?.equals === false ? () => false : options?.equals ?? Object.is;
  }

  get(): T {
    // Cycle guard: a computed reading itself.
    if (G.consumer === this) {
      throw new Error('Signal.Computed cannot read itself');
    }
    this.track();
    this.updateIfNecessary();
    if (this._threw) throw this._error;
    return this._value as T;
  }

  /** Settle: if CHECK, verify sources; if DIRTY (or never run), recompute. */
  override updateIfNecessary(): void {
    if (this.state === CHECK) {
      // Pull each source; if one recomputes to a new value it will have flipped
      // us to DIRTY (markDirty), so stop early.
      if (this.sources) {
        for (const s of this.sources) {
          s.updateIfNecessary();
          if ((this.state as NodeState) === DIRTY) break;
        }
      }
    }
    if (this.state === DIRTY || !this._initialized) this.recompute();
    this.state = CLEAN;
  }

  private recompute(): void {
    // Drop old edges (we re-collect during the run).
    if (this.sources) {
      for (const s of this.sources) s.observers?.delete(this);
      this.sources.clear();
    }
    const prevConsumer = G.consumer;
    const prevUntracked = G.untracked;
    G.consumer = this;
    G.untracked = false;
    let next: T;
    let threw = false;
    let err: unknown;
    try {
      next = this._fn();
    } catch (e) {
      threw = true;
      err = e;
      next = this._value as T;
    } finally {
      G.consumer = prevConsumer;
      G.untracked = prevUntracked;
    }

    const changed =
      !this._initialized ||
      this._threw !== threw ||
      (threw ? err !== this._error : !this._equals(this._value as T, next));

    this._initialized = true;
    this._threw = threw;
    this._error = err;
    this._value = next;

    if (changed) {
      this.version++;
      // Our value moved → observers that were merely CHECK must now recompute.
      if (this.observers) for (const o of [...this.observers]) o.markDirty(DIRTY);
      notifyWatchers(this);
    }
  }

  /**
   * Push a maybe-dirty mark. A direct observer of a changed node gets DIRTY; its
   * own observers get CHECK (recurse) — stopping where already marked, so the
   * push is O(newly-dirtied) and never recomputes.
   */
  markDirty(level: NodeState): void {
    if (this.state >= level) return;
    const wasClean = this.state === CLEAN;
    this.state = level;
    if (wasClean) {
      if (this.observers) for (const o of [...this.observers]) o.markDirty(CHECK);
      notifyWatchers(this);
    }
  }

  peek(): T {
    this.updateIfNecessary();
    if (this._threw) throw this._error;
    return this._value as T;
  }
}

function notifyWatchers(node: Source): void {
  if (!node.watchers) return;
  for (const w of [...node.watchers]) w._notify(node);
}

/**
 * Signal.subtle.Watcher — the only eager observation primitive. Its callback fires
 * when a watched signal MAY have changed; the callback MUST NOT read or write
 * signals. Effects (L1) are built on this + a scheduler.
 */
export class Watcher {
  private readonly _notifyFn: () => void;
  private readonly _watched = new Set<Source>();
  private _pending = new Set<Source>();

  constructor(notify: () => void) {
    this._notifyFn = notify;
  }

  watch(...nodes: Source[]): void {
    for (const n of nodes) {
      this._watched.add(n);
      (n.watchers ??= new Set()).add(this);
    }
  }

  unwatch(...nodes: Source[]): void {
    for (const n of nodes) {
      this._watched.delete(n);
      n.watchers?.delete(this);
      this._pending.delete(n);
    }
  }

  /** Watched nodes that may have changed since the last getPending(). */
  getPending(): Source[] {
    const out = [...this._pending];
    this._pending.clear();
    return out;
  }

  /** @internal — a watched node became non-clean. Edge-triggered: notify once. */
  _notify(node: Source): void {
    if (!this._watched.has(node) || this._pending.has(node)) return;
    const wasEmpty = this._pending.size === 0;
    this._pending.add(node);
    if (wasEmpty) this._notifyFn();
  }
}

/** Signal.subtle.untrack — run `fn` without subscribing the current consumer. */
export function untrack<T>(fn: () => T): T {
  if (G.untracked) return fn();
  G.untracked = true;
  try {
    return fn();
  } finally {
    G.untracked = false;
  }
}

/** Signal.subtle.currentComputed — the computed currently evaluating, or null. */
export function currentComputed(): Computed<unknown> | null {
  return G.consumer;
}

/** Whether a node currently has observers/watchers (Signal.subtle.hasSinks). */
export function hasSinks(node: Source): boolean {
  return !!(node.observers && node.observers.size) || !!(node.watchers && node.watchers.size);
}
