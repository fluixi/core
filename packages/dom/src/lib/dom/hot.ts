/**
 * Component hot reload, in dev. The compiler's dev transform routes a module's exports through
 * `createHotModule`: each component becomes a stable proxy whose implementation is a signal, so
 * when the module runs again with new code, the proxies it returns are the same ones every
 * importer already holds, and only their rendered instances rebuild. The rest of the page keeps
 * its state.
 */
import { createMemo, createSignal, untrack } from '@fluixi/reactive/signal';
import { createComponent } from './integration.js';

/** What dev tooling shares through the global registry. */
export interface HotRegistry {
  /** Custom elements defined with `defineElement`, by tag, while hot reload runs. */
  elements: Map<string, unknown>;
}

/** Where the router leaves its "load the data of the routes on screen again". */
export const RELOAD_ROUTE_DATA = Symbol.for('fluixi.hot.reloadRouteData');

const KEY = Symbol.for('fluixi.hot');

/** The registry, created on first use. Present only once a hot module has loaded. */
export function hotRegistry(): HotRegistry {
  const host = globalThis as Record<symbol, HotRegistry | undefined>;
  return (host[KEY] ??= { elements: new Map() });
}

/** The part of Vite's `import.meta.hot` this uses. */
interface ViteHot {
  data: Record<string, unknown>;
  invalidate(message?: string): void;
}

type Entry =
  | { kind: 'component'; proxy: (props: unknown) => unknown; set: (impl: () => unknown) => void }
  | { kind: 'data'; proxy: (...args: unknown[]) => unknown; impl: (...args: unknown[]) => unknown };

/**
 * One module's exports. On the server, and in a build, `hot` is undefined: the proxies still
 * render, so the server and the browser produce the same structure, and nothing is swapped.
 */
export function createHotModule(hot: ViteHot | undefined, id: string) {
  const entries = ((hot?.data ?? {}) as { fluixiHot?: Record<string, Entry> }).fluixiHot ?? {};
  if (hot) (hot.data as { fluixiHot?: Record<string, Entry> }).fluixiHot = entries;
  const update = Object.keys(entries).length > 0;
  let refuse: string | null = null;
  let dataChanged = false;

  return {
    /** A component export: the same proxy on every run of the module, with the newest code. */
    component<T>(name: string, impl: T): T {
      if (typeof impl !== 'function') {
        refuse ??= `${name} is not a component`;
        return impl;
      }
      const previous = entries[name];
      if (previous?.kind === 'component') {
        previous.set(() => impl);
        copyStatics(previous.proxy, impl);
        return previous.proxy as T;
      }
      const [current, set] = createSignal<(props: unknown) => unknown>(impl as never);
      // Untracked: the body's own reads must not re-render it whole, only a new implementation.
      const proxy = (props: unknown) =>
        createMemo(() => {
          const Component = current();
          return untrack(() => createComponent(Component as never, props as never));
        });
      Object.defineProperty(proxy, 'name', { value: (impl as { name?: string }).name || name });
      copyStatics(proxy, impl);
      entries[name] = { kind: 'component', proxy, set: (next) => set(next as never) };
      return proxy as T;
    },

    /** A route's `routeData` or `routeDeps`: a stable function that calls the newest one. */
    data<T>(name: string, impl: T): T {
      if (typeof impl !== 'function') return impl;
      const previous = entries[name];
      if (previous?.kind === 'data') {
        previous.impl = impl as never;
        dataChanged = true;
        return previous.proxy as T;
      }
      const entry: Entry = {
        kind: 'data',
        impl: impl as never,
        proxy: (...args: unknown[]) => (entry as { impl: (...a: unknown[]) => unknown }).impl(...args),
      };
      entries[name] = entry;
      return entry.proxy as T;
    },

    /** After the exports: on an update, reload what the swap cannot cover. */
    done(): void {
      if (!hot || !update) return;
      if (refuse) {
        hot.invalidate(`[fluixi] ${id}: ${refuse}, so the page reloads.`);
        return;
      }
      if (dataChanged) ((globalThis as Record<symbol, (() => void) | undefined>)[RELOAD_ROUTE_DATA])?.();
    },
  };
}

/** Compound components (`Tabs.List = TabsList`) keep their parts on the proxy. */
function copyStatics(proxy: object, impl: unknown): void {
  for (const key of Object.keys(impl as object)) {
    (proxy as Record<string, unknown>)[key] = (impl as Record<string, unknown>)[key];
  }
}

hotRegistry();
