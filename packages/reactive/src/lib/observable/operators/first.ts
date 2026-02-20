import {AsyncScheduler, EmptyError, Observable, OperatorFunction} from "@awc/reactive"

/**
 * Configuration options for first
 */
export interface FirstOptions<T> {
    /**
     * Optional predicate function to filter values.
     * If provided, returns the first value that matches the predicate.
     * 
     * @default undefined // First value
     */
    predicate?: (value: T, index: number) => boolean;
    
    /**
     * Default value to emit if no value matches the predicate.
     * If provided and source completes without matching, emits this value.
     * 
     * @default undefined // Throw on empty
     */
    defaultValue?: T;
    
    /**
     * Error factory for no matching values.
     * 
     * @default () => new EmptyError('no elements in sequence')
     */
    errorFactory?: () => any;
    
    /**
     * Scheduler to use for emitting the value or error.
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
}

/**
 * Emits only the first value (or the first value that matches a predicate) emitted by the source Observable.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {FirstOptions<T>} [options] Configuration options.
 * @returns {OperatorFunction<T, T | number>} An operator function.
 * 
 * @example
 * // First value
 * fromArrayLike([1, 2, 3]).pipe(first()).subscribe(console.log); // 1
 * 
 * @example
 * // With predicate
 * fromArrayLike([1, 2, 3]).pipe(
 *   first({ predicate: x => x > 1 })
 * ).subscribe(console.log); // 2
 * 
 * @example
 * // With default value
 * empty().pipe(
 *   first({ defaultValue: 100 })
 * ).subscribe(console.log); // 100
 * 
 * @example
 * // Emit index
 * fromArrayLike(['a', 'b', 'c']).pipe(
 *   first({ emitIndex: true })
 * ).subscribe(console.log); // 0
 * 
 * @performance
 * - Early unsubscription after first match
 * - Minimal predicate evaluation
 * - Efficient memory usage (no buffering)
 * - Immediate cleanup
 */
export function first<T>(
    options?: FirstOptions<T>
): OperatorFunction<T, T | number> {
    return (source: Observable<T>): Observable<T | number> => {
        return new Observable<T | number>((observer) => {
            const predicate = options?.predicate;
            const defaultValue = options?.defaultValue;
            const errorFactory = options?.errorFactory || 
                (() => new EmptyError('no elements in sequence'));
            const scheduler = options?.scheduler;
            const delay = options?.delay ?? 0;
            const emitIndex = options?.emitIndex ?? false;
            
            let index = 0;
            let found = false;
            let completed = false;
            
            const subscription = source.subscribe({
                next: (value: T) => {
                    const currentIndex = index++;
                    
                    // Check if value matches predicate (if any)
                    const matches = predicate 
                        ? predicate(value, currentIndex)
                        : true;
                    
                    if (matches && !found) {
                        found = true;
                        
                        const emitValue = (): void => {
                            observer.next(emitIndex ? currentIndex : value);
                            observer.complete();
                        };
                        
                        if (scheduler) {
                            scheduler.schedule(emitValue, delay);
                        } else {
                            emitValue();
                        }
                        
                        // Unsubscribe immediately to prevent further emissions
                        subscription.unsubscribe();
                    }
                },
                error: (err: unknown) => {
                    observer.error(err);
                },
                complete: () => {
                    completed = true;
                    
                    if (!found) {
                        const handleNoMatch = (): void => {
                            if (defaultValue !== undefined) {
                                observer.next(emitIndex ? -1 : defaultValue);
                                observer.complete();
                            } else {
                                try {
                                    const error = errorFactory();
                                    observer.error(error);
                                } catch (err) {
                                    observer.error(err);
                                }
                            }
                        };
                        
                        if (scheduler) {
                            scheduler.schedule(handleNoMatch, delay);
                        } else {
                            handleNoMatch();
                        }
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