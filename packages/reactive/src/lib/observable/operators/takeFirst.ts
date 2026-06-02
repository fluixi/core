import { Observable, OperatorFunction } from "@fluixi/reactive";

/**
 * Takes the first value that meets a specific condition.
 * 
 * @template T - The type of values emitted by the source Observable
 * @param {function(value: T, index: number): boolean} predicate - Condition to match
 * @returns {OperatorFunction<T, T>} Operator that takes first matching value
 */
export function takeFirst<T>(
    predicate?: (value: T, index: number) => boolean
): OperatorFunction<T, T> {
    return (source: Observable<T>) => new Observable<T>(subscriber => {
        let index = 0;
        let found = false;
        
        const subscription = source.subscribe({
            next: (value: T) => {
                if (!found) {
                    if (!predicate || predicate(value, index++)) {
                        subscriber.next(value);
                        subscriber.complete();
                        subscription.unsubscribe();
                        found = true;
                    }
                }
            },
            error: (err: any) => {
                if (!found) {
                    subscriber.error(err);
                }
            },
            complete: () => {
                if (!found) {
                    if (predicate) {
                        subscriber.error(new Error('No matching value found'));
                    } else {
                        subscriber.error(new Error('No value emitted'));
                    }
                }
            }
        });
        
        return subscription;
    });
}