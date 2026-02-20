/**
 * Lazy-load a component module. Returns a component function that
 * throws a Promise on first render (caught by Suspense), then
 * renders the real component once the module is loaded.
 */

import { Component } from "@awc/dom";
import { Accessor, createMemo, createResource, createSignal, untrack } from "@awc/reactive";
import { ComponentProps } from "./component";

/**
 * Lazy component loader
 */
export type LazyComponent<P = ComponentProps> = () => Promise<{
  default: Component<P>;
}>;

export interface LazyOptions {
  /** Fallback to show while loading */
  fallback?: any;
  /** Preload the component */
  preload?: boolean;
}
/**
 * Lazy-load a component module.
 *
 * SolidJS model — no throwing promises:
 * 1. Creates a resource that loads the module
 * 2. Resource self-registers with nearest Suspense via trackPromise
 * 3. While loading, resource() returns undefined → component renders nothing
 * 4. When loaded, resource() returns the component → memo re-evaluates → renders
 *
 * The Suspense boundary never re-creates the tree. The resource's signal
 * update drives the transition from fallback to content.
 */
export function lazy<T extends (...args: any[]) => any>(
  loader: () => Promise<{ default: T }>
): T {
  let loading: Promise<{ default: T }> | undefined;
  let component: Accessor<Component | undefined>;

  const LazyComponent = ((props: any) => {
    const [resolved, setResolved] = createSignal<Component | undefined>(undefined)
    if (!loading) {
      loading = loader().then((m) => {
        setResolved(()=>m.default)
        return m;
      });
      component = resolved
    }

    // Resource-based integration: self-registers with nearest Suspense.
    // createResource's internal effect calls the fetcher, which returns
    // the promise. trackPromise (called inside createResource's effect
    // via the suspense context) increments the counter. When the promise
    // resolves, the counter decrements → loading goes false.
    // const [comp] = createResource(() => loading ? loading : null);
    const [resource] = createResource(() =>
      loading!.then((m) => m.default)
    );

    component = resource as any




    // Memo: undefined while loading (Suspense shows fallback),
    // rendered component after (Suspense shows content).
    // iterateFn MUST stop at signals/memos (isSignal check) to prevent
    // infinite recursion when the rendered template is processed.
    return createMemo(() => {
      let C = component();
      if (C) {
        return untrack(() => (C as any)(props));
      }
      return undefined;
    });
  }) as unknown as T;

  (LazyComponent as any).$lazy = true;

  return LazyComponent;
}
