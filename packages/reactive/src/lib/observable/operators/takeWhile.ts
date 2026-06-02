import { Observable, OperatorFunction } from "@fluixi/reactive";

/**
 * Takes values from the source Observable until a specified condition is met.
 * 
 * @template T - The type of values emitted by the source Observable
 * @param {function(value: T, index: number): boolean} predicate - Condition to stop taking values
 * @param {boolean} [inclusive=false] - Whether to include the value that triggered the condition
 * @returns {OperatorFunction<T, T>} Operator that takes values until condition is met
 */
export function takeWhile<T>(
    predicate: (value: T, index: number) => boolean,
    inclusive: boolean = false
): OperatorFunction<T, T> {
    return (source: Observable<T>) => new Observable<T>(subscriber => {
        let index = 0;
        let completed = false;
        
        const subscription = source.subscribe({
            next: (value: T) => {
                if (completed) {
                    return;
                }
                
                const passes = predicate(value, index++);
                
                if (passes) {
                    subscriber.next(value);
                } else {
                    if (inclusive) {
                        subscriber.next(value);
                    }
                    subscriber.complete();
                    subscription.unsubscribe();
                    completed = true;
                }
            },
            error: (err: any) => {
                if (!completed) {
                    subscriber.error(err);
                }
            },
            complete: () => {
                if (!completed) {
                    subscriber.complete();
                }
            }
        });
        
        return subscription;
    });
}