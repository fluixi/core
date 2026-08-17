import { Accessor, createMemo, createChildOwner, disposeScope, getOwner, runWithOwner, type Owner } from '@fluixi/reactive/signal';
import { resolveReactiveProp, isTruthy } from './utils.js';

// Internal marker used by Switch to identify Match nodes.
const MATCH_MARKER = Symbol('match');

export interface MatchProps<T> {
  /** Condition that activates this branch. */
  when: T | Accessor<T> | null | undefined | false;
  /**
   * Content for this branch.
   * Can be a function receiving the truthy value.
   */
  children: any | ((val: NonNullable<T>) => any);
}

/** @internal Opaque shape returned by Match — consumed by Switch. */
export interface MatchNode<T = any> {
  [MATCH_MARKER]: true;
  when: Accessor<T | null | undefined | false>;
  children: any | ((val: NonNullable<T>) => any);
}

/**
 * Declare a conditional branch inside `Switch`.
 *
 * @example
 * <Switch fallback={<p>Unknown</p>}>
 *   <Match when={status() === 'loading'}><Spinner /></Match>
 *   <Match when={status() === 'error'}>{(s) => <Error />}</Match>
 *   <Match when={status() === 'ok'}><Content /></Match>
 * </Switch>
 */
export function Match<T>(props: MatchProps<T>): MatchNode<T> {
  return {
    [MATCH_MARKER]: true,
    // Lazy read through the prop getter — Switch calls `branch.when()` inside its memo,
    // so `when={cond()}` reacts; `when={cond}` unwraps via resolveReactiveProp.
    when: resolveReactiveProp(() => props.when),
    // Lazy, like `when`. Read eagerly, every branch's children were built the
    // moment the Match node was — before Switch had chosen one — so they were
    // created outside the branch's scope (and non-matching branches were built
    // for nothing). Switch reads this inside the selected branch's scope.
    get children() {
      return props.children;
    },
  } as MatchNode<T>;
}

export interface SwitchProps {
  /** Rendered when no `Match` branch is active. */
  fallback?: any;
  /**
   * One or more `Match` nodes (or an array of them).
   *
   * JSX:    children are <Match> elements
   * lit:    children array of Match({...}) results
   */
  children: MatchNode | MatchNode[];
}

/**
 * Multi-branch conditional rendering — mirrors SolidJS `<Switch>/<Match>`.
 *
 * Evaluates `Match` branches in order and renders the first truthy one.
 * Returns a memo — works in both JSX and `html` templates.
 *
 * @example JSX
 * <Switch fallback={<p>Nothing</p>}>
 *   <Match when={a()}><A /></Match>
 *   <Match when={b()}><B /></Match>
 * </Switch>
 *
 * @example html template
 * Switch({
 *   fallback: html`<p>Nothing</p>`,
 *   children: [
 *     Match({ when: a, children: html`<p>A</p>` }),
 *     Match({ when: b, children: html`<p>B</p>` }),
 *   ],
 * })
 */
export function Switch(props: SwitchProps): Accessor<any> {
  const branches = Array.isArray(props.children) ? props.children : [props.children];

  // Each branch renders in its own scope, disposed when a different branch takes
  // over, so whatever it registered with `onCleanup` — a listener, an observer, a
  // timer — goes with it. Keyed on which branch is showing, not on every re-run:
  // the memo also re-runs when a `when` value changes within the same branch, and
  // disposing then would throw away DOM the runtime deliberately reuses.
  const parentOwner = getOwner();
  let branchScope: Owner | null = null;
  let shown = -1;

  const enterBranch = (index: number): void => {
    if (index === shown) return;
    if (branchScope) disposeScope(branchScope);
    branchScope = createChildOwner(parentOwner);
    shown = index;
  };

  return createMemo(() => {
    for (let i = 0; i < branches.length; i += 1) {
      const raw = branches[i];
      // The JSX compiler wraps <Match> in createMemo(createComponent(...)); unwrap
      // those (and skip whitespace/other children) to reach the MatchNode. Direct
      // Match({...}) results (lit syntax) pass through unchanged.
      let branch: any = raw;
      let guard = 0;
      while (typeof branch === 'function' && !branch[MATCH_MARKER] && guard++ < 10) {
        branch = branch();
      }
      if (!branch || typeof branch !== 'object' || branch[MATCH_MARKER] !== true) {
        continue;
      }
      const value = branch.when();
      if (isTruthy(value)) {
        enterBranch(i);
        return runWithOwner(branchScope, () =>
          typeof branch.children === 'function' ? branch.children(value) : branch.children,
        );
      }
    }
    // The fallback is a branch too, so it gets a scope of its own.
    enterBranch(-2);
    return runWithOwner(branchScope, () => props.fallback ?? null);
  });
}
