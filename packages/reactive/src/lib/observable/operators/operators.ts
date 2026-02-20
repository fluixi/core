// import { asyncScheduler } from "../../schedulers/async.js";
// import { isFunction, isIterable, isObject, isPromise } from "../../helpers/index.js";
// import type { SchedulerAction, SchedulerLike } from "../../schedulers/index.js";
// import { Observable, Observer, type ObservableInput, type Subscriber } from "../observable.js";
// import type { TeardownLogic } from "../types.js";
// import { executePromise, isObservable, isScheduler } from "./utils.js";
// import { Subscription } from "../subscription.js";
// import { AddEventListenerOptions, OperatorFunction } from "./types.js";
// import { from } from '@awc/reactive'

// /**
//  * Creates an Observable from a subscribe function
//  * @template T - Type of values emitted
//  * @param {(subscriber: Subscriber<T>) => TeardownLogic} subscribe - Subscribe function
//  * @returns {Observable<T>} New Observable
//  * @example
// * ```typescript
// * const observable = create<string>(subscriber => {
// *   subscriber.next('Hello');
// *   subscriber.next('World');
// *   subscriber.complete();
// *   return () => console.log('Teardown');
// * });
// *
// * observable.subscribe(console.log);
// * ```
// */
// export function create<T>(
//     subscribe: (subscriber: Subscriber<T>) => TeardownLogic
// ): Observable<T> {
//     return new Observable(subscribe);
// }




// /**
// * Creates an Observable that emits sequential numbers in a specified interval
// * @param {number} [period=0] - The period (in milliseconds) between emissions
// * @param {number} [start=0] - The initial value to emit
// * @param {number} [count=Infinity] - Maximum number of emissions
// * @returns {Observable<number>} Observable emitting sequential numbers
// * @example
// * ```typescript
// * // Emit 0, 1, 2, 3, 4 every second
// * interval(1000, 0, 5).subscribe(console.log);
// *
// * // Emit numbers indefinitely every 500ms
// * interval(500).subscribe(console.log);
// * ```
// */
// export function interval(
//     period: number = 0,
//     scheduler: SchedulerLike = asyncScheduler
// ): Observable<number> {
//     if (period < 0) {
//         period = 0;
//     }

//     if (!isScheduler(scheduler)) {
//         scheduler = asyncScheduler;
//     }

//     return new Observable((subscriber) => {
//         let n = 0;
//         const action = scheduler.schedule(function periodic(
//             this: SchedulerAction<any>
//         ) {
//             subscriber.next(n++);
//             this.schedule(undefined, period);
//         },
//         period);

//         return () => action.unsubscribe();
//     });
// }

// /**
// * Creates an Observable that emits a value after a specified delay
// * @template T - Type of value to emit
// * @param {T} value - Value to emit
// * @param {number} [dueTime=0] - Delay in milliseconds before emitting
// * @returns {Observable<T>} Observable emitting the value after delay
// * @example
// * ```typescript
// * // Emit 'Hello' after 1 second
// * timer('Hello', 1000).subscribe(console.log);
// *
// * // Emit 0 after 500ms (default)
// * timer(0, 500).subscribe(console.log);
// * ```
// */
// export function timer(
//     dueTime: number = 0,
//     periodOrScheduler?: number | SchedulerLike,
//     scheduler: SchedulerLike = asyncScheduler
// ): Observable<number> {
//     let period: number | undefined;
//     let actualScheduler = scheduler;

//     if (isScheduler(periodOrScheduler)) {
//         actualScheduler = periodOrScheduler;
//     } else if (typeof periodOrScheduler === 'number') {
//         period = periodOrScheduler;
//     }

//     if (dueTime < 0) {
//         dueTime = 0;
//     }

//     if (period !== undefined && period < 0) {
//         period = 0;
//     }

//     return new Observable((subscriber) => {
//     let n = 0;
//     let action: Subscription;

//     const scheduleNext = (delay: number) => {
//         action = actualScheduler.schedule(function emit(
//         this: SchedulerAction<any>
//         ) {
//         subscriber.next(n++);
//         if (period !== undefined) {
//             this.schedule(undefined, period);
//         } else {
//             subscriber.complete();
//         }
//         },
//         delay);
//     };

//     scheduleNext(dueTime);

//     return () => action.unsubscribe();
//     });
// }

