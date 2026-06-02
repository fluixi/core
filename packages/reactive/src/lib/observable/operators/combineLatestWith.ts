import {
  AsyncScheduler,
  Observable,
  OperatorFunction,
  Subscription,
} from '@fluixi/reactive';

/**
 * Configuration options for combineLatestWith
 */
export interface CombineLatestWithOptions {
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
   * Whether to wait for all input Observables to emit at least one value.
   * If false, emits immediately with undefined for Observables that haven't emitted.
   *
   * @default true
   */
  waitForAll?: boolean;

  /**
   * Factory function to customize the combination logic.
   * If provided, used instead of default array combination.
   *
   * @default undefined // Use array combination
   */
  project?: (...values: any[]) => any;

  /**
   * Whether to complete when any input Observable completes.
   * If false, waits for all Observables to complete.
   *
   * @default false
   */
  completeOnAny?: boolean;

  /**
   * Whether to emit the initial combination (with undefined values).
   *
   * @default false
   */
  emitInitial?: boolean;
}

/**
 * Combines the source Observable with other Observables to create an Observable
 * whose values are calculated from the latest values of each, as an array or via a project function.
 *
 * @template T The type of values emitted by the source.
 * @template R The type of values emitted by the other Observables.
 *
 * @param {...Observable<R>[]} otherSources Other Observables to combine with.
 * @param {CombineLatestWithOptions} [options] Configuration options.
 * @returns {OperatorFunction<T, any>} An operator function.
 *
 * @example
 * // Basic array combination
 * timer(1000).pipe(
 *   combineLatestWith(timer(2000))
 * ).subscribe(console.log); // [0, 0] after 2 seconds
 *
 * @example
 * // With project function
 * of('Temperature:').pipe(
 *   combineLatestWith(
 *     of(25),
 *     of('°C'),
 *     { project: (label, temp, unit) => `${label} ${temp}${unit}` }
 *   )
 * ).subscribe(console.log); // 'Temperature: 25°C'
 *
 * @example
 * // Multiple Observables
 * const click$ = fromEvent(document, 'click');
 * const key$ = fromEvent(document, 'keydown');
 * const scroll$ = fromEvent(document, 'scroll');
 *
 * click$.pipe(
 *   combineLatestWith(key$, scroll$)
 * ).subscribe(([click, key, scroll]) => {
 *   console.log('Latest events:', { click, key, scroll });
 * });
 *
 * @performance
 * - Single subscription to each source
 * - Efficient value caching (only latest value per source)
 * - Minimal array/project function calls
 * - Early completion detection
 */
