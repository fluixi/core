import {
  isScheduler,
  Observable,
  operate,
  OperatorFunction,
  SchedulerAction,
  SchedulerLike,
  Subscription,
} from '@fluixi/reactive';
import { isFunction } from '@fluixi/utils';
import { asyncScheduler } from '../../schedulers/async.js';
/**
 * Emits a value from the source Observable only after a specified time span has passed
 * without another source emission.
 *
 * `debounceTime` delays emissions and discards pending emissions if a new value arrives
 * during the delay period. This is commonly used for:
 * - Search input debouncing
 * - Window resize handling
 * - Auto-save functionality
 *
 * @template T - The type of values emitted by the source Observable
 *
 * @overload
 * @param {number} dueTime - Time in milliseconds to wait before emitting
 * @returns {OperatorFunction<T, T>} Operator that debounces emissions
 *
 * @overload
 * @param {number} dueTime - Time in milliseconds to wait before emitting
 * @param {SchedulerLike} scheduler - Scheduler to use for timing operations
 * @returns {OperatorFunction<T, T>} Operator that debounces emissions
 *
 * @example
 * // Debounce search input by 300ms
 * fromEvent(searchInput, 'input').pipe(
 *   map(event => event.target.value),
 *   debounceTime(300)
 * ).subscribe(value => {
 *   console.log(`Searching for: ${value}`);
 * });
 *
 * @example
 * // Handle window resize with debouncing
 * fromEvent(window, 'resize').pipe(
 *   debounceTime(250)
 * ).subscribe(() => {
 *   console.log('Window resized (debounced)');
 * });
 *
 * @example
 * // Auto-save form data after 2 seconds of inactivity
 * fromEvent(form, 'input').pipe(
 *   map(() => getFormData()),
 *   debounceTime(2000)
 * ).subscribe(formData => {
 *   saveToAPI(formData);
 * });
 *
 * @example
 * // Multiple emissions with debouncing
 * of('a', 'b', 'c', 'd').pipe(
 *   concatMap(letter => timer(100 * letter.charCodeAt(0)).pipe(
 *     map(() => letter)
 *   )),
 *   debounceTime(200)
 * ).subscribe(letter => console.log(letter));
 * // Only 'd' will be emitted (others are debounced)
 *
 * @example
 * // With custom scheduler for testing
 * const testScheduler = new TestScheduler();
 * const source$ = cold('--a--b--c|', { a: 1, b: 2, c: 3 });
 * const debounced$ = source$.pipe(
 *   debounceTime(5, testScheduler)
 * );
 *
 * @example
 * // Error handling in debounceTime
 * throwError(() => new Error('Source error')).pipe(
 *   debounceTime(100)
 * ).subscribe({
 *   error: err => console.error('Error propagated:', err)
 * });
 *
 * @example
 * // Complete behavior
 * of(1, 2, 3).pipe(
 *   debounceTime(1000)
 * ).subscribe({
 *   next: console.log,
 *   complete: () => console.log('Completed after last debounced value')
 * });
 * // Output: 3 (after 1 second), then "Completed after last debounced value"
 *
 * @note Values are emitted only after the dueTime has passed without new emissions
 * @note If source completes while a debounced value is pending, it's emitted before completion
 * @note Errors from the source are immediately propagated (not debounced)
 * @note Default scheduler is asyncScheduler (setTimeout/clearTimeout based)
 */
export function debounceTime<T>(dueTime: number): OperatorFunction<T, T>;

export function debounceTime<T>(
  dueTime: number,
  scheduler: SchedulerLike
): OperatorFunction<T, T>;

