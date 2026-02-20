import { AsyncScheduler, Observable, OperatorFunction } from "@awc/reactive";

/**
 * Configuration options for findIndex
 */
export interface FindIndexOptions<T> {
    /**
     * Predicate function to test values.
     * The index of the first value that passes the predicate is emitted.
     * 
     * @required
     */
    predicate: (value: T, index: number) => boolean;
    
    /**
     * Default index to emit if no value matches the predicate.
     * 
     * @default -1
     */
    defaultValue?: number;
    
    /**
     * Scheduler to use for emitting the index.
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
    
    /**
     * Whether to complete immediately after finding a value.
     * 
     * @default true
     */
    completeOnFind?: boolean;
}

/**
 * Emits the index of the first value that passes a predicate, then completes.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {FindIndexOptions<T>} options Configuration options.
 * @returns {OperatorFunction<T, number>} An operator function.
 * 
 * @example
 * // Find index of first even number
 * fromArrayLike([1, 3, 5, 6, 7]).pipe(
 *   findIndex({ predicate: x => x % 2 === 0 })
 * ).subscribe(console.log); // 3
 * 
 * @example
 * // With custom default value
 * fromArrayLike([1, 3, 5]).pipe(
 *   findIndex({ 
 *     predicate: x => x % 2 === 0,
 *     defaultValue: -999
 *   })
 * ).subscribe(console.log); // -999
 * 
 * @performance
 * - Early unsubscription when completeOnFind is true
 * - Minimal predicate evaluation
 * - Efficient index tracking
 * - No value buffering
 */
export function findIndex<T>(
    options: FindIndexOptions<T>
): OperatorFunction<T, number> {
    return (source: Observable<T>): Observable<number> => {
        return new Observable<number>((observer) => {
            const { predicate, defaultValue = -1, scheduler, delay, completeOnFind = true } = options;
            
            let index = 0;
            let found = false;
            let foundIndex = -1;
            let completed = false;
            
            const subscription = source.subscribe({
                next: (value: T) => {
                    const currentIndex = index++;
                    
                    if (!found) {
                        try {
                            const matches = predicate(value, currentIndex);
                            
                            if (matches) {
                                found = true;
                                foundIndex = currentIndex;
                                
                                const emitResult = (): void => {
                                    observer.next(currentIndex);
                                    
                                    if (completeOnFind) {
                                        observer.complete();
                                        subscription.unsubscribe();
                                    }
                                };
                                
                                if (scheduler) {
                                    scheduler.schedule(emitResult, delay);
                                } else {
                                    emitResult();
                                }
                            }
                        } catch (err) {
                            observer.error(err);
                        }
                    }
                },
                error: (err: unknown) => observer.error(err),
                complete: () => {
                    completed = true;
                    
                    const emitResult = (): void => {
                        if (found) {
                            observer.next(foundIndex);
                        } else {
                            observer.next(defaultValue);
                        }
                        
                        if (!completeOnFind || !found) {
                            observer.complete();
                        }
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