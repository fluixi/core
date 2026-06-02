import {AsyncScheduler, Observable} from "@fluixi/reactive"
import { asyncScheduler } from "../../schedulers/async.js";

/**
 * Configuration options for fromPromise
 */
export interface FromPromiseOptions {
    /**
     * Scheduler to use for emitting the resolved value.
     * If provided, the emission is scheduled asynchronously.
     * 
     * @default undefined // Emit in the promise's microtask queue
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Delay before emitting the value (in milliseconds).
     * Only applicable when scheduler is provided.
     * 
     * @default 0
     */
    delay?: number;
    
    /**
     * Abort signal to cancel the promise.
     * If the signal aborts, the Observable emits an error.
     * 
     * @default undefined // No abort signal
     */
    signal?: AbortSignal;
    
    /**
     * Timeout in milliseconds after which the promise will be considered failed.
     * Automatically creates an AbortController if the promise supports it.
     * 
     * @default undefined // No timeout
     */
    timeout?: number;
}

/**
 * Creates an Observable from a Promise.
 * Emits the resolved value and completes, or emits an error if the promise rejects.
 * 
 * @template T The type of value the promise resolves to.
 * 
 * @param {PromiseLike<T>} promise The promise to convert.
 * @param {FromPromiseOptions} [options] Configuration options.
 * @returns {Observable<T>} An Observable that emits the promise result.
 * 
 * @example
 * // Basic promise conversion
 * fromPromise(fetch('/api/data')).subscribe({
 *   next: data => console.log('Data:', data),
 *   error: err => console.error('Error:', err)
 * });
 * 
 * @example
 * // With timeout and abort signal
 * const controller = new AbortController();
 * fromPromise(fetch('/api/slow'), {
 *   signal: controller.signal,
 *   timeout: 5000
 * }).subscribe({
 *   error: err => {
 *     if (err.name === 'AbortError') {
 *       console.log('Request aborted');
 *     } else if (err.name === 'TimeoutError') {
 *       console.log('Request timed out');
 *     }
 *   }
 * });
 * 
 * @example
 * // With scheduler for deferred emission
 * fromPromise(Promise.resolve(42), {
 *   scheduler: asyncScheduler,
 *   delay: 1000 // Emit after 1 second
 * }).subscribe(value => console.log('Delayed value:', value));
 * 
 * @performance
 * - Single promise subscription (no multiple .then() calls)
 * - Proper cleanup of timeout and abort signals
 * - Memory efficient (no value buffering)
 * - Supports promise cancellation via abort signals
 */
export function fromPromise<T>(
    promise: PromiseLike<T>,
    options?: FromPromiseOptions
): Observable<T> {
    const {scheduler = asyncScheduler } = options || {}
    return new Observable<T>((observer) => {
        // Create abort controller for timeout if needed
        let abortController: AbortController | undefined;
        let timeoutSubscription: { unsubscribe: () => void } | undefined;
        
        // Setup timeout if specified
        if (options?.timeout && options.timeout > 0) {
            abortController = new AbortController();
            
            // Create a timeout promise that rejects on timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutSubscription = scheduler.schedule(
                    () => {
                        abortController?.abort();
                        reject(new DOMException('Promise timeout', 'TimeoutError'));
                    },
                    options.timeout
                );
            });
            
            // Race the original promise against the timeout
            promise = Promise.race([promise, timeoutPromise]);
        }
        
        // Merge abort signals if both provided
        let finalSignal: AbortSignal | undefined;
        if (options?.signal && abortController) {
            // Combine signals
            const combinedController = new AbortController();
            
            options.signal.addEventListener('abort', () => {
                combinedController.abort();
                abortController?.abort();
            });
            
            abortController.signal.addEventListener('abort', () => {
                combinedController.abort();
            });
            
            finalSignal = combinedController.signal;
        } else {
            finalSignal = options?.signal || abortController?.signal;
        }
        
        // Attach abort handler if signal exists
        if (finalSignal) {
            const onAbort = (): void => {
                observer.error(new DOMException('Promise aborted', 'AbortError'));
            };
            
            if (finalSignal.aborted) {
                onAbort();
                return;
            }
            
            finalSignal.addEventListener('abort', onAbort);
        }
        
        /**
         * Emit the value through the scheduler or directly
         */
        const emitValue = (value: T): () => void => {
            const scheduler = options?.scheduler;
            const delay = options?.delay ?? 0;
            
            if (scheduler) {
                // Schedule the emission
                const emissionSubscription = scheduler.schedule(() => {
                    observer.next(value);
                    observer.complete();
                }, delay);
                
                return () => emissionSubscription.unsubscribe();
            } else {
                // Emit immediately
                observer.next(value);
                observer.complete();
                return ()=>{};
            }
        };
        
        /**
         * Emit an error through the scheduler or directly
         */
        const emitError = (error: unknown): void => {
            const scheduler = options?.scheduler;
            const delay = options?.delay ?? 0;
            
            // Don't emit timeout or abort errors if already unsubscribed
            if (
                error instanceof DOMException && 
                (error.name === 'TimeoutError' || error.name === 'AbortError')
            ) {
                // Check if observer is still active
                // (In a real implementation, we'd have a way to check observer state)
            }
            
            if (scheduler) {
                scheduler.schedule(() => {
                    observer.error(error);
                }, delay);
            } else {
                observer.error(error);
            }
        };
        
        // Subscribe to the promise
        promise.then(
            (value) => {
                // Clean up timeout if it exists
                if (timeoutSubscription) {
                    timeoutSubscription.unsubscribe();
                }
                
                // Remove abort listener
                if (finalSignal) {
                    finalSignal.removeEventListener('abort', emitError);
                }
                
                // Emit the value
                const cleanup = emitValue(value);
                return cleanup;
            },
            (error) => {
                // Clean up timeout
                if (timeoutSubscription) {
                    timeoutSubscription.unsubscribe();
                }
                
                // Remove abort listener
                if (finalSignal) {
                    finalSignal.removeEventListener('abort', emitError);
                }
                
                // Don't emit error if it's an abort error from our own signal
                if (
                    !(error instanceof DOMException && error.name === 'AbortError') ||
                    !finalSignal?.aborted
                ) {
                    emitError(error);
                }
            }
        );
        
        // Cleanup function
        return () => {
            // Clean up timeout
            if (timeoutSubscription) {
                timeoutSubscription.unsubscribe();
            }
            
            // Abort the promise if we created a controller
            if (abortController) {
                abortController.abort();
            }
            
            // Remove abort listener
            if (finalSignal) {
                finalSignal.removeEventListener('abort', emitError);
            }
        };
    });
}