// /**
// * Creates an Observable that emits values from an array-like or iterable object
// * @template T - Type of values
// * @param {ArrayLike<T> | Iterable<T>} array - Array or iterable to emit values from
// * @returns {Observable<T>} Observable emitting values from the array
// * @example
// * ```typescript
// * // From array-like object
// * fromArrayLike({ 0: 'a', 1: 'b', length: 2 }).subscribe(console.log);
// *
// * // From string (array-like)
// * fromArrayLike('hello').subscribe(console.log);
// * ```
// */
// export function fromArrayLike<T>(
//     array: ArrayLike<T> | Iterable<T>
// ): Observable<T> {
//     return new Observable((subscriber) => {
//         try {
//             if ('length' in array) {
//                 // ArrayLike
//                 for (let i = 0; i < array.length; i++) {
//                     if (subscriber.closed) return;
//                     subscriber.next(array[i]);
//                 }
//             } else {
//                 // Iterable
//                 for (const value of array) {
//                     if (subscriber.closed) return;
//                     subscriber.next(value);
//                 }
//             }
//             subscriber.complete();
//         } catch (err) {
//             subscriber.error(err);
//         }
//     });
// }


// /**
// * Creates an Observable that emits a sequence of numbers within a specified range.
// * 
// * @param start The starting value of the range (default: 0).
// * @param count The number of sequential integers to emit (default: 0).
// * @returns An Observable that emits a range of sequential numbers.
// * 
// * @example
// * // Emit numbers 1 through 5
// * range(1, 5).subscribe(num => console.log(num));
// * // Output: 1, 2, 3, 4, 5
// */
// export function range(
//    start: number = 0,
//    count: number = 0
// ): Observable<number> {
//    return new Observable((subscriber) => {
//        let i = 0;
//        while (i < count) {
//            subscriber.next(start + i);
//            i++;
//        }
//        subscriber.complete();
//    });
// }


// export function throwError(errorFactory: () => any, scheduler?: SchedulerLike): Observable<never> {
//     return new Observable(subscriber => {
//       const error = isFunction(errorFactory) ? errorFactory() : errorFactory;
      
//       if (scheduler) {
//         scheduler.schedule(() => subscriber.error(error));
//       } else {
//         subscriber.error(error);
//       }
//     });
// }

// /**
// * Creates an Observable that lazily creates an Observable or ObservableInput only when subscribed.
// * 
// * @template R The type of values emitted by the Observable.
// * @param observableFactory A function that returns an ObservableInput or void when called.
// * @returns An Observable that uses the ObservableInput returned by the factory function.
// * 
// * @example
// * // Defer creation of an observable until subscription
// * const random$ = defer(() => Math.random() > 0.5 ? of('heads') : of('tails'));
// * random$.subscribe(result => console.log(result));
// */
// export function defer<R>(
//    observableFactory: () => ObservableInput<R> | void
// ): Observable<R> {
//    return new Observable(subscriber => {
//        let input: ObservableInput<R>;
//        try {
//            input = observableFactory() as ObservableInput<R>;
//            if (!input) {
//                subscriber.complete();
//                return;
//            }
//        } catch (err) {
//            subscriber.error(err);
//            return;
//        }
//        const source = from(input);
//        return source.subscribe(subscriber);
//    });
// }

// /**
// * Creates an Observable from a Fetch API request.
// * 
// * @template T The type of the response (usually Response).
// * @param input The URL or Request object to fetch.
// * @param init Optional RequestInit configuration for the fetch request.
// * @returns An Observable that emits the Response and completes, or errors on failure.
// * 
// * @example
// * // Fetch data from an API
// * fromFetch('https://api.example.com/data')
// *   .subscribe(response => console.log(response));
// */
// export function fromFetch<T>(
//    input: string | Request,
//    init?: RequestInit
// ): Observable<T> {
//    return new Observable(subscriber => {
//        const controller = new AbortController();
//        const signal = controller.signal;
       
//        let abortable = true;
//        let unsubscribed = false;
       
//        // Merge init with signal
//        const subscription = new Subscription();
       
//        const initWithSignal: RequestInit = {
//            ...init,
//            signal
//        };
       
//        fetch(input, initWithSignal)
//            .then(response => {
//                abortable = false;
//                subscriber.next(response as any);
//                subscriber.complete();
//            })
//            .catch(err => {
//                abortable = false;
//                if (!unsubscribed) {
//                    subscriber.error(err);
//                }
//            });
       
