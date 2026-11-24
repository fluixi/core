/**
 * Lazy-load a component module.
 *
 * SolidJS-aligned pattern:
 *  1. `comp` signal is shared across all instances of this lazy component (module-level).
 *  2. `createResource` at the component level registers the load promise with the
 *     nearest Suspense boundary (trackPromise / resource.loading).
 *  3. A pure `createMemo` reads `comp()`: undefined while loading (Suspense shows
 *     fallback), the rendered component once loaded.
 *  4. `preload()` is exposed so routes / link hover handlers can start the download
 *     before the component is rendered.
 */

import { Component, ComponentProps, createComponent } from '@fluixi/dom';
import {
  Accessor,
  createMemo,
  createResource,
} from '@fluixi/reactive/signal';

// Public types

export type LazyComponent<P = ComponentProps> = () => Promise<{
  default: Component<P>;
}>;

export interface LazyOptions {
  /** Show this while the module is loading */
  fallback?: any;
  /** If true, start loading immediately when lazy() is called */
  preload?: boolean;
}

/**
 * Say that this came out of a chunk of its own, so devtools can tell a routed component apart
 * from one that shipped in the first bundle. Nothing but a watcher reads it.
 */
function fromChunk<T>(value: T): T {
  if (value != null && (typeof value === 'object' || typeof value === 'function')) {
    try {
      (value as Record<string, unknown>)['$lazy'] = true;
    } catch {
      /* frozen or exotic */
    }
  }
  return value;
}

// Implementation

/**
 * Defer a component to its own chunk, loaded the first time it renders.
 *
 * `loader` is a dynamic import, and its `default` export is the component. The returned
 * function stands in for it and carries `preload()`, which starts the import without
 * rendering anything. File routing uses that: `startClient` preloads the matched route
 * before hydrating.
 *
 * Preloading is what keeps hydration intact. If the module has already resolved by the
 * time this renders, the component renders synchronously on the first pass, so it adopts
 * the server's DOM in place. On a cold client navigation it goes through a resource
 * instead, suspends, and a `Suspense` boundary above it shows the fallback.
 *
 * @example
 * ```ts
 * const Settings = lazy(() => import('./Settings.js'));
 *
 * // somewhere that knows the route is next
 * void Settings.preload();
 * ```
 */
export function lazy<T extends (...args: any[]) => any>(
  loader: () => Promise<{ default: T }>,
  options?: LazyOptions,
): T & { preload: () => Promise<void> } {
  // The resolved component, set once the module loads. The whole hydration story turns on
  // this: when it's already set when LazyWrapper renders, because the route was preloaded
  // before hydration (see startClient -> preloadRoutes): we render it SYNCHRONOUSLY on the
  // first pass. No resource, no Suspense fallback, no late re-render. So the lazy file-route
  // adopts the server DOM in place instead of resolving a tick later and building a duplicate
  // next to it. The async path below is only for a cold client navigation.
  let resolved: Component | undefined;

  // Single in-flight / completed import. Idempotent: repeat calls reuse the same promise.
  let promise: Promise<Component> | undefined;

  // Suspense-tracked resource, created lazily on the cold (not-preloaded) path only.
  let component: Accessor<Component | undefined> | undefined;

  function load(): Promise<Component> {
    if (!promise) {
      promise = loader().then((mod) => (resolved = mod.default));
    }
    return promise;
  }

  if (options?.preload) load();

  const LazyWrapper = ((props: any) => {
    // Fast path: module already loaded (eager preload, or preloaded before hydration).
    // Render straight through: under hydration this consumes the cursor in place.
    if (resolved) {
      // Through `createComponent`, as the cold path below: it opens the component's key scope.
      // Called directly it opened none, so a page the server rendered cold (its first) keyed
      // everything one scope deeper than the browser did, and no element was claimed by key.
      return fromChunk(createComponent(resolved, props));
    }

    // Cold path: not loaded yet (client-side navigation to a route whose chunk hasn't been
    // fetched). Register the import with the nearest Suspense via createResource so the
    // fallback shows while it downloads, then swap in the component once it resolves.
    if (!component) {
      // transport:false, the value here is the component function, which never
      // travelled to the client, and the id it used to consume made the page's own
      // resource ids depend on whether this module was already loaded in the
      // process. The client re-imports the chunk itself either way.
      const [resource] = createResource(() => load(), { transport: false });
      component = resource;
      if (resource.error) throw resource.error;
    }
    // Left unnamed: this memo is the routed component's wrapper, so it should end up carrying
    // that component's name rather than a label of its own.
    return createMemo(() => {
      const C = component!();
      return C ? fromChunk(createComponent(C, props)) : undefined;
    });
  }) as unknown as T & { preload: () => Promise<void> };

  // Callers (link hover, router prefetch, the hydration preload pass) start the download
  // before the component enters the view: <a onMouseEnter={() => LazyFoo.preload()}>.
  LazyWrapper.preload = () => load().then(() => undefined);
  (LazyWrapper as any).$lazy = true;
  (LazyWrapper as any).loader = loader;

  return LazyWrapper;
}

