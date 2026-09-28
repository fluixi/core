/**
 * A place for a tool to watch the reactive graph from outside it.
 *
 * The runtime says a node exists, a computation re-ran, or an effect went away, and hands
 * over the node itself. It does nothing else. Edges are already on the node, a source keeps
 * its `observers`, a consumer keeps its `sources`, so a watcher reads the graph rather than
 * reconstructing it, and nothing here wraps or replaces a primitive.
 *
 * Nothing is registered by default: an unwatched runtime pays one null check per node
 * creation and per recompute.
 *
 * @fluixi/devtools is the intended caller. Nothing in the framework reads it back.
 *
 * The observer lives on the shared graph state rather than in a module `let`, so a bundle
 * carrying two copies of this module still has one observer, the same reason G exists.
 */
import { G } from './state.js';
import { VERSION } from '../../../version.generated.js';

export type ReactiveNodeKind = 'signal' | 'memo' | 'effect' | 'store' | 'resource';

export interface ReactiveNodeReport {
  kind: ReactiveNodeKind;
  /** The core node. Edges hang off this, and it is the identity later reports use. */
  node: unknown;
  /** What the caller was handed, when that is a different object from the node. */
  handle?: unknown;
  /** The name the call site gave, if it gave one. */
  name?: string;
  /**
   * How to write it, for a signal. A watcher setting the value through this goes through
   * the same path the application does, writing the node directly marks its readers dirty
   * without ever flushing them, so the page keeps whatever it last rendered.
   */
  set?: (value: unknown) => void;
  /**
   * The node this one was built for. A store creates a signal per key, lazily, wherever it
   * is first read, the useful location is the store's, not the reader's.
   */
  origin?: unknown;
  /**
   * The node is the framework's own plumbing, a render effect, one per dom binding. A graph
   * does not show these, but it needs to know they exist: a row added to a list is created
   * inside one, and without it the row has no ancestor it can be attached to.
   */
  internal?: boolean;
  /**
   * The computations running when this node was made, outermost first. A component's wrapper
   * memo reads nothing itself, so what it created is the only thing tying it to the graph
   * and the whole chain is given because the nearest one is often a render effect, which no
   * graph shows.
   *
   * Live and reused: read it during the call, do not keep it.
   */
  parents?: readonly unknown[];
  /**
   * The scope open when this node was made: the custom element, module or service it
   * belongs to. See `openReactiveScope`.
   */
  scope?: object;
}

/** What a scope stands for. The graph draws each kind as its own group. */
export type ReactiveScopeKind = 'element' | 'module' | 'service';

export interface ReactiveScopeInfo {
  kind: ReactiveScopeKind;
  /** What the author calls it: `<fx-counter>`, `AuthModule`, `AuthService`. */
  name: string;
  /** Something on the page it stands for, such as the element itself, for highlighting. */
  target?: unknown;
  /** One short line of extra detail, such as the token a service was provided for. */
  detail?: string;
}