//        subscription.add(() => {
//            unsubscribed = true;
//            if (abortable) {
//                controller.abort();
//            }
//        });
       
//        return subscription;
//    });
// }

// /**
// * Applies a projection function to each value emitted by the source Observable.
// * 
// * @template T The type of values emitted by the source Observable.
// * @template R The type of values emitted after applying the projection.
// * @param project The function to apply to each value emitted by the source Observable.
// * @returns A function that returns an Observable that emits the projected values.
// * 
// * @example
// * // Multiply each value by 10
// * of(1, 2, 3).pipe(map(x => x * 10))
// *   .subscribe(val => console.log(val));
// * // Output: 10, 20, 30
// */
// export function map<T, R>(project: (value: T, index: number) => R): OperatorFunction<T, R> {
//    return (source: Observable<T>) => new Observable(subscriber => {
//        let index = 0;
//        const subscription = source.subscribe({
//            next: value => {
//                let result: R;
//                try {
//                    result = project(value, index++);
//                } catch (err) {
//                    subscriber.error(err);
//                    return;
//                }
//                subscriber.next(result);
//            },
//            error: err => subscriber.error(err),
//            complete: () => subscriber.complete()
//        });
       
//        return subscription;
//    });
// }

// /**
// * Filters items emitted by the source Observable based on a predicate function.
// * 
// * @template T The type of values emitted by the source Observable.
// * @param predicate A function that evaluates each value emitted by the source Observable.
// * @returns A function that returns an Observable that emits only values that pass the predicate.
// * 
// * @example
// * // Filter out odd numbers
// * of(1, 2, 3, 4, 5).pipe(filter(x => x % 2 === 0))
// *   .subscribe(val => console.log(val));
// * // Output: 2, 4
// */
// export function filter<T>(
//    predicate: (value: T, index: number) => boolean
// ): OperatorFunction<T, T> {
//    return (source: Observable<T>) => new Observable(subscriber => {
//        let index = 0;
//        const subscription = source.subscribe({
//            next: value => {
//                let shouldEmit: boolean;
//                try {
//                    shouldEmit = predicate(value, index++);
//                } catch (err) {
//                    subscriber.error(err);
//                    return;
//                }
//                if (shouldEmit) {
//                    subscriber.next(value);
//                }
//            },
//            error: err => subscriber.error(err),
//            complete: () => subscriber.complete()
//        });
       
//        return subscription;
//    });
// }

// /**
// * Performs a side effect for each emission on the source Observable and passes the value through.
// * 
// * @template T The type of values emitted by the source Observable.
// * @param observerOrNext A function or Observer object for handling next notifications.
// * @param error A function for handling error notifications.
// * @param complete A function for handling completion notifications.
// * @returns A function that returns an Observable that mirrors the source but runs side effects.
// * 
// * @example
// * // Log each value before passing it through
// * of(1, 2, 3).pipe(tap(val => console.log(`Before: ${val}`)))
// *   .subscribe(val => console.log(`After: ${val}`));
// * // Output: Before: 1, After: 1, Before: 2, After: 2, Before: 3, After: 3
// */
// export function tap<T>(
//    observerOrNext?: Partial<Observer<T>> | ((value: T) => void),
//    error?: (error: any) => void,
//    complete?: () => void
// ): OperatorFunction<T, T> {
//    let observer: Partial<Observer<T>>;
   
//    if (isFunction(observerOrNext) || !observerOrNext) {
//        observer = {
//            next: observerOrNext as ((value: T) => void) || undefined,
//            error: error || undefined,
//            complete: complete || undefined
//        };
//    } else {
//        observer = observerOrNext;
//    }
   
//    return (source: Observable<T>) => new Observable(subscriber => {
//        return source.subscribe({
//            next: value => {
//                try {
//                    observer.next?.(value);
//                } catch (err) {
//                    subscriber.error(err);
//                    return;
//                }
//                subscriber.next(value);
//            },
//            error: err => {
//                try {
//                    observer.error?.(err);
//                } catch (error) {
//                    // Don't propagate tap errors to main stream
//                }
//                subscriber.error(err);
//            },
//            complete: () => {
//                try {
//                    observer.complete?.();
//                } catch (err) {
//                    subscriber.error(err);
//                    return;
//                }
//                subscriber.complete();
//            }
//        });
//    });
// }

