import {Observable, AsyncScheduler} from "@fluixi/reactive"
import { asyncScheduler } from "@fluixi/reactive/schedulers/async";
/**
 * Options for toPromise conversion
 */
export interface ToPromiseOptions<T> {
    /**
     * Scheduler to use for promise resolution.
     * 
     * @default undefined // Use the observable's natural timing
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Timeout in milliseconds after which the promise rejects.
     * 
     * @default undefined // No timeout
     */
    timeout?: number;
    
    /**
     * The value to resolve with if the observable completes without emitting.
     * 
     * @default undefined
     */
    defaultValue?: T;
    
    /**
     * Strategy for which value to resolve with:
     * - 'first': Resolve with the first emitted value
     * - 'last': Resolve with the last emitted value (default)
     * - 'single': Resolve with the single value, reject if 0 or multiple values
     * 
     * @default 'last'
     */
    strategy?: 'first' | 'last' | 'single';
    
    /**
     * Abort signal to cancel the promise.
     * 
     * @default undefined // No abort signal
     */
    signal?: AbortSignal;
}

// // Add toPromise method to Observable class
// declare module './observable' {
//     interface Observable<T> {
//         /**
//          * Converts this Observable to a Promise.
//          * The Promise resolves with a value based on the chosen strategy,
//          * or rejects if the observable errors or times out.
//          * 
//          * @param {ToPromiseOptions<T>} [options] Conversion options.
//          * @returns {Promise<T | undefined>} A Promise that resolves with the value.
//          * 
//          * @example
//          * // Basic usage (last value)
//          * const value = await observable.toPromise();
//          * 
//          * @example
//          * // First value with timeout
//          * const value = await observable.toPromise({
//          *   strategy: 'first',
//          *   timeout: 5000
//          * });
//          * 
//          * @example
//          * // With abort signal
//          * const controller = new AbortController();
//          * const promise = observable.toPromise({
//          *   signal: controller.signal
//          * });
//          * 
//          * // Cancel after 1 second
//          * setTimeout(() => controller.abort(), 1000);
//          * 
//          * @performance
//          * - Single subscription to source
//          * - Efficient value storage based on strategy
//          * - Proper cleanup on timeout/abort
//          * - Memory efficient (minimal buffering)
//          */
//         toPromise(options?: ToPromiseOptions<T>): Promise<T | undefined>;
//     }
// }

// Implementation of toPromise method
export function toPromise<T>(
    this: Observable<T>,
    options?: ToPromiseOptions<T>
): Promise<T | undefined> {
    return new Promise<T | undefined>((resolve, reject) => {
        const strategy = options?.strategy || 'last';
        const scheduler = options?.scheduler;
        const signal = options?.signal;
        const defaultValue = options?.defaultValue;
        
        // Track values based on strategy
        let lastValue: T | undefined;
        let firstValue: T | undefined;
        let hasValue = false;
        let valueCount = 0;
        let completed = false;
        let errored = false;
        
        // Timeout handling
        let timeoutSubscription: { unsubscribe: () => void } | undefined;
        if (options?.timeout && options.timeout > 0) {
            const timeoutScheduler = scheduler || asyncScheduler;
            timeoutSubscription = timeoutScheduler.schedule(() => {
                if (!completed && !errored) {
                    cleanup();
                    reject(new DOMException('toPromise timeout', 'TimeoutError'));
                }
            }, options.timeout);
        }
        
        // Abort signal handling
        const onAbort = (): void => {
            if (!completed && !errored) {
                cleanup();
                reject(new DOMException('toPromise aborted', 'AbortError'));
            }
        };
        
        if (signal) {
            if (signal.aborted) {
                onAbort();
                return;
            }
            signal.addEventListener('abort', onAbort);
        }
        
        // Subscription to the observable
        const subscription = this.subscribe({
            next: (value: T) => {
                valueCount++;
                hasValue = true;
                
                // Store based on strategy
                if (strategy === 'first' && firstValue === undefined) {
                    firstValue = value;
                    
                    // For 'first' strategy, we can resolve immediately
                    if (strategy === 'first') {
                        cleanup();
                        resolveWithScheduler(value);
                    }
                }
                
                // Always store last value for 'last' strategy
                if (strategy === 'last' || strategy === 'single') {
                    lastValue = value;
                }
                
                // For 'single' strategy with multiple values, reject
                if (strategy === 'single' && valueCount > 1) {
                    cleanup();
                    reject(new Error(
                        `Expected single emission, but got ${valueCount} values`
                    ));
                }
            },
            error: (err: unknown) => {
                errored = true;
                cleanup();
                reject(err);
            },
            complete: () => {
                completed = true;
                
                // Determine which value to resolve with
                let resolvedValue: T | undefined;
                
                switch (strategy) {
                    case 'first':
                        resolvedValue = firstValue;
                        break;
                    case 'last':
                        resolvedValue = lastValue;
                        break;
                    case 'single':
                        if (valueCount === 1) {
                            resolvedValue = lastValue;
                        } else if (valueCount === 0) {
                            cleanup();
                            reject(new Error(
                                'Expected single emission, but got 0 values'
                            ));
                            return;
                        }
                        // valueCount > 1 already handled in next()
                        break;
                }
                
                // If no value was emitted, use defaultValue or undefined
                if (!hasValue) {
                    resolvedValue = defaultValue;
                }
                
                cleanup();
                resolveWithScheduler(resolvedValue);
            }
        });
        
        /**
         * Resolve the promise, possibly through a scheduler
         */
        function resolveWithScheduler(value: T | undefined): void {
            if (scheduler) {
                scheduler.schedule(() => {
                    resolve(value);
                }, 0);
            } else {
                resolve(value);
            }
        }
        
        /**
         * Clean up resources
         */
        function cleanup(): void {
            subscription.unsubscribe();
            
            if (timeoutSubscription) {
                timeoutSubscription.unsubscribe();
            }
            
            if (signal) {
                signal.removeEventListener('abort', onAbort);
            }
        }
    });
};