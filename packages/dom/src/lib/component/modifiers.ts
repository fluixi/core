/**
 * Brands on a function, and the guards that read them back.
 *
 * The runtime has to know what a value is before it calls it. A router has to be entered
 * differently from a provider, and a provider's children have to be read under its own
 * owner, so `insert` and `createComponent` ask before dispatching. None of that is
 * inferable from a function, which is why each `as*` stamps a registry symbol and the
 * matching `is*` tests for it.
 *
 * `Symbol.for` rather than a local symbol, so two bundled copies of this module agree.
 * That is the same reason the reactive graph brands its nodes that way.
 */
import { getOwner, runWithOwner } from '@fluixi/reactive/signal';
import { hydration } from '../dom/hydration-state.js';
import { isServer } from '../dom/server/host.js';

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

/**
 * An element of a JSX array that, while hydrating, is built when the array is placed rather
 * than when it is written, in the owner it was written in. The compiler emits it for an element
 * that follows a component, control flow or reactive expression in the same array: those are
 * read when the array is placed, and an element built earlier would claim the server node that
 * belongs to them. Called once and kept, as a component thunk is.
 *
 * Anywhere else it is built at once, as before: nothing claims nodes on the server or in a
 * fresh render, and on the server a function left in the array would only be called while the
 * markup is written, after the render has stopped tracking what it waits for.
 */
export function deferElement<T>(build: () => T): T | (() => T) {
  if (isServer() || !hydration.active) return build();
  const owner = getOwner();
  return asComponent(() => runWithOwner(owner, build) as T);
}