// /**
// * Emits a value from the source Observable only after a specified time period has passed without another source emission.
// * 
// * @template T The type of values emitted by the source Observable.
// * @param dueTime The time in milliseconds to wait before emitting the last value.
// * @param scheduler The scheduler to use for timing operations (default: asyncScheduler).
// * @returns A function that returns an Observable that delays emissions.
// * 
// * @example
// * // Emit the latest keypress after 500ms of silence
// * fromEvent(inputElement, 'keyup')
// *   .pipe(debounceTime(500))
// *   .subscribe(event => console.log(event.target.value));
// */
// export function debounceTime<T>(
//    dueTime: number,
//    scheduler: SchedulerLike = asyncScheduler
// ): OperatorFunction<T, T> {
//    if (!isScheduler(scheduler)) {
//        scheduler = asyncScheduler;
//    }
   
//    return (source: Observable<T>) => new Observable(subscriber => {
//        let action: Subscription | null = null;
//        let lastValue: T;
       
//        const scheduleTimeout = (value: T) => {
//            lastValue = value;
//            if (action) {
//                action.unsubscribe();
//            }
//            action = scheduler.schedule(() => {
//                subscriber.next(lastValue);
//                action = null;
//            }, dueTime);
           
//            subscriber.add(action);
//        };
       
//        const subscription = source.subscribe({
//            next: value => scheduleTimeout(value),
//            error: err => {
//                if (action) {
//                    action.unsubscribe();
//                }
//                subscriber.error(err);
//            },
//            complete: () => {
//                if (action) {
//                    // Wait for the last value
//                    const completeAction = scheduler.schedule(() => {
//                    subscriber.complete();
//                    }, dueTime);
//                    subscriber.add(completeAction);
//                } else {
//                    subscriber.complete();
//                }
//            }
//        });
       
//        return () => {
//            if (action) {
//                action.unsubscribe();
//            }
//            subscription.unsubscribe();
//        };
//    });
// }

// /**
// * Emits a value from the source Observable, then ignores subsequent values for a specified duration.
// * 
// * @template T The type of values emitted by the source Observable.
// * @param duration The time in milliseconds to ignore values after an emission.
// * @param scheduler The scheduler to use for timing operations (default: asyncScheduler).
// * @returns A function that returns an Observable that throttles emissions.
// * 
// * @example
// * // Emit at most one value per second
// * interval(100).pipe(throttleTime(1000))
// *   .subscribe(val => console.log(val));
// */
// export function throttleTime<T>(
//    duration: number,
//    scheduler: SchedulerLike = asyncScheduler
// ): OperatorFunction<T, T> {
//    if (!isScheduler(scheduler)) {
//        scheduler = asyncScheduler;
//    }
   
//    return (source: Observable<T>) => new Observable(subscriber => {
//        let lastEmittedTime = 0;
//        let action: Subscription | null = null;
//        let lastValue: T;
       
//        const emit = () => {
//            subscriber.next(lastValue);
//            lastEmittedTime = scheduler.now();
//            action = null;
//        };
       
//        const subscription = source.subscribe({
//            next: value => {
//                lastValue = value;
//                const now = scheduler.now();
               
//                if (now - lastEmittedTime >= duration) {
//                    if (action) {
//                        action.unsubscribe();
//                        action = null;
//                    }
//                    emit();
//                } else if (!action) {
//                    const remaining = duration - (now - lastEmittedTime);
//                    action = scheduler.schedule(emit, remaining);
//                    subscriber.add(action);
//                }
//            },
//            error: err => {
//                if (action) {
//                    action.unsubscribe();
//                }
//                subscriber.error(err);
//            },
//            complete: () => {
//                if (action) {
//                    scheduler.schedule(() => subscriber.complete(), duration);
//                } else {
//                    subscriber.complete();
//                }
//            }
//        });
       
//        return () => {
//            if (action) {
//                action.unsubscribe();
//            }
//            subscription.unsubscribe();
//        };
//    });
// }

