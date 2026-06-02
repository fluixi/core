import { AsyncScheduler, Observable } from "@fluixi/reactive";

/**
 * Array-like or iterable input types for fromArrayLike
 */
export type ArrayLikeInput<T> = 
    | ArrayLike<T> 
    | Iterable<T>
    | { [Symbol.iterator](): Iterator<T> };

/**
 * Configuration options for fromArrayLike
 */
export interface FromArrayLikeOptions {
    /**
     * Scheduler to use for emitting values.
     * If provided, values are emitted asynchronously using the scheduler.
     * 
     * @default undefined // Emit synchronously
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Delay between emitted values when using scheduler (in milliseconds).
     * 
     * @default 0 // No delay between emissions
     */
    delay?: number;
    
    /**
     * Number of times to repeat the array.
     * 
     * @default 1 // Emit once
     */
    repeat?: number;
}

/**
 * Creates an Observable from an array-like or iterable object.
 * Can emit values synchronously or asynchronously via scheduler.
 * 
 * @template T The type of elements in the array-like.
 * 
 * @param {ArrayLikeInput<T>} arrayLike Array, array-like, or iterable to convert.
 * @param {FromArrayLikeOptions} [options] Configuration options.
 * @returns {Observable<T>} Observable that emits each element.
 * 
 * @example
 * // Synchronous emission
 * fromArrayLike([1, 2, 3]).subscribe(console.log); // 1, 2, 3
 * 
 * @example
 * // Asynchronous emission with scheduler
 * fromArrayLike([1, 2, 3], {
 *   scheduler: asyncScheduler,
 *   delay: 1000 // 1 second between values
 * }).subscribe(console.log);
 * 
 * @example
 * // Repeat array multiple times
 * fromArrayLike([1, 2], { repeat: 3 }).subscribe(console.log); // 1, 2, 1, 2, 1, 2
 * 
 * @performance
 * - O(n) time complexity, O(1) auxiliary space
 * - Iterates without creating intermediate arrays
 * - Immediate unsubscription cleanup
 * - Efficient memory usage for large arrays
 */
export function fromArrayLike<T>(
    arrayLike: ArrayLikeInput<T>,
    options?: FromArrayLikeOptions
): Observable<T> {
    return new Observable<T>((observer) => {
        // Handle repeat option
        const repeatCount = options?.repeat ?? 1;
        
        // Create an iterator for the input
        let iterator: Iterator<T>;
        try {
            if (Symbol.iterator in arrayLike) {
                iterator = (arrayLike as Iterable<T>)[Symbol.iterator]();
            } else if ('length' in arrayLike) {
                // Convert ArrayLike to iterator
                const array = arrayLike as ArrayLike<T>;
                let index = 0;
                iterator = {
                    next: () => {
                        if (index < array.length) {
                            return { value: array[index++], done: false };
                        }
                        return { value: undefined, done: true };
                    }
                };
            } else {
                throw new TypeError('Input must be array-like or iterable');
            }
        } catch (err) {
            observer.error(err);
            return;
        }
        
        const scheduler = options?.scheduler;
        const delay = options?.delay ?? 0;
        let currentRepeat = 0;
        let activeSubscription: { unsubscribe: () => void } | undefined;
        let completed = false;
        
        /**
         * Emit the next value from the iterator
         */
        const emitNext = (): void => {
            try {
                const result = iterator.next();
                
                if (result.done) {
                    currentRepeat++;
                    
                    if (currentRepeat >= repeatCount) {
                        // All repetitions complete
                        completed = true;
                        observer.complete();
                        return;
                    }
                    
                    // Reset iterator for next repetition
                    if (Symbol.iterator in arrayLike) {
                        iterator = (arrayLike as Iterable<T>)[Symbol.iterator]();
                    } else {
                        // Reset ArrayLike iterator
                        const array = arrayLike as ArrayLike<T>;
                        let index = 0;
                        iterator = {
                            next: () => {
                                if (index < array.length) {
                                    return { value: array[index++], done: false };
                                }
                                return { value: undefined, done: true };
                            }
                        };
                    }
                    
                    // Continue with next repeat
                    scheduleNext();
                    return;
                }
                
                // Emit the value
                observer.next(result.value);
                
                // Schedule next value if not complete
                if (!completed) {
                    scheduleNext();
                }
            } catch (err) {
                observer.error(err);
            }
        };
        
        /**
         * Schedule the next emission
         */
        const scheduleNext = (): void => {
            if (completed) {
                return;
            }
            
            if (scheduler) {
                // Use scheduler for async emission
                activeSubscription = scheduler.schedule(emitNext, delay);
            } else {
                // Synchronous emission
                emitNext();
            }
        };
        
        // Start emissions
        scheduleNext();
        
        // Cleanup function
        return () => {
            completed = true;
            
            if (activeSubscription) {
                activeSubscription.unsubscribe();
            }
            
            // Ensure iterator is properly cleaned up
            if ('return' in iterator) {
                try {
                    iterator.return?.();
                } catch {
                    // Ignore cleanup errors
                }
            }
        };
    });
}