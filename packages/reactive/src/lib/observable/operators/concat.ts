import {
  from,
  Observable,
  ObservableInput,
  OperatorFunction,
  Subscription,
} from '@awc/reactive';

/**
 * Creates an output Observable which sequentially emits all values from given Observable
 * and then moves on to the next.
 *
 * `concat` joins multiple Observables together by subscribing to them one at a time and
 * merging their results into the output Observable. You can pass either an array of Observables,
 * or put them directly as arguments. Passing an empty array will result in an Observable that
 * completes immediately.
 *
 * @overload
 * @returns {Observable<never>} An empty Observable that completes immediately
 *
 * @overload
 * @template T - The type of values emitted by the Observables
 * @param {ObservableInput<T>} source1 - First Observable to concatenate
 * @returns {Observable<T>} Observable that emits values from source1
 *
 * @overload
 * @template T1, T2 - Types of values from different Observables
 * @param {ObservableInput<T1>} source1 - First Observable
 * @param {ObservableInput<T2>} source2 - Second Observable
 * @returns {Observable<T1 | T2>} Observable that concatenates values from both
 *
 * @overload
 * @template T1, T2, T3 - Types of values from different Observables
 * @param {ObservableInput<T1>} source1 - First Observable
 * @param {ObservableInput<T2>} source2 - Second Observable
 * @param {ObservableInput<T3>} source3 - Third Observable
 * @returns {Observable<T1 | T2 | T3>} Observable that concatenates values from all
 *
 * @overload
 * @template T - The type of values emitted by the Observables
 * @param {...ObservableInput<T>[]} sources - Multiple Observables to concatenate
 * @returns {Observable<T>} Observable that concatenates values from all sources
 *
 * @overload
 * @template T - The type of values emitted by the Observables
 * @param {ObservableInput<T>[]} sources - Array of Observables to concatenate
 * @returns {Observable<T>} Observable that concatenates values from all sources
 *
 * @example
 * // Concatenate two Observables
 * const timer1 = interval(1000).pipe(take(2));
 * const timer2 = interval(2000).pipe(take(2));
 * concat(timer1, timer2).subscribe(value => console.log(value));
 * // Output: 0 (timer1), 1 (timer1), 0 (timer2), 1 (timer2) - sequential
 *
 * @example
 * // Concatenate multiple Observables
 * concat(
 *   of('A', 'B', 'C'),
 *   of(1, 2, 3),
 *   of(true, false)
 * ).subscribe(value => console.log(value));
 * // Output: A, B, C, 1, 2, 3, true, false
 *
 * @example
 * // Concatenate array of Observables
 * const sources = [
 *   of('First'),
 *   of('Second'),
 *   of('Third')
 * ];
 * concat(sources).subscribe(value => console.log(value));
 * // Output: First, Second, Third
 *
 * @example
 * // Error handling in concat
 * concat(
 *   of(1, 2, 3),
 *   throwError(() => new Error('Failed')),
 *   of(4, 5, 6) // Never reached due to error
 * ).subscribe({
 *   next: value => console.log(value),
 *   error: err => console.error('Error:', err.message)
 * });
 * // Output: 1, 2, 3, Error: Failed
 *
 * @example
 * // Empty concat
 * concat().subscribe({
 *   complete: () => console.log('Nothing to concatenate')
 * });
 *
 * @note Observables are subscribed to sequentially, one after another completes
 * @note If any Observable errors, the chain stops and the error propagates
 * @note If an Observable never completes, subsequent Observables never start
 */
export function concat(): Observable<never>;
export function concat<T>(source1: ObservableInput<T>): Observable<T>;
export function concat<T1, T2>(
  source1: ObservableInput<T1>,
  source2: ObservableInput<T2>
): Observable<T1 | T2>;
export function concat<T1, T2, T3>(
  source1: ObservableInput<T1>,
  source2: ObservableInput<T2>,
  source3: ObservableInput<T3>
): Observable<T1 | T2 | T3>;
export function concat<T1, T2, T3, T4>(
  source1: ObservableInput<T1>,
  source2: ObservableInput<T2>,
  source3: ObservableInput<T3>,
  source4: ObservableInput<T4>
): Observable<T1 | T2 | T3 | T4>;
export function concat<T>(...sources: ObservableInput<T>[]): Observable<T>;
export function concat<T>(
  ...args: (ObservableInput<T> | ObservableInput<T>[])[]
): Observable<T>;

export function concat<T>(
  ...args: (ObservableInput<T> | ObservableInput<T>[])[]
): Observable<T> {
  // Handle empty arguments
  if (args.length === 0) {
    return new Observable<never>((subscriber) => {
      subscriber.complete();
    });
  }

  // Collect all sources
  const sources: ObservableInput<T>[] = [];

  for (const arg of args) {
    if (Array.isArray(arg)) {
      sources.push(...(arg as ObservableInput<T>[]));
    } else {
      sources.push(arg as ObservableInput<T>);
    }
  }

  // Single source optimization
  if (sources.length === 1) {
    return from(sources[0]);
  }

  return new Observable<T>((subscriber) => {
    let index = 0;
    let currentSubscription: Subscription | null = null;

    const subscribeNext = () => {
      // Check if we've processed all sources
      if (index >= sources.length) {
        subscriber.complete();
        return;
      }

      const source = sources[index++];
      const observable = from(source);

      currentSubscription = observable.subscribe({
        next: (value: T) => {
          subscriber.next(value);
        },
        error: (err: any) => {
          subscriber.error(err);
        },
        complete: () => {
          currentSubscription = null;
          subscribeNext();
        },
      });

      // Add to parent subscription for cleanup
      // subscriber.add(currentSubscription);
      return () => currentSubscription?.unsubscribe();
    };

    // Start the chain
    subscribeNext();

    // Return cleanup function
    return () => {
      if (currentSubscription) {
        currentSubscription.unsubscribe();
      }
    };
  });
}

/**
 * Specialized concat operator that concatenates inner Observables as they complete.
 * This is the operator version of concat, used in `pipe()`.
 *
 * @template T - The type of values emitted by the source Observable
 * @template R - The type of values emitted by the inner Observables
 * @param {...ObservableInput<R>[]} innerSources - Inner Observables to concatenate after source
 * @returns {OperatorFunction<T, T | R>} Operator that concatenates source with inner Observables
 */
export function concatWith<T, R extends T>(
  ...innerSources: ObservableInput<R>[]
): OperatorFunction<T, T | R> {
  return (source: Observable<T>) =>
    new Observable<T | R>((subscriber) => {
      const allSources = [source, ...innerSources];
      const subscription = concat(...allSources).subscribe(subscriber);
      return subscription;
    });
}

/**
 * Creates an Observable that concatenates a variable number of Observables
 * by subscribing to them one after another.
 *
 * @template T - The type of values emitted by the Observables
 * @returns {(...sources: ObservableInput<T>[]) => Observable<T>} Function that concatenates sources
 */
export function concatAll<T>(): (
  ...sources: ObservableInput<T>[]
) => Observable<T> {
  return (...sources: ObservableInput<T>[]) => concat(...sources);
}
