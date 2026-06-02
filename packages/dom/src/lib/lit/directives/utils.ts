import { Accessor, isSignal, isMemo, isResource } from '@fluixi/reactive';
import { litrx } from './litrx.js';
import { nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { DirectiveResult } from 'lit/directive.js';
import { iterateFn } from '../../dom/runtime.js';

type Handler = (_accessor: any) => DirectiveResult;

export function isPromise<T = any>(v: unknown): v is Promise<T> {
  return (
    !!v && (typeof v === 'object' || typeof v === 'function') && 'then' in v
  );
}
export function rxDirective<T extends (...args: any[]) => any>(
  directiveFn: T,
  handler: Handler
): T {
  return ((...args: any[]) => {
    const processedArgs = args.map((arg) => {
      console.log('arg', arg);
      if (isSignal(arg) || typeof arg === 'function') {
        // If the directive returns a function, we need to handle it specially
        return handler(() => {
          const value = iterateFn(arg);
          console.log('value', value);
          return typeof value === 'function' ? value() : value;
        });
      }
      return arg;
    });
    return directiveFn(...processedArgs);
  }) as T;
}
export function asyncRxDirective<T extends (...args: any[]) => any>(
  directiveFn: T,
  handler: Handler
): T {
  return ((...args: any[]) => {
    const processedArgs = args.map((arg) => {
      if (isSignal(arg) || typeof arg === 'function') {
        // If the directive returns a function, we need to handle it specially
        const value = iterateFn(arg);
        console.log('arg', value);
        return handler(async () => {
          console.log('handler');
          if (isPromise(value)) {
            const v = await value;
            console.log('value', v);
            return v;
          } else {
            return typeof value === 'function' ? value() : value;
          }
        });
      }
      return arg;
    });
    return directiveFn(...processedArgs);
  }) as T;
}

// /**
//  * Helper type to check if a value is a signal accessor
//  */
// export function isAccessor(value: any): value is Accessor<any> {
//   return typeof value === 'function' && value.length === 0;
// }

/**
 * Automatically wraps signal accessors with reactive directive
 * Use this for convenience when you have many signals in a template
 *
 * @param value - Value or signal accessor
 * @returns Wrapped value with reactive directive if needed
 *
 * @example
 * ```typescript
 * const [count, setCount] = createSignal(0);
 *
 * // Instead of:
 * html`<p>${reactive(count)}</p>`;
 *
 * // You can use:
 * html`<p>${auto(count)}</p>`;
 *
 * // Works with non-signals too:
 * html`<p>${auto('static')}</p>`;  // No wrapping needed
 * ```
 */
export function auto(value: any): any {
  // Known reactive primitives: wrap with litrx for fine-grained tracking
  if (isSignal(value) || isMemo(value) || isResource(value)) {
    return litrx(value);
  }
  // Plain zero-arg functions (e.g. component returns, Suspense results):
  // unwrap by calling them so lit-html receives the actual value
  if (typeof value === 'function' && value.length === 0) {
    return iterateFn(value);
  }
  return value;
}

/**
 * A helper function to create reactive expressions
 */
export function $<T>(signal: Accessor<T> | (() => T)): any {
  if (isSignal(signal)) {
    return signal();
  }
  // If it's a regular function, wrap it in a signal directive
  return (signal as any)(() => signal());
}

/**
 * Conditional rendering with signals
 *
 * Example usage in templates:
 *
 * // Regular usage with signals
 * const count = createSignal(0);
 * const isActive = createSignal(true);
 *
 * // In a template:
 * html`
 *   <div class=${$if(isActive, 'active', 'inactive')}>
 *     Count: ${count}
 *     ${$each(() => items(), item => item.id, item => html`<li>${item.name}</li>`)}
 *   </div>
 * `
 *
 * // Or with automatic signal detection:
 * html`
 *   <div class=${isActive}>
 *     Count: ${count}
 *   </div>
 * `
 */
export function $if<T>(
  condition: Accessor<boolean> | (() => boolean),
  trueValue: T | Accessor<T> | (() => T),
  falseValue?: T | Accessor<T> | (() => T)
): any {
  return litrx(() => {
    const cond = typeof condition === 'function' ? condition() : condition;
    if (cond) {
      return typeof trueValue === 'function'
        ? (trueValue as Function)()
        : trueValue;
    }
    if (falseValue !== undefined) {
      return typeof falseValue === 'function'
        ? (falseValue as Function)()
        : falseValue;
    }
    return nothing;
  });
}

// /**
//  * Loop rendering with signals
//  */
// export function $each<T>(
//   items: Accessor<T[]> | (() => T[]),
//   keyFn: (item: T, index: number) => any,
//   template: (item: T, index: number) => any
// ): any {
//   return litrx(() => {
//     const array = typeof items === 'function' ? items() : items;
//     return repeat(array, keyFn, template);
//   });
// }

/**
 * Memoized computation for templates
 */
export function $memo<T>(compute: () => T): Accessor<T> {
  let cachedValue: T;
  let hasCached = false;

  return (() => {
    if (!hasCached) {
      cachedValue = compute();
      hasCached = true;
    }
    return cachedValue;
  }) as Accessor<T>;
}
