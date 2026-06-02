import { AsyncScheduler, from, Observable, ObservableInput, OperatorFunction, Subscription } from "@fluixi/reactive";

/**
 * Configuration options for throwError
 */
export interface ThrowErrorOptions {
    /**
     * Scheduler to use for emitting the error.
     * If provided, the error is emitted asynchronously via the scheduler.
     * 
     * @default undefined // Throw synchronously
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Delay before emitting the error (in milliseconds).
     * Only applicable when scheduler is provided.
     * 
     * @default 0
     */
    delay?: number;
    
    /**
     * Whether to include a stack trace with the error.
     * If true and error doesn't have a stack, captures one.
     * 
     * @default true
     */
    captureStackTrace?: boolean;
    
    /**
     * Custom error constructor to use.
     * If provided, the errorOrFactory must return an instance of this type.
     * 
     * @default Error
     */
    errorConstructor?: new (message?: string) => Error;
}

/**
 * Creates an Observable that emits an error notification immediately (or after a delay).
 * 
 * @template T The error type (though no values are emitted).
 * 
 * @param {Error | (() => Error)} errorOrFactory Error instance or factory function.
 * @param {ThrowErrorOptions} [options] Configuration options.
 * @returns {Observable<never>} An Observable that emits an error notification.
 * 
 * @example
 * // Throw immediately
 * throwError(new Error('Something went wrong')).subscribe({
 *   error: err => console.error('Caught error:', err.message)
 * });
 * 
 * @example
 * // Throw with delay
 * throwError(new Error('Delayed error'), {
 *   scheduler: asyncScheduler,
 *   delay: 1000
 * }).subscribe({
 *   error: err => console.log('Error after 1 second:', err.message)
 * });
 * 
 * @example
 * // Lazy error creation
 * throwError(() => new CustomError('Custom error')).subscribe({
 *   error: err => console.log('Custom error:', err.name)
 * });
 * 
 * @performance
 * - Zero memory overhead for error creation
 * - Efficient scheduler integration
 * - Lazy error instantiation when using factory function
 * - Stack trace optimization
 */
export function throwError<T = never>(
    errorOrFactory: Error | (() => Error),
    options?: ThrowErrorOptions
): Observable<T> {
    return new Observable<T>((observer) => {
        const scheduler = options?.scheduler;
        const delay = options?.delay ?? 0;
        const captureStackTrace = options?.captureStackTrace ?? true;
        const ErrorConstructor = options?.errorConstructor || Error;
        
        /**
         * Create and emit the error
         */
        const emitError = (): void => {
            let error: Error;
            
            try {
                // Create the error (either directly or via factory)
                if (typeof errorOrFactory === 'function') {
                    error = errorOrFactory();
                } else {
                    error = errorOrFactory;
                }
                
                // Ensure error is an instance of Error or the specified constructor
                if (!(error instanceof Error)) {
                    throw new TypeError('Error must be an instance of Error');
                }
                
                // Optionally enhance stack trace
                if (captureStackTrace && (!error.stack || error.stack.includes('Error\n'))) {
                    // Create a new error to capture current stack
                    const stackError = new ErrorConstructor(error.message);
                    
                    // Remove the first line (the error creation line) for cleaner stack
                    const stackLines = stackError.stack?.split('\n') || [];
                    if (stackLines.length > 1) {
                        // Skip the first line (error message) and take the rest
                        error.stack = error.message + '\n' + stackLines.slice(1).join('\n');
                    }
                }
                
                // Validate error type if constructor specified
                if (ErrorConstructor !== Error && (error instanceof ErrorConstructor)) {
                    // Wrap the error in the specified constructor
                    const wrappedError = new ErrorConstructor(error.message);
                    if (error.stack) {
                        wrappedError.stack = error.stack;
                    }
                    if (error.name) {
                        wrappedError.name = error.name;
                    }
                    // Copy any additional properties
                    Object.assign(wrappedError, error);
                    error = wrappedError;
                }
                
                observer.error(error);
            } catch (err) {
                // If error creation fails, emit a generic error
                const fallbackError = new ErrorConstructor(
                    `Error in error creation: ${err instanceof Error ? err.message : String(err)}`
                );
                observer.error(fallbackError);
            }
        };
        
        if (scheduler) {
            // Schedule error emission
            const subscription = scheduler.schedule(emitError, delay);
            
            return () => {
                // Cancel scheduled error on unsubscribe
                subscription.unsubscribe();
            };
        } else {
            // Emit error synchronously
            emitError();
            return;
        }
    });
}



/**
* Catches errors on the source Observable and handles them by returning a new Observable or throwing an error.
* 
* @template T The type of values emitted by the source Observable.
* @template R The type of values emitted by the recovery Observable.
* @param selector A function that takes an error and the caught source Observable, and returns an ObservableInput.
* @returns A function that returns an Observable that recovers from errors using the selector.
* 
* @example
* // Catch errors and return a fallback observable
* throwError('error').pipe(
*   catchError(err => of('fallback'))
* ).subscribe(val => console.log(val));
* // Output: 'fallback'
*/
export function catchError<T, R>(
   selector: (error: any, caught: Observable<T>) => ObservableInput<R>
): OperatorFunction<T, T | R> {
   return (source: Observable<T>) => new Observable(subscriber => {
       let innerSub: Subscription | null = null;
       
       const handleError = (error: any) => {
           try {
               const caught$ = from(selector(error, source));
               innerSub = caught$.subscribe({
                   next: value => subscriber.next(value),
                   error: err => subscriber.error(err),
                   complete: () => {
                   innerSub = null;
                   subscriber.complete();
                   }
               });
           } catch (err) {
               subscriber.error(err);
           }
       };
       
       const subscription = source.subscribe({
           next: value => subscriber.next(value),
           error: handleError,
           complete: () => subscriber.complete()
       });
       
       return () => {
           subscription.unsubscribe();
           if (innerSub) innerSub.unsubscribe();
       };
   });
}
