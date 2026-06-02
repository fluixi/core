import { Observable, OperatorFunction, SchedulerLike } from "@fluixi/reactive";
import { asyncScheduler } from "@fluixi/reactive/schedulers/async";

/**
 * Takes values for a specified duration.
 * 
 * @template T - The type of values emitted by the source Observable
 * @param {number} duration - Duration in milliseconds to take values
 * @param {SchedulerLike} [scheduler=asyncScheduler] - Scheduler to use for timing
 * @returns {OperatorFunction<T, T>} Operator that takes values for specified duration
 */
export function takeForTime<T>(
    duration: number,
    scheduler: SchedulerLike = asyncScheduler
): OperatorFunction<T, T> {
    return (source: Observable<T>) => new Observable<T>(subscriber => {
        let completed = false;
        
        // Schedule completion
        const timeout = scheduler.schedule(() => {
            if (!completed) {
                completed = true;
                subscriber.complete();
                subscription.unsubscribe();
            }
        }, duration);
        
        const subscription = source.subscribe({
            next: (value: T) => {
                if (!completed) {
                    subscriber.next(value);
                }
            },
            error: (err: any) => {
                if (!completed) {
                    completed = true;
                    timeout.unsubscribe();
                    subscriber.error(err);
                }
            },
            complete: () => {
                if (!completed) {
                    completed = true;
                    timeout.unsubscribe();
                    subscriber.complete();
                }
            }
        });
        
        // Add timeout to subscription for cleanup
        // subscriber.add(timeout);
        
        return () => {
            subscription.unsubscribe();
            timeout.unsubscribe();
        };
    });
}