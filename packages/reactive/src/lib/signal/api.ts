/**
 * The short reactive API: `signal`, `memo`, `effect`.
 *
 *   const count = signal(0);
 *   count();          // read
 *   count.set(1);     // write
 *
 * `signal` is `createSignal` with the setter attached to the accessor instead of handed
 * back beside it. The function IS that accessor, so a read is the same call it always
 * was, `count` passes anywhere an accessor is expected, and only the write changes
 * spelling. `memo` is `createMemo` under a shorter name — a derived value has nothing to
 * set, so there is nothing to attach.
 *
 * The rule across the API: read it the way its shape implies — a call for a value, a
 * property for an object (see `store`) — and `.set()` writes.
 *
 * `createSignal` and friends are unchanged; the two forms are one primitive and mix
 * freely.
 */
import {
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
} from './graph/compat.js';
import {
  createChildOwner,
  createContext,
  createRoot,
  type Context,
  type Owner,
} from './graph/runtime.js';
import type { Accessor, Setter, SignalOptions } from './signal.js';

/** A writable reactive value: call it to read, `.set()` to write. */
export type SignalHandle<T> = Accessor<T> & { set: Setter<T> };

/** A derived value. Read-only, so it is just the accessor. */
export type MemoHandle<T> = Accessor<T>;

/**
 * A writable reactive value.
 *
 * The returned function *is* the accessor, with `set` hung off it, so it passes
 * anywhere an accessor is expected and a read is an ordinary call. Reading inside a
 * tracked scope subscribes that scope; reading outside one does not.
 *
 * `options.equals` decides what counts as a change and defaults to `===`. A write that
 * compares equal notifies nobody, which is how a reflect loop or a feedback cycle
 * terminates.
 *
 * @example
 * ```ts
 * const count = signal(0);
 * count();                        // 0
 * count.set(1);                   // write a value
 * count.set((n) => n + 1);        // or derive from the previous one
 * ```
 *
 * @example A function value has to be wrapped, because a bare function is read as an
 * updater and called:
 * ```ts
 * const handler = signal<() => void>(() => {});
 * handler.set(() => myCallback);  // stores myCallback
 * handler.set(myCallback);        // calls myCallback and stores what it returned
 * ```
 *
 * @example Deep values compare by identity unless told otherwise:
 * ```ts
 * const point = signal({ x: 0 }, { equals: (a, b) => a.x === b.x });
 * ```
 */
export function signal<T>(value: T, options?: SignalOptions<T>): SignalHandle<T>;
export function signal<T = undefined>(): SignalHandle<T | undefined>;
export function signal<T>(value?: T, options?: SignalOptions<T>): SignalHandle<T> {
  const [read, write] = createSignal(value as T, options);
  return Object.assign(read, { set: write }) as SignalHandle<T>;
}

/**
 * A derived value, computed once per change and cached.
 *
 * Lazy and pull-based: the function does not run until something reads the memo, and
 * then not again until one of its own dependencies changes. That is the difference from
 * {@link computed}, which exists to do work rather than to hold a value.
 *
 * `prev` is the previous result, which makes an accumulator cheap without a second
 * signal to hold it.
 *
 * @example
 * ```ts
 * const first = signal('Ada');
 * const last = signal('Lovelace');
 * const full = memo(() => `${first()} ${last()}`);
 * full();                         // 'Ada Lovelace', computed now
 * full();                         // cached, the function did not run again
 * ```
 *
 * @example Reading the previous value:
 * ```ts
 * const high = memo((prev = 0) => Math.max(prev, reading()), 0);
 * ```
 */
export function memo<T>(fn: (prev?: T) => T, value?: T, options?: SignalOptions<T>): MemoHandle<T> {
  return createMemo(fn, value, options);
}

/**
 * Run `fn` now, and again whenever anything it read changes.
 *
 * Dependencies are collected by reading, not declared, so they are whatever the last
 * run actually touched. A branch not taken subscribes to nothing, and a read behind a
 * condition comes and goes with it.
 *
 * Eager. It runs once on creation and again as soon as a dependency is written, in the
 * same task as the write. `batch` is what coalesces a group of writes into one run.
 *
 * Teardown goes through `onCleanup`, which runs before the next execution and once more
 * on disposal. A returned function is **not** teardown: the return value is carried
 * forward as the next call's `prev`, so returning a disposer silently leaks it. The
 * effect is owned by the enclosing {@link root}, so disposing that disposes this.
 *
 * @example
 * ```ts
 * const query = signal('');
 * effect(() => console.log('searching', query()));
 * ```
 *
 * @example Teardown between runs, via onCleanup rather than a return:
 * ```ts
 * effect(() => {
 *   const id = setInterval(tick, delay());
 *   onCleanup(() => clearInterval(id));
 * });
 * ```
 *
 * @example Writing a signal an effect reads re-triggers it. Break the cycle with
 * `untrack`, or make the write compare equal:
 * ```ts
 * effect(() => save(untrack(() => draft())));
 * ```
 *
 * @returns Its disposer, for an effect created outside a root.
 */
