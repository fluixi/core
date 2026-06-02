import { AsyncScheduler, Observable, OperatorFunction } from "@fluixi/reactive";

/**
 * Configuration options for every
 */
export interface EveryOptions<T> {
    /**
     * Scheduler to use for emitting the result.
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
     * Default value to emit if source completes without any emissions.
     * 
     * @default true // Empty sequence satisfies "every"
     */
    defaultValue?: boolean;
    
    /**
     * Whether to complete immediately when a false value is found.
     * If true, emits false and completes as soon as predicate returns false.
     * 
     * @default true
     */
    completeOnFalse?: boolean;
}

/**
 * Emits true if every emission satisfies a predicate, false otherwise.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {(value: T, index: number) => boolean} predicate Function to test each value.
 * @param {EveryOptions<T>} [options] Configuration options.
 * @returns {OperatorFunction<T, boolean>} An operator function.
 * 
 * @example
 * // Check if all values are even
 * fromArrayLike([2, 4, 6, 8]).pipe(
 *   every(x => x % 2 === 0)
 * ).subscribe(console.log); // true
 * 
 * @example
 * // Early completion on false
 * fromArrayLike([2, 3, 4, 5]).pipe(
 *   every(x => x % 2 === 0, { completeOnFalse: true })
 * ).subscribe(console.log); // false (stops at 3)
 * 
 * @performance
 * - Early termination when predicate returns false
 * - O(1) memory usage
 * - Efficient predicate evaluation
 * - Minimal overhead per emission
 */
export function every<T>(
    predicate: (value: T, index: number) => boolean,
    options?: EveryOptions<T>
): OperatorFunction<T, boolean> {
    return (source: Observable<T>): Observable<boolean> => {
        return new Observable<boolean>((observer) => {
            const scheduler = options?.scheduler;
            const delay = options?.delay ?? 0;
            const includeIndex = options?.includeIndex ?? true;
            const defaultValue = options?.defaultValue ?? true;
            const completeOnFalse = options?.completeOnFalse ?? true;
            
            let allTrue = true;
            let index = 0;
            let completed = false;
            let hasValues = false;
            
            const subscription = source.subscribe({
                next: (value: T) => {
                    hasValues = true;
                    const currentIndex = includeIndex ? index++ : 0;
                    
                    try {
                        const passes = predicate(value, currentIndex);
                        
                        if (!passes) {
                            allTrue = false;
                            
                            if (completeOnFalse) {
                                subscription.unsubscribe();
                                
                                const emitFalse = (): void => {
                                    observer.next(false);
                                    observer.complete();
                                };
                                
                                if (scheduler) {
                                    scheduler.schedule(emitFalse, delay);
                                } else {
                                    emitFalse();
                                }
                            }
                        }
                    } catch (err) {
                        observer.error(err);
                    }
                },
                error: (err: unknown) => observer.error(err),
                complete: () => {
                    completed = true;
                    
                    const emitResult = (): void => {
                        observer.next(hasValues ? allTrue : defaultValue);
                        observer.complete();
                    };
                    
                    if (scheduler) {
                        scheduler.schedule(emitResult, delay);
                    } else {
                        emitResult();
                    }
                }
            });
            
            // Cleanup function
            return () => {
                subscription.unsubscribe();
            };
        });
    };
}