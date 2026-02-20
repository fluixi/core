import { isArrayLike, isIterable, isPromise } from '@awc/utils';
import {
  AnyIterator,
  Observable,
  type ObservableInput,
  type ObservedValueOf,
} from '../observable.js';

// /**
//  * Creates an Observable from various input types.
//  *
//  * This is the most versatile creation operator that can convert:
//  * - Promises (including async/await functions)
//  * - Arrays and array-like objects
//  * - Iterables (Sets, Maps, Generators, Strings)
//  * - Other Observables (acts as an identity function)
//  * - Observable-like objects
//  *
//  * @overload
//  * @template O - The input type (automatically inferred)
//  * @param {O} input - The input to convert to an Observable
//  * @returns {Observable<ObservedValueOf<O>>} Observable emitting values from the input
//  *
//  * @overload
//  * @template T - The type of values emitted
//  * @param {ObservableInput<T>} input - The input to convert
//  * @returns {Observable<T>} Observable emitting values from the input
//  *
//  * @example
//  * // Convert a Promise
//  * const promise = fetch('api/data').then(r => r.json());
//  * from(promise).subscribe(data => console.log(data));
//  *
//  * @example
//  * // Convert an Array
//  * from([1, 2, 3, 4, 5]).subscribe(num => console.log(num));
//  *
//  * @example
//  * // Convert a String (iterable)
//  * from('Hello').subscribe(char => console.log(char));
//  * // Output: H, e, l, l, o
//  *
//  * @example
//  * // Convert a Set
//  * from(new Set([1, 2, 3, 2, 1])).subscribe(num => console.log(num));
//  * // Output: 1, 2, 3
//  *
//  * @example
//  * // Convert a Generator
//  * function* numberGenerator() {
//  *   yield 1;
//  *   yield 2;
//  *   yield 3;
//  * }
//  * from(numberGenerator()).subscribe(num => console.log(num));
//  *
//  * @example
//  * // Convert NodeList (array-like)
//  * from(document.querySelectorAll('div')).subscribe(div => {
//  *   console.log(div.textContent);
//  * });
//  *
//  * @example
//  * // Already an Observable (identity)
//  * const source$ = of(1, 2, 3);
//  * from(source$).subscribe(val => console.log(val));
//  * // Same as subscribing to source$ directly
//  *
//  * @throws {TypeError} If the input cannot be converted to an Observable
//  */
// export function from<O extends ObservableInput<any>>(
//     input: O
// ): Observable<ObservedValueOf<O>>;

// export function from<T>(
//     input: ObservableInput<T>
// ): Observable<T> {
//     // If already an Observable, return it
//     if (input instanceof Observable) {
//         return input;
//     }

//     // Handle Promise
//     if (isPromise(input)) {
//         return new Observable<T>(subscriber => {
//             input.then(
//                 (value: T) => {
//                     if (!subscriber.closed) {
//                         subscriber.next(value);
//                         subscriber.complete();
//                     }
//                 },
//                 (err: any) => {
//                     if (!subscriber.closed) {
//                         subscriber.error(err);
//                     }
//                 }
//             );
//         });
//     }

//     // Handle Iterable (including Arrays, Sets, Maps, Strings, Generators)
//     if (isIterable(input)) {
//         return new Observable<T>(subscriber => {
//             try {
//                 for (const value of input) {
//                     if (subscriber.closed) {
//                         return;
//                     }
//                     subscriber.next(value);
//                 }
//                 subscriber.complete();
//             } catch (err) {
//                 subscriber.error(err);
//             }
//         });
//     }

//     // Handle Array-like objects (arguments, NodeList, etc.)
//     if (isArrayLike(input)) {
//         return new Observable<T>(subscriber => {
//             for (let i = 0; i < input.length; i++) {
//                 if (subscriber.closed) {
//                     return;
//                 }
//                 subscriber.next(input[i]);
//             }
//             subscriber.complete();
//         });
//     }

//     // Handle Iterator factory function
//     if (isFunction(input) && input.length === 0) {
//         return new Observable<T>(subscriber => {
//             try {
//                 const iterator = input();
//                 while (true) {
//                     if (subscriber.closed) {
//                         return;
//                     }
//                     const result = iterator.next();
//                     if (result.done) {
//                         subscriber.complete();
//                         break;
//                     }
//                     subscriber.next(result.value);
//                 }
//             } catch (err) {
//                 subscriber.error(err);
//             }
//         });
//     }

//     throw new TypeError(
//         `Input type "${typeof input}" cannot be converted to Observable. ` +
//         `Expected: Observable, Promise, Array, Iterable, or Array-like object.`
//     );
// }

