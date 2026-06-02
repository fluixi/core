import { Observable, OperatorFunction } from "@fluixi/reactive";

/**
* Takes values from the source Observable until a specified condition is met.
* 
* @template T - The type of values emitted by the source Observable
* @param {function(value: T, index: number): boolean} predicate - Condition to stop taking values
* @param {boolean} [inclusive=false] - Whether to include the value that triggered the condition
* @returns {OperatorFunction<T, T>} Operator that takes values until condition is met
* 
* @example
* // Take values until a negative number appears
* of(1, 2, 3, -1, 4, 5).pipe(
*   takeUntilValue(x => x < 0)
* ).subscribe(value => console.log(value));
* // Output: 1, 2, 3
* 
* @example
* // Take values including the one that triggered the condition
* of(1, 2, 3, -1, 4, 5).pipe(
*   takeUntilValue(x => x < 0, true)
* ).subscribe(value => console.log(value));
* // Output: 1, 2, 3, -1
*/
export function takeUntilValue<T>(
   predicate: (value: T, index: number) => boolean,
   inclusive: boolean = false
): OperatorFunction<T, T> {
   return (source: Observable<T>) => new Observable<T>(subscriber => {
       let index = 0;
       let completed = false;
       
       const subscription = source.subscribe({
           next: (value: T) => {
               if (completed) {
                   return;
               }
               
               const shouldStop = predicate(value, index++);
               
               if (!shouldStop) {
                   subscriber.next(value);
               } else {
                   if (inclusive) {
                       subscriber.next(value);
                   }
                   subscriber.complete();
                   subscription.unsubscribe();
                   completed = true;
               }
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