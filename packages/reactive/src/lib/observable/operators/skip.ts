import { Observable, OperatorFunction } from "@awc/reactive";

/**
 * Skips the first `count` values from the source Observable.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {number} count The number of values to skip.
 * @returns {OperatorFunction<T, T>} An operator function.
 * 
 * @example
* // Skip first 3 values
* source$.pipe(skip(3)).subscribe(console.log);
* 
* @example
* // Skip all values if count >= total emissions
* fromArrayLike([1, 2]).pipe(skip(5)).subscribe({
*   next: () => console.log('Will never execute'),
*   complete: () => console.log('Completed without values')
* });
* 
* @performance
* - O(1) memory usage (only stores count)
* - No buffering of skipped values
* - Minimal overhead per emission
* - Early completion if source completes before skip count
*/
export function skip<T>(count: number): OperatorFunction<T, T> {
   // Validate count
   const skipCount = Math.max(0, Math.floor(count));
   
   return (source: Observable<T>): Observable<T> => {
       // Optimization: if skipping zero items, return source unchanged
       if (skipCount === 0) {
           return source;
       }
       
       return new Observable<T>((observer) => {
           let remaining = skipCount;
           
           const subscription = source.subscribe({
               next: (value: T) => {
                   if (remaining > 0) {
                       // Still skipping values
                       remaining--;
                   } else {
                       // Done skipping, emit value
                       observer.next(value);
                   }
               },
               error: (err) => observer.error(err),
               complete: () => {
                   // Source completed, even if we're still skipping
                   observer.complete();
               }
           });
           
           return () => subscription.unsubscribe();
       });
   };
}


// /**
// * Skips the first `count` values emitted by the source Observable.
// * 
// * @template T The type of values emitted by the source Observable.
// * @param count The number of values to skip.
// * @returns A function that returns an Observable that skips the first `count` values.
// * 
// * @example
// * // Skip the first 2 values
// * of(1, 2, 3, 4, 5).pipe(skip(2))
// *   .subscribe(val => console.log(val));
// * // Output: 3, 4, 5
// */
// export function skip<T>(count: number): OperatorFunction<T, T> {
//    return (source: Observable<T>) => new Observable(subscriber => {
//        let skipped = 0;
//        return source.subscribe({
//            next: value => {
//                if (skipped++ >= count) {
//                    subscriber.next(value);
//                }
//            },
//            error: err => subscriber.error(err),
//            complete: () => subscriber.complete()
//        });
//    });
// }