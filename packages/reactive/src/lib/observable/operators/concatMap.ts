import { mergeMap, ObservableInput, OperatorFunction } from '@awc/reactive';

/**
 * Projects each source value to an Observable which is merged in the output Observable in a serialized fashion,
 * waiting for each one to complete before merging the next.
 *
 * This is equivalent to mergeMap with concurrency set to 1.
 *
 * @template T - The type of values emitted by the source Observable
 * @template R - The type of values emitted by the projected Observables
 * @param {function(value: T, index: number): ObservableInput<R>} project - Projection function
 * @returns {OperatorFunction<T, R>} Operator that concatenates projected Observables
 *
 * @example
 * // Process items one at a time
 * of('task1', 'task2', 'task3').pipe(
 *   concatMap(task => performAsyncTask(task))
 * ).subscribe(result => {
 *   console.log('Task completed:', result);
 * });
 * // Tasks are processed sequentially
 */
export function concatMap<T, R>(
  project: (value: T, index: number) => ObservableInput<R>
): OperatorFunction<T, R> {
  return mergeMap(project, 1);
}
