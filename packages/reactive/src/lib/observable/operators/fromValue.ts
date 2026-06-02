import {Observable, type SchedulerLike} from '@fluixi/reactive'

/**
 * Creates an Observable that emits a single value and then completes.
 * 
 * This is a specialized version of `of` optimized for single values.
 * It's useful when you need to create an Observable from a single
 * value and want to be explicit about it.
 * 
 * @overload
 * @template T - The type of the value to emit
 * @param {T} value - The single value to emit
 * @returns {Observable<T>} Observable that emits the value and completes
 * 
 * @overload
 * @template T - The type of the value to emit
 * @param {T} value - The single value to emit
 * @param {SchedulerLike} scheduler - Optional scheduler to use for emission
 * @returns {Observable<T>} Observable that emits the value on the scheduler
 * 
 * @example
* // Simple single value
* fromValue(42).subscribe(value => {
*   console.log(value); // Output: 42
* });
* 
* @example
* // With error handling
* fromValue(null).pipe(
*   map(val => val.toUpperCase()) // Will throw
* ).subscribe({
*   error: err => console.error('Error:', err)
* });
* 
* @example
* // Use as a starting point for operators
* fromValue('initial').pipe(
*   mergeMap(val => fetch(`/api/${val}`))
* ).subscribe(response => {
*   console.log(response);
* });
* 
* @example
* // Async scheduler example
* fromValue('delayed', asyncScheduler).subscribe(val => {
*   console.log(val); // Emitted asynchronously
* });
* 
* @see of - For multiple values
* @see from - For complex conversions
*/
export function fromValue<T>(value: T): Observable<T>;
export function fromValue<T>(value: T, scheduler: SchedulerLike): Observable<T>;
export function fromValue<T>(
   value: T,
   scheduler?: SchedulerLike
): Observable<T> {
   return new Observable<T>(subscriber => {
       const emit = () => {
           subscriber.next(value);
           subscriber.complete();
       };
       
       if (scheduler && isScheduler(scheduler)) {
           const subscription = scheduler.schedule(emit);
        //    subscriber.add(subscription);
           return subscription;
       } else {
           emit();
       }
       
       return () => {};
   });
}

/**
* Type guard to check if a value is a Scheduler.
* 
* @param {any} value - The value to check
* @returns {value is SchedulerLike} True if the value is a scheduler
* 
* @private
*/
function isScheduler(value: any): value is SchedulerLike {
   return value && typeof value.schedule === 'function';
}