// /**
// * Projects each source value to an Observable which is merged in the output Observable.
// * 
// * @template T The type of values emitted by the source Observable.
// * @template R The type of values emitted by the projected Observables.
// * @param project A function that returns an ObservableInput for each source value.
// * @param concurrent The maximum number of input Observables being subscribed to concurrently (default: Infinity).
// * @returns A function that returns an Observable that emits values from the projected Observables.
// * 
// * @example
// * // For each click event, start an interval
// * fromEvent(document, 'click')
// *   .pipe(mergeMap(() => interval(1000)))
// *   .subscribe(val => console.log(val));
// */
// export function mergeMap<T, R>(
//    project: (value: T, index: number) => ObservableInput<R>,
//    concurrent: number = Infinity
// ): OperatorFunction<T, R> {
//    return (source: Observable<T>) => new Observable(subscriber => {
//        let completed = false;
//        let active = 0;
//        let index = 0;
//        const buffer: T[] = [];
       
//        const next = () => {
//            if (buffer.length > 0 && active < concurrent) {
//                const value = buffer.shift()!;
//                const currentIndex = index++;
               
//                let innerObservable: Observable<R>;
//                try {
//                    const result = project(value, currentIndex);
//                    innerObservable = from(result);
//                } catch (err) {
//                    subscriber.error(err);
//                    return;
//                }
               
//                active++;
               
//                const innerSubscription = innerObservable.subscribe({
//                    next: innerValue => subscriber.next(innerValue),
//                    error: err => subscriber.error(err),
//                    complete: () => {
//                        active--;
//                        if (active === 0 && completed) {
//                            subscriber.complete();
//                        } else {
//                            next();
//                        }
//                    }
//                });
               
//                subscriber.add(innerSubscription);
//            }
//        };
       
//        const subscription = source.subscribe({
//            next: value => {
//                buffer.push(value);
//                next();
//            },
//            error: err => subscriber.error(err),
//            complete: () => {
//                completed = true;
//                if (active === 0) {
//                    subscriber.complete();
//                }
//            }
//        });
       
//        return subscription;
//    });
// }

// /**
// * Projects each source value to an Observable, then switches to the new Observable emitting its values.
// * 
// * @template T The type of values emitted by the source Observable.
// * @template R The type of values emitted by the projected Observables.
// * @param project A function that returns an ObservableInput for each source value.
// * @returns A function that returns an Observable that emits values from the most recent projected Observable.
// * 
// * @example
// * // On each click, start a new interval, cancelling the previous one
// * fromEvent(document, 'click')
// *   .pipe(switchMap(() => interval(1000)))
// *   .subscribe(val => console.log(val));
// */
// export function switchMap<T, R>(
//    project: (value: T, index: number) => ObservableInput<R>
// ): OperatorFunction<T, R> {
//    return (source: Observable<T>) => new Observable(subscriber => {
//        let innerSubscription: Subscription | null = null;
//        let index = 0;
//        let completed = false;
       
//        const subscription = source.subscribe({
//            next: value => {
//            if (innerSubscription) {
//                innerSubscription.unsubscribe();
//            }
           
//            let innerObservable: Observable<R>;
//            try {
//                const result = project(value, index++);
//                innerObservable = from(result);
//            } catch (err) {
//                subscriber.error(err);
//                return;
//            }
           
//            innerSubscription = innerObservable.subscribe({
//                next: innerValue => subscriber.next(innerValue),
//                error: err => subscriber.error(err),
//                complete: () => {
//                    innerSubscription = null;
//                    if (completed) {
//                        subscriber.complete();
//                    }
//                }
//            });
//            },
//            error: err => subscriber.error(err),
//            complete: () => {
//                completed = true;
//                if (!innerSubscription) {
//                    subscriber.complete();
//                }
//            }
//        });
       
//        return () => {
//            if (innerSubscription) {
//                innerSubscription.unsubscribe();
//            }
//            subscription.unsubscribe();
//        };
//    });
// }

// /**
// * Projects each source value to an Observable and concatenates them sequentially.
// * 
// * @template T The type of values emitted by the source Observable.
// * @template R The type of values emitted by the projected Observables.
// * @param project A function that returns an ObservableInput for each source value.
// * @returns A function that returns an Observable that emits values from each projected Observable in sequence.
// * 
// * @example
// * // Process items one at a time, waiting for each to complete
// * of('a', 'b', 'c').pipe(
// *   concatMap(letter => of(1, 2).pipe(map(num => letter + num)))
// * ).subscribe(val => console.log(val));
// * // Output: a1, a2, b1, b2, c1, c2
// */
// export function concatMap<T, R>(
//    project: (value: T, index: number) => ObservableInput<R>
//  ): OperatorFunction<T, R> {
//    return mergeMap(project, 1);
// }

