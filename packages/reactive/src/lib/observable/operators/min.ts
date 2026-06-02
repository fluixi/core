import { AsyncScheduler, Comparator, EmptyError, Observable, OperatorFunction } from "@fluixi/reactive";


/**
 * Configuration options for min
 */
export interface MinOptions<T> {
    /**
     * Comparator function that defines the sort order.
     * Should return a negative number if a < b, positive if a > b, zero if equal.
     * 
     * @default (a, b) => a < b ? -1 : a > b ? 1 : 0
     */
    comparator?: Comparator<T>;
    
    /**
     * Default value to emit if source completes without emitting.
     * 
     * @default undefined // Throw on empty
     */
    defaultValue?: T;
    
    /**
     * Error factory for empty source.
     * 
     * @default () => new EmptyError('no elements in sequence')
     */
    errorFactory?: () => any;
    
    /**
     * Scheduler to use for emitting the minimum value.
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
     * Whether to emit the index of the minimum value instead of the value.
     * 
     * @default false
     */
    emitIndex?: boolean;
    
    /**
     * Key selector function to extract comparison key from values.
     * If provided, uses key for comparison instead of direct value comparison.
     * 
     * @default undefined // Compare values directly
     */
    keySelector?: (value: T) => any;
}

/**
 * Emits the minimum value (according to a comparator) from the source Observable.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {MinOptions<T>} [options] Configuration options.
 * @returns {OperatorFunction<T, T | number>} An operator function.
 * 
 * @example
 * // Simple min of numbers
 * fromArrayLike([5, 2, 8, 1, 9]).pipe(min()).subscribe(console.log); // 1
 * 
 * @example
 * // Min with custom comparator
 * fromArrayLike(['apple', 'banana', 'cherry']).pipe(
 *   min({ comparator: (a, b) => a.length - b.length })
 * ).subscribe(console.log); // 'apple' (shortest)
 * 
 * @example
 * // Min with key selector
 * interface Person { name: string; age: number; }
 * fromArrayLike([
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 *   { name: 'Charlie', age: 35 }
 * ]).pipe(
 *   min({ keySelector: p => p.age })
 * ).subscribe(console.log); // { name: 'Bob', age: 25 }
 * 
 * @performance
 * - O(1) memory per emission (only stores current min)
 * - Efficient comparator/keySelector usage
 * - Early error detection for empty sequences
 * - No unnecessary value copying
 */
export function min<T>(
    options?: MinOptions<T>
): OperatorFunction<T, T | number> {
    return (source: Observable<T>): Observable<T | number> => {
        return new Observable<T | number>((observer) => {
            const comparator = options?.comparator || 
                ((a: any, b: any) => a < b ? -1 : a > b ? 1 : 0);
            const defaultValue = options?.defaultValue;
            const errorFactory = options?.errorFactory || 
                (() => new EmptyError('no elements in sequence'));
            const scheduler = options?.scheduler;
            const delay = options?.delay ?? 0;
            const emitIndex = options?.emitIndex ?? false;
            const keySelector = options?.keySelector;
            
            let index = 0;
            let minValue: T | undefined;
            let minIndex = -1;
            let minKey: any;
            let hasValue = false;
            let completed = false;
            
            const subscription = source.subscribe({
                next: (value: T) => {
                    const currentIndex = index++;
                    
                    if (!hasValue) {
                        // First value
                        minValue = value;
                        minIndex = currentIndex;
                        minKey = keySelector ? keySelector(value) : value;
                        hasValue = true;
                    } else {
                        // Compare with current min
                        let comparison: number;
                        
                        if (keySelector) {
                            const currentKey = keySelector(value);
                            comparison = comparator(currentKey, minKey);
                        } else {
                            comparison = comparator(value, minValue!);
                        }
                        
                        if (comparison < 0) {
                            // New minimum
                            minValue = value;
                            minIndex = currentIndex;
                            minKey = keySelector ? keySelector(value) : value;
                        }
                    }
                },
                error: (err: unknown) => observer.error(err),
                complete: () => {
                    completed = true;
                    
                    const emitResult = (): void => {
                        if (hasValue) {
                            observer.next(emitIndex ? minIndex : minValue!);
                        } else if (defaultValue !== undefined) {
                            observer.next(emitIndex ? -1 : defaultValue);
                        } else {
                            try {
                                const error = errorFactory();
                                observer.error(error);
                            } catch (err) {
                                observer.error(err);
                            }
                            return;
                        }
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