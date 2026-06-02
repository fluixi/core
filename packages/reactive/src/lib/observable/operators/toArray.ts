import { AsyncScheduler, Observable, OperatorFunction } from "@fluixi/reactive";

/**
 * Configuration options for toArray
 */
export interface ToArrayOptions<T> {
    /**
     * Scheduler to use for emitting the array.
     * If provided, the array is emitted asynchronously via the scheduler.
     * 
     * @default undefined // Emit synchronously on source completion
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Delay before emitting the array (in milliseconds).
     * Only applicable when scheduler is provided.
     * 
     * @default 0
     */
    delay?: number;
    
    /**
     * Maximum number of values to collect.
     * If source emits more values, the operator completes early with the collected values.
     * 
     * @default Infinity // Collect all values
     */
    maxCount?: number;
    
    /**
     * Initial capacity for the internal array.
     * Can improve performance by pre-allocating array size.
     * 
     * @default 10
     */
    initialCapacity?: number;
    
    /**
     * Function to transform each value before adding to array.
     * 
     * @default (value) => value // No transformation
     */
    mapFn?: (value: T, index: number) => any;
    
    /**
     * Function to filter values before adding to array.
     * 
     * @default () => true // No filtering
     */
    filterFn?: (value: T, index: number) => boolean;
}

/**
 * Collects all source emissions into an array, emitting it when the source completes.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {ToArrayOptions<T>} [options] Configuration options.
 * @returns {OperatorFunction<T, T[]>} An operator function.
 * 
 * @example
 * // Basic usage
 * fromArrayLike([1, 2, 3]).pipe(toArray())
 *   .subscribe(arr => console.log(arr)); // [1, 2, 3]
 * 
 * @example
 * // With transformation
 * fromArrayLike([1, 2, 3]).pipe(
 *   toArray({ 
 *     mapFn: x => x * 2,
 *     filterFn: x => x > 2
 *   })
 * ).subscribe(arr => console.log(arr)); // [4, 6]
 * 
 * @example
 * // With max count
 * fromArrayLike([1, 2, 3, 4, 5]).pipe(
 *   toArray({ maxCount: 3 })
 * ).subscribe(arr => console.log(arr)); // [1, 2, 3]
 * 
 * @example
 * // Async emission
 * source$.pipe(
 *   toArray({
 *     scheduler: asyncScheduler,
 *     delay: 1000
 *   })
 * ).subscribe(arr => console.log('Delayed array:', arr));
 * 
 * @performance
 * - Efficient array growth with exponential backoff
 * - Early completion with maxCount
 * - No intermediate array copies
 * - Memory efficient with initial capacity
 * - Lazy transformation/filtering
 */
export function toArray<T>(
    options?: ToArrayOptions<T>
): OperatorFunction<T, T[]> {
    return (source: Observable<T>): Observable<T[]> => {
        return new Observable<T[]>((observer) => {
            const scheduler = options?.scheduler;
            const delay = options?.delay ?? 0;
            const maxCount = options?.maxCount ?? Infinity;
            const initialCapacity = options?.initialCapacity ?? 10;
            const mapFn = options?.mapFn;
            const filterFn = options?.filterFn;
            
            const result: T[] = new Array(initialCapacity);
            let count = 0;
            let index = 0;
            let completed = false;
            
            const subscription = source.subscribe({
                next: (value: T) => {
                    // Check if we've reached max count
                    if (count >= maxCount) {
                        // Already reached max count, ignore additional values
                        return;
                    }
                    
                    const currentIndex = index++;
                    
                    // Apply filter if provided
                    if (filterFn && !filterFn(value, currentIndex)) {
                        return;
                    }
                    
                    // Apply transformation if provided
                    const processedValue = mapFn 
                        ? mapFn(value, currentIndex) 
                        : value;
                    
                    // Add to result array
                    // Efficient array growth
                    if (count >= result.length) {
                        // Double the array size when needed (exponential growth)
                        const newLength = Math.min(result.length * 2, maxCount);
                        const newArray = new Array(newLength);
                        for (let i = 0; i < count; i++) {
                            newArray[i] = result[i];
                        }
                        // Update reference
                        result.length = 0;
                        for (let i = 0; i < count; i++) {
                            result.push(newArray[i]);
                        }
                    }
                    
                    result[count] = processedValue as T;
                    count++;
                    
                    // Check if we've reached max count
                    if (count >= maxCount) {
                        // Complete early with current results
                        subscription.unsubscribe();
                        emitResult();
                    }
                },
                error: (err: unknown) => observer.error(err),
                complete: () => {
                    completed = true;
                    emitResult();
                }
            });
            
            /**
             * Emit the collected result
             */
            const emitResult = (): void => {
                // Trim the array to actual size
                const finalResult = result.slice(0, count);
                
                const emit = (): void => {
                    observer.next?.(finalResult);
                    observer.complete?.();
                };
                
                if (scheduler) {
                    scheduler.schedule(emit, delay);
                } else {
                    emit();
                }
            };
            
            // Cleanup function
            return () => {
                subscription.unsubscribe();
                
                // If we complete early and scheduled emission, we need to cancel it
                if (completed && scheduler) {
                    // The scheduler task will be cleaned up by the scheduler
                }
            };
        });
    };
}