import { from, Observable, ObservableInput, ObservedValueOf, OperatorFunction, Subscription } from "@fluixi/reactive";

/**
 * Dictionary (object) type where all values are ObservableInputs.
 * Used for the object form of mergeMap when dealing with dictionaries.
 * 
 * @template T - The type of values in the dictionary
 */
export type ObservableInputDictionary<T> = {
    [K in keyof T]: ObservableInput<T[K]>;
};

/**
 * Extracts value types from a dictionary of ObservableInputs.
 * 
 * @template O - Dictionary type
 */
export type ObservedValueDictionary<O extends Record<string, ObservableInput<any>>> = {
    [K in keyof O]: ObservedValueOf<O[K]>;
};

/**
 * Type representing the result of a mergeMap operation when using a result selector.
 * 
 * @template T - The type of values emitted by the source Observable
 * @template I - The type of values emitted by the inner Observable
 * @template R - The type of values emitted after applying the result selector
 */
export type MergeMapResult<T, I, R> = {
    outerValue: T;
    innerValue: I;
    outerIndex: number;
    innerIndex: number;
};

/**
 * Configuration options for mergeMap.
 * 
 * @interface MergeMapConfig
 * @property {number} [concurrent=Infinity] - Maximum concurrent inner subscriptions
 * @property {boolean} [bufferWhenFull=true] - Whether to buffer values when at concurrency limit
 * @property {'error'|'complete'|'ignore'} [onOverflow='buffer'] - What to do when buffer is full
 * @property {number} [bufferSize=Infinity] - Maximum buffer size when concurrent limit reached
 */
export interface MergeMapConfig {
    concurrent?: number;
    bufferWhenFull?: boolean;
    onOverflow?: 'error' | 'complete' | 'ignore' | 'buffer';
    bufferSize?: number;
}

/**
 * Projects each source value to an Observable which is merged in the output Observable.
 * 
 * `mergeMap` (also known as `flatMap`) is one of the most powerful and commonly used operators.
 * It's used for:
 * - Flattening nested Observables
 * - Making concurrent API calls
 * - Handling asynchronous operations that return Observables
 * - Implementing search-as-you-type functionality
 * 
 * @template T - The type of values emitted by the source Observable
 * @template R - The type of values emitted by the projected Observables
 * @template I - The type of values emitted by the inner Observable (when using result selector)
 * 
 * @overload
 * @param {function(value: T, index: number): ObservableInput<R>} project - Projection function
 * @returns {OperatorFunction<T, R>} Operator that merges projected Observables
 * 
 * @overload
 * @param {function(value: T, index: number): ObservableInput<R>} project - Projection function
 * @param {number} concurrent - Maximum number of input Observables being subscribed to concurrently
 * @returns {OperatorFunction<T, R>} Operator with concurrency control
 * 
 * @overload
 * @param {function(value: T, index: number): ObservableInput<I>} project - Projection function
 * @param {function(outerValue: T, innerValue: I, outerIndex: number, innerIndex: number): R} resultSelector - Result selector
 * @param {number} [concurrent] - Maximum concurrent inner subscriptions
 * @returns {OperatorFunction<T, R>} Operator with result selector
 * 
 * @overload
 * @param {ObservableInput<R>} innerObservable - Inner Observable to map to
 * @returns {OperatorFunction<T, R>} Operator that maps to a constant inner Observable
 * 
 * @example
* // Basic mergeMap - flatten inner Observables
* of('a', 'b', 'c').pipe(
*   mergeMap(letter => of(1, 2).pipe(
*     map(num => letter + num)
*   ))
* ).subscribe(result => console.log(result));
* // Output: a1, a2, b1, b2, c1, c2 (may be interleaved due to merging)
*/
export function mergeMap<T, R>(
    project: (value: T, index: number) => ObservableInput<R>
): OperatorFunction<T, R>;
export function mergeMap<T, R>(
    project: (value: T, index: number) => ObservableInput<R>,
    config: MergeMapConfig | number
): OperatorFunction<T, R>;
export function mergeMap<T, R>(
    project: (value: T, index: number) => ObservableInput<R>,
    config: MergeMapConfig | number = {concurrent: Infinity}
): OperatorFunction<T, R> {
    let concurrent: number = Infinity;
    if(typeof config === 'number') {
        concurrent = config;
    }else{
        concurrent = config.concurrent || Infinity;
    }
    return (source: Observable<T>) => new Observable<R>(subscriber => {
        // State management
        let completed = false;
        let active = 0;
        let index = 0;
        const buffer: { value: T; index: number }[] = [];
        const innerSubscriptions = new Set<Subscription>();
        
        // Function to process buffered values
        const processBuffer = () => {
            while (buffer.length > 0 && active < concurrent) {
                const nextBuffered = buffer.shift()!;
                processValue(nextBuffered.value, nextBuffered.index);
            }
        };
        
        // Function to handle value processing
        const processValue = (value: T, currentIndex: number) => {
            try {
                // Get the ObservableInput from projection
                const result = project(value, currentIndex);
                
                // Convert to Observable using the enhanced `from` function
                // This now properly handles iterator factory functions
                const innerObservable = from(result);
                
                // Increment active count
                active++;
                
                // Track inner index for this subscription
                // let innerIndex = 0;
                
                // Subscribe to inner Observable
                const innerSubscription = innerObservable.subscribe({
                    next: (innerValue: R) => {
                        subscriber.next(innerValue);
                    },
                    error: (err: any) => {
                        // Error in inner Observable
                        subscriber.error(err);
                    },
                    complete: () => {
                        // Remove this inner subscription
                        innerSubscriptions.delete(innerSubscription);
                        active--;
                        
                        // Check if we should process next buffered value
                        processBuffer();
                        
                        // Check if source is completed and no active inner subscriptions
                        if (completed && active === 0) {
                            subscriber.complete();
                        }
                    }
                });
                
                // Track inner subscription for cleanup
                innerSubscriptions.add(innerSubscription);
                // subscriber.add(innerSubscription);
                
            } catch (err) {
                // Error in projection function
                subscriber.error(err);
            }
        };
        
        // Main subscription to source
        const subscription = source.subscribe({
            next: (value: T) => {
                const currentIndex = index++;
                
                if (active < concurrent) {
                    // We have capacity, process immediately
                    processValue(value, currentIndex);
                } else {
                    // Buffer for later processing
                    buffer.push({ value, index: currentIndex });
                }
            },
            error: (err: any) => {
                // Clean up all inner subscriptions
                innerSubscriptions.forEach(sub => sub.unsubscribe());
                subscriber.error(err);
            },
            complete: () => {
                completed = true;
                
                // If no active inner subscriptions, complete immediately
                if (active === 0) {
                    subscriber.complete();
                }
                // Otherwise, completion will happen when all inner subscriptions complete
            }
        });
        
        // Add source subscription for cleanup
        // subscriber.add(subscription);
        
        // Return cleanup function
        return () => {
            // Unsubscribe from all inner subscriptions
            innerSubscriptions.forEach(sub => sub.unsubscribe());
            innerSubscriptions.clear();
        };
    });
}


