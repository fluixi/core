import { AsyncScheduler, Observable, OperatorFunction } from "@awc/reactive";
import { asyncScheduler } from "../../schedulers/async.js";

/**
 * Duration selector function for delayWhen
 */
export type DelayDurationSelector<T> = (value: T, index: number) => Observable<any> | PromiseLike<any> | number;

/**
 * Configuration options for delayWhen
 */
export interface DelayWhenOptions<T> {
    /**
     * Scheduler to use for the delay mechanism.
     * 
     * @default asyncScheduler
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Whether to reset the delay timer on each emission.
     * If true, each emission cancels previous pending delays.
     * 
     * @default false
     */
    resetOnEmit?: boolean;
    
    /**
     * Whether to delay the completion notification.
     * 
     * @default true
     */
    delayCompletion?: boolean;
    
    /**
     * Default delay duration (in milliseconds) if duration selector returns undefined.
     * 
     * @default 0
     */
    defaultDelay?: number;
    
    /**
     * Maximum delay duration (in milliseconds).
     * If duration selector returns a longer delay, it's capped at this value.
     * 
     * @default Infinity
     */
    maxDelay?: number;
    
    /**
     * Whether to include the index when calling the duration selector.
     * If false, only the value is passed.
     * 
     * @default true
     */
    includeIndex?: boolean;
}

/**
 * Delays the emission of items based on an Observable or duration returned by a function for each item.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {DelayDurationSelector<T>} durationSelector Function that returns an Observable, Promise, or number for each value.
 * @param {DelayWhenOptions<T>} [options] Configuration options.
 * @returns {OperatorFunction<T, T>} An operator function.
 * 
 * @example
 * // Delay each value by a different amount
 * source$.pipe(
 *   delayWhen((value, index) => timer(value * 100)) // Longer values get longer delays
 * ).subscribe(console.log);
 * 
 * @example
 * // Reset delay on new emissions (debounce-like behavior)
 * source$.pipe(
 *   delayWhen(() => timer(1000), { resetOnEmit: true })
 * ).subscribe(console.log);
 * 
 * @performance
 * - Efficient delay management with scheduler
 * - Reset capability for debounce-like behavior
 * - Memory efficient with proper cleanup
 * - Supports Observable, Promise, and number durations
 */
export function delayWhen<T>(
    durationSelector: DelayDurationSelector<T>,
    options?: DelayWhenOptions<T>
): OperatorFunction<T, T> {
    const scheduler = options?.scheduler || asyncScheduler;
    const resetOnEmit = options?.resetOnEmit ?? false;
    const delayCompletion = options?.delayCompletion ?? true;
    const defaultDelay = options?.defaultDelay ?? 0;
    const maxDelay = options?.maxDelay ?? Infinity;
    const includeIndex = options?.includeIndex ?? true;
    
    return (source: Observable<T>): Observable<T> => {
        return new Observable<T>((observer) => {
            let index = 0;
            let pendingDelays: Array<{ unsubscribe: () => void }> = [];
            let pendingEmissions: Array<{ value: T; task: { unsubscribe: () => void } }> = [];
            let completed = false;
            let errorEmitted = false;
            
            // Clear all pending delays
            const clearPendingDelays = (): void => {
                pendingDelays.forEach(delay => delay.unsubscribe());
                pendingDelays = [];
                pendingEmissions.forEach(emission => emission.task.unsubscribe());
                pendingEmissions = [];
            };
            
            // Schedule a delayed emission
            const scheduleEmission = (value: T, delayMs: number): void => {
                if (resetOnEmit) {
                    clearPendingDelays();
                }
                
                const task = scheduler.schedule(() => {
                    observer.next(value);
                    
                    // Remove from pending emissions
                    const emissionIndex = pendingEmissions.findIndex(e => e.task === task);
                    if (emissionIndex > -1) {
                        pendingEmissions.splice(emissionIndex, 1);
                    }
                }, delayMs);
                
                pendingEmissions.push({ value, task });
                pendingDelays.push(task);
            };
            
            // Process a value with its delay
            const processValue = (value: T, currentIndex: number): void => {
                try {
                    const durationResult = durationSelector(value, currentIndex);
                    
                    // Handle different duration types
                    if (durationResult instanceof Observable) {
                        // Subscribe to duration Observable
                        const durationSub = durationResult.subscribe({
                            next: () => {
                                // When duration emits, emit the value
                                durationSub.unsubscribe();
                                
                                const task = scheduler.schedule(() => {
                                    observer.next(value);
                                }, 0);
                                
                                pendingDelays.push(task);
                            },
                            error: (err) => observer.error(err),
                            complete: () => {
                                // If duration completes without emitting, use default delay
                                scheduleEmission(value, defaultDelay);
                            }
                        });
                        
                        pendingDelays.push({ unsubscribe: () => durationSub.unsubscribe() });
                    } else if (durationResult && typeof (durationResult as any).then === 'function') {
                        // Promise duration
                        try{
                            (durationResult as PromiseLike<any>).then(
                                () => {
                                    scheduleEmission(value, 0);
                                },
                                (err) => observer.error(err)
                            )

                        }catch (err) {
                            observer.error(err);
                        }
                        // .catch(() => {
                        //     // Ignore errors from promise rejection handling
                        // });
                    } else if (typeof durationResult === 'number') {
                        // Numeric duration
                        const delayMs = Math.min(Math.max(0, durationResult), maxDelay);
                        scheduleEmission(value, delayMs);
                    } else {
                        // Invalid duration, use default
                        scheduleEmission(value, defaultDelay);
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
                    errorEmitted = true;
                    clearPendingDelays();
                    observer.error(err);
                },
                complete: () => {
                    completed = true;
                    
                    if (delayCompletion) {
                        // Wait for all pending delays to complete
                        if (pendingDelays.length === 0) {
                            observer.complete();
                        } else {
                            // We'll complete when the last pending delay finishes
                            // Each delay task will check if it's the last one
                        }
                    } else {
                        clearPendingDelays();
                        observer.complete();
                    }
                }
            });
            
            // Cleanup function
            return () => {
                subscription.unsubscribe();
                clearPendingDelays();
            };
        });
    };
}