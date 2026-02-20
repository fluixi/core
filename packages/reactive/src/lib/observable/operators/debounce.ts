import { AsyncScheduler, Observable, OperatorFunction } from '@awc/reactive';
import { asyncScheduler } from '@awc/reactive/schedulers/async';

/**
 * Duration selector function for debounce
 */
export type DebounceDurationSelector<T> = (
  value: T,
  index: number
) => Observable<any> | PromiseLike<any> | number;

/**
 * Configuration options for debounce
 */
export interface DebounceOptions<T> {
  /**
   * Scheduler to use for debounce timing.
   *
   * @default asyncScheduler
   */
  scheduler?: AsyncScheduler;

  /**
   * Default duration (in milliseconds) if duration selector returns undefined.
   *
   * @default 0
   */
  defaultDuration?: number;

  /**
   * Maximum debounce duration (in milliseconds).
   *
   * @default Infinity
   */
  maxDuration?: number;

  /**
   * Whether to include the index when calling the duration selector.
   *
   * @default true
   */
  includeIndex?: boolean;

  /**
   * Whether to emit the trailing value when source completes.
   * If true, emits the last value after the debounce period when source completes.
   *
   * @default false
   */
  trailing?: boolean;

  /**
   * Whether to emit the leading value immediately.
   * If true, emits the first value immediately, then debounces subsequent values.
   *
   * @default false
   */
  leading?: boolean;
}

/**
 * Discards emissions that are followed by newer emissions within a duration determined by a duration selector.
 *
 * @template T The type of values emitted by the source.
 *
 * @param {DebounceDurationSelector<T>} durationSelector Function that returns an Observable, Promise, or number for each value.
 * @param {DebounceOptions<T>} [options] Configuration options.
 * @returns {OperatorFunction<T, T>} An operator function.
 *
 * @example
 * // Debounce with fixed duration
 * source$.pipe(debounce(() => 1000)).subscribe(console.log);
 *
 * @example
 * // Dynamic debounce based on value
 * source$.pipe(
 *   debounce(value => value > 100 ? 2000 : 500)
 * ).subscribe(console.log);
 *
 * @performance
 * - Efficient timer management
 * - Support for leading/trailing emissions
 * - Memory efficient with single pending timer
 * - Proper cleanup on unsubscription
 */
export function debounce<T>(
  durationSelector: DebounceDurationSelector<T>,
  options?: DebounceOptions<T>
): OperatorFunction<T, T> {
  const scheduler = options?.scheduler || asyncScheduler;
  const defaultDuration = options?.defaultDuration ?? 0;
  const maxDuration = options?.maxDuration ?? Infinity;
  const includeIndex = options?.includeIndex ?? true;
  const trailing = options?.trailing ?? false;
  const leading = options?.leading ?? false;

  return (source: Observable<T>): Observable<T> => {
    return new Observable<T>((observer) => {
      let index = 0;
      let pendingTimer: { unsubscribe: () => void } | undefined;
      let pendingValue: T | undefined;
      let hasEmittedLeading = false;
      let sourceCompleted = false;

      // Clear pending timer
      const clearTimer = (): void => {
        if (pendingTimer) {
          pendingTimer.unsubscribe();
          pendingTimer = undefined;
        }
      };

      // Emit a value
      const emitValue = (value: T): void => {
        clearTimer();
        observer.next(value);
        pendingValue = undefined;
        hasEmittedLeading = true;
      };

      // Schedule a debounced emission
      const scheduleEmission = (value: T, durationMs: number): void => {
        clearTimer();
        pendingValue = value;

        pendingTimer = scheduler.schedule(() => {
          emitValue(value);
        }, durationMs);
      };

      // Process a value with debounce logic
      const processValue = (value: T, currentIndex: number): void => {
        try {
          const durationResult = durationSelector(value, currentIndex);

          // Calculate duration
          let durationMs = defaultDuration;

          if (durationResult instanceof Observable) {
            // Observable duration - wait for it to emit
            clearTimer();
            pendingValue = value;

            const durationSub = durationResult.subscribe({
              next: () => {
                durationSub.unsubscribe();
                emitValue(value);
              },
              error: (err) => observer.error(err),
              complete: () => {
                // If duration completes without emitting, use default
                scheduleEmission(value, defaultDuration);
              },
            });

            pendingTimer = { unsubscribe: () => durationSub.unsubscribe() };
          } else if (
            durationResult &&
            typeof (durationResult as any).then === 'function'
          ) {
            // Promise duration
            clearTimer();
            pendingValue = value;
            try {
              (durationResult as PromiseLike<any>).then(
                () => {
                  emitValue(value);
                },
                (err) => observer.error(err)
              );
            } catch (err) {
              observer.error(err);
            }
            // .catch(() => {
            //     // Ignore errors from promise rejection handling
            // });
          } else if (typeof durationResult === 'number') {
            // Numeric duration
            durationMs = Math.min(Math.max(0, durationResult), maxDuration);

            if (leading && !hasEmittedLeading) {
              // Emit leading value immediately
              emitValue(value);
            } else {
              // Schedule debounced emission
              scheduleEmission(value, durationMs);
            }
          } else {
            // Invalid duration, use default
            if (leading && !hasEmittedLeading) {
              emitValue(value);
            } else {
              scheduleEmission(value, defaultDuration);
            }
          }
        } catch (err) {
          observer.error(err);
        }
      };

      const subscription = source.subscribe({
        next: (value: T) => {
          const currentIndex = includeIndex ? index++ : 0;
          processValue(value, currentIndex);
        },
        error: (err: unknown) => {
          clearTimer();
          observer.error(err);
        },
        complete: () => {
          sourceCompleted = true;

          if (trailing && pendingValue !== undefined) {
            // Emit trailing value
            scheduler.schedule(() => {
              emitValue(pendingValue!);
              observer.complete();
            }, 0);
          } else {
            clearTimer();
            observer.complete();
          }
        },
      });

      // Cleanup function
      return () => {
        subscription.unsubscribe();
        clearTimer();
      };
    });
  };
}
