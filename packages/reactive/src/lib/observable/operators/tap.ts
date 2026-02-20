import { Observable, Observer, OperatorFunction } from '@awc/reactive'

/**
 * Used to perform side effects for notifications from the source Observable,
 * and returns an Observable that is identical to the source.
 * 
 * This operator is useful for debugging, logging, or performing actions that
 * shouldn't affect the stream of values. It's similar to "tap into" the stream.
 * 
 * @template T - The type of values emitted by the source Observable
 * 
 * @overload
 * @returns {OperatorFunction<T, T>} An identity operator (no side effects)
 * 
 * @overload
 * @param {function(value: T): void} next - Function to call for each next notification
 * @returns {OperatorFunction<T, T>} Operator that taps into next notifications
 * 
 * @overload
 * @param {Partial<Observer<T>>} observer - Observer object with next, error, and/or complete handlers
 * @returns {OperatorFunction<T, T>} Operator that taps into all notifications
 * 
 * @overload
 * @param {function(value: T): void} next - Function for next notifications
 * @param {function(error: any): void} error - Function for error notifications
 * @param {function(): void} complete - Function for complete notifications
 * @returns {OperatorFunction<T, T>} Operator that taps into all notifications
 * 
 * @example
* // Basic logging
* of(1, 2, 3).pipe(
*   tap(value => console.log('Before:', value)),
*   map(x => x * 2),
*   tap(value => console.log('After:', value))
* ).subscribe();
* // Output: Before: 1, After: 2, Before: 2, After: 4, Before: 3, After: 6
* 
* @example
* // Full observer with error and complete handling
* const observable = new Observable<number>(subscriber => {
*   subscriber.next(1);
*   subscriber.next(2);
*   subscriber.error(new Error('Test error'));
* });
* 
* observable.pipe(
*   tap({
*     next: value => console.log('Next:', value),
*     error: err => console.error('Error in tap:', err),
*     complete: () => console.log('Complete')
*   })
* ).subscribe({
*   error: err => console.error('Error in subscribe:', err)
* });
* // Output: Next: 1, Next: 2, Error in tap: Error: Test error, Error in subscribe: Error: Test error
* 
* @example
* // Using separate handlers
* of(1, 2, 3).pipe(
*   tap(
*     value => console.log('Value:', value),
*     err => console.error('Error:', err),
*     () => console.log('Stream completed')
*   )
* ).subscribe();
* // Output: Value: 1, Value: 2, Value: 3, Stream completed
* 
* @example
* // Performance monitoring
* const startTime = Date.now();
* 
* someAsyncOperation().pipe(
*   tap(() => {
*     const duration = Date.now() - startTime;
*     console.log(`Operation took ${duration}ms`);
*   })
* ).subscribe(result => {
*   console.log('Result:', result);
* });
* 
* @example
* // State modification (use with caution)
* let lastValue: number | null = null;
* 
* of(1, 2, 3).pipe(
*   tap(value => {
*     lastValue = value;
*     console.log('Updated lastValue to:', lastValue);
*   })
* ).subscribe();
* 
* @example
* // Debugging with stack traces
* of(1, 2, 3).pipe(
*   tap({
*     next: value => {
*       console.log('Value emitted:', value);
*       console.trace('Emission stack trace');
*     }
*   })
* ).subscribe();
* 
* @example
* // Error handling in tap
* of(1, 2, 3).pipe(
*   tap(value => {
*     if (value === 2) throw new Error('Tap error');
*   }),
*   catchError(err => {
*     console.error('Caught error:', err.message);
*     return of(0);
*   })
* ).subscribe(value => console.log('Value:', value));
* // Output: Value: 1, Caught error: Tap error, Value: 0
* 
* @note Errors in next handlers propagate to the error channel
* @note Errors in error handlers do NOT propagate (they're caught and ignored)
* @note Errors in complete handlers propagate to the error channel
* @note tap doesn't modify values; it's for side effects only
*/
export function tap<T>(): OperatorFunction<T, T>;
export function tap<T>(
   next: (value: T) => void
): OperatorFunction<T, T>;
export function tap<T>(
   observer: Partial<Observer<T>>
): OperatorFunction<T, T>;
export function tap<T>(
   next?: ((value: T) => void) | Partial<Observer<T>>,
   error?: (error: any) => void,
   complete?: () => void
): OperatorFunction<T, T> {
   return (source: Observable<T>) => new Observable<T>(subscriber => {
       // Normalize arguments to observer object
        const defaultnext = (value: T) => subscriber.next(value);
        const defaulterror = (err: any) => subscriber.error(err);
        const defaultcomplete = () => subscriber.complete();
        const observer: Partial<Observer<T>> = (() => {
            if (typeof next === 'function') {
                return { next, error, complete };
            } else if (next && typeof next === 'object') {
                return next;
            } else {
                return {};
            }
        })();
        observer.next = observer.next || defaultnext;
        observer.error = observer.error || defaulterror;
        observer.complete = observer.complete || defaultcomplete;
        
        const subscription = source.subscribe({
            next: (value: T) => {
                try {
                    observer.next!(value);
                } catch (err) {
                    //   console.log('error on tap subscriber', err);
                    subscriber.error!(err);
                    return;
                }
                subscriber.next!(value);
            },
            error: (err: any) => {
                try {
                    observer.error!(err);
                } catch (tapError) {
                    // Don't propagate errors from error handler
                    console.warn('Error in tap error handler:', tapError);
                }
                subscriber.error!(err);
            },
            complete: () => {
                try {
                    observer.complete!();
                } catch (err) {
                    subscriber.error!(err);
                    return;
                }
                subscriber.complete!();
            }
        });
        
        return ()=>subscription.unsubscribe();
   });
}

