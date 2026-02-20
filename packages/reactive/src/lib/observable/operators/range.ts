import { AsyncScheduler, Observable } from "@awc/reactive";

/**
 * Configuration options for range
 */
export interface RangeOptions {
    /**
     * Scheduler to use for emitting values.
     * If provided, values are emitted asynchronously via the scheduler.
     * 
     * @default undefined // Emit synchronously
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Delay between emitted values when using scheduler (in milliseconds).
     * 
     * @default 0 // No delay between emissions
     */
    delay?: number;
    
    /**
     * Whether to emit values in descending order.
     * If true, emits from `start + count - 1` down to `start`.
     * 
     * @default false // Ascending order
     */
    descending?: boolean;
    
    /**
     * Step size between consecutive numbers.
     * 
     * @default 1
     */
    step?: number;
    
    /**
     * Maximum number of emissions before completing.
     * If less than count, stops early.
     * 
     * @default Infinity // No limit
     */
    maxEmissions?: number;
}

/**
 * Creates an Observable that emits a sequence of numbers within a specified range.
 * 
 * @param {number} [start=0] The start of the range.
 * @param {number} [count=0] The number of sequential integers to generate.
 * @param {RangeOptions} [options] Configuration options.
 * @returns {Observable<number>} An Observable that emits a range of sequential integers.
 * 
 * @example
 * // Basic range
 * range(1, 5).subscribe(console.log); // 1, 2, 3, 4, 5
 * 
 * @example
 * // Async range with delay
 * range(0, 3, {
 *   scheduler: asyncScheduler,
 *   delay: 1000
 * }).subscribe(value => {
 *   console.log(`Value ${value} after ${value + 1} seconds`);
 * });
 * 
 * @example
 * // Descending range with step
 * range(10, 5, {
 *   step: 2,
 *   descending: true
 * }).subscribe(console.log); // 18, 16, 14, 12, 10
 * 
 * @performance
 * - O(1) memory usage
 * - Lazy generation (no pre-built array)
 * - Efficient scheduling with async emissions
 * - Minimal overhead per emission
 */
export function range(
    start: number = 0,
    count: number = 0,
    options?: RangeOptions
): Observable<number> {
    return new Observable<number>((observer) => {
        // Validate and sanitize inputs
        const validStart = Math.floor(start);
        const validCount = Math.max(0, Math.floor(count));
        const step = Math.max(1, Math.floor(options?.step ?? 1));
        const descending = options?.descending ?? false;
        const maxEmissions = options?.maxEmissions ?? Infinity;
        const scheduler = options?.scheduler;
        const delay = options?.delay ?? 0;
        
        // If count is 0, complete immediately
        if (validCount === 0) {
            observer.complete();
            return;
        }
        
        let emissionCount = 0;
        let index = 0;
        let activeSubscription: { unsubscribe: () => void } | undefined;
        let completed = false;
        
        /**
         * Emit the next value in the range
         */
        const emitNext = (): void => {
            if (emissionCount >= maxEmissions || index >= validCount) {
                completed = true;
                observer.complete();
                return;
            }
            
            // Calculate the current value
            let currentValue: number;
            
            if (descending) {
                // Descending: start + (count - 1 - index) * step
                currentValue = validStart + (validCount - 1 - index) * step;
            } else {
                // Ascending: start + index * step
                currentValue = validStart + index * step;
            }
            
            // Emit the value
            observer.next?.(currentValue);
            
            index++;
            emissionCount++;
            
            // Schedule next emission if not complete
            if (index < validCount && emissionCount < maxEmissions && !completed) {
                scheduleNext();
            } else {
                completed = true;
                observer.complete();
            }
        };
        
        /**
         * Schedule the next emission
         */
        const scheduleNext = (): void => {
            if (completed) {
                return;
            }
            
            if (scheduler) {
                // Use scheduler for async emission
                activeSubscription = scheduler.schedule(emitNext, delay);
            } else {
                // Synchronous emission
                emitNext();
            }
        };
        
        // Start emissions
        if (scheduler && delay > 0) {
            // Initial delay for first emission
            activeSubscription = scheduler.schedule(emitNext, delay);
        } else {
            emitNext();
        }
        
        // Cleanup function
        return () => {
            completed = true;
            
            if (activeSubscription) {
                activeSubscription.unsubscribe();
            }
        };
    });
}