/**
 * Creates an Observable from various input types.
 *
 * This is the most versatile creation operator that can convert:
 * - Promises (including async/await functions)
 * - Arrays and array-like objects
 * - Iterables (Sets, Maps, Generators, Strings)
 * - Other Observables (acts as an identity function)
 * - Iterator factory functions (() => Iterator<T, any, any>)
 *
 * @overload
 * @template O - The input type (automatically inferred)
 * @param {O} input - The input to convert to an Observable
 * @returns {Observable<ObservedValueOf<O>>} Observable emitting values from the input
 *
 * @overload
 * @template T - The type of values emitted
 * @param {ObservableInput<T>} input - The input to convert
 * @returns {Observable<T>} Observable emitting values from the input
 *
 * @example
 * // Convert an iterator factory function
 * function* numberGenerator(max: number) {
 *   for (let i = 1; i <= max; i++) {
 *     yield i;
 *   }
 *   return 'done';
 * }
 *
 * const iteratorFactory = () => numberGenerator(5);
 * from(iteratorFactory).subscribe({
 *   next: value => console.log(value), // 1, 2, 3, 4, 5
 *   complete: () => console.log('Generator complete')
 * });
 */
export function from<O extends ObservableInput<any>>(
  input: O
): Observable<ObservedValueOf<O>>;

export function from<T>(input: ObservableInput<T>): Observable<T> {
  // If already an Observable, return it
  if (input instanceof Observable) {
    return input;
  }

  // Handle Promise
  if (isPromise(input)) {
    return new Observable<T>((subscriber) => {
      input.then(
        (value: T) => {
          if (!subscriber.closed) {
            subscriber.next(value);
            subscriber.complete();
          }
        },
        (err: any) => {
          if (!subscriber.closed) {
            subscriber.error(err);
          }
        }
      );
    });
  }

  // Handle Iterable (including Arrays, Sets, Maps, Strings, Generators)
  if (isIterable(input)) {
    return new Observable<T>((subscriber) => {
      try {
        for (const value of input) {
          if (subscriber.closed) {
            return;
          }
          subscriber.next(value);
        }
        subscriber.complete();
      } catch (err) {
        subscriber.error(err);
      }
    });
  }

  // Handle Array-like objects (arguments, NodeList, etc.)
  if (isArrayLike(input)) {
    return new Observable<T>((subscriber) => {
      for (let i = 0; i < input.length; i++) {
        if (subscriber.closed) {
          return;
        }
        subscriber.next(input[i]);
      }
      subscriber.complete();
    });
  }

  // Handle Iterator factory function (() => Iterator<T, any, any> or () => Generator<T, any, any>)
  if (typeof input === 'function') {
    return new Observable<T>((subscriber) => {
      let iterator: AnyIterator<T> | undefined;
      let iteratorClosed = false;

      // Function to safely close the iterator
      const closeIterator = (value?: any): void => {
        if (
          !iteratorClosed &&
          iterator &&
          typeof iterator.return === 'function'
        ) {
          iteratorClosed = true;
          try {
            iterator.return(value);
          } catch (err) {
            // Ignore errors in iterator.return()
            console.warn('Error in iterator.return():', err);
          }
        }
      };

      // Function to handle iterator errors
      const handleIteratorError = (err: any): void => {
        if (iterator && typeof iterator.throw === 'function') {
          try {
            const result = iterator.throw(err);
            if (result.done) {
              subscriber.complete();
              closeIterator(result.value);
            } else {
              subscriber.next(result.value);
            }
          } catch (iteratorErr) {
            subscriber.error(iteratorErr);
            closeIterator();
          }
        } else {
          subscriber.error(err);
          closeIterator();
        }
      };

      try {
        // Create the iterator from the factory function
        iterator = input() as AnyIterator<T>;

        // Validate that it's actually an iterator
        if (!iterator || typeof iterator.next !== 'function') {
          throw new TypeError(
            'Iterator factory function must return an iterator'
          );
        }

        // Add cleanup for unsubscription
        // subscriber.add(() => {
        //     if (!iteratorClosed) {
        //         closeIterator();
        //     }
        // });

        // Consume the iterator
        while (true) {
          if (subscriber.closed) {
            closeIterator();
            return;
          }

          let result: IteratorResult<T>;
          try {
            result = iterator.next();
          } catch (err) {
            handleIteratorError(err);
            return;
          }

          if (result.done) {
            // Iterator is done, complete the Observable
            subscriber.complete();
            closeIterator(result.value);
            break;
          }

          subscriber.next(result.value);
        }
      } catch (err) {
        subscriber.error(err);
        closeIterator();
      }
    });
  }

  throw new TypeError(
    `Input type "${typeof input}" cannot be converted to Observable. ` +
      `Expected: Observable, Promise, Array, Iterable, Array-like object, or Iterator factory function.`
  );
}

// /**
//  * Enhanced type guard for Iterator factory functions.
//  *
//  * @param {any} value - The value to check
//  * @returns {value is () => AnyIterator<any>} True if the value is an iterator factory function
//  *
//  * @private
//  */
// function isIteratorFactory<T>(value: any): value is () => AnyIterator<T> {
//     return typeof value === 'function' && value.length === 0;
// }
