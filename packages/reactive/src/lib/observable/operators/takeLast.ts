import { Observable, OperatorFunction } from "@fluixi/reactive";

/**
 * Emits only the last `count` values emitted by the source Observable.
 * 
 * @template T - The type of values emitted by the source Observable
 * @param {number} count - The number of last values to take
 * @returns {OperatorFunction<T, T>} Operator that takes last values
 * 
 * @example
* // Take last 3 values
* of(1, 2, 3, 4, 5).pipe(
*   takeLast(3)
* ).subscribe(value => console.log(value));
* // Output: 3, 4, 5
* 
* @note Only emits when the source completes
* @note If source completes with fewer than count values, emits all values
*/
export function takeLast<T>(
   count: number
): OperatorFunction<T, T> {
   // Validate count
   if (count < 0) {
       throw new Error(`takeLast count cannot be negative (got ${count})`);
   }
   
   if (count === 0) {
       return (source: Observable<T>) => new Observable<T>(subscriber => {
           // Subscribe and ignore all values, complete when source completes
           const subscription = source.subscribe({
               next: () => {
                   // Ignore all values
               },
               error: (err: any) => {
                   subscriber.error(err);
               },
               complete: () => {
                   subscriber.complete();
               }
           });
           
           return subscription;
       });
   }
   
   return (source: Observable<T>) => new Observable<T>(subscriber => {
       const buffer: T[] = [];
       
       const subscription = source.subscribe({
           next: (value: T) => {
               buffer.push(value);
               if (buffer.length > count) {
                   buffer.shift(); // Keep only the last 'count' values
               }
           },
           error: (err: any) => {
               subscriber.error(err);
           },
           complete: () => {
               // Emit all buffered values in order
               for (const value of buffer) {
                   subscriber.next(value);
               }
               subscriber.complete();
           }
       });
       
       return subscription;
   });
}