/**
* Creates a tap operator that logs values with a label.
* 
* @template T - The type of values emitted by the source
* @param {string} label - Label to prefix log messages with
* @param {'log'|'warn'|'error'|'info'} [level='log'] - Console method to use
* @returns {OperatorFunction<T, T>} Operator that logs values
* 
* @example
* // Debug logging with label
* of(1, 2, 3).pipe(
*   tapLog('Before map'),
*   map(x => x * 2),
*   tapLog('After map', 'warn')
* ).subscribe();
*/
export function tapLog<T>(
   label: string,
   level: 'log' | 'warn' | 'error' | 'info' = 'log'
): OperatorFunction<T, T> {
   return tap(value => {
       const log = console[level];
       log(`${label}:`, value);
   });
}

/**
* Creates a tap operator that measures time between emissions.
* 
* @template T - The type of values emitted by the source
* @param {string} [label='Emission'] - Label for the timing log
* @returns {OperatorFunction<T, T>} Operator that logs timing information
* 
* @example
* // Measure time between clicks
* fromEvent(document, 'click').pipe(
*   tapTiming('Click interval')
* ).subscribe();
*/
export function tapTiming<T>(
   label: string = 'Emission'
): OperatorFunction<T, T> {
   let lastTime = Date.now();
   
   return tap(() => {
       const now = Date.now();
       const elapsed = now - lastTime;
       console.log(`${label}: ${elapsed}ms`);
       lastTime = now;
   });
}

/**
* Creates a tap operator that counts emissions.
* 
* @template T - The type of values emitted by the source
* @param {string} [label='Count'] - Label for the count log
* @returns {OperatorFunction<T, T>} Operator that logs emission count
* 
* @example
* // Count how many times a button is clicked
* fromEvent(button, 'click').pipe(
*   tapCount('Button clicks')
* ).subscribe();
*/
export function tapCount<T>(
   label: string = 'Count'
): OperatorFunction<T, T> {
   let count = 0;
   
   return tap(() => {
       count++;
       console.log(`${label}: ${count}`);
   });
}

/**
* Creates a tap operator that performs an action only on the first emission.
* 
* @template T - The type of values emitted by the source
* @param {function(value: T): void} action - Action to perform on first emission
* @returns {OperatorFunction<T, T>} Operator that taps first emission
* 
* @example
* // Log only the first value
* of(1, 2, 3).pipe(
*   tapFirst(value => console.log('First value:', value))
* ).subscribe();
* // Output: First value: 1
*/
export function tapFirst<T>(
   action: (value: T) => void
): OperatorFunction<T, T> {
   let isFirst = true;
   
   return tap(value => {
       if (isFirst) {
           action(value);
           isFirst = false;
       }
   });
}

/**
* Creates a tap operator that performs an action only on the last emission.
* 
* @template T - The type of values emitted by the source
* @param {function(value: T): void} action - Action to perform on last emission
* @returns {OperatorFunction<T, T>} Operator that taps last emission
* 
* @example
* // Log only the last value
* of(1, 2, 3).pipe(
*   tapLast(value => console.log('Last value:', value))
* ).subscribe();
* // Output: Last value: 3
*/
export function tapLast<T>(
   action: (value: T) => void
): OperatorFunction<T, T> {
   let lastValue: T | undefined;
   
   return tap({
       next: value => { lastValue = value; },
       complete: () => {
           if (lastValue !== undefined) {
               action(lastValue);
           }
       }
   });
}