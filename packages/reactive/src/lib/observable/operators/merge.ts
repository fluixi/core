import { from, Observable, ObservableInput, OperatorFunction, Subscription } from "@awc/reactive";

/**
 * Creates an output Observable which concurrently emits all values from every given input Observable.
 * 
 * `merge` subscribes to each given input Observable (either as multiple arguments or as an array)
 * and simply forwards all values from all the input Observables to the output Observable.
 * The output Observable only completes when all input Observables have completed.
 * Any error delivered by an input Observable will be immediately emitted on the output Observable.
 * 
 * @overload
 * @returns {Observable<never>} An empty Observable that completes immediately
 * 
 * @overload
 * @template T - The type of values emitted by the Observables
 * @param {ObservableInput<T>} source1 - First Observable to merge
 * @returns {Observable<T>} Observable that emits values from source1
 * 
 * @overload
 * @template T1, T2 - Types of values from different Observables
 * @param {ObservableInput<T1>} source1 - First Observable
 * @param {ObservableInput<T2>} source2 - Second Observable
 * @returns {Observable<T1 | T2>} Observable that merges values from both
 * 
 * @overload
 * @template T1, T2, T3 - Types of values from different Observables
 * @param {ObservableInput<T1>} source1 - First Observable
 * @param {ObservableInput<T2>} source2 - Second Observable
 * @param {ObservableInput<T3>} source3 - Third Observable
 * @returns {Observable<T1 | T2 | T3>} Observable that merges values from all
 * 
 * @overload
 * @template T - The type of values emitted by the Observables
 * @param {...ObservableInput<T>[]} sources - Multiple Observables to merge
 * @returns {Observable<T>} Observable that merges values from all sources
 * 
 * @overload
 * @template T - The type of values emitted by the Observables
 * @param {ObservableInput<T>[]} sources - Array of Observables to merge
 * @returns {Observable<T>} Observable that merges values from all sources
 * 
 * @overload
 * @template T - The type of values emitted by the Observables
 * @param {number} concurrent - Maximum number of Observables to subscribe to concurrently
 * @param {...ObservableInput<T>[]} sources - Observables to merge with concurrency limit
 * @returns {Observable<T>} Observable that merges values with concurrency control
 * 
 * @example
* // Merge two Observables
* const timer1 = interval(1000).pipe(take(2));
* const timer2 = interval(2000).pipe(take(2));
* merge(timer1, timer2).subscribe(value => console.log(value));
* // Output: 0 (timer1), 0 (timer2), 1 (timer1), 1 (timer2) - interleaved
* 
* @example
* // Merge multiple Observables of different types
* merge(
*   of('hello'),
*   of(42),
*   of(true)
* ).subscribe(value => console.log(typeof value, value));
* // Output: string hello, number 42, boolean true
* 
* @example
* // Merge array of Observables
* const sources = [
*   interval(1000).pipe(map(() => 'A'), take(3)),
*   interval(1500).pipe(map(() => 'B'), take(2)),
*   interval(2000).pipe(map(() => 'C'), take(1))
* ];
* merge(sources).subscribe(value => console.log(value));
* 
* @example
* // Merge with concurrency control
* merge(
*   2, // Only 2 concurrent subscriptions
*   timer(0, 1000).pipe(map(() => 'Fast'), take(5)),
*   timer(0, 2000).pipe(map(() => 'Medium'), take(3)),
*   timer(0, 3000).pipe(map(() => 'Slow'), take(2))
* ).subscribe(value => console.log(value));
* // Only 'Fast' and 'Medium' start immediately, 'Slow' waits
* 
* @example
* // Merge with error handling
* merge(
*   of(1, 2, 3),
*   throwError(() => new Error('Failed')),
*   of(4, 5, 6)
* ).subscribe({
*   next: value => console.log(value),
*   error: err => console.error('Error:', err.message)
* });
* // Output: 1, 2, 3, Error: Failed
* 
* @example
* // Empty merge
* merge().subscribe({
*   complete: () => console.log('Nothing to merge')
* });
* 
* @note All input Observables are subscribed to immediately (or up to concurrent limit)
* @note Output completes only when all input Observables have completed
* @note Errors from any input Observable immediately propagate to output
*/
export function merge(): Observable<never>;
export function merge<T>(source1: ObservableInput<T>): Observable<T>;
export function merge<T1, T2>(source1: ObservableInput<T1>, source2: ObservableInput<T2>): Observable<T1 | T2>;
export function merge<T1, T2, T3>(source1: ObservableInput<T1>, source2: ObservableInput<T2>, source3: ObservableInput<T3>): Observable<T1 | T2 | T3>;
export function merge<T1, T2, T3, T4>(source1: ObservableInput<T1>, source2: ObservableInput<T2>, source3: ObservableInput<T3>, source4: ObservableInput<T4>): Observable<T1 | T2 | T3 | T4>;
export function merge<T>(...sources: ObservableInput<T>[]): Observable<T>;
export function merge<T>(...args: (ObservableInput<T> | number | ObservableInput<T>[])[]): Observable<T>;