// /**
// * Projects each source value to an Observable, ignoring new values while the current projection is still active.
// * 
// * @template T The type of values emitted by the source Observable.
// * @template R The type of values emitted by the projected Observables.
// * @param project A function that returns an ObservableInput for each source value.
// * @returns A function that returns an Observable that emits values only from the current projected Observable.
// * 
// * @example
// * // Ignore new clicks while processing the current one
// * fromEvent(document, 'click')
// *   .pipe(exhaustMap(() => interval(1000).pipe(take(5))))
// *   .subscribe(val => console.log(val));
// */
// export function exhaustMap<T, R>(
//    project: (value: T, index: number) => ObservableInput<R>
// ): OperatorFunction<T, R> {
//    return (source: Observable<T>) => new Observable(subscriber => {
//      let innerSubscription: Subscription | null = null;
//      let index = 0;
     
//      const subscription = source.subscribe({
//        next: value => {
//          if (!innerSubscription) {
//            let innerObservable: Observable<R>;
//            try {
//              const result = project(value, index++);
//              innerObservable = from(result);
//            } catch (err) {
//              subscriber.error(err);
//              return;
//            }
           
//            innerSubscription = innerObservable.subscribe({
//              next: innerValue => subscriber.next(innerValue),
//              error: err => subscriber.error(err),
//              complete: () => {
//                innerSubscription = null;
//              }
//            });
//          }
//        },
//        error: err => subscriber.error(err),
//        complete: () => {
//          if (!innerSubscription) {
//            subscriber.complete();
//          }
//        }
//      });
     
//      return () => {
//        if (innerSubscription) {
//          innerSubscription.unsubscribe();
//        }
//        subscription.unsubscribe();
//      };
//    });
// }

// /**
// * Creates an Observable from a Promise, emitting the resolved value and completing, or erroring if the Promise rejects.
// * 
// * @template T The type of the resolved value.
// * @param promise The Promise to convert to an Observable.
// * @returns An Observable that emits the resolved value or errors.
// * @throws {TypeError} If the input is not a Promise.
// * 
// * @example
// * // Convert a fetch promise to an observable
// * const promise = fetch('https://api.example.com/data');
// * fromPromise(promise).subscribe(
// *   response => console.log(response),
// *   error => console.error(error)
// * );
// */
// export function fromPromise<T>(promise: Promise<T>): Observable<T> {
//    if (!isPromise(promise)) {
//        throw new TypeError('Input is not a Promise');
//    }
//    return from(promise);
// }

// /**
// * Converts an Observable to a Promise that resolves with the last emitted value when the Observable completes.
// * 
// * @returns A Promise that resolves with the last emitted value (or undefined if no value emitted).
// * 
// * @example
// * // Get the last value from an observable as a promise
// * const promise = of(1, 2, 3).toPromise();
// * promise.then(lastValue => console.log(lastValue)); // Output: 3
// */
// export function toPromise<T>(this: Observable<T>): Promise<T | undefined> {
//    return new Promise((resolve, reject) => {
//        let lastValue: T | undefined;
//        this.subscribe({
//            next: value => lastValue = value,
//            error: reject,
//            complete: () => resolve(lastValue)
//        });
//    });
// }

// /**
// * Creates an Observable that merges multiple Observables, emitting values from all of them as they arrive.
// * 
// * @template T The type of values emitted by the Observables.
// * @param sources The Observables to merge.
// * @returns An Observable that emits values from all input Observables interleaved.
// * 
// * @example
// * // Merge two intervals
// * merge(interval(1000), interval(1500))
// *   .subscribe(val => console.log(val));
// */
// export function merge<T>(...sources: Observable<T>[]): Observable<T> {
//    return new Observable(subscriber => {
//        const subscriptions = sources.map(source => 
//            source.subscribe({
//                next: value => subscriber.next(value),
//                error: err => subscriber.error(err),
//                complete: () => {
//                    if (subscriptions.every(sub => sub.closed)) {
//                        subscriber.complete();
//                    }
//                }
//            })
//        );
       
//        return () => subscriptions.forEach(sub => sub.unsubscribe());
//    });
// }

