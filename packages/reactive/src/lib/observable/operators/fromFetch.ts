import { AsyncScheduler, Observable } from "@awc/reactive";
import { asyncScheduler } from "@awc/reactive/schedulers/async";

/**
 * Configuration options for fromFetch.
 */
export interface FromFetchOptions extends RequestInit {
    /**
     * Optional selector function to transform the Response.
     * Useful for parsing JSON or extracting specific data.
     * 
     * @default (response) => response.json() // Auto-detects Content-Type
     */
    selector?: (response: Response) => Observable<unknown>;
    
    /**
     * Timeout in milliseconds after which the request will be aborted.
     * Automatically creates an AbortController if not provided.
     * 
     * @default undefined // No timeout
     */
    timeout?: number;
}

/**
 * Wraps the Fetch API in an Observable, providing automatic cleanup and response handling.
 * Uses asyncScheduler for timeout and scheduling operations.
 * 
 * @template T The type of data returned by the selector function.
 * 
 * @param {string | Request} input The resource to fetch.
 * @param {FromFetchOptions} [init] Optional fetch options and configuration.
 * @param {Scheduler} [scheduler=asyncScheduler] Scheduler for timeout and async operations.
 * @returns {Observable<T>} An Observable that emits the fetched data or error.
 * 
 * @example
 * // Basic GET request
 * fromFetch('https://api.example.com/data')
 *   .subscribe({
 *     next: data => console.log('Data:', data),
 *     error: err => console.error('Error:', err)
 *   });
 * 
 * @example
 * // With custom scheduler for testing
 * const testScheduler = {
 *   schedule: (task, delay) => {
 *     // Immediate execution for tests
 *     task();
 *     return { unsubscribe: () => {} };
 *   }
 * };
 * fromFetch('/api', {}, testScheduler).subscribe(console.log);
 * 
 * @performance
 * - Uses scheduler abstraction for better testability
 * - Automatic AbortController cleanup on unsubscribe
 * - Efficient timeout management via scheduler
 * - Content-Type aware default selector
 * - Lazy execution with proper resource cleanup
 */
export function fromFetch<T = unknown>(
    input: string | Request,
    init?: FromFetchOptions,
    scheduler: AsyncScheduler = asyncScheduler
): Observable<T> {
    return new Observable<T>((observer) => {
        // Create AbortController for request cancellation
        const abortController = new AbortController();
        
        // Setup timeout if specified using scheduler
        let timeoutSubscription: { unsubscribe: () => void } | undefined;
        
        if (init?.timeout && init.timeout > 0) {
            timeoutSubscription = scheduler.schedule(() => {
                abortController.abort();
                observer.error(new DOMException('Request timed out', 'TimeoutError'));
            }, init.timeout);
        }
        
        // Default selector function with Content-Type awareness
        const defaultSelector = (response: Response): Observable<unknown> => {
            return new Observable(subscriber => {
                // Schedule the parsing work asynchronously
                const parseSubscription = scheduler.schedule(() => {
                    const contentType = response.headers.get('content-type');
                    
                    // Choose parsing method based on Content-Type
                    const parsePromise = contentType?.includes('application/json')
                        ? response.json()
                        : response.text();
                    
                    parsePromise
                        .then(data => {
                            subscriber.next(data);
                            subscriber.complete();
                        })
                        .catch(err => {
                            subscriber.error(err);
                        });
                }, 0);
                
                return () => parseSubscription.unsubscribe();
            });
        };
        
        // Use custom selector or default
        const selector = init?.selector || defaultSelector;
        
        // Merge provided signal with abortController's signal
        const finalInit: RequestInit = {
            ...init,
            signal: (() => {
                if (!init?.signal) {
                    return abortController.signal;
                }
                
                // Combine signals if both exist
                const combinedController = new AbortController();
                
                // Abort combined signal when either signal aborts
                abortController.signal.addEventListener('abort', 
                    () => combinedController.abort()
                );
                init.signal.addEventListener('abort', 
                    () => combinedController.abort()
                );
                
                return combinedController.signal;
            })()
        };
        
        // Schedule the fetch operation
        const fetchSubscription = scheduler.schedule(() => {
            fetch(input, finalInit)
                .then(async (response) => {
                    // Clear timeout if it exists
                    if (timeoutSubscription) {
                        timeoutSubscription.unsubscribe();
                    }
                    
                    if (!response.ok) {
                        // Create enhanced error with status
                        const error = new Error(
                            `HTTP ${response.status}: ${response.statusText}`
                        ) as Error & { status: number; response: Response };
                        
                        error.status = response.status;
                        error.response = response;
                        throw error;
                    }
                    
                    try {
                        // Process response through selector
                        const result$ = selector(response);
                        
                        // Subscribe to selector result
                        const selectorSubscription = result$.subscribe({
                            next: (value: unknown) => {
                                observer.next(value as T);
                            },
                            error: (err) => {
                                observer.error(err);
                            },
                            complete: () => {
                                observer.complete();
                            }
                        });
                        
                        // Add selector subscription to cleanup
                        return () => selectorSubscription.unsubscribe();
                    } catch (err) {
                        observer.error(err);
                        return
                    }
                })
                .catch((error) => {
                    // Clear timeout
                    if (timeoutSubscription) {
                        timeoutSubscription.unsubscribe();
                    }
                    
                    // Don't emit error if request was aborted
                    if (error.name !== 'AbortError') {
                        observer.error(error);
                    }
                });
        }, 0);
        
        // Cleanup function
        return () => {
            // Cancel timeout if active
            if (timeoutSubscription) {
                timeoutSubscription.unsubscribe();
            }
            
            // Cancel fetch operation
            abortController.abort();
            
            // Unschedule any pending fetch work
            fetchSubscription.unsubscribe();
        };
    });
}