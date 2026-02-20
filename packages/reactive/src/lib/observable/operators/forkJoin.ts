import {from, Observable, ObservableInput, ObservableInputDictionary, ObservedValueOf} from '@awc/reactive';

/**
 * Creates an Observable that waits for all input Observables to complete,
 * then emits an array or object containing the last values from each.
 * 
 * This is often used for making parallel HTTP requests or waiting for
 * multiple async operations to complete before proceeding.
 * 
 * @overload
 * @template O - Array of ObservableInputs
 * @param {O[]} sources - Array of Observables or convertible inputs
 * @returns {Observable<ObservedValueTuple<O>>} Observable emitting tuple of last values
 * 
 * @overload
 * @template T - Array of value types
 * @param {...ObservableInput<T>[]} sources - Observables to combine
 * @returns {Observable<T[]>} Observable emitting array of last values
 * 
 * @overload
 * @template O - Dictionary of ObservableInputs
 * @param {ObservableInputDictionary<O>} sources - Dictionary of Observables
 * @returns {Observable<ObservedValueDictionary<O>>} Observable emitting dictionary of last values
 * 
 * @example
 * // Combine multiple HTTP requests
 * forkJoin([
 *   fetch('/api/users').then(r => r.json()),
 *   fetch('/api/posts').then(r => r.json()),
 *   fetch('/api/comments').then(r => r.json())
 * ]).subscribe(([users, posts, comments]) => {
 *   console.log('All data loaded:', { users, posts, comments });
 * });
 * 
 * @example
 * // Combine Observables of different types
 * forkJoin([
 *   of('Hello'),
 *   interval(1000).pipe(take(3)),
 *   from(Promise.resolve(42))
 * ]).subscribe(([greeting, numbers, answer]) => {
 *   console.log(greeting, numbers, answer);
 * });
 * 
 * @example
 * // Object form for named results
 * forkJoin({
 *   user: fetchUser(1),
 *   posts: fetchUserPosts(1),
 *   stats: fetchUserStats(1)
 * }).subscribe(result => {
 *   console.log(`User: ${result.user.name}`);
 *   console.log(`Post count: ${result.posts.length}`);
 *   console.log(`Stats: ${result.stats}`);
 * });
 * 
 * @example
 * // With error handling - fails fast
 * forkJoin([
 *   of(1),
 *   throwError(() => new Error('Failed')),
 *   of(3)
 * ]).subscribe({
 *   next: console.log,
 *   error: err => console.error('One failed:', err)
 * });
 * // Only error handler is called
 * 
 * @example
 * // Empty array case
 * forkJoin([]).subscribe(values => {
 *   console.log(values); // Output: []
 * });
 * 
 * @note If any input Observable errors, forkJoin immediately errors
 * @note If any input Observable never completes, forkJoin never emits
 */
export function forkJoin<O extends ObservableInput<any>[]>(
    sources: O
): Observable<ObservedValueTuple<O>>;

export function forkJoin<O extends ObservableInput<any>[]>(
    ...sources: O
): Observable<ObservedValueTuple<O>>;

export function forkJoin<O extends Record<string, ObservableInput<any>>>(
    sources: O
): Observable<ObservedValueDictionary<O>>;

export function forkJoin<O extends ObservableInput<any>[] | Record<string, ObservableInput<any>>>(
    ...args: any[]
): Observable<any> {
    // Handle array form
    if (Array.isArray(args[0]) || args.length === 0) {
        const sources = (args[0] as ObservableInput<any>[]) || [];
        return forkJoinArray(sources);
    }
    
    // Handle object form
    if (args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
        return forkJoinObject(args[0] as Record<string, ObservableInput<any>>);
    }
    
    // Handle rest parameters form
    return forkJoinArray(args as ObservableInput<any>[]);
}

/**
 * Implementation for array form of forkJoin.
 * 
 * @template O - Array of ObservableInput types
 * @param {O} sources - Array of Observable inputs
 * @returns {Observable<ObservedValueTuple<O>>} Observable emitting tuple
 * 
 * @private
 */
function forkJoinArray<O extends ObservableInput<any>[]>(
    sources: O
): Observable<ObservedValueTuple<O>> {
    return new Observable(subscriber => {
        const length = sources.length;
        
        // Handle empty array case
        if (length === 0) {
            subscriber.next([] as any);
            subscriber.complete();
            return;
        }
        
        const values: any[] = new Array(length);
        const completed = new Array(length).fill(false);
        let completedCount = 0;
        
        const subscriptions = sources.map((source$, index) => {
            const observable = from(source$);
            
            return observable.subscribe({
                next: (value: any) => {
                    values[index] = value;
                },
                error: (err: any) => {
                    subscriber.error(err);
                },
                complete: () => {
                    completed[index] = true;
                    completedCount++;
                    
                    if (completedCount === length) {
                        subscriber.next(values as any);
                        subscriber.complete();
                    }
                }
            });
        });
        
        return () => {
            subscriptions.forEach(sub => sub.unsubscribe());
        };
    });
}

/**
 * Implementation for object form of forkJoin.
 * 
 * @template O - Dictionary type
 * @param {ObservableInputDictionary<O>} sources - Dictionary of Observable inputs
 * @returns {Observable<ObservedValueDictionary<O>>} Observable emitting dictionary
 * 
 * @private
 */
function forkJoinObject<O extends Record<string, ObservableInput<any>>>(
    sources: ObservableInputDictionary<O>
): Observable<ObservedValueDictionary<O>> {
    return new Observable(subscriber => {
        const keys = Object.keys(sources);
        const length = keys.length;
        
        // Handle empty object case
        if (length === 0) {
            subscriber.next({} as any);
            subscriber.complete();
            return;
        }
        
        const values: any = {};
        const completed: Record<string, boolean> = {};
        let completedCount = 0;
        
        const subscriptions = keys.map(key => {
            const source$ = sources[key];
            const observable = from(source$);
            
            completed[key] = false;
            
            return observable.subscribe({
                next: (value: any) => {
                    values[key] = value;
                },
                error: (err: any) => {
                    subscriber.error(err);
                },
                complete: () => {
                    completed[key] = true;
                    completedCount++;
                    
                    if (completedCount === length) {
                        subscriber.next(values);
                        subscriber.complete();
                    }
                }
            });
        });
        
        return () => {
            subscriptions.forEach(sub => sub.unsubscribe());
        };
    });
}

/**
 * Extracts value types from a tuple of ObservableInputs.
 * 
 * @template O - Tuple of ObservableInput types
 * 
 * @private
 */
type ObservedValueTuple<O extends ObservableInput<any>[]> = {
    [K in keyof O]: ObservedValueOf<O[K]>;
};

/**
 * Extracts value types from a dictionary of ObservableInputs.
 * 
 * @template O - Dictionary type
 * 
 * @private
 */
type ObservedValueDictionary<O extends Record<string, ObservableInput<any>>> = {
    [K in keyof O]: ObservedValueOf<O[K]>;
};