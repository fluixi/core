import { Accessor, createMemo } from '@awc/reactive/signal';
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

  return createMemo(() => {
    const C = getComponent();
    if (C == null) return null;
    if (typeof C === 'string') {
      // Intrinsic element — return a descriptor that the runtime can handle.
      return { tag: C, props: rest };
    }
    return (C as (p: any) => any)(rest);
  });
}
