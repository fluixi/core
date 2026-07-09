// /**
//  * @fileoverview Context API for Fluixi that wraps @fluixi/reactive context for Lit templates
//  * @module @fluixi/core/context/context
//  */

import { asProvider, type Component } from '@fluixi/dom';
import { createContext as createReactiveContext, useContext as useReactiveContext } from '@fluixi/reactive/signal';
import {
  Accessor,
  Context,
  readChildren,
} from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
ensureIntegration('index')
// import {
//   createContext as reactiveCreateContext,
//   useContext as reactiveUseContext,
//   type CreateContext as ReactiveContext,
//   type Accessor,
// } from '@fluixi/reactive/signal';
// import { html, TemplateResult } from 'lit';

// /**
//  * Re-export Context type from @fluixi/reactive
//  */
// export type Context<T> = ReactiveContext<T>;

// /**
//  * Creates a new context using @fluixi/reactive's context system
//  *
//  * Contexts provide a way to pass data through the component tree without
//  * having to pass props down manually at every level.
//  *
//  * @template T - Type of the context value
//  * @param {T} defaultValue - Default value when no provider is found
//  * @returns {Context<T>} Context object
//  *
//  * @example
//  * ```typescript
//  * import { createContext } from '@fluixi/core/context';
//  *
//  * // Create a theme context
//  * interface Theme {
//  *   primaryColor: string;
//  *   secondaryColor: string;
//  * }
//  *
//  * const ThemeContext = createContext<Theme>({
//  *   primaryColor: '#007bff',
//  *   secondaryColor: '#6c757d'
//  * });
//  * ```
//  *
//  * @example
//  * ```typescript
//  * // Create a user context
//  * interface User {
//  *   id: number;
//  *   name: string;
//  *   email: string;
//  * }
//  *
//  * const UserContext = createContext<User | null>(null);
//  * ```
//  */
// export function createContext<T>(defaultValue: T): Context<T> {
//   return reactiveCreateContext(defaultValue);
// }

// /**
//  * Retrieves the value of a context using @fluixi/reactive's context system
//  *
//  * Must be called within a component that is a descendant of a Provider
//  * for the given context, otherwise returns the default value.
//  *
//  * @template T - Type of the context value
//  * @param {Context<T>} context - Context to read from
//  * @returns {T} Current context value
//  *
//  * @example
//  * ```typescript
//  * import { createContext, useContext } from '@fluixi/core/context';
//  * import { FluixiElement } from '@fluixi/core/core/component';
//  * import { html } from 'lit';
//  *
//  * const ThemeContext = createContext({ primaryColor: '#007bff' });
//  *
//  * class ThemedButton extends FluixiElement {
//  *   view() {
//  *     const theme = useContext(ThemeContext);
//  *     return html`
//  *       <button style="background: ${theme.primaryColor}">
//  *         Themed Button
//  *       </button>
//  *     `;
//  *   }
//  * }
//  * ```
//  *
//  * @example
//  * ```typescript
//  * // With null checking
//  * const UserContext = createContext<User | null>(null);
//  *
//  * class UserProfile extends FluixiElement {
//  *   view() {
//  *     const user = useContext(UserContext);
//  *
//  *     if (!user) {
//  *       return html`<p>Not logged in</p>`;
//  *     }
//  *
//  *     return html`<p>Welcome, ${user.name}!</p>`;
//  *   }
//  * }
//  * ```
//  */
// export function useContext<T>(context: Context<T>): T {
//   return reactiveUseContext(context) as T;
// }

type C = Component | Component[];

interface Children {
  (): C;
  (...args: any[]): C;
}
// /**
//  * Props for the Provider component
//  * @template T - Type of the context value
//  */

type PickAccessor<T> = T extends Accessor<infer U> ? U : T;
type PickChildren<T> = T extends Record<any, any> ? 'children' extends keyof T ? T['children'] : never : never;
export interface ContextProvider<T, S> {
  /**
   * Context to provide
   */
  context: Context<T>;

  /**
   * Value to provide
   */
  value: T | Accessor<T>;