export function effect<T>(fn: (prev?: T) => T | (() => void), value?: T): () => void {
  return createEffect(fn, value);
}

/**
 * The rest of the `create` prefix, dropped.
 *
 * Each one calls through to the long name with the same arguments. Both spellings stay
 * and mix freely; the graph does not know which was written.
 *
 * `onCleanup`, `getOwner` and `runWithOwner` keep their names. The rule here is losing
 * a `create` that adds nothing, and none of those three has one; `cleanup` would also
 * lose the sense that it registers a callback rather than performing one now.
 */

/**
 * An owner scope with an explicit disposer.
 *
 * Every signal, memo, effect and nested scope created while `fn` runs belongs to this
 * one, and `dispose()` takes all of them down together. Without an owner an effect has
 * nothing to tear it down, which is the usual source of a leak.
 *
 * A root created inside another root is attached to it, so disposal is recursive. To
 * detach deliberately, create the root where no owner is current.
 *
 * @example
 * ```ts
 * const stop = root((dispose) => {
 *   effect(() => render(state()));
 *   onCleanup(() => detachListeners());
 *   return dispose;
 * });
 * stop();                         // effect and cleanup both run
 * ```
 *
 * @returns Whatever `fn` returns. Return the disposer when the caller needs it.
 */
export function root<T>(fn: (dispose: () => void) => T): T {
  return createRoot(fn);
}

/**
 * The effect form `@fluixi/dom` wires its bindings with.
 *
 * Timing is identical to {@link effect} in this runtime: both are eager, and both
 * re-run in the task that wrote their dependency. The render-versus-commit distinction
 * the name suggests is a DOM-layer concern, not a graph one, so do not reach for this
 * expecting different scheduling.
 *
 * What differs is that it is not reported to devtools. Every DOM binding goes through
 * here, and a graph carrying one node per text node is not a graph anyone reads.
 *
 * @example
 * ```ts
 * renderEffect(() => el.setAttribute('aria-expanded', String(open())));
 * ```
 */
export function renderEffect<T>(fn: (prev?: T) => T | (() => void), value?: T): () => void {
  return createRenderEffect(fn, value);
}

/**
 * A tracked computation whose result nobody reads.
 *
 * Eager where {@link memo} is lazy. A memo that nothing reads never runs at all, so a
 * memo written for its side effect silently does nothing; this is the form for work
 * that has to happen on every change.
 *
 * Timing matches {@link effect}, and so does ordering: they run in creation order, not
 * in two phases. A `computed` that writes a signal an effect reads has to be created
 * first for the effect to see the settled value.
 *
 * @example
 * ```ts
 * computed(() => {
 *   valid.set(email().includes('@'));   // derive into another signal
 * });
 * ```
 *
 * @example `prev` threads the last result through, with no signal to hold it:
 * ```ts
 * computed((runs = 0) => {
 *   void query();
 *   return runs + 1;
 * }, 0);
 * ```
 */
export function computed<T>(fn: (prev?: T) => T, value?: T): void {
  createComputed(fn, value);
}

/**
 * A context key: a value passed down an owner tree instead of through props.
 *
 * Lookup walks owners, not the DOM, so a consumer sees whatever provider encloses it
 * reactively. A consumer with no provider above it gets `defaultValue`, which is why
 * supplying one is usually better than handling undefined everywhere.
 *
 * Pass `name`. Unnamed, the key is a bare symbol and a devtools panel has nothing to
 * label the node with.
 *
 * @example
 * ```ts
 * const Theme = context<'light' | 'dark'>('light', 'theme');
 *
 * // provider side, as a component
 * Theme.Provider({ value: 'dark', children: () => renderPage() });
 *
 * // consumer side, anywhere below it
 * const theme = useContext(Theme);   // 'dark' here, 'light' with no provider
 * ```
 */
export function context<T>(defaultValue?: T, name?: string): Context<T> {
  return createContext(defaultValue, name);
}

/**
 * A child scope of `parent`, created without entering it.
 *
 * Low level, and rarely the right tool. {@link root} both creates a scope and makes it
 * current, which is what almost all code wants. This hands back an owner to hold and
 * enter later with `runWithOwner`, for a scope whose lifetime does not match the call
 * that created it: a cached subtree, or one list row among many.
 *
 * Disposing `parent` disposes this, since it is attached on creation.
 *
 * @example
 * ```ts
 * const scope = childOwner(getOwner());
 * // later, and possibly from another task
 * runWithOwner(scope, () => effect(() => paint(row())));
 * ```
 */
export function childOwner(parent: Owner | null): Owner {
  return createChildOwner(parent);
}
