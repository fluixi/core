import {  Observable, OperatorFunction, SchedulerLike } from "@fluixi/reactive";

/**
 * Emits only the first `count` values emitted by the source Observable.
 * 
 * `take` returns an Observable that emits only the first `count` values emitted by the source Observable.
 * If the source emits fewer than `count` values, then all of its values are emitted.
 * After `count` values (or when the source completes), the output Observable completes.
 * 
 * @template T - The type of values emitted by the source Observable
 * 
 * @overload
 * @param {number} count - The maximum number of values to emit
 * @returns {OperatorFunction<T, T>} An operator that takes the first `count` values
 * 
 * @overload
 * @template U - The type of this context
 * @param {number} count - The maximum number of values to emit
 * @param {U} thisArg - Optional context for the operator
 * @returns {OperatorFunction<T, T>} An operator with context binding
 * 
 * @example
* // Take the first 5 values
* interval(1000).pipe(take(5)).subscribe(value => console.log(value));
* // Output: 0, 1, 2, 3, 4 (then completes)
* 
* @example
* // Take the first value (like first())
* fromEvent(document, 'click').pipe(take(1)).subscribe(() => {
*   console.log('Clicked once');
* });
* 
* @example
* // Take from a finite Observable
* of(1, 2, 3, 4, 5).pipe(take(3)).subscribe(value => console.log(value));
* // Output: 1, 2, 3
* 
* @example
* // Take more values than available
* of(1, 2, 3).pipe(take(10)).subscribe({
*   next: value => console.log(value),
*   complete: () => console.log('Source completed early')
* });
* // Output: 1, 2, 3, Source completed early
* 
* @example
* // Take zero values
* of(1, 2, 3).pipe(take(0)).subscribe({
*   complete: () => console.log('Completed immediately')
* });
* // Output: Completed immediately
* 
* @example
* // Error handling
* throwError(() => new Error('Source error')).pipe(
*   take(5)
* ).subscribe({
*   error: err => console.error('Error:', err.message)
* });
* // Output: Error: Source error
* 
* @example
* // With scheduler (for testing)
* const testScheduler = new TestScheduler();
* of(1, 2, 3, 4, 5).pipe(
*   take(3, testScheduler)
* ).subscribe(value => console.log(value));
* 
* @note If `count` is 0, the result is an empty Observable that completes immediately
* @note If `count` is negative, an error is thrown
* @note If the source errors before `count` values, the error propagates immediately
*/
export function take<T>(
   count: number
): OperatorFunction<T, T>;

export function take<T, U>(
   count: number,
   thisArg: U
): OperatorFunction<T, T>;

export function take<T>(
   count: number,
   scheduler?: SchedulerLike
): OperatorFunction<T, T>;

export function take<T>(
    count: number
): OperatorFunction<T, T> {
    // Validate count
    if (count < 0) {
        throw new Error(`take count cannot be negative (got ${count})`);
    }
    
    return (source: Observable<T>) => new Observable<T>(subscriber => {
        let taken = 0;
        
        const subscription = source.subscribe({
            next: (value: T) => {
                if (taken++ < count) {
                    subscriber.next(value);
                    if (taken >= count) {
                        subscriber.complete();
                        subscription.unsubscribe();
                    }
                }
            },
            error: (err: any) => {
                subscriber.error(err);
            },
            complete: () => {
                subscriber.complete();
            }
        });
        
        // If count is 0, complete immediately
        if (count === 0) {
            subscriber.complete();
            subscription.unsubscribe();
        }
        
        return subscription;
    });
}