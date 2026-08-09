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

import { Component, ComponentProps } from '@fluixi/dom';
import {
  Accessor,
  untrack,
  createMemo,
  createResource,
} from '@fluixi/reactive/signal';

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
  // The resolved component, set once the module loads. The whole hydration story turns on
  // this: when it's already set when LazyWrapper renders — because the route was preloaded
  // before hydration (see startClient → preloadRoutes) — we render it SYNCHRONOUSLY on the
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
    // Render straight through — under hydration this consumes the cursor in place.
    if (resolved) {
      const C = resolved;
      return untrack(() => C(props));
    }

    // Cold path: not loaded yet (client-side navigation to a route whose chunk hasn't been
    // fetched). Register the import with the nearest Suspense via createResource so the
    // fallback shows while it downloads, then swap in the component once it resolves.
    if (!component) {
      // transport:false — the value here is the component function, which never
      // travelled to the client, and the id it used to consume made the page's own
      // resource ids depend on whether this module was already loaded in the
      // process. The client re-imports the chunk itself either way.
      const [resource] = createResource(() => load(), { transport: false });
      component = resource;
      if (resource.error) throw resource.error;
    }
    return createMemo(() => {
      const C = component!();
      return C ? untrack(() => C(props)) : undefined;
    }, undefined, { name: 'lazy' });
  }) as unknown as T & { preload: () => Promise<void> };

  // Callers (link hover, router prefetch, the hydration preload pass) start the download
  // before the component enters the view: <a onMouseEnter={() => LazyFoo.preload()}>.
  LazyWrapper.preload = () => load().then(() => undefined);
  (LazyWrapper as any).$lazy = true;
  (LazyWrapper as any).loader = loader;

  return LazyWrapper;
}