export function merge<T>(...args: (ObservableInput<T> | number | ObservableInput<T>[])[]): Observable<T> {
    // Handle empty arguments
    if (args.length === 0) {
        return new Observable<never>(subscriber => {
            subscriber.complete();
        });
    }
    
    // Extract concurrent parameter if first argument is a number
    let concurrent = Infinity;
    let startIndex = 0;
    
    if (typeof args[0] === 'number') {
        concurrent = args[0] as number;
        if (concurrent < 1) {
            throw new Error('concurrent must be >= 1');
        }
        startIndex = 1;
    }
    
    // Collect all sources
    const sources: ObservableInput<T>[] = [];
    
    for (let i = startIndex; i < args.length; i++) {
        const arg = args[i];
        if (Array.isArray(arg)) {
            sources.push(...(arg as ObservableInput<T>[]));
        } else {
            sources.push(arg as ObservableInput<T>);
        }
    }
    
    // Handle case where only concurrent was specified
    if (sources.length === 0) {
        return new Observable<never>(subscriber => {
            subscriber.complete();
        });
    }
    
    // Single source optimization
    if (sources.length === 1) {
        return from(sources[0]);
    }
    
    return new Observable<T>(subscriber => {
        let completedCount = 0;
        let activeCount = 0;
        let index = 0;
        const subscriptions: Subscription[] = [];
        const pending: ObservableInput<T>[] = [];
        
        // Function to subscribe to next source
        const subscribeNext = () => {
            // Check if we can subscribe (concurrent limit)
            if (activeCount >= concurrent) {
                return;
            }
            
            // Get next source
            let source: ObservableInput<T>;
            if (index < sources.length) {
                source = sources[index++];
            } else if (pending.length > 0) {
                source = pending.shift()!;
            } else {
                return; // No more sources
            }
            
            activeCount++;
            
            const observable = from(source);
            const subscription = observable.subscribe({
                next: (value: T) => {
                    subscriber.next(value);
                },
                error: (err: any) => {
                    // Unsubscribe all on error
                    subscriptions.forEach(sub => sub.unsubscribe());
                    subscriber.error(err);
                },
                complete: () => {
                    activeCount--;
                    completedCount++;
                    
                    // Check if all sources completed
                    if (completedCount === sources.length) {
                        subscriber.complete();
                    } else {
                        // Try to subscribe to next source
                        subscribeNext();
                    }
                }
            });
            
            subscriptions.push(subscription);
            // subscriber.add(subscription);
        };
        
        // Start initial subscriptions (up to concurrent limit)
        const initialSubscriptions = Math.min(concurrent, sources.length);
        for (let i = 0; i < initialSubscriptions; i++) {
            subscribeNext();
        }
        
        // Buffer remaining sources
        for (let i = initialSubscriptions; i < sources.length; i++) {
            pending.push(sources[i]);
        }
        
        // Return cleanup function
        return () => {
            subscriptions.forEach(sub => sub.unsubscribe());
        };
    });
}

/**
* Specialized merge operator that merges inner Observables as they arrive.
* This is the operator version of merge, used in `pipe()`.
* 
* @template T - The type of values emitted by the source Observable
* @template R - The type of values emitted by the inner Observables
* @param {...ObservableInput<R>[]} innerSources - Inner Observables to merge with source
* @returns {OperatorFunction<T, T | R>} Operator that merges source with inner Observables
*/
export function mergeWith<T, R extends T>(...innerSources: ObservableInput<R>[]): OperatorFunction<T, T | R> {
   return (source: Observable<T>) => new Observable<T | R>(subscriber => {
       const allSources = [source, ...innerSources];
       const subscription = merge(...allSources).subscribe(subscriber);
       return subscription;
   });
}

/**
* Creates an Observable that merges a variable number of Observables by taking
* values from the source Observable that triggers first, then moving to the next.
* 
* @template T - The type of values emitted by the Observables
* @param {number} concurrent - Number of Observables to merge concurrently
* @returns {(...sources: ObservableInput<T>[]) => Observable<T>} Function that merges sources
*/
export function mergeAll<T>(concurrent: number = Infinity): (...sources: ObservableInput<T>[]) => Observable<T> {
   return (...sources: ObservableInput<T>[]) => merge(concurrent, ...sources);
}