// /**
// * Creates an Observable that emits values from each input Observable sequentially, one after the other completes.
// * 
// * @template T The type of values emitted by the Observables.
// * @param sources The Observables to concatenate.
// * @returns An Observable that emits all values from the first Observable, then the second, etc.
// * 
// * @example
// * // Concatenate two observables
// * concat(of(1, 2), of(3, 4))
// *   .subscribe(val => console.log(val));
// * // Output: 1, 2, 3, 4
// */
// export function concat<T>(...sources: Observable<T>[]): Observable<T> {
//    return new Observable(subscriber => {
//        let currentIndex = 0;
//        let currentSubscription: Subscription | null = null;
       
//        const subscribeNext = () => {
//            if (currentIndex >= sources.length) {
//                subscriber.complete();
//                return;
//            }
           
//            const source = sources[currentIndex++];
//            currentSubscription = source.subscribe({
//                next: value => subscriber.next(value),
//                error: err => subscriber.error(err),
//                complete: () => {
//                    currentSubscription = null;
//                    subscribeNext();
//                }
//            });
//        };
       
//        subscribeNext();
       
//        return () => {
//            if (currentSubscription) {
//            currentSubscription.unsubscribe();
//            }
//        };
//    });
// }

// /**
// * Combines multiple Observables to create an Observable that emits arrays of the most recent values from each.
// * 
// * @template T Array of Observable types.
// * @template R The result type after applying the projection function.
// * @param args The Observables to combine followed by a projection function.
// * @returns An Observable that emits projected values when any source Observable emits.
// * @throws {TypeError} If the last argument is not a function.
// * 
// * @example
// * // Combine latest values from two streams
// * combineLatest(
// *   interval(1000),
// *   fromEvent(document, 'click'),
// *   (time, click) => `Time: ${time}, Click: ${click.type}`
// * ).subscribe(val => console.log(val));
// */
// export function combineLatest<T extends Observable<any>[], R>(
//    ...args: [...T, (...values: { [K in keyof T]: T[K] extends Observable<infer U> ? U : never }) => R]
// ): Observable<R> {
//    const observables = args.slice(0, -1) as T;
//    const project = args[args.length - 1] as (...values: any[]) => R;
   
//    if (!isFunction(project)) {
//        throw new TypeError('Last argument must be a projection function');
//    }
   
//    return new Observable(subscriber => {
//        const length = observables.length;
//        if (length === 0) {
//            subscriber.complete();
//            return;
//        }
       
//        const values = new Array(length);
//        const hasValue = new Array(length).fill(false);
//        const completed = new Array(length).fill(false);
//        let active = length;
       
//        const subscriptions = observables.map((obs$, index) => {
//            return obs$.subscribe({
//            next: value => {
//                values[index] = value;
//                hasValue[index] = true;
               
//                if (hasValue.every(Boolean)) {
//                    try {
//                        subscriber.next(project(...values));
//                    } catch (err) {
//                        subscriber.error(err);
//                    }
//                }
//            },
//            error: err => subscriber.error(err),
//            complete: () => {
//                completed[index] = true;
//                if (--active === 0) {
//                subscriber.complete();
//                }
//            }
//            });
//        });
       
//        return () => subscriptions.forEach(sub => sub.unsubscribe());
//    });
// }

// /**
// * Waits for all input Observables to complete, then emits an array of their last values.
// * 
// * @template T Array of Observable types.
// * @param sources The Observables to combine.
// * @returns An Observable that emits an array of the last values from each input Observable when all complete.
// * 
// * @example
// * // Get the final values from multiple observables
// * forkJoin(
// *   of(1, 2, 3),
// *   of('a', 'b', 'c')
// * ).subscribe(([num, str]) => console.log(num, str));
// * // Output: 3, 'c'
// */
// export function forkJoin<T extends Observable<any>[]>(
//    ...sources: T
// ): Observable<{ [K in keyof T]: T[K] extends Observable<infer U> ? U : never }> {
//    return new Observable(subscriber => {
//        const length = sources.length;
//        if (length === 0) {
//            subscriber.complete();
//            return;
//        }
       
//        const values = new Array(length);
//        let completedCount = 0;
//     //    let emittedCount = 0;
       
