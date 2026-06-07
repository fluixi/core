import { createMemo, isSignal, untrack } from '../dom/integration.js';
import { normalizeAccessor, isTruthy, isLitResult } from './utils.js';
import { makeArrayFlat } from '../dom/runtime.js';
import { Accessor, isResource } from '@fluixi/reactive/signal';

/**
 * Extract the resolved value type from Show's `when` prop.
 */
export type ShowValue<T> = T extends () => infer V ? V : NonNullable<T extends () => infer V ? V : T>;


export interface ShowProps<T> {
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
  children: ((val: ShowValue<T>) => any);
  debug?: boolean
}

/**
 * Conditionally renders content based on a reactive condition.
 *
 * Returns a memo — works in both JSX and lit-html templates.
 *
 * @example JSX
 * <Show when={isLoggedIn()} fallback={<Login />}>
 *   <Dashboard />
 * </Show>
 *
 * @example lit-html
 * Show({ when: isLoggedIn, fallback: html`<p>Login</p>`, children: html`<p>Dashboard</p>` })
 */
// export function Show<T>(props: ShowProps<T>): Accessor<any> {
//   const when = normalizeAccessor(props.when);

//   return createMemo(() => {
//     const value = when();
    // if (isTruthy(value)) {
    //   return typeof props.children === 'function'
    //     ? props.children(value)
    //     : props.children;
    // }
//     return props.fallback ?? null;
//   });
// }
export function Show<T>(props: ShowProps<T>): any {
  const when = normalizeAccessor(props.when);
  // const {when} = props
  const value = createMemo(when, undefined)
    const cond = createMemo(value, undefined)
    return createMemo(
      () => {
        // if (isResource(when)) {
          //   if (when.loading) {
            //     return props.fallback ?? null;
            //   }
            // }
            // const value = when();
          const evaluate = cond()
          if(evaluate){
            let children = props.children;

              if (typeof children === 'function' && !isLitResult(children)) {
              if (typeof value === 'function') {
                // value = (value as any)() as any;
                return untrack(()=>{
                  if(!untrack(value)) return props.fallback
                  return (children as (item: T) => any)((value as any)())
                });
              }
              return (children as (item: T) => any)(value as T);
            }
            return children;
          }
        return props.fallback
      // if (isTruthy(value)) {
      //   let children = props.children;
      //   // handle children on jsx
      //   // if(Array.isArray(children)) {
      //   //   children = makeArrayFlat(children);
      //   //   // console.log('is truthy', children);
      //   //   // if(children)
      //   //   // children = (children as any[]).map((c: any) => typeof c === 'function' ? c(value) : c) as any;
      //   //   // return children;
      //   // }
      //   if (typeof children === 'function' && !isLitResult(children)) {
      //     if (isSignal<any>(value)) {
      //       // value = (value as any)() as any;
      //       return (children as (item: T) => any)((value as any)());
      //     }
      //     return (children as (item: T) => any)(value as T);
      //   }
      //   return children;
      //   // return typeof props.children === 'function'
      //   //   ? props.children(value)
      //   //   : props.children;
      // }
      // let value =
      //   typeof condition === 'function' ? (condition as () => T)() : condition;
      // if (value != null && value !== false) {
      //   // console.log('value', value);
      //   const children = props.children;
      //   if (typeof children === 'function' && !isLitResult(children)) {
      //     if (isSignal<any>(value)) {
      //       value = (value as any)() as any;
      //     }
      //     return (children as (item: T) => any)(value as T);
      //   }
      //   return children;
      // }
      return props.fallback ?? null;
    },
    undefined,
    { name: 'show'}
  );
}
export function Show1<T>(props: ShowProps<T>): any {
  const when = normalizeAccessor(props.when);
  return createMemo(
    () => {
      if (isResource(when)) {
        if (when.loading) {
          return props.fallback ?? null;
        }
      }
      const value = when();
      if (isTruthy(value)) {
        let children = props.children;
        // handle children on jsx
        // if(Array.isArray(children)) {
        //   children = makeArrayFlat(children);
        //   // console.log('is truthy', children);
        //   // if(children)
        //   // children = (children as any[]).map((c: any) => typeof c === 'function' ? c(value) : c) as any;
        //   // return children;
        // }
        if (typeof children === 'function' && !isLitResult(children)) {
          if (isSignal<any>(value)) {
            // value = (value as any)() as any;
            return (children as (item: T) => any)((value as any)());
          }
          return (children as (item: T) => any)(value as T);
        }
        return children;
        // return typeof props.children === 'function'
        //   ? props.children(value)
        //   : props.children;
      }
      // let value =
      //   typeof condition === 'function' ? (condition as () => T)() : condition;
      // if (value != null && value !== false) {
      //   // console.log('value', value);
      //   const children = props.children;
      //   if (typeof children === 'function' && !isLitResult(children)) {
      //     if (isSignal<any>(value)) {
      //       value = (value as any)() as any;
      //     }
      //     return (children as (item: T) => any)(value as T);
      //   }
      //   return children;
      // }
      return props.fallback ?? null;
    },
    undefined,
    { name: 'show' }
  );
}

      // if (isTruthy(value)) {
      //   const children = props.children;
      //   if (typeof children === 'function' && !isLitResult(children)) {
      //     if (isSignal<any>(value)) {
      //       // value = (value as any)() as any;
      //       return (children as (item: T) => any)((value as any)());
      //     }
      //     return (children as (item: T) => any)(value as T);
      //   }
      //   return children;
      //   // return typeof props.children === 'function'
      //   //   ? props.children(value)
      //   //   : props.children;
      // }
