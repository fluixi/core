import { from, Observable, ObservableInput, OperatorFunction, Subscription } from "@awc/reactive";

/**
 * Projects each source value to an Observable, then switches to the new Observable emitting its values.
 * 
 * When a new source value arrives, the previous inner Observable is unsubscribed and the new one is subscribed.
 * 
 * @template T - The type of values emitted by the source Observable
 * @template R - The type of values emitted by the projected Observables
 * @param {function(value: T, index: number): ObservableInput<R>} project - Projection function
 * @returns {OperatorFunction<T, R>} Operator that switches to new projected Observables
 * 
 * @example
* // Cancel previous search when new search term arrives
* fromEvent(searchInput, 'input').pipe(
*   map(event => event.target.value),
*   debounceTime(300),
*   switchMap(query => 
*     from(fetch(`/api/search?q=${query}`).then(r => r.json()))
*   )
* ).subscribe(results => {
*   // Only shows results for latest search term
*   updateResults(results);
* });
*/
export function switchMap<T, R>(
   project: (value: T, index: number) => ObservableInput<R>
): OperatorFunction<T, R> {
   return (source: Observable<T>) => new Observable<R>(subscriber => {
       let innerSubscription: Subscription | null = null;
       let index = 0;
       let completed = false;
       
       const subscription = source.subscribe({
           next: (value: T) => {
               // Unsubscribe previous inner subscription
               if (innerSubscription) {
                   innerSubscription.unsubscribe();
                   innerSubscription = null;
               }
               
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