export function combineLatestWith<T, R>(
  ...args: [...Observable<R>[], CombineLatestWithOptions]
): OperatorFunction<T, any> {
  return (source: Observable<T>): Observable<any> => {
    // Extract options and other sources from args
    const lastArg = args[args.length - 1];
    let options: CombineLatestWithOptions | undefined;
    let otherSources: Observable<R>[];

    if (lastArg && typeof lastArg === 'object' && !('subscribe' in lastArg)) {
      // Last argument is options
      options = lastArg as CombineLatestWithOptions;
      otherSources = args.slice(0, -1) as Observable<R>[];
    } else {
      // No options provided
      options = undefined;
      otherSources = args as Observable<R>[];
    }

    const scheduler = options?.scheduler;
    const delay = options?.delay ?? 0;
    const waitForAll = options?.waitForAll ?? true;
    const project = options?.project;
    const completeOnAny = options?.completeOnAny ?? false;
    const emitInitial = options?.emitInitial ?? false;

    // Combine all sources (source + otherSources)
    const allSources = [source, ...otherSources];

    return new Observable<any>((observer) => {
      // Track each source
      const sourcesData: Array<{
        subscription: Subscription | null;
        hasValue: boolean;
        latestValue: any;
        completed: boolean;
        index: number;
      }> = new Array(allSources.length);

      // Track subscriptions for cleanup
      const subscriptions: Subscription[] = [];
      let hasCompleted = false;

      // Initialize source data
      for (let i = 0; i < allSources.length; i++) {
        sourcesData[i] = {
          subscription: null,
          hasValue: false,
          latestValue: undefined,
          completed: false,
          index: i,
        };
      }

      // Check if we should emit
      const shouldEmit = (): boolean => {
        if (!waitForAll) {
          // Emit if any source has a value
          return sourcesData.some((source) => source.hasValue);
        } else {
          // Emit only if all sources have values OR there are no sources
          return (
            allSources.length === 0 ||
            sourcesData.every((source) => source.hasValue)
          );
        }
      };

      // Create the output value
      const createOutput = (): any => {
        const values = sourcesData.map((source) => source.latestValue);

        if (project) {
          try {
            return project(...values);
          } catch (err) {
            observer.error(err);
            return undefined;
          }
        } else {
          return values;
        }
      };

      // Emit the current combination
      const emitCombination = (): void => {
        if (shouldEmit()) {
          const output = createOutput();

          // Check if we got an error from project function
          if (output === undefined && project) {
            // Error already handled in createOutput
            return;
          }

          const emit = (): void => {
            observer.next(output);
          };

          if (scheduler) {
            scheduler.schedule(emit, delay);
          } else {
            emit();
          }
        } else if (emitInitial && !sourcesData.some((s) => s.hasValue)) {
          // Emit initial undefined values
          const initialValues = sourcesData.map(() => undefined);
          const output = project ? project(...initialValues) : initialValues;

          const emit = (): void => {
            observer.next(output);
          };

          if (scheduler) {
            scheduler.schedule(emit, delay);
          } else {
            emit();
          }
        }
      };

      // Check completion
      const checkCompletion = (): void => {
        if (completeOnAny) {
          // Complete if any source completed
          const anyCompleted = sourcesData.some((source) => source.completed);
          if (anyCompleted && !hasCompleted) {
            hasCompleted = true;
            observer.complete();
          }
        } else {
          // Complete only if all sources completed
          const allCompleted = sourcesData.every((source) => source.completed);
          if (allCompleted && !hasCompleted) {
            hasCompleted = true;
            observer.complete();
          }
        }
      };

      // Subscribe to all sources
      allSources.forEach((source$, index) => {
        const subscription = source$.subscribe({
          next: (value: any) => {
            sourcesData[index].hasValue = true;
            sourcesData[index].latestValue = value;
            emitCombination();
          },
          error: (err: unknown) => {
            observer.error(err);
          },
          complete: () => {
            sourcesData[index].completed = true;
            checkCompletion();
          },
        });

        sourcesData[index].subscription = subscription;
        subscriptions.push(subscription);
      });

      // Emit initial combination if requested
      if (emitInitial) {
        emitCombination();
      }

      // Cleanup function
      return () => {
        subscriptions.forEach((sub) => sub.unsubscribe());
      };
    });
  };
}

// // 1. throwError examples
// console.log('=== throwError Examples ===');

// // Immediate error
// throwError(new Error('Something broke')).subscribe({
//     next: () => console.log('Never happens'),
//     error: err => console.log('Caught error:', err.message)
// });

// // Delayed error
// throwError(new Error('Delayed failure'), {
//     scheduler: asyncScheduler,
//     delay: 2000
// }).subscribe({
//     error: err => console.log('Error after 2s:', err.message)
// });

// // Lazy error creation
// throwError(() => {
//     const error = new Error('Dynamically created error');
//     error.name = 'CustomError';
//     return error;
// }).subscribe({
//     error: err => console.log('Custom error:', err.name, err.message)
// });

// // Custom error constructor
// class ValidationError extends Error {
//     constructor(message: string, public field: string) {
//         super(message);
//         this.name = 'ValidationError';
//     }
// }

// throwError(new ValidationError('Invalid input', 'email'), {
//     errorConstructor: ValidationError
// }).subscribe({
//     error: err => {
//         console.log(`${err.name} on ${err.field}:`, err.message);
//     }
// });

// // 2. combineLatestAll examples
// console.log('\n=== combineLatestAll Examples ===');

