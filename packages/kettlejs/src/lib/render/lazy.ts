/**
 * Lazy-load a component module.
 *
 * SolidJS-aligned pattern:
 *  1. `comp` signal is shared across all instances of this lazy component (module-level).
 *  2. `createResource` at the component level registers the load promise with the
 *     nearest Suspense boundary (trackPromise / resource.loading).
 *  3. A pure `createMemo` reads `comp()` — undefined while loading (Suspense shows
 *     fallback), the rendered component once loaded.
 *  4. `preload()` is exposed so routes / link hover handlers can start the download
 *     before the component is rendered.
 */

import { Component, ComponentProps, createMemo, createResource, createSignal, } from '@fluixi/dom';
import { Accessor, untrack } from '@fluixi/reactive/signal';

// ─── Public types ────────────────────────────────────────────────────────────

export type LazyComponent<P = ComponentProps> = () => Promise<{
  default: Component<P>;
}>;

export interface LazyOptions {
  /** Show this while the module is loading */
  fallback?: any;
  /** If true, start loading immediately when lazy() is called */
  preload?: boolean;
}

// ─── Implementation ──────────────────────────────────────────────────────────

export function lazy<T extends (...args: any[]) => any>(
  loader: () => Promise<{ default: T }>,
  options?: LazyOptions,
): T & { preload: () => Promise<void> } {
  const lazyCache = new WeakMap();
  // ── Module-level state ─────────────────────────────────────────────────────
  // Shared across every instance of this lazy component so that the first
  // render that triggers loading benefits all subsequent renders.
  
  // The resolved component function (undefined until the module loads).
  // createSignal here is fine at module level — signals need no owner.
  // const [comp, setComp] = createSignal<T | undefined>(undefined);
  let component: Accessor<Component | undefined> | undefined;
  const [resolved, setResolved] = createSignal<any | undefined>(undefined)

  // The single in-flight / completed promise.  Idempotent: subsequent calls
  // to load() return the same promise instead of re-importing the module.
  let promise: Promise<any> | undefined;
  

  function load(): Promise<any> {
    if (!promise) {
      promise = loader().then((mod) => {
        // Functional setter form `() => value` prevents the setter from
        // interpreting the component function as an updater callback.
        // setComp(() => mod.default);
        return mod.default
      });
      // component = comp
    }
    return promise;
  }

  // ── Optional eager preload ─────────────────────────────────────────────────
  if (options?.preload) {
    load();
  }

  // ── Component wrapper ──────────────────────────────────────────────────────
  const LazyWrapper = ((props: any) => {
    // createResource registers the loading promise with the nearest Suspense
    // boundary via trackPromise / context.increment().  The resource is created
    // at the component (not memo) level so its internal effect is owned by this
    // component instance and is not cancelled by memo re-evaluation.
    if(!component){
      const [resource] = createResource(() => promise || load());
      component = resource
      // setComp(resource)
      // If the component is not yet loaded, show the fallback.
      // if (resource.loading) return options?.fallback;
  
      // If the component has failed to load, show the error.
      if (resource.error) throw resource.error;
    }

    // setComp(resource())

    // Pure memo: reads `comp` (the shared signal) — creates no side effects.
    //   • While loading  → comp() === undefined → return undefined
    //                      Suspense boundary keeps showing the fallback.
    //   • After load     → comp() === RealComponent → call it with props
    //                      Suspense switches to content.
    //
    // untrack() around the component call ensures the component's own reactive
    // primitives are NOT tracked as dependencies of this memo.
//     const C = comp();
// if (!C) return undefined;
// return untrack(() => C(props));
// if(lazyCache.has(loader)) return untrack(lazyCache.get(loader))
    return createMemo(() => {
      const C = component!();
      if (!C) {
        // Module still loading — throw the promise so Suspense boundaries catch it.
        // The throw propagates to createMemo's catch block which calls
        // ctx.increment() on the nearest SuspenseContext found via useContext.
        // throw promise || load();
        return undefined
      }
      // return res;
      // if(untrack(resolved)) {
      //     // console.log('resolved is', resolved())
      //     return resolved()
      //   }
        const res = typeof C==="function" ? untrack(() => C!(props)) : C
        setResolved(()=>res)
        return res
        // return typeof C==="function" ? untrack(() => C!(props)) : C
    }, undefined, {name: "lazy"});
  }) as unknown as T & { preload: () => Promise<void> };

  // ── Preload API ────────────────────────────────────────────────────────────
  // Callers can kick off the download before the component enters the view:
  //   <a onMouseEnter={() => LazyFoo.preload()}>…</a>
  //   router.prefetch(LazyFoo)
  LazyWrapper.preload = load;
  (LazyWrapper as any).$lazy = true;
  (LazyWrapper as any).loader = loader;

  return LazyWrapper;
}

export function lazy1<T extends (...args: any[]) => any>(
  loader: () => Promise<{ default: T }>
): T {
  let loading: Promise<{ default: T }> | undefined;
  let component: Accessor<Component | undefined>;


  console.log('lazy for loader', loader)
  const [resolved, setResolved] = createSignal<Component | undefined>(undefined)
  const LazyComponent = ((props: any) => {
    // if(loaded.has(loader)){
    //   console.log('lazy run for loader', loader, loaded.get(loader))
    //   return ()=> loaded.get(loader)
    // }
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
    // const [resource] = createResource(() => loading ? loading.then((m) => m.default) : null);
    const [resource] = createResource(() =>
      loading!.then((m) => m.default)
    );

    component = resource as any
    // if(!loaded.has(loader)){
    //   loaded.set(loader, component)
      
    // }else{
    //   component = resolved
    // }





    // Memo: undefined while loading (Suspense shows fallback),
    // rendered component after (Suspense shows content).
    // iterateFn MUST stop at signals/memos (isSignal check) to prevent
    // infinite recursion when the rendered template is processed.
    // if(!initial){
    //   initial = true
    //       return createMemo(() => {
    //   let C = component();
    //     // console.log('lazy load',C )
    //   if (C) {
    //     return untrack(() => (C as any)(props));
    //   }
    //   return undefined;
    // });
    // }
    // return createMemo(() => {
    //   let C = component();
    //   return untrack(()=>{
    //     // console.log('lazy load',C , loader)
    //     if (C) {
    //       // if(loaded.has(loader)){
    //       //   return untrack(()=>loaded.get(loader))
    //       // }
    //       // const tracked = untrack(() => (C as any)(props))
    //       // loaded.set(loader, C)
    //       return untrack(() => (C as any)(props));
    //     }
    //     return undefined;
    //   })
    // })
    return createMemo(() => {
      let C = component();
        console.log('lazy load',C )
      if (C) {
        return untrack(() => (C as any)(props));
      }
      return undefined;
    });
  }) as unknown as T;

  (LazyComponent as any).$lazy = true;

  return LazyComponent;
}
