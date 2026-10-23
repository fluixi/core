import { type Accessor, type MemoOptions, type EnhancedSignal } from './signal.js';
import { createSignal, createMemo, createEffect } from './graph/compat.js';
import { Observable } from '../observable/observable.js';

// TRANSFORMATION UTILITIES

/**
 * Transform a signal value through a mapping function
 *
 * @example
 * ```typescript
 * const count = createSignal(5);
 * const doubled = map(count[0], x => x * 2);
 * console.log(doubled()); // 10
 * ```
 */
export function mapSignal<T, U>(
  signal: Accessor<T>,
  fn: (value: T) => U,
  options?: MemoOptions<U>
): Accessor<U> {
  return createMemo(() => fn(signal()), undefined, options);
}

/**
 * Filter an array signal using a predicate function
 *
 * @example
 * ```typescript
 * const [numbers] = createSignal([1, 2, 3, 4, 5]);
 * const evens = filter(numbers, x => x % 2 === 0);
 * console.log(evens()); // [2, 4]
 * ```
 */
export function filterSignal<T>(
  signal: Accessor<T[]>,
  predicate: (value: T, index: number) => boolean,
  options?: MemoOptions<T[]>
): Accessor<T[]> {
  return createMemo(() => signal().filter(predicate), undefined, options);
}

/**
 * Reduce an array signal to a single value
 *
 * @example
 * ```typescript
 * const [numbers] = createSignal([1, 2, 3, 4, 5]);
 * const sum = reduce(numbers, (acc, x) => acc + x, 0);
 * console.log(sum()); // 15
 * ```
 */
export function reduceSignal<T, U>(
  signal: Accessor<T[]>,
  reducer: (accumulator: U, current: T, index: number) => U,
  initialValue: U,
  options?: MemoOptions<U>
): Accessor<U> {
  return createMemo(
    () => signal().reduce(reducer, initialValue),
    undefined,
    options
  );
}

/**
 * Find first element in array signal matching predicate
 *
 * @example
 * ```typescript
 * const [users] = createSignal([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
 * const user = find(users, u => u.id === 2);
 * console.log(user()?.name); // 'Bob'
 * ```
 */
export function findSignal<T>(
  signal: Accessor<T[]>,
  predicate: (value: T, index: number) => boolean,
  options?: MemoOptions<T | undefined>
): Accessor<T | undefined> {
  return createMemo(() => signal().find(predicate), undefined, options);
}

/**
 * Check if any element in array signal matches predicate
 *
 * @example
 * ```typescript
 * const [numbers] = createSignal([1, 2, 3, 4, 5]);
 * const hasEven = some(numbers, x => x % 2 === 0);
 * console.log(hasEven()); // true
 * ```
 */
export function someSignal<T>(
  signal: Accessor<T[]>,
  predicate: (value: T, index: number) => boolean,
  options?: MemoOptions<boolean>
): Accessor<boolean> {
  return createMemo(() => signal().some(predicate), undefined, options);
}

/**
 * Check if all elements in array signal match predicate
 *
 * @example
 * ```typescript
 * const [numbers] = createSignal([2, 4, 6, 8]);
 * const allEven = every(numbers, x => x % 2 === 0);
 * console.log(allEven()); // true
 * ```
 */
export function everySignal<T>(
  signal: Accessor<T[]>,
  predicate: (value: T, index: number) => boolean,
  options?: MemoOptions<boolean>
): Accessor<boolean> {
  return createMemo(() => signal().every(predicate), undefined, options);
}

/**
 * Sort an array signal
 *
 * @example
 * ```typescript
 * const [numbers] = createSignal([3, 1, 4, 1, 5]);
 * const sorted = sort(numbers);
 * console.log(sorted()); // [1, 1, 3, 4, 5]
 * ```
 */
export function sortSignal<T>(
  signal: Accessor<T[]>,
  compareFn?: (a: T, b: T) => number,
  options?: MemoOptions<T[]>
): Accessor<T[]> {
  return createMemo(() => [...signal()].sort(compareFn), undefined, options);
}

/**
 * Get unique values from array signal
 *
 * @example
 * ```typescript
 * const [numbers] = createSignal([1, 2, 2, 3, 3, 3, 4]);
 * const unique = distinct(numbers);
 * console.log(unique()); // [1, 2, 3, 4]
 * ```
 */
export function distinctSignal<T>(
  signal: Accessor<T[]>,
  options?: MemoOptions<T[]>
): Accessor<T[]> {
  return createMemo(() => [...new Set(signal())], undefined, options);
}

// COMBINATION UTILITIES

