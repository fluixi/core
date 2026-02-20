import { mergeMap, Observable, ObservableInput, OperatorFunction } from '@awc/reactive'

/**
 * Applies a given projection function to each value emitted by the source Observable,
 * and emits the resulting values as an Observable.
 * 
 * This is one of the most commonly used operators for transforming data in RxJS pipelines.
 * It's similar to Array.prototype.map but for Observables.
 * 
 * @template T - The type of values emitted by the source Observable
 * @template R - The type of values emitted by the projected Observable
 * 
 * @overload
 * @param {function(value: T, index: number): R} project - The projection function
 * @returns {OperatorFunction<T, R>} An operator function that transforms values
 * 
 * @overload
 * @template U - The type of this context
 * @param {function(this: U, value: T, index: number): R} project - The projection function
 * @param {U} [thisArg] - Optional context for the projection function
 * @returns {OperatorFunction<T, R>} An operator function that transforms values
 * 
 * @example
* // Basic transformation
* of(1, 2, 3).pipe(
*   map(x => x * 2)
* ).subscribe(result => console.log(result));
* // Output: 2, 4, 6
* 
* @example
* // Transform with index
* of('a', 'b', 'c').pipe(
*   map((value, index) => `${value}-${index}`)
* ).subscribe(result => console.log(result));
* // Output: 'a-0', 'b-1', 'c-2'
* 
* @example
* // Transform objects
* of(
*   { name: 'Alice', age: 30 },
*   { name: 'Bob', age: 25 }
* ).pipe(
*   map(person => person.name)
* ).subscribe(name => console.log(name));
* // Output: 'Alice', 'Bob'
* 
* @example
* // Using this context
* const multiplier = {
*   factor: 10,
*   transform(x: number) { return x * this.factor; }
* };
* 
* of(1, 2, 3).pipe(
*   map(function(x) { return this.transform(x); }, multiplier)
* ).subscribe(result => console.log(result));
* // Output: 10, 20, 30
* 
* @example
* // Type narrowing with map
* interface User { id: number; name: string; }
* interface AdminUser extends User { isAdmin: true; }
* 
* const users$ = of<User | AdminUser>(
*   { id: 1, name: 'Alice' },
*   { id: 2, name: 'Bob', isAdmin: true }
* );
* 
* users$.pipe(
*   map(user => 'isAdmin' in user ? 'Admin' : 'Regular')
* ).subscribe(type => console.log(type));
* // Output: 'Regular', 'Admin'
* 
* @example
* // Error handling in projection
* of(1, 2, 3).pipe(
*   map(x => {
*     if (x === 2) throw new Error('Invalid value');
*     return x * 10;
*   }),
*   catchError(err => of('Error handled'))
* ).subscribe(result => console.log(result));
* // Output: 10, 'Error handled'
* 
* @note The index passed to the projection function starts at 0 for each subscription
* @note Errors thrown in the projection function are propagated to the error channel
* @note The projection function is called for each emission synchronously by default
*/
export function map<T, R>(
   project: (value: T, index: number) => R
): OperatorFunction<T, R>;

export function map<T, R, U>(
   project: (this: U, value: T, index: number) => R,
   thisArg: U
): OperatorFunction<T, R>;

export function map<T, R>(
   project: (value: T, index: number) => R,
   thisArg?: any
): OperatorFunction<T, R> {
   return (source: Observable<T>) => new Observable<R>(subscriber => {
       let index = 0;
       
       const subscription = source.subscribe({
           next: (value: T) => {
               let result: R;
               try {
                   // Call projection function with proper context
                   result = thisArg 
                       ? project.call(thisArg, value, index++)
                       : project(value, index++);
               } catch (err) {
                   subscriber.error(err);
                   return;
               }
            //    console.log('sub', subscriber)
               subscriber.next?.(result);
           },
           error: (err: any) => {
               subscriber.error(err);
           },
           complete: () => {
               subscriber.complete?.();
           }
       });
       
       return subscription;
   });
}

/**
* Specialized map operator that always returns the same type.
* Useful when you know the transformation doesn't change the type.
* 
* @template T - The type of values (same for input and output)
* @param {function(value: T, index: number): T} project - Transformation function
* @returns {OperatorFunction<T, T>} Operator that transforms values of same type
*/
export function mapToSame<T>(
   project: (value: T, index: number) => T
): OperatorFunction<T, T> {
   return map(project);
}

/**
* Creates an operator that maps every source emission to a constant value.
* 
* @template T - The type of values emitted by the source
* @template R - The type of the constant value to emit
* @param {R} value - The constant value to emit
* @returns {OperatorFunction<T, R>} Operator that maps to constant value
* 
* @example
* // Map all clicks to the same string
* fromEvent(document, 'click').pipe(
*   mapTo('Clicked!')
* ).subscribe(message => console.log(message));
*/
export function mapTo<R>(value: R): OperatorFunction<any, R>;
export function mapTo<T, R>(value: R): OperatorFunction<T, R> {
   return map(() => value);
}

/**
* Maps each source value to an Observable which is merged in the output Observable.
* This is an alias for mergeMap for better readability in certain contexts.
* 
* @template T - The type of values emitted by the source
* @template R - The type of values emitted by the inner Observables
* @param {function(value: T, index: number): ObservableInput<R>} project - Projection function
* @param {number} [concurrent=Infinity] - Maximum number of concurrent inner Observables
* @returns {OperatorFunction<T, R>} Operator that flattens the projection
*/
export function flatMap<T, R>(
   project: (value: T, index: number) => ObservableInput<R>,
   concurrent: number = Infinity
): OperatorFunction<T, R> {
   return mergeMap(project, concurrent);
}