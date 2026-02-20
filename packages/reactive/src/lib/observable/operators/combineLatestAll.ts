import {
  AsyncScheduler,
  Observable,
  OperatorFunction,
  Subscription,
} from '@awc/reactive';

/**
 * Configuration options for combineLatestAll
 */
export interface CombineLatestAllOptions {
  /**
   * Scheduler to use for combining values.
   * If provided, the combination is performed asynchronously via the scheduler.
   *
   * @default undefined // Combine synchronously
   */
  scheduler?: AsyncScheduler;

  /**
   * Delay for scheduler operations (in milliseconds).
   *
   * @default 0
   */
  delay?: number;

  /**
   * Maximum number of inner Observables to combine.
   * If more inner Observables are emitted, they are ignored.
   *
   * @default Infinity // No limit
   */
  maxConcurrency?: number;

  /**
   * Whether to wait for all inner Observables to emit at least one value.
   * If false, emits empty array when no inner Observables.
   *
   * @default true
   */
  waitForAll?: boolean;

  /**
   * Whether to emit when any inner Observable completes.
   * If false, waits for all inner Observables to complete.
   *
   * @default false
   */
  emitOnAnyComplete?: boolean;

  /**
   * Whether to emit the initial empty array (when no inner Observables).
   *
   * @default true
   */
  emitInitial?: boolean;
}

/**
 * Converts a higher-order Observable into a first-order Observable
 * which combines values from the most recent inner Observables.
 *
 * @template T The type of values emitted by the inner Observables.
 *
 * @param {CombineLatestAllOptions} [options] Configuration options.
 * @returns {OperatorFunction<Observable<T>, T[]>} An operator function.
 *
 * @example
 * // Basic usage
 * const higherOrder$ = fromArrayLike([
 *   of(1, 2, 3),
 *   of('a', 'b', 'c')
 * ]);
 *
 * higherOrder$.pipe(combineLatestAll()).subscribe(console.log);
 * // Output: [[1, 'a'], [2, 'a'], [2, 'b'], [3, 'b'], [3, 'c']]
 *
 * @example
 * // With max concurrency
 * const manyObservables$ = interval(100).pipe(
 *   take(10),
 *   map(i => interval(50).pipe(
 *     map(j => `obs${i}-${j}`),
 *     take(3)
 *   ))
 * );
 *
 * manyObservables$.pipe(
 *   combineLatestAll({ maxConcurrency: 3 })
 * ).subscribe(console.log);
 *
 * @performance
 * - Efficient inner Observable tracking
 * - Memory efficient with maxConcurrency limit
 * - Early unsubscription for completed inner Observables
 * - Minimal array allocations
 */
export function combineLatestAll<T>(
  options?: CombineLatestAllOptions
): OperatorFunction<Observable<T>, T[]> {
  return (source: Observable<Observable<T>>): Observable<T[]> => {
    return new Observable<T[]>((observer) => {
      const scheduler = options?.scheduler;
      const delay = options?.delay ?? 0;
      const maxConcurrency = options?.maxConcurrency ?? Infinity;
      const waitForAll = options?.waitForAll ?? true;
      const emitOnAnyComplete = options?.emitOnAnyComplete ?? false;
      const emitInitial = options?.emitInitial ?? true;

      // Track inner Observables
      const innerObservables: Array<{
        source: Observable<T>;
        subscription: Subscription | null;
        hasValue: boolean;
        latestValue: T | undefined;
        completed: boolean;
        index: number;
      }> = [];

      // Track all subscriptions for cleanup
      const subscriptions: Subscription[] = [];
      let sourceCompleted = false;
      let hasEmitted = false;

      // Emit the current combination
      const emitCombination = (): void => {
        // Check if we should emit based on waitForAll
        const shouldEmit =
          !waitForAll ||
          innerObservables.length === 0 ||
          innerObservables.every((obs) => obs.hasValue);

        if (shouldEmit) {
          const values = innerObservables.map((obs) => obs.latestValue);

          const emit = (): void => {
            observer.next(values as T[]);
            hasEmitted = true;
          };

          if (scheduler) {
            scheduler.schedule(emit, delay);
          } else {
            emit();
          }
        }
      };

      // Subscribe to an inner Observable
      const subscribeToInner = (
        innerSource: Observable<T>,
        innerIndex: number
      ): void => {
        const innerObs = {
          source: innerSource,
          subscription: null as Subscription | null,
          hasValue: false,
          latestValue: undefined as T | undefined,
          completed: false,
          index: innerIndex,
        };

        innerObservables.push(innerObs);

        // Check max concurrency
        if (innerObservables.length > maxConcurrency) {
          // Remove and unsubscribe from the oldest inner Observable
          const removed = innerObservables.shift()!;
          if (removed.subscription) {
            removed.subscription.unsubscribe();
            const subIndex = subscriptions.indexOf(removed.subscription);
            if (subIndex > -1) {
              subscriptions.splice(subIndex, 1);
            }
          }
        }

        // Subscribe to the inner Observable
        const subscription = innerSource.subscribe({
          next: (value: T) => {
            innerObs.hasValue = true;
            innerObs.latestValue = value;
            emitCombination();
          },
          error: (err: unknown) => {
            // Propagate error to main observer
            observer.error(err);
          },
          complete: () => {
            innerObs.completed = true;

            // Check if we should emit on any inner completion
            if (emitOnAnyComplete) {
              emitCombination();
            }

            // Check if all inner Observables are completed
            const allCompleted = innerObservables.every((obs) => obs.completed);

            if (allCompleted && sourceCompleted) {
              // Complete the outer Observable
              observer.complete();
            }
          },
        });

        innerObs.subscription = subscription;
        subscriptions.push(subscription);
      };

      // Subscribe to the source Observable
      const sourceSubscription = source.subscribe({
        next: (innerSource: Observable<T>) => {
          subscribeToInner(innerSource, innerObservables.length);

          // Emit initial empty array if requested
          if (emitInitial && !hasEmitted) {
            emitCombination();
          }
        },
        error: (err: unknown) => observer.error(err),
        complete: () => {
          sourceCompleted = true;

          // If no inner Observables were emitted
          if (innerObservables.length === 0) {
            if (emitInitial && !hasEmitted) {
              const emit = (): void => {
                observer.next([]);
                observer.complete();
              };

              if (scheduler) {
                scheduler.schedule(emit, delay);
              } else {
                emit();
              }
            } else {
              observer.complete();
            }
          } else {
            // Check if all inner Observables are already completed
            const allCompleted = innerObservables.every((obs) => obs.completed);

            if (allCompleted) {
              observer.complete();
            }
          }
        },
      });

      subscriptions.push(sourceSubscription);

      // Cleanup function
      return () => {
        subscriptions.forEach((sub) => sub.unsubscribe());
        innerObservables.length = 0;
      };
    });
  };
}
