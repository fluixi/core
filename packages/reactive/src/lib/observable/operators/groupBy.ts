import { AsyncScheduler, OperatorFunction, Subscription } from "@awc/reactive";
import { asyncScheduler } from "@awc/reactive/schedulers/async";
import { Subject } from "@awc/reactive";
import {Observable} from '../observable.js'

/**
 * Key selector function for groupBy
 */
export type KeySelector<T, K> = (value: T, index: number) => K;

/**
 * Element selector function for groupBy
 */
export type ElementSelector<T, R> = (value: T, index: number) => R;

/**
 * Configuration options for groupBy
 */
export interface GroupByOptions<T, K, R> {
    /**
     * Element selector to transform values before adding to groups.
     * 
     * @default (value) => value
     */
    elementSelector?: ElementSelector<T, R>;
    
    /**
     * Duration selector for determining when a group should complete.
     * Returns an Observable - when it emits, the group completes.
     * 
     * @default undefined // Groups complete when source completes
     */
    durationSelector?: (group: Observable<R>) => Observable<any>;
    
    /**
     * Comparator for determining key equality.
     * 
     * @default (a, b) => a === b
     */
    comparator?: (a: K, b: K) => boolean;
    
    /**
     * Maximum number of concurrent groups.
     * Older groups are completed when limit is exceeded.
     * 
     * @default Infinity
     */
    maxConcurrency?: number;
    
    /**
     * Whether to include the index when calling selectors.
     * 
     * @default true
     */
    includeIndex?: boolean;
    
    /**
     * Scheduler for group management operations.
     * 
     * @default asyncScheduler
     */
    scheduler?: AsyncScheduler;
}

/**
 * Groups the items emitted by an Observable according to a specified key selector function
 * and emits these grouped items as GroupedObservables.
 * 
 * @template T The source type.
 * @template K The key type.
 * @template R The element type (after transformation).
 * 
 * @param {KeySelector<T, K>} keySelector Function to extract the key for grouping.
 * @param {GroupByOptions<T, K, R>} [options] Configuration options.
 * @returns {OperatorFunction<T, GroupedObservable<K, R>>} An operator function.
 * 
 * @example
 * // Group by first letter
 * fromArrayLike(['apple', 'banana', 'apricot', 'blueberry']).pipe(
 *   groupBy(word => word[0])
 * ).subscribe(group$ => {
 *   console.log('Group key:', group$.key);
 *   group$.subscribe(word => console.log('  ', word));
 * });
 * 
 * @example
 * // With element selector
 * interface Person { name: string; age: number; }
 * fromArrayLike(people).pipe(
 *   groupBy(
 *     person => person.age >= 18 ? 'adult' : 'child',
 *     { elementSelector: person => person.name }
 *   )
 * ).subscribe(group$ => {
 *   console.log(`${group$.key}s:`, group$.toArray());
 * });
 * 
 * @performance
 * - Efficient key comparison with comparator
 * - Memory management with maxConcurrency
 * - Lazy group creation
 * - Proper cleanup of completed groups
 */
