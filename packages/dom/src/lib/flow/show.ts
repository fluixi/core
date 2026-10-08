import {
  createChildOwner,
  createMemo,
  disposeScope,
  getOwner,
  isSignal,
  runWithOwner,
  untrack,
  type Owner,
} from '@fluixi/reactive/signal';
import { normalizeAccessor, resolveReactiveProp, isTruthy, isLitResult } from './utils.js';
import { makeArrayFlat } from '../dom/runtime.js';
import { Accessor, isResource } from '@fluixi/reactive/signal';

/**
 * Extract the resolved value type from Show's `when` prop.
 */
export type ShowValue<T> = T extends () => infer V ? V : NonNullable<T extends () => infer V ? V : T>;


export interface ShowProps<T, W = any> {
  /** Reactive condition. When truthy, renders children. */
  when: T | Accessor<T> | null | undefined | false;
  /** Content rendered when `when` is falsy. */
  fallback?: any;
  /**
   * Content when `when` is truthy.
   * Can be a function receiving the truthy value (useful to narrow types).
   *
   * JSX:    <Show when={user()}>{(u) => <span>{u.name}</span>}</Show>
   * lit:    Show({ when: user, children: (u) => html`<span>${u.name}</span>` })
   */
  children: W | ((val: ShowValue<T>) => any);
  debug?: boolean
}

/**
 * Conditionally renders content based on a reactive condition.
 *
 * Returns a memo: works in both JSX and `html` templates.
 *
 * @example JSX
 * <Show when={isLoggedIn()} fallback={<Login />}>
 *   <Dashboard />
 * </Show>
 *
 * @example html template
 * Show({ when: isLoggedIn, fallback: html`<p>Login</p>`, children: html`<p>Dashboard</p>` })
 */
//   return createMemo(() => {
export function Show<T>(props: ShowProps<T>): any {
  // Read `when` lazily through the prop getter so `when={cond()}` re-runs the caller's
  // expression inside these memos (reactive), while `when={cond}` / `when={() => cond}`
  // still work: resolveReactiveProp unwraps the accessor form once.
  const when = resolveReactiveProp<T>(() => props.when as any);
  // Named for a watcher: three memos at one line, two of them anonymous, is what a graph of
  // a page with a few conditions turns into.
  const value = createMemo(when, undefined, { name: 'Show.when' });
    // Which branch, not the value: a new object that is just as truthy (route data after a
    // refetch) must not rebuild plain children, or everything under them is remounted and
    // loses its state, focus and input.
    const cond = createMemo(() => !!value(), undefined, { name: 'Show.cond' });

    // Each branch renders in its own scope so that leaving it tears down whatever
    // it registered, an event listener, an observer, a timer. Without this the
    // branch's `onCleanup`s land on the enclosing owner and only run when the
    // whole tree dies, so a closed <Show> kept listening and reacting.
    //
    // Keyed on which branch is showing, not on every re-run: the memo also re-runs
    // when function children get a new value or what the children read changes, and
    // disposing then would throw away DOM the runtime deliberately reuses.
    const parentOwner = getOwner();
    let branchScope: Owner | null = null;
    let shown: 'when' | 'fallback' | null = null;

    const enterBranch = (next: 'when' | 'fallback'): void => {
      if (next === shown) return;
      if (branchScope) disposeScope(branchScope);
      branchScope = createChildOwner(parentOwner);
      shown = next;
    };

    return createMemo(
      () => {
        const evaluate = cond();
        enterBranch(evaluate ? 'when' : 'fallback');
        return runWithOwner(branchScope, () => {
          if (!evaluate) return props.fallback;
          const children = props.children;
          if (typeof children === 'function' && !isLitResult(children)) {
            // Function children receive the value, so a new value renders them again.
            const current = value();
            return untrack(() => (children as (item: T) => any)(current as T));
          }
          return children;
        });
      },
      undefined,
    // Not `Show`: the compiler already marks the memo it wraps the component in with that,
    // and two cards of the same name in one graph is worse than a longer one.
    { name: 'Show.result' }
  );
}