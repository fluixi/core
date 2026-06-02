import { from, Observable, ObservableInput, OperatorFunction, Subscription } from "@fluixi/reactive";

/**
 * Projects each source value to an Observable, then ignores new source values while the current projected
 * Observable has not yet completed.
 * 
 * @template T - The type of values emitted by the source Observable
 * @template R - The type of values emitted by the projected Observables
 * @param {function(value: T, index: number): ObservableInput<R>} project - Projection function
 * @returns {OperatorFunction<T, R>} Operator that ignores new values while inner Observable is active
 * 
 * @example
* // Ignore new clicks while processing current click
* fromEvent(button, 'click').pipe(
*   exhaustMap(() => 
*     from(fetch('/api/process').then(r => r.json()))
*   )
* ).subscribe(result => {
*   console.log('Process result:', result);
* });
* // If button is clicked multiple times rapidly, only first click is processed
*/
export function exhaustMap<T, R>(
   project: (value: T, index: number) => ObservableInput<R>
): OperatorFunction<T, R> {
   return (source: Observable<T>) => new Observable<R>(subscriber => {
       let innerSubscription: Subscription | null = null;
       let index = 0;
       let completed = false;
       
       const subscription = source.subscribe({
           next: (value: T) => {
               if (!innerSubscription) {
                   let innerObservable: Observable<R>;
                   try {
                       const result = project(value, index++);
                       innerObservable = from(result);
                   } catch (err) {
                       subscriber.error(err);
                       return;
                   }
                   
                   innerSubscription = innerObservable.subscribe({
                       next: (innerValue: R) => subscriber.next(innerValue),
                       error: (err: any) => subscriber.error(err),
                       complete: () => {
                           innerSubscription = null;
                           if (completed) {
                               subscriber.complete();
                           }
                       }
                   });
                //    subscriber.add(innerSubscription);
               }
               // Else: ignore this value while inner subscription is active
           },
           error: (err: any) => subscriber.error(err),
           complete: () => {
               completed = true;
               if (!innerSubscription) {
                   subscriber.complete();
               }
           }
       });
       
       return () => {
           if (innerSubscription) {
               innerSubscription.unsubscribe();
           }
           subscription.unsubscribe();
       };
   });
}