export interface ReactiveObserver {
  created(report: ReactiveNodeReport): void;
  /** A computation recomputed. Effects have no value to diff, so this is their only signal. */
  ran?(node: unknown): void;
  /** An effect was disposed. Memos and signals go with their owner and are not reported. */
  disposed?(node: unknown): void;
  /**
   * A signal was written, and by which computation, nothing, when the write came from an
   * event handler, which is where most of them come from.
   */
  wrote?(node: unknown, by: unknown): void;
  /**
   * A node now belongs somewhere else, and is called something else.
   *
   * A store write replaces the object that held a value: `set({ items: [...items, one] })`
   * builds a new array, and the signals underneath it are the same signals in a new place.
   * Without this they keep pointing at a node that no longer exists.
   */
  moved?(node: unknown, origin: unknown, name?: string): void;
  /**
   * A computation writes to this piece of the document. Only the dom layer knows a reader is
   * the text of an `<li>` and not a `class`, and only as it wires the binding up.
   *
   * `node` is the render effect doing it. `accessor` is the function it reads, which the
   * compiler may have stamped with the hole's position.
   */
  bound?(node: unknown, target: unknown, kind: string, name?: string, accessor?: unknown): void;
  /**
   * The props a component was handed.
   *
   * `node` is the computation the component was created inside, which is the node a watcher
   * draws it as. The object is kept rather than read: every prop is a getter over whatever
   * the caller passed, so reading one here would subscribe the wrong computation to it.
   */
  props?(node: unknown, props: unknown): void;
  /**
   * A directive applied to an element: `use:`, `class:`, `style:`, `bind:`.
   *
   * `bound` says a value writes to a class or a style but not which key, so two `class:`
   * directives on one element both report as `class`. This carries the key too.
   */
  directive?(
    node: unknown,
    target: unknown,
    kind: string,
    name: string,
    accessor?: unknown,
  ): void;
  /**
   * A context provided or read.
   *
   * Nothing else in the graph records it: a provider stamps a value on the owner chain and a
   * reader walks up looking for it, so neither is a dependency and no edge is ever made.
   */
  context?(node: unknown, id: symbol, kind: 'provide' | 'read', value?: unknown): void;
  /**
   * A context was created. Separate from providing it, because a context is usually made at
   * module scope with nothing running, and the line it was written on is the one worth
   * showing. The watcher reads its own stack for that.
   */
  contextCreated?(id: symbol): void;
  /**
   * A scope was opened: a custom element connected, a module registered, a service built.
   * Nothing in the graph says so otherwise; its signals would be loose nodes with no owner
   * a reader recognises. `parent` is the scope open around this one.
   */
  scope?(scope: object, info: ReactiveScopeInfo, parent?: object): void;
  /** A scope ended: the element was removed, the service disposed. */
  scopeEnded?(scope: object): void;
  /**
   * A scope now sits inside another: a service built at import time, later registered by the
   * module that provides it.
   */
  scopeAdopted?(scope: object, parent: object): void;
}

/**
 * Watch the graph. Returns a function that stops watching.
 *
 * One observer at a time, the last to register wins. Two tools watching one page at once is
 * not a case worth carrying state for.
 */
export function observeReactiveNodes(next: ReactiveObserver): () => void {
  G.observer = next;
  return () => {
    if (G.observer === next) G.observer = null;
  };
}

/** What is running right now, outermost first. Empty unless something is watching. */
const running: unknown[] = [];

/** What the nodes created in here belong to. See ReactiveNodeReport.origin. */
let origin: unknown;

/** Attribute everything `fn` creates to `owner`. Free when nobody is watching. */
export function withReactiveOrigin<T>(owner: unknown, fn: () => T): T {
  if (!G.observer) return fn();
  const previous = origin;
  origin = owner;
  try {
    return fn();
  } finally {
    origin = previous;
  }
}

/** The scope nodes created right now belong to. */
let currentScope: object | undefined;

/**
 * Announce a scope and get its identity back. Cheap when nobody is watching: an empty
 * object, reported to no one.
 */
export function openReactiveScope(info: ReactiveScopeInfo): object {
  const scope = {};
  (G.observer as ReactiveObserver | null)?.scope?.(scope, info, currentScope);
  return scope;
}

/** Run `fn` with `scope` open, so every node it creates belongs to it. Free when unwatched. */
export function withReactiveScope<T>(scope: object, fn: () => T): T {
  if (!G.observer) return fn();
  const previous = currentScope;
  currentScope = scope;
  try {
    return fn();
  } finally {
    currentScope = previous;
  }
}

/** The scope has ended. */
export function closeReactiveScope(scope: object): void {
  (G.observer as ReactiveObserver | null)?.scopeEnded?.(scope);
}

/** Put an existing scope inside another. */
export function adoptReactiveScope(scope: object, parent: object): void {
  (G.observer as ReactiveObserver | null)?.scopeAdopted?.(scope, parent);
}

/**
 * Where a package leaves the scope it opened for a value it built, so whoever registers the
 * value later (a module providing it) can place it. Shared by key, across copies.
 */
const SCOPE_OF = Symbol.for('fluixi.reactiveScope');

/** Remember `scope` on `value`. Not enumerable, so it never shows up in a spread or a log. */
export function markReactiveScope(value: object, scope: object): void {
  Object.defineProperty(value, SCOPE_OF, { value: scope, configurable: true, enumerable: false });
}

/** The scope a package marked on `value`, if any. */
export function reactiveScopeOf(value: unknown): object | undefined {
  return value !== null && (typeof value === 'object' || typeof value === 'function')
    ? ((value as Record<symbol, object | undefined>)[SCOPE_OF] ?? undefined)
    : undefined;
}

