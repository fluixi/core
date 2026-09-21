/**
 * `resource`: `createResource` as one binding instead of a tuple.
 *
 *   const user = resource(userId, fetchUser);
 *
 *   user();          // the value: suspends under <Suspense>, exactly as before
 *   user.latest;     // last settled value, kept across a refetch
 *   user.loading;    // boolean
 *   user.error;
 *   user.refetch();
 *   user.mutate(next);
 *
 * `createResource` already hands back a callable carrying `loading`/`error`/`latest`,
 * with only the two actions split into a second tuple slot, so this mostly folds that
 * split away.
 *
 * The returned function is the accessor `createResource` gave back, with the two actions
 * assigned onto it, so suspending, tracking and SSR seeding are untouched, and a read is
 * the same call it always was.
 */
import { createResource } from './graph/resource.js';
import type {
  ResourceActions,
  ResourceFetcherInfo,
  ResourceReturn,
} from './graph/resource.js';

type ResourceOptions<T> = { initialValue?: T; name?: string; transport?: boolean };

type ResourceAccessor<T> = ResourceReturn<T>[0];

export type ResourceHandle<T> = ResourceAccessor<T> & ResourceActions<T>;

/**
 * The overloads are restated rather than borrowed from `createResource`.
 *
 * `Parameters<typeof createResource>` collapses an overloaded function to its **last**
 * signature, which is the one taking a source, so `resource(fetcher)` was rejected for
 * missing an argument even though the underlying call accepts it.
 */
export function resource<T>(
  fetcher: (k: true, info: ResourceFetcherInfo<T>) => T | Promise<T>,
  options?: ResourceOptions<T>,
): ResourceHandle<T>;
export function resource<T, S>(
  source: S | false | null | undefined | (() => S | false | null | undefined),
  fetcher: (k: S, info: ResourceFetcherInfo<T>) => T | Promise<T>,
  options?: ResourceOptions<T>,
): ResourceHandle<T>;
export function resource<T>(...args: unknown[]): ResourceHandle<T> {
  const [read, actions] = (createResource as (...a: unknown[]) => ResourceReturn<T>)(...args);

  // Assigned onto the accessor itself, so `loading`/`error`/`latest` stay the live
  // properties createResource put there rather than copies that would latch.
  return Object.assign(read, actions) as ResourceHandle<T>;
}
