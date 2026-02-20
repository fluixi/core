// import { Subscription, toPromise } from "@awc/reactive";

// import { toPromise } from "./operators/index.js";
import { Subscription } from "./subscription.js";

/**
 * Represents an object that can observe values emitted by an Observable.
 * 
 * @template T - The type of values being observed
 * @interface Observer
 * 
 * @property {function(value: T): void} [next] - Callback for next notifications
 * @property {function(error: any): void} [error] - Callback for error notifications
 * @property {function(): void} [complete] - Callback for complete notifications
 */
export interface Observer<T> {
    next: (value: T) => void;
    error: (error: any) => void;
    complete: () => void;
    closed?: boolean;
}

/**
 * Union type representing all possible inputs that can be converted to an Observable.
 * 
 * @template T - The type of values emitted by the Observable
 * @typedef {Observable<T>|PromiseLike<T>|ArrayLike<T>|Iterable<T>|(() => Iterator<T>)} ObservableInput
 */

/**
 * Type representing any iterator that can be consumed by the `from` function.
 * This includes both standard iterators and generator function results.
 * 
 * @template T - The type of values yielded by the iterator
 * @template TReturn - The type of value returned by the iterator (when done)
 * @template TNext - The type of value that can be passed to next()
 * @typedef {Iterator<T, TReturn, TNext> & { return?(value?: TReturn): IteratorResult<T, TReturn>; throw?(e?: any): IteratorResult<T, TReturn>; }} AnyIterator
 */
export type AnyIterator<T, TReturn = any, TNext = any> = 
    Iterator<T, TReturn, TNext> & { 
        return?(value?: TReturn): IteratorResult<T, TReturn>; 
        throw?(e?: any): IteratorResult<T, TReturn>; 
    };

/**
 * Enhanced ObservableInput type that includes iterator factory functions.
 * 
 * @template T - The type of values emitted by the Observable
 * @typedef {Observable<T>|PromiseLike<T>|ArrayLike<T>|Iterable<T>|(() => AnyIterator<T>) | (() => Generator<T, any, any>)} ObservableInput
 */
export type ObservableInput<T> =
    | Observable<T>                    // Already an Observable
    | PromiseLike<T>                   // Promise or thenable
    | ArrayLike<T>                     // Array or array-like (arguments, NodeList)
    | Iterable<T>                      // Generators, Sets, Maps, Strings
    | (() => AnyIterator<T>)          // Iterator factory function with proper typing
//     | (() => Generator<T, any, any>); // Generator function
// export type ObservableInput<T> =
//     | Observable<T>
//     | PromiseLike<T>
//     | ArrayLike<T>
//     | Iterable<T>
//     | (() => Iterator<T>);

/**
 * Extracts the value type from an ObservableInput.
 * 
 * @template O - The ObservableInput type to extract from
 * 
 * @example
 * // Returns number
 * type Num = ObservedValueOf<Promise<number>>;
 */
export type ObservedValueOf<O> = O extends ObservableInput<infer T> ? T : never;

/**
 * Type for operator functions that transform one Observable into another.
 * 
 * @template T - The input value type
 * @template R - The output value type
 * @typedef {function(source: Observable<T>): Observable<R>} OperatorFunction
 */
export type OperatorFunction<T, R> = (source: Observable<T>) => Observable<R>;

/**
 * Type for unary operator functions (operators that take one parameter).
 * 
 * @template T - The input value type
 * @template R - The output value type
 * @template A - The type of the operator's parameter
 * @typedef {function(arg: A): OperatorFunction<T, R>} UnaryOperatorFunction
 */
export type UnaryOperatorFunction<T, R, A> = (arg: A) => OperatorFunction<T, R>;

/**
 * Type for binary operator functions (operators that take two parameters).
 * 
 * @template T - The input value type
 * @template R - The output value type
 * @template A - The type of the first parameter
 * @template B - The type of the second parameter
 * @typedef {function(arg1: A, arg2: B): OperatorFunction<T, R>} BinaryOperatorFunction
 */