  /**
   * Children components that can access this context
   */
  debug?: boolean;
  children?: (S extends Record<any, any> ? PickChildren<S> : never) | S;
}

export interface ProviderProps<Child> {
  /**
   * Children components that can access this context
   */
  children?: Child extends Record<any, any> ? PickChildren<Child> : never;
}

/**
 * Provider component that supplies a context value to its descendants
 *
 * This wraps @fluixi/reactive's Provider for use with Lit templates.
 *
 * @template T - Type of the context value
 * @param {ContextProvider<T>} props - Component props
 * @returns {TemplateResult} Rendered children with context
 *
 * @example
 * ```typescript
 * import { createContext, Provider } from '@fluixi/core/context';
 * import { createSignal } from '@fluixi/reactive';
 * import { html } from 'lit';
 *
 * const ThemeContext = createContext({ primaryColor: '#007bff' });
 *
 * class App extends FluixiElement {
 *   private [theme, setTheme] = createSignal({ primaryColor: '#28a745' });
 *
 *   view() {
 *     return html`
 *       ${Provider({
 *         context: ThemeContext,
 *         value: this.theme(),
 *         children: html`
 *           <div>
 *             <themed-button></themed-button>
 *             <themed-text></themed-text>
 *           </div>
 *         `
 *       })}
 *     `;
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Nested providers
 * const UserContext = createContext<User | null>(null);
 * const PermissionsContext = createContext<string[]>([]);
 *
 * class App extends FluixiElement {
 *   private [user, setUser] = createSignal<User | null>(null);
 *   private [permissions, setPermissions] = createSignal<string[]>(['read']);
 *
 *   view() {
 *     return html`
 *       ${Provider({
 *         context: UserContext,
 *         value: this.user(),
 *         children: Provider({
 *           context: PermissionsContext,
 *           value: this.permissions(),
 *           children: html`<app-dashboard></app-dashboard>`
 *         })
 *       })}
 *     `;
 *   }
 * }
 * ```
 */
let _warnedEagerProvider = false;
function warnEagerProvider(): void {
  if (_warnedEagerProvider) return;
  _warnedEagerProvider = true;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  console.warn(
    '[fluixi] createProvider({ context, value, children }) reads `children` eagerly: ' +
    'the object literal materialises `children` BEFORE the context is stamped, so a ' +
    'routed <Outlet/> that has siblings inside the provider renders detached and its ' +
    'descendants see no context under SSR. Use the lazy form instead:\n' +
    '  createProvider(Context, value, props)   // children stays a getter\n' +
    '  // or JSX:  <Context.Provider value={…}>{props.children}</Context.Provider>',
  );
}

/**
 * Lazy-safe form — pass the component's `props` so `children` is read through a
 * getter (inside the stamped scope), never materialised early. This is the
 * recommended way to wrap an <Outlet/>.
 *
 *   function ThemeProvider(props) {
 *     return createProvider(ThemeContext, theme, props);
 *   }
 */
export function createProvider<T>(
  context: Context<T>,
  value: T | Accessor<T>,
  props: { children?: any },
): Component<T>;
/**
 * @deprecated Eager form — `{ context, value, children }` reads `children` before
 * the context is stamped (see warnEagerProvider). Use `createProvider(context,
 * value, props)` or `<Context.Provider>` instead.
 */
