import { isFunction } from '@awc/utils';
import type { Observable, Observer } from '../observable.js';
import { SchedulerLike } from '../../schedulers/index.js';

/**
 * Type guard to check if a value is an Observable (has a subscribe method)
 * @template T - The type of values emitted by the Observable
 * @param {unknown} v - The value to check
 * @returns {v is Observable<T>} True if the value is an Observable, false otherwise
 * @example
 * isObservable(new Observable()); // true
 * isObservable({ subscribe: () => {} }); // true
 */
export function isObservable<T = any>(v: unknown): v is Observable<T> {
  return !!v && typeof v === 'object' && isFunction((v as any).subscribe);
}

/**
 * Type guard to check if a value is a Scheduler (has schedule and now methods)
 * @param {unknown} v - The value to check
 * @returns {v is SchedulerLike} True if the value is a Scheduler, false otherwise
 * @example
 * isScheduler(asyncScheduler); // true
 */
export function isScheduler(v: unknown): v is SchedulerLike {
  return (
    !!v &&
    typeof v === 'object' &&
    isFunction((v as any).schedule) &&
    isFunction((v as any).now)
  );
}

export function executePromise<T>(
  promise: Promise<T>,
  subscriber: Observer<T>
  // subscriber: Subscriber<T>
): void {
  promise
    .then(
      (value: T) => {
        if (!subscriber.closed) {
          subscriber.next(value);
          subscriber.complete();
        }
      },
      (err: any) => {
        if (!subscriber.closed) {
          subscriber.error(err);
        }
      }
    )
    .then(null, (err: any) => {
      // Handle any errors in the promise chain
      setTimeout(() => {
        throw err;
      });
    });
}
