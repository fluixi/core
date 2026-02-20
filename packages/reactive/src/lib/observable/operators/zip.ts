import { AsyncScheduler, Observable, Subscription } from "@awc/reactive";

/**
 * Configuration options for zip
 */
export interface ZipOptions {
    /**
     * Scheduler to use for zipping operations.
     * 
     * @default undefined // Synchronous
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Delay for scheduler operations (in milliseconds).
     * 
     * @default 0
     */
    delay?: number;
    
    /**
     * Whether to emit incomplete arrays at completion.
     * If true, emits arrays with available values when sources complete.
     * 
     * @default false // Wait for all sources to have values
     */
    emitIncomplete?: boolean;
    
    /**
     * Whether to complete when any source completes.
     * If true, completes immediately when any source completes.
     * 
     * @default false // Wait for all sources to complete
     */
    completeOnAny?: boolean;
    
    /**
     * Project function to combine values.
     * If provided, uses this function instead of default array combination.
     * 
     * @default undefined // Use array combination
     */
    project?: (...values: any[]) => any;
}

/**
 * Combines multiple Observables to create an Observable whose values are calculated from the values, in order, of each of its input Observables.
 * 
 * @template T Array of types for each input Observable.
 * 
 * @param {...Observable<T[number]>[]} sources Observables to combine.
 * @param {ZipOptions} [options] Configuration options.
 * @returns {Observable<T>} An Observable that emits arrays of combined values.
 * 
 * @example
 * // Basic zip
 * zip(
 *   interval(1000).pipe(take(3)),
 *   interval(1500).pipe(take(3))
 * ).subscribe(values => {
 *   console.log(values); // [0,0], [1,1], [2,2]
 * });
 * 
 * @example
 * // With project function
 * zip(
 *   of('Hello'),
 *   of('World'),
 *   { project: (a, b) => `${a} ${b}!` }
 * ).subscribe(console.log); // 'Hello World!'
 * 
 * @performance
 * - Efficient value queuing per source
 * - Minimal array allocations
 * - Early completion detection
 * - Memory efficient with bounded queues
 */
export function zip<T extends unknown[]>(
    ...args: [...Observable<T[number]>[], ZipOptions]
): Observable<T> {
    // Extract options and sources from args
    const lastArg = args[args.length - 1];
    let options: ZipOptions | undefined;
    let sources: Observable<T[number]>[];
    
    if (lastArg && typeof lastArg === 'object' && !('subscribe' in lastArg)) {
        // Last argument is options
        options = lastArg as ZipOptions;
        sources = args.slice(0, -1) as Observable<T[number]>[];
    } else {
        // No options provided
        options = undefined;
        sources = args as Observable<T[number]>[];
    }
    
    const scheduler = options?.scheduler;
    const delay = options?.delay ?? 0;
    const emitIncomplete = options?.emitIncomplete ?? false;
    const completeOnAny = options?.completeOnAny ?? false;
    const project = options?.project;
    
    return new Observable<T>((observer) => {
        const sourcesCount = sources.length;
        
        // If no sources, emit empty array and complete
        if (sourcesCount === 0) {
            const emit = (): void => {
                observer.next([] as unknown as T);
                observer.complete();
            };
            
            if (scheduler) {
                scheduler.schedule(emit, delay);
            } else {
                emit();
            }
            return;
        }
        
        // Queues for each source
        const queues: T[number][][] = new Array(sourcesCount);
        for (let i = 0; i < sourcesCount; i++) {
            queues[i] = [];
        }
        
        // Track completed sources
        const completed: boolean[] = new Array(sourcesCount).fill(false);
        
        // Track active subscriptions
        const subscriptions: Subscription[] = new Array(sourcesCount);
        
        /**
         * Check if we can emit a combined value
         */
        const canEmit = (): boolean => {
            if (emitIncomplete) {
                // Need at least one value from each non-completed source
                for (let i = 0; i < sourcesCount; i++) {
                    if (!completed[i] && queues[i].length === 0) {
                        return false;
                    }
                }
                return true;
            } else {
                // Need at least one value from each source
                for (let i = 0; i < sourcesCount; i++) {
                    if (queues[i].length === 0) {
                        return false;
                    }
                }
                return true;
            }
        };
        
        /**
         * Emit a combined value if possible
         */
        const emitIfPossible = (): void => {
            if (canEmit()) {
                const values: T[number][] = new Array(sourcesCount);
                
                // Take one value from each queue
                for (let i = 0; i < sourcesCount; i++) {
                    if (queues[i].length > 0) {
                        values[i] = queues[i].shift()!;
                    } else {
                        // For emitIncomplete, use undefined for completed sources
                        values[i] = undefined as T[number];
                    }
                }
                
                // Create output
                const output = project ? project(...values) : values;
                
                const emit = (): void => {
                    observer.next(output as T);
                };
                
                if (scheduler) {
                    scheduler.schedule(emit, delay);
                } else {
                    emit();
                }
            }
        };
        
        /**
         * Check if we should complete
         */
        const shouldComplete = (): boolean => {
            if (completeOnAny) {
                // Complete if any source completed and no values left
                for (let i = 0; i < sourcesCount; i++) {
                    if (completed[i] && queues[i].length === 0) {
                        return true;
                    }
                }
                return false;
            } else {
                // Complete only if all sources completed
                for (let i = 0; i < sourcesCount; i++) {
                    if (!completed[i]) {
                        return false;
                    }
                }
                return true;
            }
        };
        
        /**
         * Check completion and emit remaining values
         */
        const checkCompletion = (): void => {
            if (shouldComplete()) {
                // Emit any remaining values
                if (emitIncomplete) {
                    while (canEmit()) {
                        emitIfPossible();
                    }
                }
                
                observer.complete();
            }
        };
        
        // Subscribe to each source
        for (let i = 0; i < sourcesCount; i++) {
            const sourceIndex = i;
            
            subscriptions[sourceIndex] = sources[sourceIndex].subscribe({
                next: (value: T[typeof sourceIndex]) => {
                    queues[sourceIndex].push(value);
                    emitIfPossible();
                },
                error: (err) => {
                    // Clean up all subscriptions on error
                    subscriptions.forEach((sub, idx) => {
                        if (idx !== sourceIndex && sub) {
                            sub.unsubscribe();
                        }
                    });
                    observer.error(err);
                },
                complete: () => {
                    completed[sourceIndex] = true;
                    checkCompletion();
                }
            });
        }
        
        // Cleanup function
        return () => {
            subscriptions.forEach(subscription => {
                if (subscription) {
                    subscription.unsubscribe();
                }
            });
            
            // Clear queues for garbage collection
            queues.forEach(queue => {
                queue.length = 0;
            });
        };
    });
}