/**
 * Combine multiple signals into a single computed signal
 *
 * @example
 * ```typescript
 * const [a] = createSignal(1);
 * const [b] = createSignal(2);
 * const sum = combine([a, b], ([x, y]) => x + y);
 * console.log(sum()); // 3
 * ```
 */
export function combineSignal<T extends any[], U>(
  signals: { [K in keyof T]: Accessor<T[K]> },
  combiner: (values: T) => U,
  options?: MemoOptions<U>
): Accessor<U> {
  return createMemo(
    () => {
      const values = signals.map((s) => s()) as T;
      return combiner(values);
    },
    undefined,
    options
  );
}

/**
 * Combine multiple signals into observable
 */
export function combineSignals<T extends any[]>(
  ...signals: { [K in keyof T]: Accessor<T[K]> | EnhancedSignal<T[K]> }
): Observable<T> {
  return new Observable<T>((observer) => {
    const getValues = () =>
      signals.map((s) => (typeof s === 'function' ? s() : s.get())) as T;
    const disposers = signals.map((signal) => {
      if (typeof signal === 'function' && (signal as any).subscribe) {
        return (signal as any).subscribe(() => {
          observer.next(getValues());
        });
      } else if (typeof signal !== 'function') {
        return signal.subscribe(() => {
          observer.next(getValues());
        });
      }

      return createEffect(() => {
        observer.next(getValues());
      });
    });

    return () => {
      disposers.forEach((dispose) => {
        if (typeof dispose === 'function') dispose();
        else if (dispose && typeof dispose.unsubscribe === 'function') {
          dispose.unsubscribe();
        }
      });
    };
  });
}

/**
 * Merge two signals, returning value from first truthy signal
 *
 * @example
 * ```typescript
 * const [user] = createSignal(null);
 * const [guest] = createSignal({ name: 'Guest' });
 * const current = merge(user, guest);
 * console.log(current()?.name); // 'Guest'
 * ```
 */
export function mergeSignal<T>(
  primary: Accessor<T>,
  fallback: Accessor<T>,
  options?: MemoOptions<T>
): Accessor<T> {
  return createMemo(() => primary() || fallback(), undefined, options);
}

/**
 * Combine two signals using a binary operator
 *
 * @example
 * ```typescript
 * const [x] = createSignal(5);
 * const [y] = createSignal(3);
 * const product = zip(x, y, (a, b) => a * b);
 * console.log(product()); // 15
 * ```
 */
export function zipSignal<T, U, V>(
  a: Accessor<T>,
  b: Accessor<U>,
  operator: (a: T, b: U) => V,
  options?: MemoOptions<V>
): Accessor<V> {
  return createMemo(() => operator(a(), b()), undefined, options);
}

// SELECTION UTILITIES

/**
 * Select a derived value from a signal with custom equality
 * Only updates when selected value changes according to equals function
 *
 * @example
 * ```typescript
 * const [user] = createSignal({ id: 1, name: 'Alice', age: 30 });
 * const userName = select(user, u => u.name);
 * // Only updates when name changes, not when age changes
 * ```
 */
export function selectSignal<T, U>(
  signal: Accessor<T>,
  selector: (value: T) => U,
  equals?: (a: U, b: U) => boolean
): Accessor<U> {
  return createMemo(() => selector(signal()), undefined, {
    equals,
    internal: true,
  });
}

/**
 * Pick specific properties from an object signal
 *
 * @example
 * ```typescript
 * const [user] = createSignal({ id: 1, name: 'Alice', age: 30, email: 'alice@example.com' });
 * const userData = pick(user, ['name', 'email']);
 * console.log(userData()); // { name: 'Alice', email: 'alice@example.com' }
 * ```
 */
export function pickSignal<T extends Record<string, any>, K extends keyof T>(
  signal: Accessor<T>,
  keys: K[],
  options?: MemoOptions<Pick<T, K>>
): Accessor<Pick<T, K>> {
  return createMemo(
    () => {
      const obj = signal();
      const result = {} as Pick<T, K>;
      for (const key of keys) {
        result[key] = obj[key];
      }
      return result;
    },
    undefined,
    options
  );
}

/**
 * Omit specific properties from an object signal
 *
 * @example
 * ```typescript
 * const [user] = createSignal({ id: 1, name: 'Alice', age: 30, password: 'secret' });
 * const safeUser = omit(user, ['password']);
 * console.log(safeUser()); // { id: 1, name: 'Alice', age: 30 }
 * ```
 */
