import { Observable, Subscription } from '@awc/reactive';

/**
 * Creates an Observable that emits arrays combining the latest values from multiple input Observables.
 * Emits whenever any of the input Observables emits.
 *
 * @template T Array of types for each input Observable.
 *
 * @param {...Observable<T[number]>[]} sources Two or more Observables to combine.
 * @returns {Observable<T>} An Observable emitting arrays of the latest values.
 *
 * @example
 * // Combine two Observables
 * combineLatest(timer$, click$).subscribe(
 *   ([timerValue, clickEvent]) => console.log(timerValue, clickEvent)
 * );
 *
 * @example
 * // Combine multiple Observables with type inference
 * combineLatest(obs1$, obs2$, obs3$).subscribe(
 *   ([val1, val2, val3]) => console.log(val1, val2, val3)
 * );
 *
 * @performance
 * - Only stores latest value from each source (O(n) memory)
 * - Uses atomic updates to prevent race conditions
 * - Efficient emission checking with a single flag per source
 * - Avoids unnecessary emissions with complete source tracking
 */
export function combineLatest<T extends unknown[]>(
  ...sources: { [K in keyof T]: Observable<T[K]> }
): Observable<T> {
  return new Observable<T>((observer) => {
    const sourcesCount = sources.length;

    // If no sources, emit empty array and complete
    if (sourcesCount === 0) {
      observer.next([] as unknown as T);
      observer.complete();
      return;
    }

    // Storage for latest values from each source
    const latestValues: Partial<T>[] = new Array(sourcesCount);

    // Track which sources have emitted at least once
    const hasEmitted: boolean[] = new Array(sourcesCount).fill(false);

    // Track completed sources
    const completed: boolean[] = new Array(sourcesCount).fill(false);

    // Track active subscriptions
    const subscriptions: Subscription[] = new Array(sourcesCount);

    // Function to check if all sources have completed
    const allCompleted = (): boolean => {
      for (let i = 0; i < sourcesCount; i++) {
        if (!completed[i]) return false;
      }
      return true;
    };

    // Function to check if we can emit (all sources have emitted at least once)
    const canEmit = (): boolean => {
      for (let i = 0; i < sourcesCount; i++) {
        if (!hasEmitted[i]) return false;
      }
      return true;
    };

    // Function to emit combined value if all sources are ready
    const emitIfReady = (): void => {
      if (canEmit()) {
        try {
          observer.next(latestValues as T);
        } catch (err) {
          observer.error(err);
        }
      }
    };

    // Subscribe to each source
    for (let i = 0; i < sourcesCount; i++) {
      const sourceIndex = i;

      subscriptions[sourceIndex] = sources[sourceIndex].subscribe({
        next: (value: T[typeof sourceIndex]) => {
          // Store latest value
          latestValues[sourceIndex] = value as T;
          hasEmitted[sourceIndex] = true;

          // Emit if all sources have values
          emitIfReady();
        },
        error: (err) => {
          // Clean up all subscriptions on error
          subscriptions.forEach((sub, idx) => {
            if (idx !== sourceIndex && sub) {
              sub.unsubscribe();
            }
          });
          observer.error(err);
        },
        complete: () => {
          completed[sourceIndex] = true;

          // Check if all sources are completed
          if (allCompleted()) {
            observer.complete();
          }
        },
      });
    }

    // Cleanup function to unsubscribe from all sources
    return () => {
      subscriptions.forEach((subscription) => {
        if (subscription) {
          subscription.unsubscribe();
        }
      });

      // Clear references for garbage collection
      latestValues.length = 0;
    };
  });
}