export function groupBy<T, K, R = T>(
    keySelector: KeySelector<T, K>,
    options?: GroupByOptions<T, K, R>
): OperatorFunction<T, GroupedObservable<K, R>> {
    const elementSelector = options?.elementSelector || ((value: T) => value as any as R);
    const durationSelector = options?.durationSelector;
    const comparator = options?.comparator || ((a: K, b: K) => a === b);
    const maxConcurrency = options?.maxConcurrency ?? Infinity;
    const includeIndex = options?.includeIndex ?? true;
    const scheduler = options?.scheduler || asyncScheduler;
    
    return (source: Observable<T>): Observable<GroupedObservable<K, R>> => {
        return new Observable<GroupedObservable<K, R>>((observer) => {
            const groups = new Map<K, {
                group: GroupedObservable<K, R>;
                subject: Subject<R>;
                subscription: Subscription;
                count: number;
                createdTime: number;
            }>();
            
            let index = 0;
            let sourceCompleted = false;
            
            // Get or create a group
            const getOrCreateGroup = (key: K, value: T, currentIndex: number): GroupedObservable<K, R> | undefined => {
                // Find existing group
                for (const [existingKey, groupData] of groups.entries()) {
                    if (comparator(key, existingKey)) {
                        groupData.count++;
                        return groupData.group;
                    }
                }
                
                // Check max concurrency
                if (groups.size >= maxConcurrency) {
                    // Find oldest group to remove
                    let oldestKey: K | undefined;
                    let oldestTime = Infinity;
                    
                    for (const [groupKey, groupData] of groups.entries()) {
                        if (groupData.createdTime < oldestTime) {
                            oldestTime = groupData.createdTime;
                            oldestKey = groupKey;
                        }
                    }
                    
                    if (oldestKey !== undefined) {
                        removeGroup(oldestKey);
                    }
                }
                
                // Create new group
                const subject = new Subject<R>();
                const group = new GroupedObservable<K, R>(key, subject.asObservable());
                
                const groupData = {
                    group,
                    subject,
                    subscription: new Subscription(),
                    count: 1,
                    createdTime: Date.now()
                };
                
                groups.set(key, groupData);
                
                // Emit the new group
                scheduler.schedule(() => {
                    observer.next(group);
                }, 0);
                
                // Set up duration selector if provided
                if (durationSelector) {
                    const durationSub = durationSelector(subject.asObservable()).subscribe({
                        next: () => {
                            // Duration Observable emitted - complete the group
                            removeGroup(key);
                        },
                        error: (err) => {
                            subject.error(err);
                            removeGroup(key);
                        },
                        complete: () => {
                            // Duration completed - complete the group
                            removeGroup(key);
                        }
                    });
                    
                    groupData.subscription.add(durationSub);
                }
                
                return group;
            };
            
            // Remove a group
            const removeGroup = (key: K): void => {
                const groupData = groups.get(key);
                if (groupData) {
                    groupData.subject.complete();
                    groupData.subscription.unsubscribe();
                    groups.delete(key);
                    
                    // Check if we should complete the outer Observable
                    if (sourceCompleted && groups.size === 0) {
                        scheduler.schedule(() => {
                            observer.complete();
                        }, 0);
                    }
                }
            };
            
            // Process a value
            const processValue = (value: T, currentIndex: number): void => {
                try {
                    const key = keySelector(value, currentIndex);
                    const element = elementSelector(value, currentIndex);
                    
                    const group = getOrCreateGroup(key, value, currentIndex);
                    
                    if (group) {
                        const groupData = groups.get(key);
                        if (groupData) {
                            groupData.subject.next(element);
                        }
                    }
                } catch (err) {
                    observer.error(err);
                }
            };
            
            const subscription = source.subscribe({
                next: (value: T) => {
                    const currentIndex = includeIndex ? index++ : 0;
                    processValue(value, currentIndex);
                },
                error: (err: unknown) => {
                    // Error all active groups
                    groups.forEach(groupData => {
                        groupData.subject.error(err);
                        groupData.subscription.unsubscribe();
                    });
                    groups.clear();
                    observer.error(err);
                },
                complete: () => {
                    sourceCompleted = true;
                    
                    // Complete all active groups
                    groups.forEach(groupData => {
                        groupData.subject.complete();
                        groupData.subscription.unsubscribe();
                    });
                    
                    if (groups.size === 0) {
                        scheduler.schedule(() => {
                            observer.complete();
                        }, 0);
                    } else {
                        // Groups will complete themselves
                        groups.clear();
                    }
                }
            });
            
            // Cleanup function
            return () => {
                subscription.unsubscribe();
                groups.forEach(groupData => {
                    groupData.subject.complete();
                    groupData.subscription.unsubscribe();
                });
                groups.clear();
            };
        });
    };
}

/**
 * Grouped Observable with a key property
 */
export class GroupedObservable<K, T> extends Observable<T> {
    /**
     * Creates a new GroupedObservable
     * @param key The key for this group
     * @param source The source Observable for this group
     */
    constructor(
        public readonly key: K,
        source: Observable<T>
    ) {
        super((observer) => source.subscribe(observer));
    }
}