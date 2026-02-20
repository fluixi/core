import { Observable, OperatorFunction } from "@awc/reactive";

/**
 * A comparison function type for distinctUntilChanged operator.
 * @template T The type of values being compared.
 */
type CompareFunction<T> = (previous: T | null, current: T) => boolean;

/**
 * Emits values only when they are different from the previous value.
 * Uses a comparator function or default equality check.
 * 
 * @template T The type of values emitted by the source Observable.
 * 
 * @param {CompareFunction<T>} [comparator] Optional comparison function.
 * If not provided, uses strict equality (===).
 * 
 * @returns {OperatorFunction<T, T>} An operator function that can be used with Observable.pipe().
 * 
 * @example
 * // Using default equality
 * source$.pipe(distinctUntilChanged()).subscribe(console.log);
 * 
 * @example
 * // Using custom comparator
 * source$.pipe(
 *   distinctUntilChanged((prev, curr) => prev?.id === curr?.id)
 * ).subscribe(console.log);
 * 
 * of(1, 1, 2, 2, 3, 1).pipe(distinctUntilChanged())
 *   .subscribe(val => console.log(val));
 * // Output: 1, 2, 3, 1
 * 
 * @performance
 * - O(1) time complexity for each emission
 * - Stores only the last value for comparison
 * - No unnecessary allocations for equal consecutive values
 */
export function distinctUntilChanged<T>(
    comparator?: CompareFunction<T>
): OperatorFunction<T, T> {
    return (source: Observable<T>): Observable<T> => {
        return new Observable<T>((observer) => {
            let hasPrevious = false;
            let previousValue: T | null = null;
            
            const subscription = source.subscribe({
                next: (currentValue: T) => {
                    let isEqual = false;
                    
                    try {
                        if (!hasPrevious) {
                            // First value always emits
                            previousValue = currentValue;
                            hasPrevious = true;
                            observer.next(currentValue);
                            return;
                        }
                        
                        // Use custom comparator if provided, otherwise strict equality
                        if (comparator) {
                            isEqual = comparator(previousValue, currentValue);
                        } else {
                            isEqual = previousValue === currentValue;
                        }
                        
                        if (!isEqual) {
                            previousValue = currentValue;
                            observer.next(currentValue);
                        }
                        // If equal, do nothing (skip the emission)
                    } catch (err) {
                        observer.error(err);
                    }
                },
                error: (err) => observer.error(err),
                complete: () => observer.complete()
            });
            
            return () => {
                // Clean up references to prevent memory leaks
                subscription.unsubscribe();
                previousValue = null;
            };
        });
    };
}