export function createProvider<T, S = Children>(props: ContextProvider<T, S>): Component<T>;
export function createProvider<T, S = Children>(
  a: Context<T> | ContextProvider<T, S>,
  value?: T | Accessor<T>,
  childProps?: { children?: any },
): Component<T> {
  // Distinguish the two overloads: a Context (from createContext) exposes `.Provider`,
  // whereas the deprecated form's first arg is the props object (which has `.context`).
  const isLazyForm = !!(a as any)?.Provider;

  const context = (isLazyForm ? (a as Context<T>) : (a as ContextProvider<T, S>).context);
  const rawValue = isLazyForm ? value : (a as ContextProvider<T, S>).value;
  const debug = isLazyForm ? false : ((a as ContextProvider<T, S>).debug ?? false);

  if (!isLazyForm) warnEagerProvider();

  // Resolve value if it's an accessor
  const resolvedValue =
    typeof rawValue === 'function' ? (rawValue as Accessor<T>)() : (rawValue as T);

  // Always read children through a getter so they render INSIDE the stamped scope.
  // For the lazy form `childProps.children` is still a getter here (untouched); for
  // the eager form the caller already materialised it, so this can only mitigate,
  // not fully fix — hence the deprecation warning above.
  const sourceProps = isLazyForm ? childProps : (a as ContextProvider<T, S>);
  return context.Provider({
    value: resolvedValue,
    get children() { return (sourceProps as any)?.children; },
    debug,
  });

  // // Wrap children in the reactive provider
  // return html`${ReactiveProvider({
  //   value: resolvedValue,
  //   children: resolveChildren(children),
  //   //<!--Array.isArray(children) ? html`${children}` : children,-->
  // } as any)}`;
}

/**
 * Creates a context with a provider component
 *
 * Returns both the context and a convenience component that combines
 * context creation with the provider.
 *
 * @template T - Type of the context value
 * @param {T} defaultValue - Default value for the context
 * @returns {[Context<T>, (props: { value: T | Accessor<T>; children: TemplateResult | TemplateResult[] }) => TemplateResult]} Context and provider component
 *
 * @example
 * ```typescript
 * import { createContextWithProvider } from '@fluixi/core/context';
 * import { createSignal } from '@fluixi/reactive';
 * import { html } from 'lit';
 *
 * const [ThemeContext, ThemeProvider] = createContextWithProvider({
 *   primaryColor: '#007bff'
 * });
 *
 * class App extends FluixiElement {
 *   private [theme] = createSignal({ primaryColor: '#28a745' });
 *
 *   view() {
 *     return html`
 *       ${ThemeProvider({
 *         value: this.theme(),
 *         children: html`<div><themed-button></themed-button></div>`
 *       })}
 *     `;
 *   }
 * }
 *
 * class ThemedButton extends FluixiElement {
 *   view() {
 *     const theme = useContext(ThemeContext);
 *     return html`<button style="color: ${theme.primaryColor}">Click</button>`;
 *   }
 * }
 * ```
 */
export function createContextWithProvider<T, U>(
  defaultValue: T
): [Context<T>, (props: Omit<ContextProvider<T, U>, 'context'>) => Component<T>] {
  const context = createContext(defaultValue);

  const provider = (props: Omit<ContextProvider<T, U>, 'context'>) => {
    // Lazy-safe form so children (which may contain an <Outlet/>) render inside
    // the stamped scope.
    return createProvider(context, props.value as T, props as { children?: any });
  };

  return [context, provider];
}

/**
 * Creates multiple context providers in a nested structure
 *
 * Utility function to avoid deeply nested Provider components.
 *
 * @param {Array<[Context<any>, any]>} contexts - Array of [context, value] tuples
 * @param {TemplateResult | TemplateResult[]} children - Children to render
 * @returns {TemplateResult} Nested providers with children
 *
 * @example
 * ```typescript
 * import { composeProviders, createContext } from '@fluixi/core/context';
 * import { createSignal } from '@fluixi/reactive';
 * import { html } from 'lit';
 *
 * const ThemeContext = createContext({ dark: false });
 * const UserContext = createContext<User | null>(null);
 * const LocaleContext = createContext('en');
 *
 * class App extends FluixiElement {
 *   private [theme] = createSignal({ dark: true });
 *   private [user] = createSignal<User | null>({ id: 1, name: 'Alice' });
 *   private [locale] = createSignal('fr');
 *
 *   view() {
 *     return composeProviders(
 *       [
 *         [ThemeContext, this.theme()],
 *         [UserContext, this.user()],
 *         [LocaleContext, this.locale()]
 *       ],
 *       html`<app-dashboard></app-dashboard>`
 *     );
 *   }
 * }
 * ```
 */