/** Called by the primitives. Not part of the public surface. */
export function reportReactiveNode(report: ReactiveNodeReport): void {
  const observer = G.observer as ReactiveObserver | null;
  // Filled here rather than at each call site: the stack is already on hand, and a report
  // costs nothing to build when nobody is watching.
  if (observer) {
    observer.created(
      report.parents === undefined
        ? { ...report, parents: running, origin: report.origin ?? origin, scope: report.scope ?? currentScope }
        : { ...report, scope: report.scope ?? currentScope },
    );
  }
}

/** Called around a recompute, so a node can say what it was created inside. */
export function enterReactiveRun(node: unknown): boolean {
  if (!G.observer) return false;
  running.push(node);
  return true;
}

export function exitReactiveRun(): void {
  running.pop();
}

/** Called from the recompute path, so it stays a property read when nobody is watching. */
export function reportReactiveRun(node: unknown): void {
  (G.observer as ReactiveObserver | null)?.ran?.(node);
}

/** Called from the write path, so it stays a property read when nobody is watching. */
export function reportReactiveWrite(node: unknown, by: unknown): void {
  (G.observer as ReactiveObserver | null)?.wrote?.(node, by);
}

/**
 * The node is whatever is running: a binding is set up inside its own render effect. Nothing
 * is pushed when no one is watching, so this stays a property read on the hot path.
 */
export function reportReactiveBinding(
  target: unknown,
  kind: string,
  name?: string,
  accessor?: unknown,
): void {
  const observer = G.observer as ReactiveObserver | null;
  if (!observer?.bound || !running.length) return;
  // The compiler may have stamped the accessor with the hole's line. A stack cannot say it:
  // every binding in a template comes from the same generated expression.
  observer.bound(running[running.length - 1], target, kind, name, accessor);
}

/**
 * A component's props, reported where it is created so the running computation is the one
 * the props belong to. Nothing is read: the caller keeps the object and reads it untracked
 * when someone asks.
 */
export function reportReactiveProps(props: unknown): void {
  const observer = G.observer as ReactiveObserver | null;
  if (!observer?.props || !running.length || !props) return;
  observer.props(running[running.length - 1], props);
}

/**
 * As `reportReactiveBinding`: the node is whatever is running, since a directive is applied
 * while its element is being built. A property read when nobody is watching.
 */
export function reportReactiveDirective(
  target: unknown,
  kind: string,
  name: string,
  accessor?: unknown,
): void {
  const observer = G.observer as ReactiveObserver | null;
  if (!observer?.directive || !running.length) return;
  observer.directive(running[running.length - 1], target, kind, name, accessor);
}

/** Called where the context is made, so a watcher can take the line from its own stack. */
export function reportReactiveContextCreated(id: symbol): void {
  (G.observer as ReactiveObserver | null)?.contextCreated?.(id);
}

/** As the others: the node is whatever is running, and nothing happens without a watcher. */
export function reportReactiveContext(
  id: symbol,
  kind: 'provide' | 'read',
  value?: unknown,
): void {
  const observer = G.observer as ReactiveObserver | null;
  if (!observer?.context || !running.length) return;
  observer.context(running[running.length - 1], id, kind, value);
}

export function reportReactiveMove(node: unknown, origin: unknown, name?: string): void {
  (G.observer as ReactiveObserver | null)?.moved?.(node, origin, name);
}

export function reportReactiveDispose(node: unknown): void {
  (G.observer as ReactiveObserver | null)?.disposed?.(node);
}

/**
 * Where a tool that cannot be imported finds the runtime.
 *
 * An extension has no way into an application's module graph, and an application should not
 * have to import a debugger to be debuggable. So a tool sets this global before any of the
 * app loads, and the runtime hands it the door on the way past.
 *
 * Set it too late and nothing happens, the runtime only offers once, when this module is
 * first evaluated. A browser agent has to run at document_start for that reason.
 */
const HOOK = '__FLUIXI_DEVTOOLS_HOOK__';

export interface DevtoolsHook {
  inject?(runtime: { observeReactiveNodes: typeof observeReactiveNodes; version: string }): void;
}

const hook = (globalThis as Record<string, unknown>)[HOOK] as DevtoolsHook | undefined;
if (typeof hook?.inject === 'function') {
  try {
    hook.inject({ observeReactiveNodes, version: VERSION });
  } catch {
    // A broken tool is not the application's problem.
  }
}

/** Whether anything is watching, for a caller that would otherwise do work to report. */
export function isObserved(): boolean {
  return G.observer != null;
}
