import { Observable, OperatorFunction } from '@fluixi/reactive';

/**
 * Filters items emitted by the source Observable by only emitting those that satisfy
 * a specified predicate function.
 *
 * This operator is similar to Array.prototype.filter but for Observables.
 * It's commonly used for conditional logic in streams.
 *
 * @template T - The type of values emitted by the source Observable
 *
 * @overload
 * @param {function(value: T, index: number): boolean} predicate - The predicate function
 * @returns {OperatorFunction<T, T>} An operator function that filters values
 *
 * @overload
 * @template U - The type of this context
 * @param {function(this: U, value: T, index: number): boolean} predicate - The predicate function
 * @param {U} [thisArg] - Optional context for the predicate function
 * @returns {OperatorFunction<T, T>} An operator function that filters values
 *
 * @overload
 * @param {T} value - A specific value to filter for (uses strict equality)
 * @returns {OperatorFunction<T, T>} Operator that filters for specific value
 *
 * @example
 * // Filter even numbers
 * of(1, 2, 3, 4, 5).pipe(
 *   filter(x => x % 2 === 0)
 * ).subscribe(result => console.log(result));
 * // Output: 2, 4
 *
 * @example
 * // Filter with index
 * of('a', 'b', 'c', 'd', 'e').pipe(
 *   filter((value, index) => index % 2 === 0)
 * ).subscribe(result => console.log(result));
 * // Output: 'a', 'c', 'e'
 *
 * @example
 * // Filter objects by property
 * of(
 *   { id: 1, active: true },
 *   { id: 2, active: false },
 *   { id: 3, active: true }
 * ).pipe(
 *   filter(user => user.active)
 * ).subscribe(activeUser => console.log(activeUser));
 * // Output: { id: 1, active: true }, { id: 3, active: true }
 *
 * @example
 * // Filter for specific value
 * of(1, 2, 2, 3, 2).pipe(
 *   filter(2)
 * ).subscribe(result => console.log(result));
 * // Output: 2, 2, 2
 *
 * @example
 * // Using this context
 * const validator = {
 *   minAge: 18,
 *   isValid(user: { age: number }) { return user.age >= this.minAge; }
 * };
 *
 * of(
 *   { name: 'Alice', age: 25 },
 *   { name: 'Bob', age: 16 },
 *   { name: 'Charlie', age: 30 }
 * ).pipe(
 *   filter(function(user) { return this.isValid(user); }, validator)
 * ).subscribe(adult => console.log(adult.name));
 * // Output: 'Alice', 'Charlie'
 *
 * @example
 * // Type narrowing with filter
 * type Animal = { type: 'dog'; bark(): void } | { type: 'cat'; meow(): void };
 *
 * const animals$ = of<Animal>(
 *   { type: 'dog', bark: () => console.log('Woof!') },
 *   { type: 'cat', meow: () => console.log('Meow!') },
 *   { type: 'dog', bark: () => console.log('Arf!') }
 * );
 *
 * animals$.pipe(
 *   filter(animal => animal.type === 'dog')
 * ).subscribe(dog => {
 *   dog.bark(); // TypeScript knows this is a dog
 * });
 * // Output: 'Woof!', 'Arf!'
 *
 * @example
 * // Error handling in predicate
 * of(1, 2, 3).pipe(
 *   filter(x => {
 *     if (x === 2) throw new Error('Invalid value');
 *     return x > 0;
 *   }),
 *   catchError(err => of(0))
 * ).subscribe(result => console.log(result));
 * // Output: 1, 0
 *
 * @note The index passed to the predicate function starts at 0 for each subscription
 * @note Errors thrown in the predicate function are propagated to the error channel
 * @note The predicate function is called for each emission synchronously by default
 */
export function filter<T>(
  predicate: (value: T, index: number) => boolean
): OperatorFunction<T, T>;

export function filter<T, U>(
  predicate: (this: U, value: T, index: number) => boolean,
  thisArg: U
): OperatorFunction<T, T>;

export function filter<T>(value: T): OperatorFunction<T, T>;

export function filter<T>(
  predicateOrValue: ((value: T, index: number) => boolean) | T,
  thisArg?: any
): OperatorFunction<T, T> {
  return (source: Observable<T>) =>
    new Observable<T>((subscriber) => {
      let index = 0;

      const subscription = source.subscribe({
        next: (value: T) => {
          let shouldEmit: boolean;

          try {
            // Handle constant value filtering
            if (typeof predicateOrValue !== 'function') {
              shouldEmit = value === predicateOrValue;
            } else {
              // Handle predicate function
              const predicate = predicateOrValue as (
                value: T,
                index: number
              ) => boolean;
              shouldEmit = thisArg
                ? predicate.call(thisArg, value, index++)
                : predicate(value, index++);
            }
          } catch (err) {
            subscriber.error(err);
            return;
          }

          if (shouldEmit) {
            subscriber.next?.(value);
          }
        },
        error: (err: any) => {
          subscriber.error(err);
        },
        complete: () => {
          subscriber.complete?.();
        },
      });

      return subscription;
    });
}

/**
 * Type guard filter operator that narrows the type of emitted values.
 *
 * @template T - The original type of values
 * @template R - The narrowed type (must extend T)
 * @param {function(value: T, index: number): value is R} predicate - Type guard predicate
 * @returns {OperatorFunction<T, R>} Operator that narrows the type
 *
 * @example
 * // Type guard filter
 * type Shape = { kind: 'circle'; radius: number } | { kind: 'square'; size: number };
 *
 * const shapes$ = of<Shape>(
 *   { kind: 'circle', radius: 5 },
 *   { kind: 'square', size: 10 },
 *   { kind: 'circle', radius: 8 }
 * );
 *
 * shapes$.pipe(
 *   filter((shape): shape is { kind: 'circle'; radius: number } =>
 *     shape.kind === 'circle'
 *   )
 * ).subscribe(circle => {
 *   console.log(`Circle radius: ${circle.radius}`);
 *   // TypeScript knows circle has radius property
 * });
 */
export function filterType<T, R extends T>(
  predicate: (value: T, index: number) => value is R
): OperatorFunction<T, R> {
  return filter(predicate) as OperatorFunction<T, R>;
}

/**
 * Filters out falsy values from the Observable stream.
 *
 * @template T - The type of values emitted by the source
 * @returns {OperatorFunction<T, NonNullable<T>>} Operator that filters falsy values
 *
 * @example
 * // Filter falsy values
 * of(0, 1, null, 2, undefined, 3, '', 4).pipe(
 *   filterTruthy()
 * ).subscribe(value => console.log(value));
 * // Output: 1, 2, 3, 4
 */
export function filterTruthy<T extends {}>(): OperatorFunction<
  T,
  NonNullable<T>
> {
  return filter((value): value is NonNullable<T> => !!value);
}

/**
 * Filters out null and undefined values from the Observable stream.
 *
 * @template T - The type of values emitted by the source
 * @returns {OperatorFunction<T, NonNullable<T>>} Operator that filters null/undefined
 *
 * @example
 * // Filter null/undefined values
 * of(1, null, 2, undefined, 3).pipe(
 *   filterNotNullish()
 * ).subscribe(value => console.log(value));
 * // Output: 1, 2, 3
 */
export function filterNotNullish<T extends {}>(): OperatorFunction<
  T,
  NonNullable<T>
> {
  return filter((value): value is NonNullable<T> => value != null);
}
