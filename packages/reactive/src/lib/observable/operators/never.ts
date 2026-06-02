import { Observable } from "@fluixi/reactive/observable";

/**
* Creates an Observable that never emits any items and never completes.
* 
* @returns An Observable that never emits values and never completes.
* 
* @example
* // Create an observable that never emits
* const never$ = never();
* never$.subscribe({
*   next: val => console.log(val), // Never called
*   complete: () => console.log('complete') // Never called
* });
*/
export function never(): Observable<never> {
   return new Observable(() => {});
}
