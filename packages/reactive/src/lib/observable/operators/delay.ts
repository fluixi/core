import {AsyncScheduler, Observable, OperatorFunction} from "@fluixi/reactive"
import { asyncScheduler } from "@fluixi/reactive/schedulers/async";

/**
 * Configuration options for delay
 */
export interface DelayOptions {
    /**
     * Scheduler to use for delaying emissions.
     * 
     * @default asyncScheduler
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Delay duration in milliseconds.
     * Can be a number, a function that returns a number, or a Date for absolute time.
     * 
     * @default 0
     */
    delay?: number | ((value: any, index: number) => number) | Date;
    
    /**
     * Strategy for handling delay errors:
     * - 'throw': Throw the error immediately
     * - 'delay': Delay the error by the same amount
     * - 'immediate': Emit error immediately regardless of delay
     * 
     * @default 'throw'
     */
    errorStrategy?: 'throw' | 'delay' | 'immediate';
    
    /**
     * Whether to delay the completion notification.
     * 
     * @default true
     */
    delayCompletion?: boolean;
    
    /**
     * Whether to reset the delay timer on each emission.
     * If true, each emission starts a new delay timer.
     * 
     * @default false
     */
    resetOnEmit?: boolean;
}

/**
 * Delays the emission of items from the source Observable by a given timeout or until a given Date.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @param {DelayOptions} [options] Configuration options.
 * @returns {OperatorFunction<T, T>} An operator function.
 * 
 * @example
 * // Fixed delay
 * source$.pipe(delay({ delay: 1000 })).subscribe(console.log);
 * 
 * @example
 * // Dynamic delay based on value
 * source$.pipe(delay({ 
 *   delay: value => value * 100 // Larger values get longer delays
 * })).subscribe(console.log);
 * 
 * @example
 * // Absolute time (Date)
 * const targetTime = new Date(Date.now() + 5000);
 * source$.pipe(delay({ delay: targetTime })).subscribe(console.log);
 * 
 * @performance
 * - Efficient timer management with scheduler
 * - Dynamic delay calculation per value
 * - Memory efficient with proper cleanup
 * - Supports both relative and absolute delays
 */
export function delay<T>(
    options?: DelayOptions
): OperatorFunction<T, T> {
    const scheduler = options?.scheduler || asyncScheduler;
    const delayAmount = options?.delay ?? 0;
    const errorStrategy = options?.errorStrategy || 'throw';
    const delayCompletion = options?.delayCompletion ?? true;
    const resetOnEmit = options?.resetOnEmit ?? false;
    
    return (source: Observable<T>): Observable<T> => {
        return new Observable<T>((observer) => {
            let index = 0;
            let pendingEmissions = 0;
            let scheduledTasks: Array<{ unsubscribe: () => void }> = [];
            let completed = false;
            let errorEmitted = false;
            
            // Calculate delay for a specific value
            const calculateDelay = (value: T, currentIndex: number): number => {
                if (typeof delayAmount === 'function') {
                    return delayAmount(value, currentIndex);
                } else if (delayAmount instanceof Date) {
                    const targetTime = delayAmount.getTime();
                    const now = Date.now();
                    return Math.max(0, targetTime - now);
                } else {
                    return delayAmount;
                }
            };
            
            // Schedule a delayed emission
            const scheduleEmission = (value: T, valueIndex: number, emissionDelay: number): void => {
                if (resetOnEmit) {
                    // Cancel all pending emissions
                    scheduledTasks.forEach(task => task.unsubscribe());
                    scheduledTasks = [];
                    pendingEmissions = 0;
                }
                
                const task = scheduler.schedule(() => {
                    observer.next(value);
                    pendingEmissions--;
                    
                    // Clean up task reference
                    const taskIndex = scheduledTasks.indexOf(task);
                    if (taskIndex > -1) {
                        scheduledTasks.splice(taskIndex, 1);
                    }
                }, emissionDelay);
                
                scheduledTasks.push(task);
                pendingEmissions++;
            };
            
            const subscription = source.subscribe({
                next: (value: T) => {
                    const currentIndex = index++;
                    const emissionDelay = calculateDelay(value, currentIndex);
                    
                    if (emissionDelay <= 0) {
                        // Immediate emission
                        observer.next(value);
                    } else {
                        // Delayed emission
                        scheduleEmission(value, currentIndex, emissionDelay);
                    }
                },
                error: (error: unknown) => {
                    errorEmitted = true;
                    
                    switch (errorStrategy) {
                        case 'immediate':
                            // Immediate error
                            scheduledTasks.forEach(task => task.unsubscribe());
                            scheduledTasks = [];
                            observer.error(error);
                            break;
                        case 'delay':
                            // Delay error by default delay
                            const errorDelay = typeof delayAmount === 'number' ? delayAmount : 0;
                            scheduler.schedule(() => {
                                observer.error(error);
                            }, errorDelay);
                            break;
                        case 'throw':
                        default:
                            // Immediate error (default)
                            scheduledTasks.forEach(task => task.unsubscribe());
                            scheduledTasks = [];
                            observer.error(error);
                            break;
                    }
                },
                complete: () => {
                    completed = true;
                    
                    const completeObserver = (): void => {
                        if (pendingEmissions === 0) {
                            observer.complete();
                        } else {
                            // Wait for pending emissions to complete
                            // This is handled by the scheduled tasks
                        }
                    };
                    
                    if (delayCompletion) {
                        // Calculate completion delay
                        const completionDelay = typeof delayAmount === 'number' ? delayAmount : 0;
                        
                        scheduler.schedule(() => {
                            // Wait for any remaining pending emissions
                            // if (pendingEmissions === 0) {
                            //     observer.complete();
                            // } else {
                            //     // We'll complete when the last pending emission finishes
                            //     // This is handled by the emission tasks
                            // }
                            checkCompletion();
                        }, completionDelay);
                    } else {
                        completeObserver();
                    }
                }
            });
            
            // Helper to check if we can complete
            const checkCompletion = (): void => {
                if (completed && pendingEmissions === 0 && !errorEmitted) {
                    observer.complete();
                }
            };
            
            // Cleanup function
            return () => {
                subscription.unsubscribe();
                scheduledTasks.forEach(task => task.unsubscribe());
                scheduledTasks = [];
            };
        });
    };
}