//        const subscriptions = sources.map((source, index) => {
//            return source.subscribe({
//                next: value => {
//                    values[index] = value;
//                },
//                error: err => subscriber.error(err),
//                complete: () => {
//                    completedCount++;
//                    if (completedCount === length) {
//                        subscriber.next(values as any);
//                        subscriber.complete();
//                    }
//                }
//            });
//        });
       
//        return () => subscriptions.forEach(sub => sub.unsubscribe());
//    });
// }

// /**
// * Emits only the first `count` values from the source Observable.
// * 
// * @template T The type of values emitted by the source Observable.
// * @param count The maximum number of values to emit.
// * @returns A function that returns an Observable that emits at most `count` values.
// * 
// * @example
// * // Take only the first 3 values
// * of(1, 2, 3, 4, 5).pipe(take(3))
// *   .subscribe(val => console.log(val));
// * // Output: 1, 2, 3
// */
// export function take<T>(count: number): OperatorFunction<T, T> {
//    return (source: Observable<T>) => new Observable(subscriber => {
//        let taken = 0;
       
//        const subscription = source.subscribe({
//            next: value => {
//                if (taken++ < count) {
//                    subscriber.next(value);
//                    if (taken >= count) {
//                        subscriber.complete();
//                        subscription.unsubscribe();
//                    }
//                }
//            },
//            error: err => subscriber.error(err),
//            complete: () => subscriber.complete()
//        });
       
//        return subscription;
//    });
// }









// // /**
// // * Emits values from the source Observable only when they differ from the previous value.
// // * 
// // * @template T The type of values emitted by the source Observable.
// // * @param compare Optional comparison function (defaults to strict equality).
// // * @returns A function that returns an Observable that emits only distinct consecutive values.
// // * 
// // * @example
// // * // Only emit when the value changes
// // * of(1, 1, 2, 2, 3, 1).pipe(distinctUntilChanged())
// // *   .subscribe(val => console.log(val));
// // * // Output: 1, 2, 3, 1
// // */
// // export function distinctUntilChanged<T>(
// //    compare?: (x: T, y: T) => boolean
// // ): OperatorFunction<T, T> {
// //    return (source: Observable<T>) => new Observable(subscriber => {
// //        let previous: T;
// //        let first = true;
// //        const comparator = compare || ((x, y) => x === y);
       
// //        return source.subscribe({
// //            next: value => {
// //                if (first || !comparator(previous, value)) {
// //                    first = false;
// //                    previous = value;
// //                    subscriber.next(value);
// //                }
// //            },
// //            error: err => subscriber.error(err),
// //            complete: () => subscriber.complete()
// //        });
// //    });
// // }



export * from './from.js'
export * from './fromValue.js'
export * from './fromEvent.js'
export * from './forkJoin.js'
export * from './timer.js'
export * from './debounceTime.js'
export * from './of.js'
export * from './take.js'
export * from './takeLast.js'
export * from './takeUntil.js'
export * from './takeUntilValue.js'
export * from './takeFirst.js'
export * from './takeForTime.js'
export * from './takeWhile.js'
export * from './concat.js'
export * from './concatMap.js'
export * from './map.js'
export * from './merge.js'
export * from './mergeMap.js'
export * from './exhaustMap.js'
export * from './switchMap.js'
export * from './mergeMapDict.js'
export * from './tap.js'
export * from './combineLatest.js'
export * from './distinctUntilChanged.js'
export * from './filter.js'
export * from './fromEvent.js'
export * from './fromFetch.js'
export * from './fromArrayLike.js'
export * from './last.js'
export * from './timer.js'
export * from './partition.js'
export * from './pluck.js'
export * from './skip.js'
export * from './fromPromise.js'
export * from './toPromise.js'
export * from './empty.js'
export * from './throwIfEmpty.js'
export * from './defer.js'
export * from './single.js'
export * from './toArray.js'
export * from './find.js'
export * from './first.js'
export * from './findIndex.js'
export * from './min.js'
export * from './max.js'
export * from './combineLatest.js'
export * from './combineLatestAll.js'
export * from './combineLatestWith.js'
export * from './throwError.js'
export * from './zip.js'
export * from './throttle.js'
export * from './throttleTime.js'
export * from './buffer.js'
export * from './count.js'
export * from './range.js'
export * from './materialize.js'
export * from './dematerialize.js'
export * from './groupBy.js'
export * from './interval.js'
export * from './never.js'
// export * from './'
// export * from './'