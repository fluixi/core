import { Accessor, createMemo, createChildOwner, disposeScope, getOwner, isSignal, runWithOwner, untrack, type Owner } from '@fluixi/reactive/signal';
import { createDynamicElement } from '../dom/dynamic-element.js';
import { createComponent } from '../dom/integration.js';
import { splitProps } from '../dom/runtime.js';

export interface DynamicProps<T extends Record<string, any> = Record<string, any>> {
  /**
   * A component function (or null/undefined) to render.
   * Can be a reactive accessor that changes over time.
   *
   * JSX:    <Dynamic component={currentView()} {...props} />
   * html:   Dynamic({ component: currentView, ...props })
   */
  component: ((props: T) => any) | string | null | undefined | Accessor<((props: T) => any) | string | null | undefined>;
  [key: string]: any;
}

/**
 * Renders a component dynamically: mirrors SolidJS `<Dynamic>`.
 *
 * `component` is a tag or a component, read through the prop so it can change; a signal or memo
 * passed as is also works. When it changes, the old output is discarded and the new one built.
 * Returns a memo: works in both JSX and `html` templates.
 *
 * @example JSX
 * <Dynamic component={tab() === 'a' ? CompA : CompB} value={x()} />
 *
 * @example html template
 * Dynamic({ component: currentView, value: x })   // currentView: a signal or memo
 */
export function Dynamic<T extends Record<string, any> = Record<string, any>>(
  props: DynamicProps<T>
): Accessor<any> {
  // Read through the prop on each run, so `component={view()}` follows `view`. A signal or memo
  // handed over as is (the `html` template form) is read; any other function is a component.
  const getComponent = () => {
    const value = props.component as unknown;
    return isSignal(value) ? (value as () => unknown)() : value;
  };

  // Every prop but `component`, still read through `props`: a getter stays live, so a prop that
  // changes reaches what is rendered. Destructuring read each one once.
  const [, rest] = splitProps(props, ['component']);

  // The rendered component owns its scope, disposed when `component` changes, so
  // what the outgoing one registered with `onCleanup` goes with it. Keyed on the
  // component itself, not on every re-run: the memo also re-runs when a prop it
  // reads changes, and disposing then would remount on every update.
  const parentOwner = getOwner();
  let scope: Owner | null = null;
  let current: unknown;
  let rendered: unknown;

  return createMemo(() => {
    const C = getComponent();
    if (C === current) return rendered;
    if (scope) disposeScope(scope);
    scope = createChildOwner(parentOwner);
    current = C;
    // A tag builds that element, as the compiler would (server render and hydration included);
    // a function is a component. Untracked: what they read is theirs, not a reason to rebuild.
    rendered =
      C == null
        ? null
        : runWithOwner(scope, () =>
            untrack(() => (typeof C === 'string' ? createDynamicElement(C, rest) : createComponent(C as (p: any) => any, rest))),
          );
    return rendered;
  }, undefined, { name: 'Dynamic' });
}