export function debounceTime<T>(
  dueTime: number,
  scheduler: SchedulerLike = asyncScheduler
): OperatorFunction<T, T> {
  // Validate scheduler
  if (!isScheduler(scheduler)) {
    throw new TypeError('scheduler must be a SchedulerLike instance');
  }

  return (source: Observable<T>) =>
    new Observable<T>((subscriber) => {
      // State for debouncing
      let pendingValue: T | null = null;
      let pendingTimeout: Subscription | null = null;
      let hasValue = false;
      let index = 0;

      // Function to schedule next emission
      const scheduleTimeout = (value: T, currentIndex: number) => {
        // Cancel previous timeout if exists
        if (pendingTimeout) {
          pendingTimeout.unsubscribe();
          pendingTimeout = null;
        }

        // Cancel previous value if exists
        //    if (hasValue) {
        //        pendingValue = null;
        //        hasValue = false;
        //    }

        // Store value for later emission
        pendingValue = value;
        hasValue = true;

        // Schedule emission
        pendingTimeout = executeSchedule(
          subscriber,
          scheduler,
          () => {
            // console.log('run schdule')
            const v = pendingValue;
            subscriber.next(v as T);
            if (isFunction(pendingTimeout)) {
              pendingTimeout();
            } else {
              pendingTimeout?.unsubscribe();
            }
            pendingValue = null!;
            pendingTimeout = null;
          },
          dueTime
        ) as any;
        // pendingTimeout =
        // scheduler.schedule(() => {
        //     // Only emit if this is still the latest scheduled value
        //     if (hasValue && currentIndex === index - 1) {
        //         //    console.log('value schedule', value, currentIndex, index, dueTime);
        //            subscriber.next(pendingValue!);
        //            hasValue = false;
        //            pendingValue = null;
        //        }
        //        pendingTimeout = null;
        //    }, dueTime);

        //    subscriber.add(pendingTimeout);
      };

      // Subscribe to source
      const subscription = source.subscribe(
        operate({
          next: (value: T) => {
            const currentIndex = index++;
            scheduleTimeout(value, currentIndex);
          },
          error: (err: any) => {
            // Cancel any pending timeout on error
            if (pendingTimeout) {
              pendingTimeout.unsubscribe();
              pendingTimeout = null;
            }
            subscriber.error(err);
          },
          complete: () => {
            // Handle completion with pending value
            if (hasValue && pendingTimeout) {
              // Wait for pending timeout to emit
              // const completeTimeout = scheduler.schedule(() => {
              //     subscriber.complete();
              // }, dueTime);
              // const completeTimeout = executeSchedule(
              //     subscriber,
              //     scheduler,
              //     () => {
              //         // console.log('last schedule', pendingValue)
              //         subscriber.next(pendingValue!);
              //         pendingTimeout?.unsubscribe();
              //         subscriber.complete();
              //     },
              //     dueTime
              // )
              // if(!(completeTimeout && isFunction(completeTimeout))){
              //     // completeTimeout();
              //     completeTimeout?.unsubscribe();
              // }
              // subscriber.add(completeTimeout as any);
              subscriber.next(pendingValue!);
              subscriber.complete();
              if (isFunction(pendingTimeout)) {
                pendingTimeout();
              } else {
                pendingTimeout.unsubscribe();
              }
              pendingTimeout = null;
            } else {
              subscriber.complete();
            }
          },
        })
      );

      // Cleanup function
      return () => {
        if (pendingTimeout) {
          if (isFunction(pendingTimeout)) {
            pendingTimeout();
          } else {
            pendingTimeout.unsubscribe();
          }
          pendingTimeout = null;
        }
        subscription.unsubscribe();
      };
    });
}

// export function debounceTime<T>(ms: number, scheduler: SchedulerLike = asyncScheduler): OperatorFunction<T, T> {
//     return (source: Observable<T>) =>
//         new Observable<T>((observer) => {

//             let handle: Subscription | null = null;
//             let lastValue: T | undefined;
//             let hasValue = false;
//             let isComplete = false;

//             const emit = () => {
//                 if (hasValue) {
//                     // console.log('emit schedule', lastValue);
//                         observer.next(lastValue as T);
//                         // hasValue = false;
//                 }
//             };
//             const unsub = source.subscribe(
//                 operate({
//                     next: function(value){
//                         lastValue = value as T;
//                         hasValue = true;
//                         if(handle) handle.unsubscribe()
//                         handle = executeSchedule(
//                                 observer,
//                                 scheduler,
//                                 () => {
//                                   handle = null;
//                                   const v = lastValue;
//                                   lastValue = null!;
//                                   observer.next(v as T);
//                                 },
//                                 ms
//                               ) as any;
//                         // handle = asyncScheduler.schedule(()=>{
//                         //     emit();
//                         //     if (isComplete) observer.complete?.();
//                         // }, ms)
//                     },
//                     complete() {
//                         isComplete = true;

//                         // If no timeout is pending, emit immediately
//                         // if (handle === null) {
//                         if (handle) {
//                             emit();
//                             observer.complete?.();
//                         }
//                     },
//                     error(error) {
//                         if (handle !== null) handle.unsubscribe();
//                         observer.error?.(error);
//                     },
//                 })
//             )