export function composeProviders(
  contexts: Array<[Context<any>, any]>,
  children: Children
): Component {
  if (contexts.length === 0) {
    return readChildren(() => children) as unknown as Component;
  }

  const [context, value] = contexts[0];
  const remaining = contexts.slice(1);

  // Lazy-safe form: defer the nested children behind a getter so each provider
  // stamps its context before the inner providers/children render.
  return createProvider(context, value, {
    get children() { return composeProviders(remaining, children) as any; },
  });
}

/**
 * Creates a context consumer component
 *
 * Alternative to useContext hook, useful for rendering props patterns.
 *
 * @template T - Type of the context value
 * @param {Context<T>} context - Context to consume
 * @returns {(props: { children: (value: T) => TemplateResult }) => TemplateResult} Consumer component
 *
 * @example
 * ```typescript
 * import { createContext, createConsumer } from '@fluixi/core/context';
 * import { html } from 'lit';
 *
 * const ThemeContext = createContext({ primaryColor: '#007bff' });
 * const ThemeConsumer = createConsumer(ThemeContext);
 *
 * class MyComponent extends FluixiElement {
 *   view() {
 *     return html`
 *       ${ThemeConsumer({
 *         children: (theme) => html`
 *           <div style="color: ${theme.primaryColor}">
 *             Themed content
 *           </div>
 *         `
 *       })}
 *     `;
 *   }
 * }
 * ```
 */
export function createConsumer<T>(
  context: Context<T>
): (props: { children: (value: T) => Component }) => Component {
  return (props: { children: (value: T) => Component }) => {
    const value = useContext(context);
    return props.children(value as T);
  };
}

/**
 * Hook to provide and consume a context in one component
 *
 * Useful for creating context-based stores or services.
 *
 * @template T - Type of the context value
 * @param {Context<T>} context - Context to use
 * @param {() => T} factory - Factory function to create the context value
 * @returns {T} Context value
 *
 * @example
 * ```typescript
 * import { createContext, useProvide, Provider } from '@fluixi/core/context';
 * import { createSignal } from '@fluixi/reactive';
 * import { html } from 'lit';
 *
 * interface Counter {
 *   count: number;
 *   increment: () => void;
 * }
 *
 * const CounterContext = createContext<Counter>({
 *   count: 0,
 *   increment: () => {}
 * });
 *
 * class CounterProvider extends FluixiElement {
 *   view() {
 *     const counter = useProvide(CounterContext, () => {
 *       const [count, setCount] = createSignal(0);
 *       return {
 *         count: count(),
 *         increment: () => setCount(count() + 1)
 *       };
 *     });
 *
 *     return html`
 *       ${Provider({
 *         context: CounterContext,
 *         value: counter,
 *         children: html`<slot></slot>`
 *       })}
 *     `;
 *   }
 * }
 * ```
 */
export function useProvide<T>(context: Context<T>, factory: () => T): T {
  // Check if already provided
  const existing = useContext(context);

  // If we got the default value, create new instance
  if (existing === context.defaultValue) {
    return factory();
  }

  return existing as T;
}

/**
 * Creates a scoped context that only exists within a specific component tree
 *
 * @template T - Type of the context value
 * @param {T} defaultValue - Default value for the context
 * @returns {Context<T>} Scoped context object
 *
 * @example
 * ```typescript
 * import { createContext } from '@fluixi/core/context';
 *
 * // This context won't leak to parent or sibling components
 * const LocalContext = createContext({ data: 'local' });
 * ```
 */
// export function createContext<T>(defaultValue: T): Context<T> {
//   // Create a unique symbol-based context for scoping
//   return createContext(defaultValue);
// }
//
//
// ============================================================================
// CONTEXT HELPERS
// ============================================================================

/**
 * Create a context for sharing state across component tree
 *
 * Section 9: Context is lookup-based, works on server and client
 * Supports nested contexts and complex values
 *
 * @template T - Context value type
 * @param {T} defaultValue - Default value
 * @returns {Context<T>} Context object with Provider
 *
 * @example
 * ```typescript
 * // Simple context
 * const ThemeContext = createContext('light');
 *
 * // Complex context with object
 * const AppContext = createContext({
 *   theme: 'light',
 *   toggleTheme: () => {}
 * });
 *
 * // Usage in JSX
 * <ThemeContext.Provider value="dark">
 *   <Child />
 * </ThemeContext.Provider>
 *
 * // Usage in Lit-html
 * html`
 *   <${ThemeContext.Provider} value=${{ theme: 'dark', toggleTheme }}>
 *     <${Child} />
 *   </${ThemeContext.Provider}>
 * `
 * ```
 */

