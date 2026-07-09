/**
 * Signal detection guards + small helpers. Graph-agnostic: they check global
 * Symbol.for markers, which both the TC39 core and the legacy signal.ts stamp,
 * so a value is recognised regardless of which graph made it. Kept out of
 * signal.ts so it survives once that file is retired.
 */
import type { Accessor, Resource } from '../signal.js';

export const __DEV__ = process.env.NODE_ENV !== 'production';

const $SIGNAL = Symbol.for('signal');
const $MEMO = Symbol.for('memo');
const $RESOURCE = Symbol.for('resource');

export function isSignal<T = any>(value: any): value is Accessor<T> {
  return typeof value === 'function' && (value as any)[$SIGNAL] === true;
}

export function isMemo<T = any>(value: any): value is Accessor<T> {
  return typeof value === 'function' && value[$MEMO] === true;
}

export function isResource<T = any>(value: any): value is Resource<T> {
  return typeof value === 'function' && value[$RESOURCE] === true;
}

export function isComponent(value: any): boolean {
  return typeof value === 'function' && value[Symbol.for('fluixi-component')] === true;
}

export function isSuspense(value: any): boolean {
  return typeof value === 'function' && value[Symbol.for('fluixi-suspense')] === true;
}

export function isProvider(value: any): boolean {
  return typeof value === 'function' && value[Symbol.for('fluixi-provider')] === true;
}

export function makeArrayFlat(values: any[]): any {
  if (!Array.isArray(values)) return values;
  if (values.length === 2 && values[1] === ' ') {
    if (Array.isArray(values[0])) return makeArrayFlat(values[0]);
    if (typeof values[0] === 'function') return values[0];
    return values[0];
  }
  if (values.length === 1 && typeof values[0] === 'function') return values[0];
  return values;
}