//             // const unsub = source.subscribe({
//             // next(value) {

//             //     lastValue = value;
//             //     hasValue = true;
//             //     if(handle) handle.unsubscribe()
//             //     handle = asyncScheduler.schedule(()=>{
//             //         emit();
//             //         if (isComplete) observer.complete?.();
//             //     }, ms)
//             //     // if (handle !== null && emitted) {
//             //     //     console.log('clear timeout')
//             //     //     clearTimeout((observer as any).handle);
//             //     // }

//             //     // console.log('debounce before', (observer as any).__teardown);
//             //     // (observer as any).handle = setTimeout(() => {
//             //     //     // console.log('inside set timeout')
//             //     //     (observer as any).handle = null;
//             //     //     emit();

//             //     //     if (isComplete) observer.complete?.();
//             //     // }, ms);
//             //     // console.log('debounce after', (observer as any).__teardown);
//             // },

//             // error(err) {
//             //     if (handle !== null) handle.unsubscribe();
//             //     observer.error?.(err);
//             // },

//             // complete() {
//             //     isComplete = true;

//             //     // If no timeout is pending, emit immediately
//             //     if (handle === null) {
//             //         emit();
//             //         observer.complete?.();
//             //     }
//             //     // Otherwise completion will happen after the timeout fires
//             // },
//             // });

//             // return () => {
//             //     console.log('fn is')
//             //   if (handle !== null || !emitted) clearTimeout(handle);
//             //   unsub.unsubscribe();
//             // };
//             return ()=>unsub.unsubscribe()
//         });
// }

export function executeSchedule(
  parentSubscription: Subscription,
  scheduler: SchedulerLike,
  work: () => void,
  delay = 0,
  repeat = false
): Subscription | void {
  if (!parentSubscription.closed) {
    const scheduleSubscription = scheduler.schedule(function (
      this: SchedulerAction<any>
    ) {
      work();
      if (repeat) {
        parentSubscription.add(this.schedule(null, delay));
      } else {
        this.unsubscribe();
      }
    },
    delay);

    parentSubscription.add(scheduleSubscription);

    if (!repeat) {
      // Because user-land scheduler implementations are unlikely to properly reuse
      // Actions for repeat scheduling, we can't trust that the returned subscription
      // will control repeat subscription scenarios. So we're trying to avoid using them
      // incorrectly within this library.
      return scheduleSubscription;
    }
  }
}

// /**
// * Enhanced version with configurable leading/trailing emissions.
// * Similar to lodash's debounce with leading/trailing options.
// *
// * @template T - The type of values emitted by the source Observable
// *
// * @overload
// * @param {number} dueTime - Time in milliseconds to wait before emitting
// * @param {DebounceConfig} config - Configuration object
// * @returns {OperatorFunction<T, T>} Operator that debounces emissions
// *
// * @example
// * // Emit immediately on first value, then debounce
// * fromEvent(input, 'input').pipe(
// *   debounceTime(300, { leading: true, trailing: true })
// * ).subscribe(value => {
// *   console.log(value); // Emits first value immediately, then debounced values
// * });
// */
// export function debounceTime<T>(
//    dueTime: number,
//    config: DebounceConfig
// ): OperatorFunction<T, T>;

// export function debounceTime<T>(
//    dueTime: number,
//    configOrScheduler?: DebounceConfig | SchedulerLike
// ): OperatorFunction<T, T> {
//    // Handle different parameter signatures
//    let scheduler: SchedulerLike = asyncScheduler;
//    let config: DebounceConfig | undefined;

//    if (isScheduler(configOrScheduler)) {
//        scheduler = configOrScheduler;
//    } else if (configOrScheduler && typeof configOrScheduler === 'object') {
//        config = configOrScheduler as DebounceConfig;
//    }

//    return createDebounceTimeOperator(dueTime, scheduler, config);
// }

/**
 * Configuration for debounceTime with leading/trailing options.
 *
 * @interface DebounceConfig
 * @property {boolean} [leading=false] - Whether to emit on the leading edge
 * @property {boolean} [trailing=true] - Whether to emit on the trailing edge
 * @property {number} [maxWait] - Maximum time to wait before emitting
 */
