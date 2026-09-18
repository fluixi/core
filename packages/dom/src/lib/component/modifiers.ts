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
