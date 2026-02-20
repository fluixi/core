import { AsyncScheduler, Observable, OperatorFunction } from '@awc/reactive';

/**
 * Configuration options for count
 */
export interface CountOptions<T> {
  /**
   * Predicate function to filter values before counting.
   * Only values that pass the predicate are counted.
   *
   * @default undefined // Count all values
   */
  predicate?: (value: T, index: number) => boolean;

  /**
   * Scheduler to use for emitting the count.
   *
   * @default undefined // Emit synchronously
   */
  scheduler?: AsyncScheduler;

  /**
   * Delay for scheduler operations (in milliseconds).
   *
   * @default 0
   */
  delay?: number;

  /**
   * Whether to include the index when calling the predicate.
   *
   * @default true
   */
  includeIndex?: boolean;

  /**
   * Default count to emit if source completes without any emissions.
   *
   * @default 0
   */
  defaultValue?: number;

  /**
   * Whether to emit the count as soon as it reaches this value.
   * If set, emits and completes immediately when count reaches this value.
   *
   * @default undefined // Wait for source completion
   */
  emitAt?: number;
}

/**
 * Counts the number of emissions that satisfy a predicate and emits that number when the source completes.
 *
 * @template T The type of values emitted by the source.
 *
 * @param {CountOptions<T>} [options] Configuration options.
 * @returns {OperatorFunction<T, number>} An operator function.
 *
 * @example
 * // Count all emissions
 * fromArrayLike([1, 2, 3]).pipe(count()).subscribe(console.log); // 3
 *
 * @example
 * // Count with predicate
 * fromArrayLike([1, 2, 3, 4, 5]).pipe(
 *   count({ predicate: x => x % 2 === 0 })
 * ).subscribe(console.log); // 2
 *
 * @example
 * // Emit at specific count
 * interval(100).pipe(
 *   count({ emitAt: 5 })
 * ).subscribe(count => {
 *   console.log('Reached 5 emissions');
 * });
 *
 * @performance
 * - O(1) memory usage
 * - Early completion with emitAt
 * - Efficient predicate evaluation
 * - Minimal overhead per emission
 */
export function count<T>(
  options?: CountOptions<T>
): OperatorFunction<T, number> {
  return (source: Observable<T>): Observable<number> => {
    return new Observable<number>((observer) => {
      const predicate = options?.predicate;
      const scheduler = options?.scheduler;
      const delay = options?.delay ?? 0;
      const includeIndex = options?.includeIndex ?? true;
      const defaultValue = options?.defaultValue ?? 0;
      const emitAt = options?.emitAt;

      let count = 0;
      let index = 0;
      let completed = false;

      const subscription = source.subscribe({
        next: (value: T) => {
          const currentIndex = includeIndex ? index++ : 0;

          if (predicate) {
            try {
              if (predicate(value, currentIndex)) {
                count++;
              }
            } catch (err) {
              observer.error(err);
              return;
            }
          } else {
            count++;
          }

          // Check if we should emit early
          if (emitAt !== undefined && count >= emitAt) {
            subscription.unsubscribe();

            const emit = (): void => {
              observer.next(Math.min(count, emitAt));
              observer.complete();
            };

            if (scheduler) {
              scheduler.schedule(emit, delay);
            } else {
              emit();
            }
          }
        },
        error: (err: unknown) => observer.error(err),
        complete: () => {
          completed = true;

          const emit = (): void => {
            observer.next(count > 0 ? count : defaultValue);
            observer.complete();
          };

          if (scheduler) {
            scheduler.schedule(emit, delay);
          } else {
            emit();
          }
        },
      });

      // Cleanup function
      return () => {
        subscription.unsubscribe();
      };
    });
  };
}