export type BinaryOperatorFunction<T, R, A, B> = (arg1: A, arg2: B) => OperatorFunction<T, R>;

/**
 * A subscriber is both an Observer and a Subscription.
 * This is the object that gets passed to the Observable's subscribe function.
 * 
 * @template T - The type of values being observed
 * @class Subscriber
 * @extends {Subscription}
 * @implements {Observer<T>}
 */
export class Subscriber<T> extends Subscription implements Observer<T> {
    /** @private */ protected isStopped = false;
    /** @private */ protected destination: Partial<Observer<T>>;
    
    /**
     * Creates a new Subscriber.
     * 
     * @param {Partial<Observer<T>>|((value: T) => void)} [destinationOrNext] - 
     *        Either an observer object or a next handler function
     * @param {(error: any) => void} [error] - Error handler (if first param is next function)
     * @param {() => void} [complete] - Complete handler (if first param is next function)
     */
    constructor(
        destinationOrNext?: Partial<Observer<T>> | ((value: T) => void),
        error?: (error: any) => void,
        complete?: () => void
    ) {
        super();
        
        // Normalize arguments to observer object
        let observer: Partial<Observer<T>>;
        
        if (!destinationOrNext) {
            observer = {};
        } else if (typeof destinationOrNext === 'object') {
            observer = destinationOrNext;
        } else {
            observer = {
                next: destinationOrNext,
                error: error,
                complete: complete
            };
        }
        
        this.destination = observer;
    }
    
    /**
     * Sends the next value to the observer.
     * 
     * @param {T} value - The value to send
     * @returns {void}
     */
    next(value: T): void {
        if (!this.isStopped && this.destination.next) {
            try {
                this.destination.next(value);
            } catch (error) {
                this.error(error);
            }
        }
    }
    
    /**
     * Sends an error notification to the observer.
     * 
     * @param {any} err - The error to send
     * @returns {void}
     */
    error(err: any): void {
        if (!this.isStopped) {
            this.isStopped = true;
            if (this.destination.error) {
                try {
                    this.destination.error(err);
                } catch (error) {
                    // Rethrow if error handler throws
                    throw error;
                }
            } else {
                throw err;
            }
            this.unsubscribe();
        }
    }
    
    /**
     * Sends a complete notification to the observer.
     * 
     * @returns {void}
     */
    complete(): void {
        if (!this.isStopped) {
            this.isStopped = true;
            if (this.destination.complete) {
                try {
                    this.destination.complete();
                } catch (error) {
                    this.error(error);
                    return;
                }
            }
            this.unsubscribe();
        }
    }
    
    /**
     * Unsubscribes the subscriber.
     * 
     * @returns {void}
     */
    override unsubscribe(): void {
        if (this.closed) {
            return;
        }
        this.isStopped = true;
        super.unsubscribe();
    }
}

/**
 * SafeSubscriber adds extra safety checks to prevent reentrant calls.
 * 
 * @template T - The type of values being observed
 * @class SafeSubscriber
 * @extends {Subscriber<T>}
 */
export class SafeSubscriber<T> extends Subscriber<T> {
    /** @private */ private _isUnsubscribing = false;
    /** @private */ private _parentSubscriber: Subscriber<any> | null = null;
    
    constructor(
        observerOrNext?: Partial<Observer<T>> | ((value: T) => void),
        error?: (error: any) => void,
        complete?: () => void,
        parentSubscriber?: Subscriber<any>
    ) {
        super(observerOrNext, error, complete);
        this._parentSubscriber = parentSubscriber || null;
    }
    
    override next(value: T): void {
        if (!this.isStopped && !this._isUnsubscribing) {
            // Use try-catch to ensure errors don't break the subscriber
            try {
                super.next(value);
            } catch (error) {
                this.error(error);
            }
        }
    }
    
    override error(err: any): void {
        if (!this.isStopped && !this._isUnsubscribing) {
            this._isUnsubscribing = true;
            try {
                super.error(err);
            } finally {
                this._isUnsubscribing = false;
            }
        }
    }
    
