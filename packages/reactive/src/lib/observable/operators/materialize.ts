import { Observable, OperatorFunction } from "@fluixi/reactive";

/**
 * Notification types for materialize/dematerialize
 */
export enum NotificationKind {
    NEXT = 'N',
    ERROR = 'E',
    COMPLETE = 'C'
}

/**
 * Notification wrapper for Observable events
 */
export interface Notification<T> {
    /** The kind of notification */
    kind: NotificationKind;
    /** The value (for NEXT) */
    value?: T;
    /** The error (for ERROR) */
    error?: any;
}

/**
 * Wraps Observable emissions, errors, and completion in Notification objects.
 * 
 * @template T The type of values emitted by the source.
 * 
 * @returns {OperatorFunction<T, Notification<T>>} An operator function.
 * 
 * @example
 * // Materialize all events
 * source$.pipe(
 *   materialize()
 * ).subscribe(notification => {
 *   switch (notification.kind) {
 *     case NotificationKind.NEXT:
 *       console.log('Value:', notification.value);
 *       break;
 *     case NotificationKind.ERROR:
 *       console.error('Error:', notification.error);
 *       break;
 *     case NotificationKind.COMPLETE:
 *       console.log('Completed');
 *       break;
 *   }
 * });
 * 
 * @performance
 * - Lightweight object creation
 * - No additional allocations for errors/completion
 * - Efficient type discrimination
 * - Minimal overhead per emission
 */
export function materialize<T>(): OperatorFunction<T, Notification<T>> {
    return (source: Observable<T>): Observable<Notification<T>> => {
        return new Observable<Notification<T>>((observer) => {
            const subscription = source.subscribe({
                next: (value: T) => {
                    observer.next({
                        kind: NotificationKind.NEXT,
                        value
                    });
                },
                error: (err: unknown) => {
                    observer.next({
                        kind: NotificationKind.ERROR,
                        error: err
                    });
                    observer.complete();
                },
                complete: () => {
                    observer.next({
                        kind: NotificationKind.COMPLETE
                    });
                    observer.complete();
                }
            });
            
            return () => subscription.unsubscribe();
        });
    };
}