export interface DebounceConfig {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

// /**
// * Creates the debounceTime operator with configuration options.
// *
// * @template T - The type of values emitted by the source Observable
// * @param {number} dueTime - Time in milliseconds to wait before emitting
// * @param {SchedulerLike} scheduler - Scheduler to use
// * @param {DebounceConfig} [config] - Configuration options
// * @returns {OperatorFunction<T, T>} Configured debounce operator
// *
// * @private
// */
// function createDebounceTimeOperator<T>(
//    dueTime: number,
//    scheduler: SchedulerLike,
//    config?: DebounceConfig
// ): OperatorFunction<T, T> {
//    const {
//        leading = false,
//        trailing = true,
//        maxWait
//    } = config || {};

//    return (source: Observable<T>) => new Observable<T>(subscriber => {
//        let pendingValue: T | null = null;
//        let pendingTimeout: Subscription | null = null;
//        let maxWaitTimeout: Subscription | null = null;
//        let lastCallTime: number | null = null;
//        let leadingCalled = false;
//        let index = 0;

//        // Function to emit value
//        const emitValue = (value: T) => {
//            subscriber.next(value);
//            pendingValue = null;
//            lastCallTime = scheduler.now();
//            leadingCalled = false;
//        };

//        // Function to schedule trailing emission
//        const scheduleTrailing = (value: T, currentIndex: number) => {
//            if (pendingTimeout) {
//                pendingTimeout.unsubscribe();
//                pendingTimeout = null;
//            }

//            pendingValue = value;

//            pendingTimeout = scheduler.schedule(() => {
//                if (pendingValue !== null && currentIndex === index - 1) {
//                    emitValue(pendingValue);
//                }
//                pendingTimeout = null;
//            }, dueTime);

//            subscriber.add(pendingTimeout);
//        };

//        // Function to schedule maxWait timeout
//        const scheduleMaxWait = (value: T, currentIndex: number) => {
//            if (maxWait && maxWait > dueTime) {
//                if (maxWaitTimeout) {
//                    maxWaitTimeout.unsubscribe();
//                    maxWaitTimeout = null;
//                }

//                maxWaitTimeout = scheduler.schedule(() => {
//                    if (pendingValue !== null && currentIndex === index - 1) {
//                        emitValue(pendingValue);
//                    }
//                    maxWaitTimeout = null;
//                }, maxWait);

//                subscriber.add(maxWaitTimeout);
//            }
//        };

//        // Subscribe to source
//        const subscription = source.subscribe({
//            next: (value: T) => {
//                const currentIndex = index++;
//                const now = scheduler.now();

//                // Handle leading emission
//                if (leading && !leadingCalled && (lastCallTime === null || now - lastCallTime >= dueTime)) {
//                    emitValue(value);
//                    leadingCalled = true;
//                } else {
//                    pendingValue = value;
//                }

//                // Schedule trailing emission if configured
//                if (trailing) {
//                    scheduleTrailing(value, currentIndex);
//                }

//                // Schedule maxWait if configured
//                if (maxWait) {
//                    scheduleMaxWait(value, currentIndex);
//                }
//            },
//            error: (err: any) => {
//                // Clean up timeouts
//                if (pendingTimeout) {
//                    pendingTimeout.unsubscribe();
//                    pendingTimeout = null;
//                }
//                if (maxWaitTimeout) {
//                    maxWaitTimeout.unsubscribe();
//                    maxWaitTimeout = null;
//                }
//                subscriber.error(err);
//            },
//            complete: () => {
//                // Handle pending value on completion
//                if (pendingValue !== null && trailing) {
//                    if (pendingTimeout) {
//                        // Wait for pending timeout to emit
//                        const completeTimeout = scheduler.schedule(() => {
//                            subscriber.complete();
//                        }, dueTime);
//                        subscriber.add(completeTimeout);
//                    } else {
//                        subscriber.next(pendingValue);
//                        subscriber.complete();
//                    }
//                } else {
//                    subscriber.complete();
//                }
//            }
//        });

//        // Cleanup function
//        return () => {
//            if (pendingTimeout) {
//                pendingTimeout.unsubscribe();
//                pendingTimeout = null;
//            }
//            if (maxWaitTimeout) {
//                maxWaitTimeout.unsubscribe();
//                maxWaitTimeout = null;
//            }
//            subscription.unsubscribe();
//        };
//    });
// }