    override complete(): void {
        if (!this.isStopped && !this._isUnsubscribing) {
            this._isUnsubscribing = true;
            try {
                super.complete();
            } finally {
                this._isUnsubscribing = false;
            }
        }
    }
    
    override unsubscribe(): void {
        if (this.closed) {
            return;
        }
        this._isUnsubscribing = true;
        super.unsubscribe();
        this._isUnsubscribing = false;
    }
}

export interface OperateConfig<In, Out> extends Observer<In> {
    /**
     * The destination subscriber to forward notifications to. This is also the
     * subscriber that will receive unhandled errors if your `next`, `error`, or `complete`
     * overrides throw.
     */
    destination: Subscriber<Out>;
  }

export function operate<T>(destination: Observer<T>) {
    return new Subscriber(destination.next, destination.error, destination.complete);
}

/**
 * A representation of any set of values over any amount of time.
 * This is the most basic building block of RxJS.
 * 
 * @template T - The type of values emitted by the Observable
 * @class Observable
 * 
 * @example
 * // Create an Observable from scratch
 * const observable = new Observable<string>(subscriber => {
 *   subscriber.next('Hello');
 *   subscriber.next('World');
 *   subscriber.complete();
 *   
 *   return () => console.log('Cleanup');
 * });
 * 
 * @example
 * // Subscribe to an Observable
 * const subscription = observable.subscribe({
 *   next: value => console.log(value),
 *   error: err => console.error(err),
 *   complete: () => console.log('Done')
 * });
 * 
 * // Later, unsubscribe
 * subscription.unsubscribe();
 */
// export class Observable<T> extends Subscription {
//     constructor(
//         private _subscribeFn: (observer: Observer<T>) => void | (() => void) | Subscription
//       ) {
//         super()
//       }
    
//       subscribe(observer: Partial<Observer<T>> | ((v: T) => void)): Subscription {
//         const finalObserver: Observer<T> =
//           typeof observer === "function"
//             ? { next: observer, error: () => {}, complete: () => {} }
//             : {
//                 next: observer.next!,
//                 error: observer.error,
//                 complete: observer.complete
//               } as Observer<T>;
    
//         const subscription = new Subscription();
    
//         const teardown = this._subscribeFn(finalObserver);
//         if (typeof teardown === "function") {
//           subscription.add(teardown);
//         }
    
//         return subscription;
//       }
    

//     /** Fully dynamic variadic pipe */
//     pipe(): Observable<T>;
//     pipe<A>(op1: OperatorFunction<T, A>): Observable<A>;
//     pipe<A, B>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>): Observable<B>;
//     pipe<A, B, C>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>): Observable<C>;
//     pipe<A, B, C, D>(
//         op1: OperatorFunction<T, A>,
//         op2: OperatorFunction<A, B>,
//         op3: OperatorFunction<B, C>,
//         op4: OperatorFunction<C, D>
//     ): Observable<D>;
//     pipe<A, B, C, D, E>(
//         op1: OperatorFunction<T, A>,
//         op2: OperatorFunction<A, B>,
//         op3: OperatorFunction<B, C>,
//         op4: OperatorFunction<C, D>,
//         op5: OperatorFunction<D, E>
//     ): Observable<E>;
//     // generic fallback for >5 operators (loses some inference but keeps runtime behavior)
//     pipe(...ops: OperatorFunction<any, any>[]): Observable<any> {
//         if (ops.length === 0) return this;
//         return ops.reduce((prev, fn) => fn(prev), this as any);
//     }

// }
export class Observable<T> extends Subscription {
    /**
     * The function that is called when the Observable is subscribed to.
     * This function is given a Subscriber to which new values can be `next`ed,
     * or an `error` or `complete` notification can be sent.
     * 
     * @private
     * @type {function(Subscriber<T>): (void | (() => void) | Subscription)}
     */
    private _subscribe: (subscriber: Subscriber<T>) => void | (() => void) | Subscription;
    