export function omitSignal<T extends Record<string, any>, K extends keyof T>(
  signal: Accessor<T>,
  keys: K[],
  options?: MemoOptions<Omit<T, K>>
): Accessor<Omit<T, K>> {
  return createMemo(
    () => {
      const obj = signal();
      const result = { ...obj } as any;
      for (const key of keys) {
        delete result[key];
      }
      return result;
    },
    undefined,
    options
  );
}

// CONDITIONAL UTILITIES

/**
 * Conditionally compute signal based on condition
 *
 * @example
 * ```typescript
 * const [isLoggedIn] = createSignal(false);
 * const [user] = createSignal({ name: 'Alice' });
 * const [guest] = createSignal({ name: 'Guest' });
 * const currentUser = when(isLoggedIn, user, guest);
 * console.log(currentUser()?.name); // 'Guest'
 * ```
 */
export function whenSignal<T>(
  condition: Accessor<boolean>,
  whenTrue: Accessor<T>,
  whenFalse: Accessor<T>,
  options?: MemoOptions<T>
): Accessor<T> {
  return createMemo(
    () => (condition() ? whenTrue() : whenFalse()),
    undefined,
    options
  );
}

/**
 * Compute signal only when condition is true, otherwise return undefined
 *
 * @example
 * ```typescript
 * const [showDetails] = createSignal(false);
 * const [details] = createSignal({ info: 'Details here' });
 * const visibleDetails = guard(showDetails, details);
 * console.log(visibleDetails()); // undefined (when showDetails is false)
 * ```
 */
export function guardSignal<T>(
  condition: Accessor<boolean>,
  accessor: Accessor<T>,
  options?: MemoOptions<T | undefined>
): Accessor<T | undefined> {
  return createMemo(
    () => (condition() ? accessor() : undefined),
    undefined,
    options
  );
}

// TIMING UTILITIES

/**
 * Debounce a signal - only update after delay period with no changes
 *
 * @example
 * ```typescript
 * const [search] = createSignal('');
 * const debouncedSearch = debounce(search, 300);
 * // debouncedSearch only updates 300ms after last search change
 * ```
 */
export function debounceSignal<T>(
  signal: Accessor<T>,
  delay: number,
  options?: MemoOptions<T>
): Accessor<T> {
  const [debounced, setDebounced] = createSignal(signal());
  let timeoutId: any;

  createMemo(() => {
    const value = signal();
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => setDebounced(() => value), delay);
  });

  return debounced;
}

/**
 * Throttle a signal - limit update frequency
 *
 * @example
 * ```typescript
 * const [scroll] = createSignal(0);
 * const throttledScroll = throttle(scroll, 100);
 * // throttledScroll updates at most once per 100ms
 * ```
 */
export function throttleSignal<T>(
  signal: Accessor<T>,
  delay: number,
  options?: MemoOptions<T>
): Accessor<T> {
  const [throttled, setThrottled] = createSignal(signal());
  let lastUpdate = 0;
  let timeoutId: any;

  createMemo(() => {
    const value = signal();
    const now = Date.now();

    if (now - lastUpdate >= delay) {
      lastUpdate = now;
      setThrottled(() => value);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastUpdate = Date.now();
        setThrottled(() => value);
      }, delay - (now - lastUpdate));
    }
  });

  return throttled;
}

// Re-export for convenience
export { type Accessor, type MemoOptions } from './signal.js';
/**
 * Creates a deferred promise with exposed resolve and reject methods
 *
 * This utility function creates a Promise along with its resolver functions,
 * allowing for more control over when and how the promise resolves or rejects.
 * Useful for converting callback-based APIs to promises, implementing timeouts,
 * or coordinating complex async flows.
 *
 * @example
 * ```typescript
 * // Create a promise with external controls
 * const deferred = createDeferred<Response>();
 *
 * // Set up timeout
 * const timeoutId = setTimeout(() => {
 *   deferred.reject(new Error('Request timed out'));
 * }, 5000);
 *
 * // Make the request
 * fetch('/api/data')
 *   .then(deferred.resolve)
 *   .catch(deferred.reject)
 *   .finally(() => clearTimeout(timeoutId));
 *
 * // Return the promise to the caller
 * return deferred.promise;
 * ```
 */

export type ReadSignal<T, depth extends 0 | 1 | 2 | 3 | 4 = 0> = depth extends 4 ? T : T extends Accessor<infer U> ? U extends (()=>any) ? ReadSignal<U, depth extends 4 ? 4 : depth extends 3 ? 3 : depth extends 2 ? 2 : depth extends 1 ? 1 : 0> : U : T;

export function readSignal<T>(signal?: Accessor<T> | T | null): ReadSignal<T> {
  let value = signal;
  while (typeof value === 'function') value = (value as any)() as any;
  return value as ReadSignal<T>;
}
