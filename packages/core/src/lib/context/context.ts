/**
 * Context: a value provided by a component and read by any component below it.
 *
 * The owner tree holds it (`@fluixi/reactive`), so `useContext` finds the nearest
 * `<Ctx.Provider>` above the component that asks. The same object is the key custom elements use
 * with `@fluixi/web-components`: an element reads what a Provider around it gives, and the
 * components an element renders read what the element provides.
 */
import { asProvider, type ComponentChild } from '@fluixi/dom';
import {
  createContext as createReactiveContext,
  getOwner,
  useContext as useReactiveContext,
  type Accessor,
  type Context,
} from '@fluixi/reactive/signal';

/**
 * A context with a default for components that have no Provider above them. `name` is what
 * devtools show for it.
 *
 * @example
 * ```tsx
 * const Theme = createContext<'light' | 'dark'>('light', 'theme');
 *
 * <Theme.Provider value="dark"><Toolbar /></Theme.Provider>
 * ```
 */
export function createContext<T>(defaultValue?: T, name?: string): {
  id: symbol;
  Provider: (props: { value: T; children?: any; debug?: boolean }) => any;
  defaultValue: T;
} {
  const context = createReactiveContext(defaultValue, name);

  const Provider = (props: { value: T; children?: any; debug?: boolean }) =>
    // Children stay a getter: the reactive Provider reads them after stamping the value on
    // its owner. Reading `props.children` here would render them, and any <Outlet/> in them,
    // before the context exists.
    context.Provider({
      value: props.value,
      get children() {
        return props.children;
      },
      debug: props.debug,
    });

  return {
    id: context.id,
    Provider: asProvider(Provider),
    defaultValue: defaultValue as T,
  };
}

/** The value of the nearest Provider above the calling component, or the context's default. */
export function useContext<T>(context: { id: symbol; defaultValue: T; [key: string]: any }): T {
  const value = useReactiveContext(context as any);
  return value !== undefined ? (value as T) : context.defaultValue;
}

/**
 * A Provider as a function call, for a component that provides without JSX. `value` may be an
 * accessor, read once. Pass the component's own props so `children` stays lazy.
 *
 * @example
 * ```ts
 * const ThemeProvider = (props) => createProvider(Theme, 'dark', props);
 * ```
 */
export function createProvider<T>(
  context: Context<T>,
  value: T | Accessor<T>,
  props: { children?: any },
): ComponentChild {
  const resolved = typeof value === 'function' ? (value as Accessor<T>)() : value;
  return context.Provider({
    value: resolved,
    get children() {
      return props.children;
    },
  });
}

/**
 * Several Providers as one, outermost first, for an app shell that would otherwise nest a
 * Provider per context. Values may be accessors, as in `createProvider`; children stay lazy.
 *
 * @example
 * ```ts
 * const AppProviders = (props) =>
 *   composeProviders([[Theme, 'dark'], [Locale, () => locale()], [Session, session]], props);
 * ```
 */
export function composeProviders(
  providers: ReadonlyArray<readonly [Context<any>, unknown]>,
  props: { children?: any },
): ComponentChild {
  const outermost = providers.reduceRight<{ children?: any }>(
    (inner, [context, value]) => ({
      get children() {
        return createProvider(context, value, inner);
      },
    }),
    props,
  );
  return outermost.children;
}

/**
 * `useContext` for a value that has to come from a Provider: throws when none is above,
 * instead of handing back the default. For parts that only work inside their parent, a tab
 * outside its tabs.
 */
export function requireContext<T>(context: { id: symbol; defaultValue?: T; [key: string]: any }, message?: string): T {
  for (let owner = getOwner(); owner; owner = owner.parent) {
    if (owner.contexts?.has(context.id)) return useContext(context as { id: symbol; defaultValue: T });
  }
  throw new Error(message ?? `[fluixi] No Provider for ${context.id.description ?? 'this context'} above this component.`);
}

export type { Context };
