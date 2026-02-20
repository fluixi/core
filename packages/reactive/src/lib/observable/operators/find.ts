import { AsyncScheduler, Observable, OperatorFunction } from "@awc/reactive";

/**
 * Configuration options for find
 */
export interface FindOptions<T> {
    /**
     * Predicate function to test values.
     * The first value that passes the predicate is emitted.
     * 
     * @required
     */
    predicate: (value: T, index: number) => boolean;
    
    /**
     * Default value to emit if no value matches the predicate.
     * 
     * @default undefined // Returns undefined on no match
     */
    defaultValue?: T;
    
    /**
     * Scheduler to use for emitting the value.
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
     * Whether to emit the index instead of the value.
     * 
     * @default false
     */
    emitIndex?: boolean;
    
    /**
     * Whether to complete immediately after finding a value.
     * If false, continues to receive values but only emits the first match.
     * 
     * @default true
     */
    completeOnFind?: boolean;
}

/**
 * Emits the first value that passes a predicate, then completes.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {FindOptions<T>} options Configuration options.
 * @returns {OperatorFunction<T, T | number | undefined>} An operator function.
 * 
 * @example
 * // Find first even number
 * fromArrayLike([1, 3, 5, 6, 7]).pipe(
 *   find({ predicate: x => x % 2 === 0 })
 * ).subscribe(console.log); // 6
 * 
 * @example
 * // With default value
 * fromArrayLike([1, 3, 5]).pipe(
 *   find({ 
 *     predicate: x => x % 2 === 0,
 *     defaultValue: -1
 *   })
 * ).subscribe(console.log); // -1
 * 
 * @example
 * // Emit index
 * fromArrayLike(['a', 'b', 'c']).pipe(
 *   find({ 
 *     predicate: x => x === 'b',
 *     emitIndex: true
 *   })
 * ).subscribe(console.log); // 1
 * 
 * @performance
 * - Early unsubscription when completeOnFind is true
 * - Minimal predicate evaluation
 * - Efficient default value handling
 * - No value buffering
 */
export function find<T>(
    options: FindOptions<T>
): OperatorFunction<T, T | number | undefined> {
    return (source: Observable<T>): Observable<T | number | undefined> => {
        return new Observable<T | number | undefined>((observer) => {
            const { predicate, defaultValue, scheduler, delay, emitIndex, completeOnFind = true } = options;
            
            let index = 0;
            let found = false;
            let completed = false;
            
            const subscription = source.subscribe({
                next: (value: T) => {
                    const currentIndex = index++;
                    
                    if (!found) {
                        try {
                            const matches = predicate(value, currentIndex);
                            
                            if (matches) {
                                found = true;
                                
                                const emitResult = (): void => {
                                    observer.next(emitIndex ? currentIndex : value);
                                    
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
                    
                    if (!found) {
                        const emitDefault = (): void => {
                            observer.next(emitIndex ? -1 : defaultValue);
                            observer.complete();
                        };
                        
                        if (scheduler) {
                            scheduler.schedule(emitDefault, delay);
                        } else {
                            emitDefault();
                        }
                    } else if (!completeOnFind) {
                        // If we found a value but didn't complete, complete now
                        observer.complete();
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