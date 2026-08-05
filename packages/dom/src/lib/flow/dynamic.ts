import { Accessor, createMemo, createChildOwner, disposeScope, getOwner, runWithOwner, type Owner } from '@fluixi/reactive/signal';
import { normalizeAccessor } from './utils.js';

export interface DynamicProps<T extends Record<string, any> = Record<string, any>> {
  /**
   * A component function (or null/undefined) to render.
   * Can be a reactive accessor that changes over time.
   *
   * JSX:    <Dynamic component={currentView()} {...props} />
   * lit:    Dynamic({ component: currentView, ...props })
   */
  component: ((props: T) => any) | string | null | undefined | Accessor<((props: T) => any) | string | null | undefined>;
  [key: string]: any;
}

/**
 * Renders a component dynamically — mirrors SolidJS `<Dynamic>`.
 *
 * The `component` prop can be a reactive accessor.  When it changes,
 * the old output is discarded and the new component is called.
 * Returns a memo — works in both JSX and lit-html.
 *
 * @example JSX
 * <Dynamic component={tab() === 'a' ? CompA : CompB} value={x()} />
 *
 * @example lit-html
 * Dynamic({ component: () => tab() === 'a' ? CompA : CompB, value: x })
 */
export function Dynamic<T extends Record<string, any> = Record<string, any>>(
  props: DynamicProps<T>
): Accessor<any> {
  const getComponent = normalizeAccessor(props.component as any);

  // Spread all props except `component` to the resolved component.
  const { component: _c, ...rest } = props;

  // The rendered component owns its scope, disposed when `component` changes, so
  // what the outgoing one registered with `onCleanup` goes with it. Keyed on the
  // component itself, not on every re-run: the memo also re-runs when a prop it
  // reads changes, and disposing then would remount on every update.
  const parentOwner = getOwner();
  let scope: Owner | null = null;
  let current: unknown;

  return createMemo(() => {
    const C = getComponent();
    if (C !== current) {
      if (scope) disposeScope(scope);
      scope = createChildOwner(parentOwner);
      current = C;
    }
    if (C == null) return null;
    if (typeof C === 'string') {
      // Intrinsic element — return a descriptor that the runtime can handle.
      return { tag: C, props: rest };
    }
    return runWithOwner(scope, () => (C as (p: any) => any)(rest));
  });
}