/**
 * Creates a scoped context that only exists within a specific component tree
 *
 * @template T - Type of the context value
 * @param {T} defaultValue - Default value for the context
 * @returns {Context<T>} Scoped context object
 *
 * @example
 * ```typescript
 * import { createContext } from '@fluixi/core';
 *
 * // This context won't leak to parent or sibling components
 * const LocalContext = createContext({ data: 'local' });
 * ```
 * @example
 * ```typescript
 * // Simple context
 * const ThemeContext = createContext('light');
 *
 * // Complex context with object
 * const AppContext = createContext({
 *   theme: 'light',
 *   toggleTheme: () => {}
 * });
 *
 * // Usage in JSX
 * <ThemeContext.Provider value="dark">
 *   <Child />
 * </ThemeContext.Provider>
 *
 * // Usage in Lit-html
 * html`
 *   <${ThemeContext.Provider} value=${{ theme: 'dark', toggleTheme }}>
 *     <${Child} />
 *   </${ThemeContext.Provider}>
 * `
 * ```
 */
export function createContext<T>(defaultValue?: T): {
  id: symbol;
  Provider: (props: { value: T; children?: any, debug?: boolean }) => any;
  defaultValue: T;
} {
  const context = createReactiveContext(defaultValue);

  // Wrap Provider to work with both JSX and Lit-html
  const Provider = (props: { value: T; children?: any, debug?: boolean }) => {
    if (props.debug === true) {
    }
    // Pass children LAZILY (a getter). The reactive Provider reads children inside
    // its render effect, AFTER stamping the context on the owner. Reading
    // props.children here (e.g. `children: props.children`) evaluates the imperative
    // `get children()` getter eagerly, so the children — and any <Outlet/> in them —
    // render before the context is available.
    return context.Provider({
      value: props.value,
      get children() {
        return props.children;
      },
      debug: props.debug,
    });
  };

  // For JSX: Provider.$$typeof support
  if (typeof Symbol !== 'undefined' && Symbol.for) {
    (Provider as any).$$typeof = Symbol.for('react.provider');
  }
  (Provider as any).$$typeof = Symbol.for('react.provider');

  return {
    id: context.id,
    Provider: asProvider(Provider),
    defaultValue: defaultValue as T,
  };
}

/**
 * Use context value from nearest Provider
 *
 * Section 9: Lookup-based, no subscriptions on server
 *
 * @template T - Context value type
 * @param {Context} context - Context to use
 * @returns {T} Context value
 *
 * @example
 * ```typescript
 * const Child = () => {
 *   const theme = useContext(ThemeContext);
 *   const { theme: currentTheme, toggleTheme } = useContext(AppContext);
 *
 *   return html`
 *     <div>
 *       <p>Theme: ${currentTheme}</p>
 *       <button @click=${toggleTheme}>Toggle</button>
 *     </div>
 *   `;
 * };
 * ```
 */

export function useContext<T>(context: {
  id: symbol;
  defaultValue: T;
  [key: string]: any;
}): T {
  // Use reactive context lookup — walks up Owner chain
  const value = useReactiveContext(context as any);
  return value !== undefined ? (value as T) : context.defaultValue;
}

// /**
//  * Create a context provider component helper
//  * Useful for creating custom provider components
//  *
//  * @template T
//  * @param {Context} context - Context to provide
//  * @param {T} value - Value to provide
//  * @param {any} children - Child components
//  * @returns {any} Provider element
//  */
// export function createProvider<T>(
//   context: { Provider: any },
//   value: T,
//   children: any
// ): any {
//   return context.Provider({ value, children });
// }

export type { Context };
