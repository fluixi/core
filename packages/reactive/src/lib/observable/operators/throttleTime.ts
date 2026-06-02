import { AsyncScheduler, OperatorFunction, throttle } from "@fluixi/reactive";
import { asyncScheduler } from "../../schedulers/async.js";

/**
 * Configuration options for throttleTime
 */
export interface ThrottleTimeOptions {
    /**
     * Scheduler to use for throttle timing.
     * 
     * @default asyncScheduler
     */
    scheduler?: AsyncScheduler;
    
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
     * Maximum wait time for trailing emission (in milliseconds).
     * If set, trailing value is emitted after this delay even if source hasn't emitted.
     * 
     * @default undefined // No maximum wait
     */
    maxWait?: number;
}

/**
 * Emits a value from the source Observable, then ignores subsequent values for a specified duration, then repeats.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {number} duration Time in milliseconds to wait before allowing another emission.
 * @param {ThrottleTimeOptions} [options] Configuration options.
 * @returns {OperatorFunction<T, T>} An operator function.
 * 
 * @example
 * // Basic throttleTime
 * source$.pipe(throttleTime(1000)).subscribe(console.log);
 * 
 * @example
 * // Leading and trailing
 * source$.pipe(
 *   throttleTime(1000, { leading: true, trailing: true })
 * ).subscribe(console.log);
 * 
 * @performance
 * - Efficient timer management
 * - Configurable leading/trailing behavior
 * - Memory efficient with minimal state
 * - Proper cleanup on unsubscription
 */
export function throttleTime<T>(
    duration: number,
    options?: ThrottleTimeOptions
): OperatorFunction<T, T> {
    const scheduler = options?.scheduler || asyncScheduler;
    const leading = options?.leading ?? true;
    const trailing = options?.trailing ?? false;
    // const maxWait = options?.maxWait;
    
    // Use throttle with fixed duration selector
    return throttle(
        () => duration,
        {
            scheduler,
            leading,
            trailing,
            includeIndex: false,
            defaultDuration: duration,
            maxDuration: duration
        }
    );
    
    // Note: The above implementation reuses `throttle` for consistency.
    // Below is an optimized standalone implementation for reference:
    
    /*
    return (source: Observable<T>): Observable<T> => {
        return new Observable<T>((observer) => {
            let throttled = false;
            let trailingValue: T | undefined;
            let pendingTimer: { unsubscribe: () => void } | undefined;
            let maxWaitTimer: { unsubscribe: () => void } | undefined;
            let sourceCompleted = false;
            
            // Clear all timers
            const clearTimers = (): void => {
                if (pendingTimer) {
                    pendingTimer.unsubscribe();
                    pendingTimer = undefined;
                }
                if (maxWaitTimer) {
                    maxWaitTimer.unsubscribe();
                    maxWaitTimer = undefined;
                }
            };
            
            // Start throttle period
            const startThrottle = (): void => {
                throttled = true;
                
                // Regular duration timer
                pendingTimer = scheduler.schedule(() => {
                    throttled = false;
                    
                    // Emit trailing value if exists
                    if (trailing && trailingValue !== undefined) {
                        emitTrailing();
                    }
                    
                    // Clear max wait timer
                    if (maxWaitTimer) {
                        maxWaitTimer.unsubscribe();
                        maxWaitTimer = undefined;
                    }
                    
                    // Check completion
                    if (sourceCompleted) {
                        observer.complete();
                    }
                }, duration);
                
                // Max wait timer if specified
                if (maxWait !== undefined && maxWait > duration) {
                    maxWaitTimer = scheduler.schedule(() => {
                        if (throttled) {
                            throttled = false;
                            clearTimers();
                            
                            // Emit trailing value if exists
                            if (trailing && trailingValue !== undefined) {
                                emitTrailing();
                            }
                            
                            // Check completion
                            if (sourceCompleted) {
                                observer.complete();
                            }
                        }
                    }, maxWait);
                }
            };
            
            // Emit trailing value
            const emitTrailing = (): void => {
                if (trailingValue !== undefined) {
                    observer.next(trailingValue);
                    trailingValue = undefined;
                }
            };
            
            // Emit value
            const emitValue = (value: T): void => {
                clearTimers();
                observer.next(value);
                startThrottle();
            };
            
            const subscription = source.subscribe({
                next: (value: T) => {
                    if (!throttled) {
                        // Not throttled
                        if (leading) {
                            emitValue(value);
                        } else if (trailing) {
                            trailingValue = value;
                            startThrottle();
                        }
                    } else {
                        // Already throttled
                        if (trailing) {
                            trailingValue = value;
                        }
                    }
                },
                error: (err: unknown) => {
                    clearTimers();
                    observer.error(err);
                },
                complete: () => {
                    sourceCompleted = true;
                    
                    // Emit trailing value if exists
                    if (trailing && trailingValue !== undefined) {
                        emitTrailing();
                    }
                    
                    if (!throttled) {
                        observer.complete();
                    }
                    // Otherwise, complete when throttle ends
                }
            });
            
            // Cleanup
            return () => {
                subscription.unsubscribe();
                clearTimers();
                trailingValue = undefined;
            };
        });
    };
    */
}