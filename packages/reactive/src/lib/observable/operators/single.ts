import { AsyncScheduler, EmptyError, Observable, OperatorFunction } from "@awc/reactive";

/**
 * Configuration options for single
 */
export interface SingleOptions<T> {
    /**
     * Optional predicate function to filter values.
     * If provided, returns the single value that matches the predicate,
     * or throws if 0 or multiple values match.
     * 
     * @default undefined // No predicate, use any value
     */
    predicate?: (value: T, index: number) => boolean;
    
    /**
     * Error factory for no matching values.
     * 
     * @default () => new EmptyError('no elements in sequence')
     */
    emptyErrorFactory?: () => any;
    
    /**
     * Error factory for multiple values.
     * 
     * @default (count) => new Error(`sequence contains ${count} elements`)
     */
    multipleErrorFactory?: (count: number) => any;
    
    /**
     * Default value to emit if no value is emitted.
     * If provided and source completes without emitting, emits this value instead of throwing.
     * 
     * @default undefined // Throw on empty
     */
    defaultValue?: T;
    
    /**
     * Scheduler to use for error throwing or default value emission.
     * 
     * @default undefined // Synchronous
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Delay for scheduler operations (in milliseconds).
     * 
     * @default 0
     */
    delay?: number;
}

/**
 * Emits the single item emitted by the source Observable that matches a predicate,
 * or throws specific errors if 0 or multiple items are emitted.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {SingleOptions<T>} [options] Configuration options.
 * @returns {OperatorFunction<T, T>} An operator function.
 * 
 * @example
 * // Basic usage - expects exactly one value
 * fromArrayLike([42]).pipe(single()).subscribe(console.log); // 42
 * 
 * @example
 * // With predicate
 * fromArrayLike([1, 2, 3, 4, 5]).pipe(
 *   single({ predicate: x => x > 4 })
 * ).subscribe(console.log); // 5
 * 
 * @example
 * // With default value
 * empty().pipe(
 *   single({ defaultValue: 100 })
 * ).subscribe(console.log); // 100
 * 
 * @example
 * // Async error handling
 * source$.pipe(
 *   single({
 *     scheduler: asyncScheduler,
 *     delay: 1000
 *   })
 * ).subscribe(console.log);
 * 
 * @performance
 * - Early error detection for multiple values
 * - Minimal value storage (only stores first matching value)
 * - Efficient predicate evaluation
 * - No unnecessary buffering
 */
export function single<T>(
    options?: SingleOptions<T>
): OperatorFunction<T, T> {
    return (source: Observable<T>): Observable<T> => {
        return new Observable<T>((observer) => {
            const predicate = options?.predicate;
            const emptyErrorFactory = options?.emptyErrorFactory || 
                (() => new EmptyError('no elements in sequence'));
            const multipleErrorFactory = options?.multipleErrorFactory || 
                ((count: number) => new Error(`sequence contains ${count} elements`));
            const defaultValue = options?.defaultValue;
            const scheduler = options?.scheduler;
            const delay = options?.delay ?? 0;
            
            let hasValue = false;
            let value: T | undefined;
            let valueCount = 0;
            let index = 0;
            let completed = false;
            
            const subscription = source.subscribe({
                next: (sourceValue: T) => {
                    const currentIndex = index++;
                    
                    // Check if value matches predicate (if any)
                    const matches = predicate 
                        ? predicate(sourceValue, currentIndex)
                        : true;
                    
                    if (matches) {
                        valueCount++;
                        
                        if (valueCount === 1) {
                            // First matching value
                            hasValue = true;
                            value = sourceValue;
                        } else if (valueCount === 2) {
                            // Second matching value - we have multiple
                            const throwError = (): void => {
                                try {
                                    const error = multipleErrorFactory(valueCount);
                                    observer.error(error);
                                } catch (err) {
                                    observer.error(err);
                                }
                            };
                            
                            if (scheduler) {
                                scheduler.schedule(throwError, delay);
                            } else {
                                throwError();
                            }
                        }
                        // For valueCount > 2, we've already thrown or scheduled throw
                    }
                },
                error: (err: unknown) => observer.error(err),
                complete: () => {
                    completed = true;
                    
                    const emitOrError = (): void => {
                        if (valueCount === 0) {
                            // No matching values
                            if (defaultValue !== undefined) {
                                observer.next(defaultValue);
                                observer.complete();
                            } else {
                                try {
                                    const error = emptyErrorFactory();
                                    observer.error(error);
                                } catch (err) {
                                    observer.error(err);
                                }
                            }
                        } else if (valueCount === 1) {
                            // Exactly one matching value
                            observer.next(value!);
                            observer.complete();
                        }
                        // valueCount > 1 already handled in next()
                    };
                    
                    if (scheduler) {
                        scheduler.schedule(emitOrError, delay);
                    } else {
                        emitOrError();
                    }
                }
            });
            
            // Cleanup function
            return () => {
                subscription.unsubscribe();
                
                // If we complete without proper handling, we need to cleanup
                if (completed && scheduler && valueCount > 1) {
                    // We've scheduled an error but unsubscribed before it fired
                    // The scheduler will handle cleanup of the scheduled task
                }
            };
        });
    };
}