    /**
     * Creates a new Observable.
     * 
     * @param {function(Subscriber<T>): (void | (() => void) | Subscription)} subscribe - 
     *        The function that is called when the Observable is subscribed to
     */
    constructor(
        subscribe: (subscriber: Subscriber<T>) => void | (() => void) | Subscription
    ) {
        super()
        if (subscribe) {
            this._subscribe = subscribe;
        } else {
            throw new TypeError('Observable constructor requires a subscribe function');
        }
    }
    
    /**
     * Invokes an execution of an Observable and registers Observer handlers for notifications it will emit.
     * 
     * @overload
     * @returns {Subscription} A subscription object
     * 
     * @overload
     * @param {function(value: T): void} next - A function to handle next notifications
     * @returns {Subscription} A subscription object
     * 
     * @overload
     * @param {function(value: T): void} next - A function to handle next notifications
     * @param {function(error: any): void} error - A function to handle error notifications
     * @returns {Subscription} A subscription object
     * 
     * @overload
     * @param {function(value: T): void} next - A function to handle next notifications
     * @param {function(error: any): void} error - A function to handle error notifications
     * @param {function(): void} complete - A function to handle complete notifications
     * @returns {Subscription} A subscription object
     * 
     * @overload
     * @param {Partial<Observer<T>>} observer - An observer object
     * @returns {Subscription} A subscription object
     * 
     * @example
     * // Subscribe with separate handlers
     * observable.subscribe(
     *   value => console.log(value),
     *   error => console.error(error),
     *   () => console.log('Complete')
     * );
     * 
     * @example
     * // Subscribe with observer object
     * observable.subscribe({
     *   next: value => console.log(value),
     *   error: error => console.error(error),
     *   complete: () => console.log('Complete')
     * });
     * 
     * @throws {TypeError} If the observer is not an object or function
     */
    subscribe(): Subscription;
    subscribe(next: (value: T) => void): Subscription;
    subscribe(next: (value: T) => void, error: (error: any) => void): Subscription;
    subscribe(next: (value: T) => void, error: (error: any) => void, complete: () => void): Subscription;
    subscribe(observer: Partial<Observer<T>>): Subscription;
    
    subscribe(
        observerOrNext?: Partial<Observer<T>> | ((value: T) => void),
        error?: (error: any) => void,
        complete?: () => void
    ): Subscription {
        // Create subscriber
        let subscriber: Subscriber<T>;
        
        if (observerOrNext instanceof Subscriber) {
            subscriber = observerOrNext;
        } else {
            subscriber = new SafeSubscriber(observerOrNext, error, complete);
        }
        
        // Add finalization logic
        const { _subscribe } = this;
        
        // Call the subscribe function
        try {
            const result = _subscribe.call(this, subscriber);
            
            // Handle return value (could be a cleanup function or subscription)
            if (result) {
                if (typeof result === 'function') {
                    subscriber.add(result);
                } else if (typeof result.unsubscribe === 'function') {
                    subscriber.add(result);
                }
            }
        } catch (err) {
            // If subscribe function throws, error the subscriber
            subscriber.error(err);
        }
        
        return subscriber;
    }
    