// // Basic higher-order to first-order
// const higherOrder$ = new Observable<Observable<number>>(observer => {
//     observer.next(new Observable(obs => {
//         obs.next(1);
//         obs.next(2);
//         setTimeout(() => obs.next(3), 100);
//     }));

//     observer.next(new Observable(obs => {
//         setTimeout(() => obs.next('a'), 50);
//         setTimeout(() => obs.next('b'), 150);
//     }));

//     setTimeout(() => observer.complete(), 200);
// });

// higherOrder$.pipe(
//     combineLatestAll()
// ).subscribe({
//     next: values => console.log('Combined:', values),
//     complete: () => console.log('combineLatestAll completed')
// });

// // With max concurrency
// const source$ = interval(100).pipe(
//     take(5),
//     map(i =>
//         interval(50).pipe(
//             map(j => `inner${i}-val${j}`),
//             take(3)
//         )
//     )
// );

// source$.pipe(
//     combineLatestAll({ maxConcurrency: 2 })
// ).subscribe({
//     next: values => console.log('Limited concurrency:', values)
// });

// // With async scheduler
// const asyncHigherOrder$ = of(
//     of(1, 2, 3),
//     of('a', 'b')
// ).pipe(
//     delay({ delay: 1000 })
// );

// asyncHigherOrder$.pipe(
//     combineLatestAll({
//         scheduler: asyncScheduler,
//         delay: 500
//     })
// ).subscribe(values => {
//     console.log('Async combined:', values);
// });

// // 3. combineLatestWith examples
// console.log('\n=== combineLatestWith Examples ===');

// // Basic combination
// const timer1$ = interval(1000).pipe(take(3));
// const timer2$ = interval(1500).pipe(take(3));

// timer1$.pipe(
//     combineLatestWith(timer2$)
// ).subscribe(values => {
//     console.log('Timers:', values);
// });

// // With project function
// const name$ = of('Alice', 'Bob');
// const age$ = of(25, 30);
// const city$ = of('New York', 'London');

// name$.pipe(
//     combineLatestWith(age$, city$, {
//         project: (name, age, city) => `${name} (${age}) from ${city}`
//     })
// ).subscribe(profile => {
//     console.log('Profile:', profile);
// });

// // With DOM events
// const click$ = fromEvent(document, 'click').pipe(
//     map(() => 'click')
// );
// const key$ = fromEvent(document, 'keydown').pipe(
//     map((e: KeyboardEvent) => e.key)
// );
// const resize$ = fromEvent(window, 'resize').pipe(
//     map(() => `${window.innerWidth}x${window.innerHeight}`)
// );

// click$.pipe(
//     combineLatestWith(key$, resize$, {
//         project: (click, key, size) => ({ click, key, size }),
//         emitInitial: true
//     })
// ).subscribe(event => {
//     console.log('Latest events:', event);
// });

// // Multiple sources with options
// const source1$ = of('A', 'B', 'C');
// const source2$ = of(1, 2);
// const source3$ = of(true, false);

// source1$.pipe(
//     combineLatestWith(
//         source2$,
//         source3$,
//         {
//             waitForAll: false,
//             emitInitial: true
//         }
//     )
// ).subscribe(values => {
//     console.log('Partial wait:', values);
// });

// // Type-safe combination
// interface User { id: number; name: string; }
// interface Settings { theme: string; notifications: boolean; }

// const user$ = of<User>({ id: 1, name: 'Alice' });
// const settings$ = of<Settings>({ theme: 'dark', notifications: true });

// user$.pipe(
//     combineLatestWith(settings$, {
//         project: (user, settings) => ({
//             ...user,
//             ...settings
//         })
//     })
// ).subscribe(combined => {
//     console.log('User with settings:', combined);
//     // TypeScript knows combined has id, name, theme, notifications
// });

