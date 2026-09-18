import { Accessor } from '@fluixi/reactive/signal';

/** Normalize a value or accessor to an accessor function */
export function normalizeAccessor<T>(value: T | Accessor<T>): Accessor<T> {
  return typeof value === 'function'
    ? (value as Accessor<T>)
    : (() => value as T) as Accessor<T>;
}

/**
 * Resolve a control-flow reactive prop to an accessor, whatever shape the caller passed:
 * a value, a called accessor (via the prop getter), or a bare accessor/arrow. `read` is a
 * thunk that reads the prop, e.g. `() => props.each`.
 *
 * The compiler emits control-flow value props (each/when/component/mount) as getters, so
 * `read()` re-runs the caller's expression INSIDE the tracking scope where the returned
 * accessor is invoked, this is what makes `each={items()}` reactive. If the read value is
 * itself a function (the `each={items}` accessor form), it is called once. This unwraps at
 * most one level, so `each={() => items()}` doesn't double-call.
 */
export function resolveReactiveProp<T>(read: () => T | (() => T)): Accessor<T> {
  return () => {
    const value = read();
    return typeof value === 'function' ? (value as () => T)() : value;
  };
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
