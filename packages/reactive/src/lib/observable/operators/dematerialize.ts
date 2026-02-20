import { Observable, OperatorFunction } from "@awc/reactive";

/* NOTIFICATIONS */

/**
 * A notification representing a "next" from an observable.
 * Can be used with {@link dematerialize}.
 */
export interface NextNotification<T> {
    /** The kind of notification. Always "N" */
    kind: 'N';
    /** The value of the notification. */
    value: T;
  }
  
  /**
   * A notification representing an "error" from an observable.
   * Can be used with {@link dematerialize}.
   */
  export interface ErrorNotification {
    /** The kind of notification. Always "E" */
    kind: 'E';
    error: any;
  }
  
  /**
   * A notification representing a "completion" from an observable.
   * Can be used with {@link dematerialize}.
   */
  export interface CompleteNotification {
    kind: 'C';
  }
  

  enum NotificationKind {
    NEXT = 'N',
    ERROR = 'E',
    COMPLETE = 'C'
  }
  /**
   * Valid observable notification types.
   */
  export type ObservableNotification<T> = NextNotification<T> | ErrorNotification | CompleteNotification;
/**
 * Converts Notification objects back into Observable emissions, errors, and completion.
 * 
 * @template T The type of values in the notifications.
 * 
 * @returns {OperatorFunction<ObservableNotification<T>, T>} An operator function.
 * 
 * @example
* // Dematerialize notifications
* source$.pipe(
*   materialize(),
*   // ... some operators that work on notifications
*   dematerialize()
* ).subscribe(console.log);
* 
* @performance
* - Efficient type checking
* - Direct event propagation
* - No unnecessary object creation
* - Early error propagation
*/
export function dematerialize<T>(): OperatorFunction<ObservableNotification<T>, T> {
   return (source: Observable<ObservableNotification<T>>): Observable<T> => {
       return new Observable<T>((observer) => {
           const subscription = source.subscribe({
               next: (notification: ObservableNotification<T>) => {
                   switch (notification.kind) {
                       case NotificationKind.NEXT:
                           if (notification.value !== undefined) {
                               observer.next(notification.value);
                           }
                           break;
                       case NotificationKind.ERROR:
                           observer.error(notification.error);
                           break;
                       case NotificationKind.COMPLETE:
                           observer.complete();
                           break;
                       default:
                           // Unknown notification type
                           observer.error(new Error(`Unknown notification kind: ${notification.kind}`));
                           break;
                   }
               },
               error: (err: unknown) => observer.error(err),
               complete: () => {
                   // Source completed without sending COMPLETE notification
                   // This is fine - dematerialize just passes through
               }
           });
           
           return () => subscription.unsubscribe();
       });
   };
}