import { from, Observable, ObservableInput, OperatorFunction } from "@fluixi/reactive";

/**
 * Takes values until a notifier Observable emits a value.
 * 
 * @template T - The type of values emitted by the source Observable
 * @template O - The type of the notifier Observable
 * @param {ObservableInput<O>} notifier - Observable that signals when to stop
 * @returns {OperatorFunction<T, T>} Operator that takes values until notifier emits
 * 
 * @example
* // Take values until a button is clicked
* interval(1000).pipe(
*   takeUntil(fromEvent(button, 'click'))
* ).subscribe(value => console.log(value));
*/
export function takeUntil<T, O>(
   notifier: ObservableInput<O>
): OperatorFunction<T, T> {
   return (source: Observable<T>) => new Observable<T>(subscriber => {
       let completed = false;
       
       // Subscribe to notifier
       const notifier$ = from(notifier);
       const notifierSubscription = notifier$.subscribe({
           next: () => {
               if (!completed) {
                   completed = true;
                   subscriber.complete();
                   // Unsubscribe from source
                   sourceSubscription.unsubscribe();
               }
           },
           error: (err: any) => {
               if (!completed) {
                   completed = true;
                   subscriber.error(err);
               }
           },
           complete: () => {
               // Notifier completed without emitting - continue taking values
           }
       });
       
       // Subscribe to source
       const sourceSubscription = source.subscribe({
           next: (value: T) => {
               if (!completed) {
                   subscriber.next(value);
               }
           },
           error: (err: any) => {
               if (!completed) {
                   completed = true;
                   notifierSubscription.unsubscribe();
                   subscriber.error(err);
               }
           },
           complete: () => {
               if (!completed) {
                   completed = true;
                   notifierSubscription.unsubscribe();
                   subscriber.complete();
               }
           }
       });
       
       // Return cleanup function
       return () => {
           sourceSubscription.unsubscribe();
           notifierSubscription.unsubscribe();
       };
   });
}