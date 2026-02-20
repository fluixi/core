import { Observable } from "../observable.js";

/**
 * Creates an Observable that emits the provided arguments in sequence and then completes.
 * 
 * This is a creation operator that converts a list of values into an Observable sequence.
 * It's particularly useful for creating Observables from known values or combining
 * with other operators in a pipeline.
 * 
 * @overload
 * @returns {Observable<never>} An empty Observable that completes immediately
 * 
 * @overload
 * @template T - The type of values to emit
 * @param {T} value - A single value to emit
 * @returns {Observable<T>} Observable that emits the value and completes
 * 
 * @overload
 * @template T - The type of values to emit
 * @param {T} value1 - First value to emit
 * @param {T} value2 - Second value to emit
 * @returns {Observable<T>} Observable that emits both values and completes
 * 
 * @overload
 * @template T - The type of values to emit
 * @param {...T[]} values - Multiple values to emit
 * @returns {Observable<T>} Observable that emits all values and completes
 * 
 * @overload
 * @template T1 - Type of first value
 * @template T2 - Type of second value
 * @param {T1} value1 - First value to emit
 * @param {T2} value2 - Second value to emit
 * @returns {Observable<T1|T2>} Observable that emits both values (different types)
 * 
 * @overload
 * @template Args - Tuple of value types
 * @param {...Args} values - Values of potentially different types
 * @returns {Observable<Args[number]>} Observable that emits all values
 * 
 * @example
* // Emit a sequence of numbers
* of(1, 2, 3).subscribe(
*   value => console.log(value),
*   null,
*   () => console.log('Complete!')
* );
* // Output: 1, 2, 3, Complete!
* 
* @example
* // Emit values of different types
* of('hello', 42, true, { key: 'value' }).subscribe(value => {
*   console.log(typeof value, value);
* });
* // Output: string hello, number 42, boolean true, object { key: 'value' }
* 
* @example
* // Empty observable
* of().subscribe({
*   complete: () => console.log('Nothing to emit')
* });
* 
* @example
* // Use with operators
* of(10, 20, 30).pipe(
*   map(x => x * 2),
*   filter(x => x > 25)
* ).subscribe(console.log); // Output: 30, 40, 60
*/
export function of(): Observable<never>;
export function of<T>(value: T): Observable<T>;
export function of<T>(...values: T[]): Observable<T>;
export function of<T1, T2>(v1: T1, v2: T2): Observable<T1 | T2>;
export function of<T1, T2, T3>(v1: T1, v2: T2, v3: T3): Observable<T1 | T2 | T3>;
export function of<T1, T2, T3, T4>(v1: T1, v2: T2, v3: T3, v4: T4): Observable<T1 | T2 | T3 | T4>;
export function of<T1, T2, T3, T4, T5>(v1: T1, v2: T2, v3: T3, v4: T4, v5: T5): Observable<T1 | T2 | T3 | T4 | T5>;
export function of<T>(...args: T[]): Observable<T>;

export function of<T>(...args: T[]): Observable<T> {
    return new Observable<T>(subscriber => {
        args.forEach(value => {
            subscriber.next(value);
        });
        subscriber.complete();
    });
}