import { forkJoin, from, map, mergeMap, Observable, ObservableInput, OperatorFunction } from "@awc/reactive";

/**
 * Specialized mergeMap for making multiple parallel requests and combining their results.
 * 
 * @template T - The type of values emitted by the source Observable
 * @template K - The keys of the dictionary
 * @template R - The type of values in the dictionary
 * @param {function(value: T): Record<K, ObservableInput<R>>} project - Function returning dictionary
 * @returns {OperatorFunction<T, Record<K, R>>} Operator emitting dictionary of results
 * 
 * @example
* // Make multiple parallel API calls
* getUser(1).pipe(
*   mergeMapDict(user => ({
*     profile: fetchProfile(user.id),
*     posts: fetchPosts(user.id),
*     comments: fetchComments(user.id)
*   }))
* ).subscribe(data => {
*   console.log('Profile:', data.profile);
*   console.log('Posts:', data.posts);
*   console.log('Comments:', data.comments);
* });
*/
export function mergeMapDict<T, K extends string, R>(
   project: (value: T) => Record<K, ObservableInput<R>>
): OperatorFunction<T, Record<K, R>> {
   return (source: Observable<T>) => new Observable<Record<K, R>>(subscriber => {
       return source.pipe(
           mergeMap((value: T) => {
               const dict = project(value);
               const keys = Object.keys(dict) as K[];
               const observables = keys.map(key => from(dict[key]));
               
               return forkJoin(observables).pipe(
                   map((results: R[]) => {
                       const resultDict = {} as Record<K, R>;
                       keys.forEach((key, index) => {
                           resultDict[key] = results[index];
                       });
                       return resultDict;
                   })
               );
           })
       ).subscribe(subscriber);
   });
}