// Error recovery pipeline with throwError
// function fetchWithRetry<T>(
//     url: string,
//     maxRetries: number = 3
// ): Observable<T> {
//     return fromFetch<T>(url).pipe(
//         catchError((error, attempt) => {
//             if (attempt < maxRetries) {
//                 // Retry with exponential backoff
//                 const delay = Math.pow(2, attempt) * 1000;
//                 return throwError(error, {
//                     scheduler: asyncScheduler,
//                     delay
//                 }).pipe(
//                     mergeMap(() => fetchWithRetry(url, maxRetries - attempt - 1))
//                 );
//             }
//             // Final error
//             return throwError(new Error(`Failed after ${maxRetries} retries: ${error.message}`));
//         })
//     );
// }

// // Dynamic combineLatestAll for multiple API calls
// function combineApiCalls<T>(
//     apiCallFactory: (id: number) => Observable<T>,
//     ids: number[]
// ): Observable<T[]> {
//     return fromArrayLike(ids).pipe(
//         map(id => apiCallFactory(id)),
//         combineLatestAll({
//             waitForAll: true,
//             emitOnAnyComplete: false
//         })
//     );
// }

// // Usage
// const userIds = [1, 2, 3, 4];
// combineApiCalls(
//     id => fromFetch(`/api/users/${id}`),
//     userIds
// ).subscribe(users => {
//     console.log('All users:', users);
// });

// // Smart combineLatestWith with validation
// function combineWithValidation<T, R>(
//     source$: Observable<T>,
//     validator$: Observable<(value: T) => boolean>,
//     errorMessage: string
// ): Observable<T> {
//     return source$.pipe(
//         combineLatestWith(validator$, {
//             project: (value, validator) => {
//                 if (validator(value)) {
//                     return value;
//                 }
//                 throw new Error(errorMessage);
//             }
//         }),
//         catchError(error => {
//             console.error('Validation failed:', error.message);
//             return EMPTY;
//         })
//     );
// }

// // Usage
// const age$ = new Observable<number>(obs => {
//     obs.next(15);
//     obs.next(25);
//     obs.next(17);
//     obs.complete();
// });

// const ageValidator$ = of((age: number) => age >= 18);

// combineWithValidation(
//     age$,
//     ageValidator$,
//     'Must be 18 or older'
// ).subscribe(validAge => {
//     console.log('Valid age:', validAge); // Only 25
// });

// // Real-time dashboard with combineLatestAll
// function createDashboard(
//     dataSources: Observable<any>[]
// ): Observable<DashboardData> {
//     return fromArrayLike(dataSources).pipe(
//         // Add timestamp to each data source
//         map(source$ => source$.pipe(
//             map(data => ({ data, timestamp: Date.now() }))
//         )),
//         // Combine all sources
//         combineLatestAll({
//             project: (...sources) => {
//                 const dashboard: DashboardData = {
//                     lastUpdate: Math.max(...sources.map(s => s.timestamp)),
//                     data: sources.map(s => s.data)
//                 };
//                 return dashboard;
//             }
//         })
//     );
// }

// // Error boundary with throwError
// function withErrorBoundary<T>(
//     source$: Observable<T>,
//     fallback$: Observable<T>
// ): Observable<T> {
//     return source$.pipe(
//         catchError(error => {
//             // Log error
//             console.error('Error in source:', error);

//             // Emit error notification
//             const error$ = throwError(error, {
//                 scheduler: asyncScheduler,
//                 delay: 0
//             });

//             // Switch to fallback after error
//             return concat(error$, fallback$);
//         })
//     );
// }

// // Combine latest with debounced updates
// function combineLatestDebounced<T>(
//     sources: Observable<T>[],
//     debounceTime: number
// ): Observable<T[]> {
//     return new Observable<T[]>(observer => {
//         const debouncedSources = sources.map(source$ =>
//             source$.pipe(debounceTime(debounceTime))
//         );

//         return combineLatest(...debouncedSources).subscribe(observer);
//     });
// }

// // Usage with search inputs
// const search1$ = fromEvent(searchInput1, 'input').pipe(
//     map(e => (e.target as HTMLInputElement).value)
// );
// const search2$ = fromEvent(searchInput2, 'input').pipe(
//     map(e => (e.target as HTMLInputElement).value)
// );

// combineLatestDebounced([search1$, search2$], 300).subscribe(
//     ([term1, term2]) => {
//         performSearch(term1, term2);
//     }
// );
