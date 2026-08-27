/**
 * The type predicates this package needs, inlined.
 *
 * They came from `@fluixi/utils`, and the import was the only thing standing between
 * this package and being installable on its own — a signals library that drags a
 * framework's utility package behind it reads as a framework component, whatever the
 * README says. Three predicates are not worth a dependency.
 *
 * These match the `@fluixi/utils` originals exactly, including the parts that look
 * incidental. Each of those exclusions is load-bearing here.
 */

/**
 * A callable, excluding classes.
 *
 * The class check matters: a signal's setter accepts an updater function, and
 * `set(SomeClass)` means "store this class", not "call it with the previous value".
 * Without the exclusion the constructor would be invoked.
 */
export function isFunction<T extends Function = Function>(value: unknown): value is T {
  return (
    typeof value === 'function' &&
    !/^class\s/.test(Function.prototype.toString.call(value))
  );
}

/**
 * A plain-ish object: not null, not an array, not a function, and not one of the
 * built-ins with their own identity.
 *
 * Date, RegExp, Map, Set and Error are excluded because a store must treat them as
 * opaque values rather than walking into them — proxying a Date's internals produces
 * an object that fails every method call on it.
 */
export function isObject(value: unknown): value is Record<string | symbol, unknown> {
  if (value == null) return false;
  if (Array.isArray(value)) return false;
  if (typeof value === 'function') return false;
  if (value instanceof Date) return false;
  if (value instanceof RegExp) return false;
  if (value instanceof Map) return false;
  if (value instanceof Set) return false;
  if (value instanceof Error) return false;
  return typeof value === 'object';
}

/**
 * Thenable, rather than `instanceof Promise`.
 *
 * A resource fetcher may return a promise from another realm or another
 * implementation, and those are still awaitable. Functions are included because a
 * thenable function is legal, if unusual.
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    value instanceof Promise ||
    (!!value &&
      (typeof value === 'object' || typeof value === 'function') &&
      'then' in value)
  );
}
