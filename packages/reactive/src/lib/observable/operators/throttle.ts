import { AsyncScheduler, Observable, OperatorFunction } from "@fluixi/reactive";
import { asyncScheduler } from "../../schedulers/async.js";

/**
 * Duration selector for throttle
 */
export type ThrottleDurationSelector<T> = (value: T, index: number) => Observable<any> | PromiseLike<any> | number;

/**
 * Configuration options for throttle
 */
export interface ThrottleOptions<T> {
    /**
     * Scheduler to use for throttle timing.
     * 
     * @default asyncScheduler
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Default duration (in milliseconds) if duration selector returns undefined.
     * 
     * @default 0
     */
    defaultDuration?: number;
    
    /**
     * Whether to emit the leading value (first in throttle period).
     * 
     * @default true
     */
    leading?: boolean;
    
    /**
     * Whether to emit the trailing value (last in throttle period).
     * 
     * @default false
     */
    trailing?: boolean;
    
    /**
     * Whether to include the index when calling the duration selector.
     * 
     * @default true
     */
    includeIndex?: boolean;
    
    /**
     * Maximum throttle duration (in milliseconds).
     * 
     * @default Infinity
     */
    maxDuration?: number;
}

/**
 * Emits a value from the source Observable, then ignores subsequent values for a duration determined by a selector function, then repeats.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {ThrottleDurationSelector<T>} durationSelector Function that returns an Observable, Promise, or number for throttle duration.
 * @param {ThrottleOptions<T>} [options] Configuration options.
 * @returns {OperatorFunction<T, T>} An operator function.
 * 
 * @example
 * // Throttle with fixed duration
 * source$.pipe(throttle(() => 1000)).subscribe(console.log);
 * 
 * @example
 * // Dynamic throttle based on value
 * source$.pipe(
 *   throttle(value => value > 100 ? 2000 : 500)
 * ).subscribe(console.log);
 * 
 * @example
 * // Leading and trailing
 * source$.pipe(
 *   throttle(() => 1000, { leading: true, trailing: true })
 * ).subscribe(console.log); // Emits first and last value in each window
 * 
 * @performance
 * - Efficient timer management
 * - Support for leading/trailing emissions
 * - Dynamic duration selection
 * - Memory efficient with single pending value
 */
export function throttle<T>(
    durationSelector: ThrottleDurationSelector<T>,
    options?: ThrottleOptions<T>
): OperatorFunction<T, T> {
    const scheduler = options?.scheduler || asyncScheduler;
    const defaultDuration = options?.defaultDuration ?? 0;
    const leading = options?.leading ?? true;
    const trailing = options?.trailing ?? false;
    const includeIndex = options?.includeIndex ?? true;
    const maxDuration = options?.maxDuration ?? Infinity;
    
    return (source: Observable<T>): Observable<T> => {
        return new Observable<T>((observer) => {
            let index = 0;
            let throttled = false;
            let trailingValue: T | undefined;
            let pendingTimer: { unsubscribe: () => void } | undefined;
            let sourceCompleted = false;
            
            /**
             * Clear the throttle state
             */
            const clearThrottle = (): void => {
                if (pendingTimer) {
                    pendingTimer.unsubscribe();
                    pendingTimer = undefined;
                }
                throttled = false;
            };
            
            /**
             * Emit a value
             */
            const emitValue = (value: T): void => {
                clearThrottle();
                observer.next(value);
            };
            
            /**
             * Start a throttle period
             */
            const startThrottle = (value: T, durationMs: number): void => {
                throttled = true;
                
                // Store trailing value if needed
                if (trailing) {
                    trailingValue = value;
                }
                
                // Set up timer to end throttle
                pendingTimer = scheduler.schedule(() => {
                    throttled = false;
                    
                    // Emit trailing value if exists
                    if (trailing && trailingValue !== undefined) {
                        emitValue(trailingValue);
                        trailingValue = undefined;
                    }
                    
                    // Check if source completed while throttled
                    if (sourceCompleted) {
                        observer.complete();
                    }
                }, durationMs);
            };
            
            /**
             * Process a value with throttle logic
             */
            const processValue = (value: T, currentIndex: number): void => {
                try {
                    const durationResult = durationSelector(value, currentIndex);
                    
                    // Calculate duration
                    let durationMs = defaultDuration;
                    
                    if (durationResult instanceof Observable) {
                        // Observable duration
                        clearThrottle();
                        
                        const durationSub = durationResult.subscribe({
                            next: () => {
                                durationSub.unsubscribe();
                                throttled = false;
                            },
                            error: (err) => observer.error(err),
                            complete: () => {
                                throttled = false;
                            }
                        });
                        
                        pendingTimer = { unsubscribe: () => durationSub.unsubscribe() };
                        throttled = true;
                        
                        // Emit if leading
                        if (leading) {
                            emitValue(value);
                        } else if (trailing) {
                            trailingValue = value;
                        }
                    } else if (durationResult && typeof (durationResult as any).then === 'function') {
                        // Promise duration
                        clearThrottle();
                        throttled = true;
                        try{
                            (durationResult as PromiseLike<any>).then(
                                () => {
                                    throttled = false;
                                },
                                (err) => observer.error(err)
                            )
                        }catch(err){
                            observer.error(err)
                        }
                        // .catch(() => {
                        //     // Ignore errors from promise rejection handling
                        // });
                        
                        // Emit if leading
                        if (leading) {
                            emitValue(value);
                        } else if (trailing) {
                            trailingValue = value;
                        }
                    } else if (typeof durationResult === 'number') {
                        // Numeric duration
                        durationMs = Math.min(Math.max(0, durationResult), maxDuration);
                        
                        if (!throttled) {
                            // Not throttled - emit and start throttle
                            if (leading) {
                                emitValue(value);
                            } else if (trailing) {
                                trailingValue = value;
                            }
                            startThrottle(value, durationMs);
                        } else {
                            // Already throttled - store for trailing emission
                            if (trailing) {
                                trailingValue = value;
                            }
                        }
                    } else {
                        // Invalid duration, use default
                        if (!throttled) {
                            if (leading) {
                                emitValue(value);
                            } else if (trailing) {
                                trailingValue = value;
                            }
                            startThrottle(value, defaultDuration);
                        } else if (trailing) {
                            trailingValue = value;
                        }
                    }
                } catch (err) {
                    observer.error(err);
                }
            };
            
            const subscription = source.subscribe({
                next: (value: T) => {
                    const currentIndex = includeIndex ? index++ : 0;
                    processValue(value, currentIndex);
                },
                error: (err: unknown) => {
                    clearThrottle();
                    observer.error(err);
                },
                complete: () => {
                    sourceCompleted = true;
                    
                    // Emit trailing value if exists
                    if (trailing && trailingValue !== undefined) {
                        emitValue(trailingValue);
                    }
                    
                    if (!throttled) {
                        observer.complete();
                    }
                    // Otherwise, complete when throttle ends (in timer)
                }
            });
            
            // Cleanup function
            return () => {
                subscription.unsubscribe();
                clearThrottle();
                trailingValue = undefined;
            };
        });
    };
}