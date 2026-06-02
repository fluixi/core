import { Observable, OperatorFunction, AsyncScheduler } from "@fluixi/reactive";

/**
 * Configuration options for throwIfEmpty
 */
export interface ThrowIfEmptyOptions {
    /**
     * Error factory function that creates the error to throw.
     * If not provided, a default error is thrown.
     * 
     * @default () => new EmptyError()
     */
    errorFactory?: () => any;
    
    /**
     * Scheduler to use for throwing the error.
     * If provided, the error is thrown asynchronously via the scheduler.
     * 
     * @default undefined // Throw synchronously
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Delay before throwing the error (in milliseconds).
     * Only applicable when scheduler is provided.
     * 
     * @default 0
     */
    delay?: number;
}

/**
 * Custom error class for empty observables
 */
export class EmptyError extends Error {
    constructor(message: string = 'no elements in sequence') {
        super(message);
        this.name = 'EmptyError';
        
        // Maintains proper stack trace in V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, EmptyError);
        }
    }
}

/**
 * Throws an error if the source Observable completes without emitting a value.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {ThrowIfEmptyOptions} [options] Configuration options.
 * @returns {OperatorFunction<T, T>} An operator function.
 * 
 * @example
 * // Basic usage
 * empty().pipe(throwIfEmpty()).subscribe({
 *   error: err => console.log(err.message) // 'no elements in sequence'
 * });
 * 
 * @example
 * // With custom error
 * source$.pipe(
 *   throwIfEmpty({
 *     errorFactory: () => new Error('Expected at least one value')
 *   })
 * ).subscribe(console.log);
 * 
 * @example
 * // Async error throwing
 * source$.pipe(
 *   throwIfEmpty({
 *     scheduler: asyncScheduler,
 *     delay: 1000
 *   })
 * ).subscribe(console.log);
 * 
 * @performance
 * - O(1) memory (only tracks if any value was emitted)
 * - Early detection on first emission
 * - Minimal overhead per emission
 * - Efficient scheduler integration
 */
export function throwIfEmpty<T>(
    options?: ThrowIfEmptyOptions
): OperatorFunction<T, T> {
    return (source: Observable<T>): Observable<T> => {
        return new Observable<T>((observer) => {
            let hasValue = false;
            let completed = false;
            
            const errorFactory = options?.errorFactory || (() => new EmptyError());
            const scheduler = options?.scheduler;
            const delay = options?.delay ?? 0;
            
            const subscription = source.subscribe({
                next: (value: T) => {
                    hasValue = true;
                    observer.next(value);
                },
                error: (err: unknown) => observer.error(err),
                complete: () => {
                    completed = true;
                    
                    if (!hasValue) {
                        const throwError = (): void => {
                            try {
                                const error = errorFactory();
                                observer.error(error);
                            } catch (err) {
                                observer.error(err);
                            }
                        };
                        
                        if (scheduler) {
                            // Schedule error throwing
                            scheduler.schedule(throwError, delay);
                        } else {
                            // Throw immediately
                            throwError();
                        }
                    } else {
                        observer.complete();
                    }
                }
            });
            
            // Cleanup function
            return () => {
                subscription.unsubscribe();
                
                // If we complete before any value and haven't thrown yet,
                // we should throw immediately on unsubscribe
                if (completed && !hasValue && scheduler) {
                    // For async errors, we need to check if we should still throw
                    // In practice, we'd cancel any scheduled error
                }
            };
        });
    };
}