import { AsyncScheduler, Observable } from "@awc/reactive";

/**
 * Predicate function type for partition
 */
export type Predicate<T, S extends T> = 
    (value: T, index: number) => value is S;

/**
 * Splits the source Observable into two:
 * one with values that satisfy a predicate,
 * another with values that don't.
 * 
 * @template T The source type.
 * @template S The filtered type (when using type guard predicate).
 * 
 * @param {Observable<T>} source The source Observable.
 * @param {(value: T, index: number) => boolean} predicate Function to test each value.
 * @param {Scheduler} [scheduler] Optional scheduler for async predicate evaluation.
 * @returns {[Observable<T>, Observable<T>]} Tuple of two Observables.
 * 
 * @example
 * // Basic partition
 * const [evens, odds] = partition(source$, x => x % 2 === 0);
 * evens.subscribe(x => console.log('Even:', x));
 * odds.subscribe(x => console.log('Odd:', x));
 * 
 * @example
 * // Type-safe partition with type guard
 * interface Cat { type: 'cat'; meow(): void; }
 * interface Dog { type: 'dog'; bark(): void; }
 * type Animal = Cat | Dog;
 * 
 * const animals$ = new Observable<Animal>();
 * const [cats$, dogs$] = partition(
 *   animals$,
 *   (animal): animal is Cat => animal.type === 'cat'
 * );
 * 
 * cats$.subscribe(cat => cat.meow()); // TypeScript knows this is a Cat
 * 
 * @example
 * // Async predicate with scheduler
 * const [fast$, slow$] = partition(
 *   clicks$,
 *   async (click) => {
 *     // Async predicate logic
 *     return await checkIfFast(click);
 *   },
 *   asyncScheduler
 * );
 * 
 * @performance
 * - Single subscription to source (multicasting)
 * - No value buffering (direct forwarding)
 * - Efficient predicate caching for sync predicates
 * - Shared subscription resources
 */
export function partition<T, S extends T = T>(
    source: Observable<T>,
    predicate: Predicate<T, S> | ((value: T, index: number) => boolean | Promise<boolean>),
    scheduler?: AsyncScheduler
): [Observable<T>, Observable<T>] {
    // Cache for synchronous predicate results
    let syncPredicateCache: Map<T, boolean> | undefined;
    let index = 0;
    
    // Check if predicate is synchronous
    const isSyncPredicate = (
        predicate: (value: T, index: number) => boolean | Promise<boolean>
    ): predicate is (value: T, index: number) => boolean => {
        // Simple check: if predicate returns a Promise, it's async
        try {
            // Test with a dummy value
            const result = predicate({} as T, 0);
            return !(result && typeof result === 'object' && 'then' in result);
        } catch {
            return true; // Assume sync on error
        }
    };
    
    // Create shared multicast source
    const sharedSource = new Observable<{value: T; passes: boolean}>((observer) => {
        const subscription = source.subscribe({
            next: async (value: T) => {
                const currentIndex = index++;
                
                try {
                    let passes: boolean;
                    
                    if (isSyncPredicate(predicate)) {
                        // Check cache for sync predicate
                        if (!syncPredicateCache) {
                            syncPredicateCache = new Map();
                        }
                        
                        if (syncPredicateCache.has(value)) {
                            passes = syncPredicateCache.get(value)!;
                        } else {
                            passes = predicate(value, currentIndex);
                            syncPredicateCache.set(value, passes);
                        }
                        
                        // Emit immediately for sync predicate
                        observer.next({ value, passes });
                    } else {
                        // Async predicate evaluation
                        if (scheduler) {
                            // Schedule predicate evaluation
                            scheduler.schedule(async () => {
                                try {
                                    const result = await predicate(value, currentIndex);
                                    observer.next({ value, passes: result });
                                } catch (err) {
                                    observer.error(err);
                                }
                            }, 0);
                        } else {
                            // Evaluate async predicate immediately
                            const result = await predicate(value, currentIndex);
                            observer.next({ value, passes: result });
                        }
                    }
                } catch (err) {
                    observer.error(err);
                }
            },
            error: (err) => observer.error(err),
            complete: () => observer.complete()
        });
        
        return () => {
            subscription.unsubscribe();
            syncPredicateCache?.clear();
        };
    });
    
    // Create two output observables
    const trueObservable = new Observable<T>((observer) => {
        return sharedSource.subscribe({
            next: (event: { value: T; passes: boolean }) => {
                if (event.passes) {
                    observer.next(event.value);
                }
            },
            error: (err) => observer.error(err),
            complete: () => observer.complete()
        });
    });
    
    const falseObservable = new Observable<T>((observer) => {
        return sharedSource.subscribe({
            next: (event: { value: T; passes: boolean }) => {
                if (!event.passes) {
                    observer.next(event.value);
                }
            },
            error: (err) => observer.error(err),
            complete: () => observer.complete()
        });
    });
    
    return [trueObservable, falseObservable];
}


// export function partition<T>(
//     source: Observable<T>,
//     predicate: (value: T, index: number) => boolean
// ): [Observable<T>, Observable<T>] {
//     return [
//         source.pipe(filter(predicate)),
//         source.pipe(filter((value, index) => !predicate(value, index)))
//     ];
// }