    /**
     * Used to stitch together functional operators into a chain.
     * Returns a new Observable that is the result of applying all specified operators
     * to the source Observable.
     * 
     * @overload
     * @returns {Observable<T>} The source Observable unchanged
     * 
     * @overload
     * @template A
     * @param {OperatorFunction<T, A>} op1 - First operator
     * @returns {Observable<A>} Observable transformed by op1
     * 
     * @overload
     * @template A, B
     * @param {OperatorFunction<T, A>} op1 - First operator
     * @param {OperatorFunction<A, B>} op2 - Second operator
     * @returns {Observable<B>} Observable transformed by op1 and op2
     * 
     * @overload
     * @template A, B, C
     * @param {OperatorFunction<T, A>} op1 - First operator
     * @param {OperatorFunction<A, B>} op2 - Second operator
     * @param {OperatorFunction<B, C>} op3 - Third operator
     * @returns {Observable<C>} Observable transformed by all operators
     * 
     * @overload
     * @template A, B, C, D
     * @param {OperatorFunction<T, A>} op1 - First operator
     * @param {OperatorFunction<A, B>} op2 - Second operator
     * @param {OperatorFunction<B, C>} op3 - Third operator
     * @param {OperatorFunction<C, D>} op4 - Fourth operator
     * @returns {Observable<D>} Observable transformed by all operators
     * 
     * @overload
     * @template A, B, C, D, E
     * @param {OperatorFunction<T, A>} op1 - First operator
     * @param {OperatorFunction<A, B>} op2 - Second operator
     * @param {OperatorFunction<B, C>} op3 - Third operator
     * @param {OperatorFunction<C, D>} op4 - Fourth operator
     * @param {OperatorFunction<D, E>} op5 - Fifth operator
     * @returns {Observable<E>} Observable transformed by all operators
     * 
     * @overload
     * @template A, B, C, D, E, F
     * @param {OperatorFunction<T, A>} op1 - First operator
     * @param {OperatorFunction<A, B>} op2 - Second operator
     * @param {OperatorFunction<B, C>} op3 - Third operator
     * @param {OperatorFunction<C, D>} op4 - Fourth operator
     * @param {OperatorFunction<D, E>} op5 - Fifth operator
     * @param {OperatorFunction<E, F>} op6 - Sixth operator
     * @returns {Observable<F>} Observable transformed by all operators
     * 
     * @overload
     * @template A, B, C, D, E, F, G
     * @param {OperatorFunction<T, A>} op1 - First operator
     * @param {OperatorFunction<A, B>} op2 - Second operator
     * @param {OperatorFunction<B, C>} op3 - Third operator
     * @param {OperatorFunction<C, D>} op4 - Fourth operator
     * @param {OperatorFunction<D, E>} op5 - Fifth operator
     * @param {OperatorFunction<E, F>} op6 - Sixth operator
     * @param {OperatorFunction<F, G>} op7 - Seventh operator
     * @returns {Observable<G>} Observable transformed by all operators
     * 
     * @overload
     * @template A, B, C, D, E, F, G, H
     * @param {OperatorFunction<T, A>} op1 - First operator
     * @param {OperatorFunction<A, B>} op2 - Second operator
     * @param {OperatorFunction<B, C>} op3 - Third operator
     * @param {OperatorFunction<C, D>} op4 - Fourth operator
     * @param {OperatorFunction<D, E>} op5 - Fifth operator
     * @param {OperatorFunction<E, F>} op6 - Sixth operator
     * @param {OperatorFunction<F, G>} op7 - Seventh operator
     * @param {OperatorFunction<G, H>} op8 - Eighth operator
     * @returns {Observable<H>} Observable transformed by all operators
     * 
     * @overload
     * @template A, B, C, D, E, F, G, H, I
     * @param {OperatorFunction<T, A>} op1 - First operator
     * @param {OperatorFunction<A, B>} op2 - Second operator
     * @param {OperatorFunction<B, C>} op3 - Third operator
     * @param {OperatorFunction<C, D>} op4 - Fourth operator
     * @param {OperatorFunction<D, E>} op5 - Fifth operator
     * @param {OperatorFunction<E, F>} op6 - Sixth operator
     * @param {OperatorFunction<F, G>} op7 - Seventh operator
     * @param {OperatorFunction<G, H>} op8 - Eighth operator
     * @param {OperatorFunction<H, I>} op9 - Ninth operator
     * @returns {Observable<I>} Observable transformed by all operators
     * 
     * @example
     * // Simple pipeline
     * source$.pipe(
     *   map(x => x * 2),
     *   filter(x => x > 10)
     * ).subscribe(console.log);
     * 
     * @example
     * // Complex pipeline
     * source$.pipe(
     *   debounceTime(300),
     *   distinctUntilChanged(),
     *   switchMap(query => api.search(query)),
     *   catchError(err => of([]))
     * ).subscribe(results => {
     *   // Handle results
     * });
     */
    pipe(): Observable<T>;
    pipe<A>(op1: OperatorFunction<T, A>): Observable<A>;
    pipe<A, B>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>): Observable<B>;
    pipe<A, B, C>(
        op1: OperatorFunction<T, A>,
        op2: OperatorFunction<A, B>,
        op3: OperatorFunction<B, C>
    ): Observable<C>;
    pipe<A, B, C, D>(
        op1: OperatorFunction<T, A>,
        op2: OperatorFunction<A, B>,
        op3: OperatorFunction<B, C>,
        op4: OperatorFunction<C, D>
    ): Observable<D>;
    pipe<A, B, C, D, E>(
        op1: OperatorFunction<T, A>,
        op2: OperatorFunction<A, B>,
        op3: OperatorFunction<B, C>,
        op4: OperatorFunction<C, D>,
        op5: OperatorFunction<D, E>
    ): Observable<E>;
    pipe<A, B, C, D, E, F>(
        op1: OperatorFunction<T, A>,
        op2: OperatorFunction<A, B>,
        op3: OperatorFunction<B, C>,
        op4: OperatorFunction<C, D>,
        op5: OperatorFunction<D, E>,
        op6: OperatorFunction<E, F>
    ): Observable<F>;
    pipe<A, B, C, D, E, F, G>(
        op1: OperatorFunction<T, A>,
        op2: OperatorFunction<A, B>,
        op3: OperatorFunction<B, C>,
        op4: OperatorFunction<C, D>,
        op5: OperatorFunction<D, E>,
        op6: OperatorFunction<E, F>,
        op7: OperatorFunction<F, G>
    ): Observable<G>;
    pipe<A, B, C, D, E, F, G, H>(
        op1: OperatorFunction<T, A>,
        op2: OperatorFunction<A, B>,
        op3: OperatorFunction<B, C>,
        op4: OperatorFunction<C, D>,
        op5: OperatorFunction<D, E>,
        op6: OperatorFunction<E, F>,
        op7: OperatorFunction<F, G>,
        op8: OperatorFunction<G, H>
    ): Observable<H>;
    pipe<A, B, C, D, E, F, G, H, I>(
        op1: OperatorFunction<T, A>,
        op2: OperatorFunction<A, B>,
        op3: OperatorFunction<B, C>,
        op4: OperatorFunction<C, D>,
        op5: OperatorFunction<D, E>,
        op6: OperatorFunction<E, F>,
        op7: OperatorFunction<F, G>,
        op8: OperatorFunction<G, H>,
        op9: OperatorFunction<H, I>
    ): Observable<I>;
    
    pipe(...operations: OperatorFunction<any, any>[]): Observable<any> {
        if (operations.length === 0) {
            return this;
        }
        
        // Apply operators in sequence
        return operations.reduce(
            (prev: Observable<any>, fn: OperatorFunction<any, any>) => fn(prev),
            this as Observable<any>
        );
    }
    
    /**
     * Converts the Observable to a Promise.
     * The Promise resolves with the last emitted value when the Observable completes,
     * or rejects if the Observable errors.
     * 
     * @returns {Promise<T | undefined>} A Promise that resolves with the last value
     * 
     * @example
     * // Convert Observable to Promise
     * const value = await of(1, 2, 3).toPromise();
     * console.log(value); // 3
     * 
     * @example
     * // Handle empty Observable
     * const value = await EMPTY.toPromise();
     * console.log(value); // undefined
     */
    toPromise(): Promise<T | undefined> {
        return new Promise((resolve, reject) => {
            let lastValue: T | undefined;
            
            this.subscribe({
                next: value => lastValue = value,
                error: reject,
                complete: () => resolve(lastValue)
            });
        });
    }
}


// Observable.prototype.toPromise = toPromise;