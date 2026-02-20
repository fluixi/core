import { Observable, OperatorFunction } from "@awc/reactive";

/**
 * Takes the last value emitted by the source Observable before completion.
 * 
 * @template T - The type of values emitted by the source Observable
 * @returns {OperatorFunction<T, T>} Operator that takes the last value
 * 
 * @example
* // Take the last value
* of(1, 2, 3, 4, 5).pipe(
*   last()
* ).subscribe(value => console.log(value));
* // Output: 5
* 
* @note Throws an error if source completes without emitting any values
* @note Optional predicate can be provided to filter values
*/
export function last<T>(
   predicate?: (value: T, index: number, source: Observable<T>) => boolean
): OperatorFunction<T, T> {
   return (source: Observable<T>) => new Observable<T>(subscriber => {
       let lastValue: T | undefined;
       let hasValue = false;
       let index = 0;
       
       const subscription = source.subscribe({
           next: (value: T) => {
               if (!predicate || predicate(value, index++, source)) {
                   lastValue = value;
                   hasValue = true;
               }
           },
           error: (err: any) => {
               subscriber.error(err);
           },
           complete: () => {
               if (hasValue && lastValue !== undefined) {
                   subscriber.next(lastValue);
                   subscriber.complete();
               } else if (predicate) {
                   subscriber.error(new Error('No matching value found'));
               } else {
                   subscriber.error(new Error('No value emitted'));
               }
           }
       });
       
       return subscription;
   });
}