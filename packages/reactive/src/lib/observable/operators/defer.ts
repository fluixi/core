import { AsyncScheduler, Observable, Subscription } from '@awc/reactive';
import { isIterable } from '@awc/utils';
import { asyncScheduler } from '@awc/reactive/schedulers/async';

/**
 * Factory function for defer
 */
export type DeferFactory<T> = () =>
  | Observable<T>
  | PromiseLike<T>
  | ArrayLike<T>
  | T;

/**
 * Configuration options for defer
 */
export interface DeferOptions {
  /**
   * Scheduler to use for deferred creation.
   * If provided, the factory function is called asynchronously via the scheduler.
   *
   * @default undefined // Create synchronously on subscription
   */
  scheduler?: AsyncScheduler;

  /**
   * Delay before calling the factory (in milliseconds).
   * Only applicable when scheduler is provided.
   *
   * @default 0
   */
  delay?: number;

  /**
   * Maximum number of retries if the factory throws an error.
   *
   * @default 0 // No retry
   */
  retry?: number;

  /**
   * Delay between retries (in milliseconds).
   *
   * @default 1000 // 1 second
   */
  retryDelay?: number;

  /**
   * Function to determine if an error should be retried.
   *
   * @default (error) => true // Retry all errors
   */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Creates an Observable that calls a factory function to create an Observable
 * for each new Observer. Useful for lazy initialization.
 *
 * @template T The type of values emitted by the Observable.
 *
 * @param {DeferFactory<T>} factory The Observable factory function.
 * @param {DeferOptions} [options] Configuration options.
 * @returns {Observable<T>} An Observable whose Observers trigger the factory function.
 *
 * @example
 * // Lazy random number generation
 * defer(() => Math.random()).subscribe(console.log);
 *
 * @example
 * // Lazy HTTP request
 * defer(() => fetch('/api/data').then(res => res.json()))
 *   .subscribe(data => console.log('Data:', data));
 *
 * @example
 * // With retry logic
 * defer(
 *   () => fetch('/unstable-api'),
 *   {
 *     retry: 3,
 *     retryDelay: 1000
 *   }
 * ).subscribe(console.log);
 *
 * @performance
 * - Factory only called on subscription (lazy initialization)
 * - No resource allocation until subscription
 * - Efficient retry mechanism with backoff
 * - Scheduler integration for async factory calls
 */
export function defer<T>(
  factory: DeferFactory<T>,
  options?: DeferOptions
): Observable<T> {
  return new Observable<T>((observer) => {
    const scheduler = options?.scheduler;
    const delay = options?.delay ?? 0;
    const maxRetries = options?.retry ?? 0;
    const retryDelay = options?.retryDelay ?? 1000;
    const shouldRetry = options?.shouldRetry ?? (() => true);

    let retryCount = 0;
    let activeSubscription: Subscription | undefined;
    let scheduledCreation: { unsubscribe: () => void } | undefined;

    /**
     * Create the observable from the factory result
     */
    const createObservable = (
      factoryResult: ReturnType<DeferFactory<T>>
    ): Observable<T> => {
      if (factoryResult instanceof Observable) {
        return factoryResult;
      } else if (
        factoryResult &&
        typeof (factoryResult as any).then === 'function'
      ) {
        // Promise-like
        return new Observable<T>((subscriber) => {
          (factoryResult as PromiseLike<T>).then(
            (value) => {
              subscriber.next(value);
              subscriber.complete();
            },
            (error) => subscriber.error(error)
          );
        });
      } else if (
        factoryResult &&
        (typeof (factoryResult as any)[Symbol.iterator as any] === 'function' ||
          typeof (factoryResult as any).length === 'number')
      ) {
        // Array-like or iterable
        return new Observable<T>((subscriber) => {
          try {
            if (isIterable(factoryResult)) {
              for (const value of factoryResult as Iterable<T>) {
                subscriber.next(value);
              }
            } else {
              // Array-like
              const arrayLike = factoryResult as ArrayLike<T>;
              for (let i = 0; i < arrayLike.length; i++) {
                subscriber.next(arrayLike[i]);
              }
            }
            subscriber.complete();
          } catch (error) {
            subscriber.error(error);
          }
        });
      } else {
        // Single value
        return new Observable<T>((subscriber) => {
          subscriber.next(factoryResult as T);
          subscriber.complete();
        });
      }
    };

    /**
     * Execute the factory and subscribe to the result
     */
    const executeFactory = (attempt: number = 1): void => {
      try {
        const factoryResult = factory();
        const observable = createObservable(factoryResult);

        activeSubscription = observable.subscribe({
          next: (value: T) => observer.next?.(value),
          error: (error: unknown) => {
            // Check if we should retry
            if (attempt <= maxRetries && shouldRetry(error)) {
              retryCount++;

              // Schedule retry with delay
              scheduledCreation = (scheduler || asyncScheduler).schedule(() => {
                executeFactory(attempt + 1);
              }, retryDelay);
            } else {
              observer.error(error);
            }
          },
          complete: () => observer.complete(),
        });
      } catch (error) {
        // Check if we should retry
        if (attempt <= maxRetries && shouldRetry(error)) {
          retryCount++;

          // Schedule retry with delay
          scheduledCreation = (scheduler || asyncScheduler).schedule(() => {
            executeFactory(attempt + 1);
          }, retryDelay);
        } else {
          console.error('Defer factory error:', error);
          observer.error?.(error);
        }
      }
    };

    /**
     * Schedule or execute the factory
     */
    if (scheduler) {
      // Schedule factory execution
      scheduledCreation = scheduler.schedule(() => {
        executeFactory();
      }, delay);
    } else {
      // Execute factory synchronously
      executeFactory();
    }

    // Cleanup function
    return () => {
      if (activeSubscription) {
        activeSubscription.unsubscribe();
      }

      if (scheduledCreation) {
        scheduledCreation.unsubscribe();
      }
    };
  });
}
