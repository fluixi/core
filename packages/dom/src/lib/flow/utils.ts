import { Accessor } from '@fluixi/reactive/signal';

/** Normalize a value or accessor to an accessor function */
export function normalizeAccessor<T>(value: T | Accessor<T>): Accessor<T> {
  return typeof value === 'function'
    ? (value as Accessor<T>)
    : (() => value as T) as Accessor<T>;
}

/** Type-safe truthiness check */
export function isTruthy<T>(
  value: T | undefined | null | false
): value is NonNullable<T> {
  return value !== null && value !== undefined && value !== false;
}

export function isLitResult(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  return !!(
    typeof value['_$litType$'] !== 'undefined' ||
    typeof value['_$litDirective$'] !== 'undefined' ||
    (Array.isArray(value.strings) && Array.isArray(value.values))
  );
}
