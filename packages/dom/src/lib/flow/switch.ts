import { Accessor, createMemo } from '@fluixi/reactive/signal';
import { normalizeAccessor, isTruthy } from './utils.js';

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
    when: normalizeAccessor(props.when),
    children: props.children,
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
 * Returns a memo — works in both JSX and lit-html.
 *
 * @example JSX
 * <Switch fallback={<p>Nothing</p>}>
 *   <Match when={a()}><A /></Match>
 *   <Match when={b()}><B /></Match>
 * </Switch>
 *
 * @example lit-html
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

  return createMemo(() => {
    for (const branch of branches) {
      const value = branch.when();
      if (isTruthy(value)) {
        return typeof branch.children === 'function'
          ? branch.children(value)
          : branch.children;
      }
    }
    return props.fallback ?? null;
  });
}
