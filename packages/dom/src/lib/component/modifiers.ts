// /**
//  * Development mode flag
//  */


export function asRouter(value: any) {
  Object.defineProperty(value, Symbol.for('fluixi-router'), { value: true, enumerable: true });
  return value
}
export function asRoutes(value: any) {
  Object.defineProperty(value, Symbol.for('fluixi-routes'), { value: true, enumerable: true });
  return value
}
export function asRoute(value: any) {
  Object.defineProperty(value, Symbol.for('fluixi-route'), { value: true, enumerable: true });
  return value
}
export function asOutlet(value: any) {
  if(typeof value!== 'function') return value
  Object.defineProperty(value, Symbol.for('fluixi-outlet'), { value: true, enumerable: true });
  return value
}
export function asProvider(value: any) {
  Object.defineProperty(value, Symbol.for('fluixi-provider'), { value: true, enumerable: true });
  return value
}
export function asContext(value: any) {
  Object.defineProperty(value, Symbol.for('fluixi-context'), { value: true, enumerable: true });
  return value
}
export function asComponent(value: any) {
  if(typeof value!== 'function') return value
  Object.defineProperty(value, Symbol.for('fluixi-component'), { value: true, enumerable: true });
  return value
}
export function asSuspense(value: any) {
  Object.defineProperty(value, Symbol.for('fluixi-suspense'), { value: true, enumerable: true });
  return value
}


export function isRouter(value: any) {
  return typeof value === 'function' && value[Symbol.for('fluixi-router')] === true
}
export function isRoutes(value: any) {
  return typeof value === 'function' && value[Symbol.for('fluixi-routes')] === true
}
export function isRoute(value: any) {
  return typeof value === 'function' && value[Symbol.for('fluixi-route')] === true
}
export function isOutlet(value: any) {
  return typeof value === 'function' && value[Symbol.for('fluixi-outlet')] === true
}
export function isProvider(value: any) {
  return typeof value === 'function' && value[Symbol.for('fluixi-provider')] === true
}
export function isContext(value: any) {
  return typeof value === 'function' && value[Symbol.for('fluixi-context')] === true
}
export function isComponent(value: any) {
  return typeof value === 'function' && value[Symbol.for('fluixi-component')] === true
}
export function isSuspense(value: any) {
  return typeof value === 'function' && value[Symbol.for('fluixi-suspense')] === true
}


export function checkRenderType(value: any): {
  type: 'router' | 'route' | 'routes' | 'outlet' | 'component' | 'suspense' | 'provider' | 'context' | 'none',
  value: any
}{
  if (isRouter(value)) {
    return {type: 'router', value}
  }
  if (isRoute(value)) {
    return {type: 'route', value}
  }
  if (isRoutes(value)) {
    return {type: 'routes', value}
  }
  if (isOutlet(value)) {
    return {type: 'outlet', value}
  }
  if (isComponent(value)) {
    return {type: 'component', value}
  }
  if (isSuspense(value)) {
    return {type: 'suspense', value}
  }
  if (isProvider(value)) {
    return {type: 'provider', value}
  }
  if (isContext(value)) {
    return {type: 'context', value}
  }
  return {type: 'none', value}
}


// export const DEV =
//   typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

// /**
//  * Component props type
//  */
// export interface ComponentProps {
//   children?: any;
//   [key: string]: any;
// }

// /**
//  * Component function type
//  */
// export type Component<P = ComponentProps> = (props: P) => any;

// /**
//  * Create and execute a component
//  *
//  * Section 2 — createComponent responsibilities:
//  * - Create Owner ✓
//  * - Untrack execution ✓
//  * - Capture output ✓
//  * - Lazy children ✓
//  * - Context propagation ✓ (via reactive system)
//  * - Cleanup attachment ✓
//  *
//  * Section 1: Components execute once, never re-execute
//  *
//  * @template P - Props type
//  * @param {Component<P>} Comp - Component function
//  * @param {P} props - Component props
//  * @returns {any} Component output
//  *
//  * @example
//  * ```typescript
//  * const MyComponent = (props: { name: string }) => {
//  *   return html`<div>Hello ${props.name}</div>`;
//  * };
//  *
//  * const result = createComponent(MyComponent, { name: 'World' });
//  * ```
//  */
// export function createComponent<P extends ComponentProps>(
//   Comp: Component<P>,
//   props: P
// ): any {
//   // Section 1: Component is a plain function
//   if (typeof Comp !== 'function') {
//     return Comp;
//   }

//   // Section 3: Make children lazy
//   if (props && 'children' in props) {
//     const children = props.children;

//     // Already lazy, keep as is
//     if (typeof children === 'function') {
//       // Children are already a function
//     } else {
//       // Make children lazy by wrapping in getter
//       Object.defineProperty(props, 'children', {
//         get() {
//           return typeof children === 'function' ? children : () => children;
//         },
//         enumerable: true,
//         configurable: true,
//       });
//     }
//   }

//   // DEV mode: Mark component for debugging
//   if (DEV && Comp.name) {
//     try {
//       (props as any).__componentName = Comp.name;
//     } catch (e) {
//       // Silently fail if props is frozen
//     }
//   }

//   // Section 2: Untrack execution - component doesn't track parent dependencies
//   // Section 1: Execute once, never re-execute
//   return untrack(() => {
//     // Section 2: Execute component in untracked context
//     // The component function runs once and constructs the reactive graph
//     return Comp(props);
//   });
// }
