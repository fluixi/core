
import {AsyncScheduler, Observable} from "@awc/reactive"

/**
 * Configuration options for empty
 */
export interface EmptyOptions {
    /**
     * Scheduler to use for completing the Observable.
     * If provided, the complete notification is scheduled asynchronously.
     * 
     * @default undefined // Complete synchronously
     */
    scheduler?: AsyncScheduler;
    
    /**
     * Delay before completing (in milliseconds).
     * Only applicable when scheduler is provided.
     * 
     * @default 0
     */
    delay?: number;
}

/**
 * Creates an Observable that emits no items and immediately completes.
 * Can complete synchronously or asynchronously via scheduler.
 * 
 * @template T The type parameter (though no values are emitted).
 * 
 * @param {EmptyOptions} [options] Configuration options.
 * @returns {Observable<T>} An Observable that completes immediately.
 * 
 * @example
 * // Synchronous completion
 * empty().subscribe({
 *   next: () => console.log('This never executes'),
 *   complete: () => console.log('Completed immediately')
 * });
 * 
 * @example
 * // Asynchronous completion with scheduler
 * empty({ 
 *   scheduler: asyncScheduler,
 *   delay: 1000 
 * }).subscribe({
 *   complete: () => console.log('Completed after 1 second')
 * });
 * 
 * @performance
 * - Zero memory overhead (no values stored)
 * - Immediate unsubscription cleanup
 * - Efficient scheduler integration
 * - No event loop overhead for sync completion
 */
export function empty<T = never>(
    options?: EmptyOptions
): Observable<T> {
    return new Observable<T>((observer) => {
        const scheduler = options?.scheduler;
        const delay = options?.delay ?? 0;
        
        /**
         * Complete the observable
         */
        const complete = (): void => {
            observer.complete();
        };
        
        if (scheduler) {
            // Schedule completion asynchronously
            const subscription = scheduler.schedule(complete, delay);
            
            return () => {
                // Cancel scheduled completion on unsubscribe
                subscription.unsubscribe();
            };
        } else {
            // Complete synchronously
            complete();
            return;
        }
    });
}

// /**
// * Creates an Observable that emits no values and completes immediately
// * @returns {Observable<never>} Empty Observable
// * @example
// * ```typescript
// * empty().subscribe({
// *   next: () => console.log('This will never be called'),
// *   complete: () => console.log('Complete immediately')
// * });
// * ```
// */
// export function empty(scheduler?: SchedulerLike): Observable<never> {
//     return new Observable((subscriber) => {
//         if (scheduler) {
//             scheduler.schedule(() => subscriber.complete());
//         } else {
//             subscriber.complete();
//         }
//     });
// }