import { Observable, SchedulerLike, timer } from "@fluixi/reactive";
import { asyncScheduler } from "@fluixi/reactive/schedulers/async";

/**
* Creates an Observable that emits sequential numbers in a specified interval
* @param {number} [period=0] - The period (in milliseconds) between emissions
* @param {number} [start=0] - The initial value to emit
* @param {number} [count=Infinity] - Maximum number of emissions
* @returns {Observable<number>} Observable emitting sequential numbers
* @example
* ```typescript
* // Emit 0, 1, 2, 3, 4 every second
* interval(1000, 0, 5).subscribe(console.log);
*
* // Emit numbers indefinitely every 500ms
* interval(500).subscribe(console.log);
* ```
*/
export function interval(
    period: number = 0,
    scheduler: SchedulerLike = asyncScheduler
): Observable<number> {
    if (period < 0) {
        // Impossible to schedule an period already past.
        period = 0;
    }
    
    return timer(period, period, scheduler);
}