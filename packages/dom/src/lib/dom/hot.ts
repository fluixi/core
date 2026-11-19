/**
 * Component hot reload, in dev. The compiler's dev transform routes a module's exports through
 * `createHotModule`: each component becomes a stable proxy whose implementation is a signal, so
 * when the module runs again with new code, the proxies it returns are the same ones every
 * importer already holds, and only their rendered instances rebuild. The rest of the page keeps
 * its state.
 *
 * With `keepState`, a rebuilt instance also keeps its signals and stores, matched by the order
 * the body creates them, and so do its children, matched by position under it.
 */
import {
  createChildOwner,
  createMemo,
  createSignal,
  disposeScope,
  getOwner,
  onCleanup,
  runWithOwner,
  setHotState,
  untrack,
  type HotState,
  type HotStateKind,
  type Owner,
} from '@fluixi/reactive/signal';
import { createComponent } from './integration.js';

/** What dev tooling shares through the global registry. */
export interface HotRegistry {
  /** Custom elements defined with `defineElement`, by tag, while hot reload runs. */
  elements: Map<string, unknown>;
  /**
   * Run a swap under a devtools mark: `label` names the commit the swap's writes land in, and
   * the elements it rebuilt are outlined for a moment.
   */
  announce(label: string, swap: () => void, rebuilt?: () => Element[]): void;
  /**
   * Run a custom element's render: with keepState on, the signals and stores it creates start
   * from the ones its previous render made, as a component's do.
   */
  keep<T>(host: object, render: () => T): T;
  /**
   * Start custom element renders fresh until the module's hot setup runs: what a file with
   * `// @refresh reset` says before its `defineElement` rebuilds anything.
   */
  reset(on: boolean): void;
}

/** Where the router leaves its "load the data of the routes on screen again". */
export const RELOAD_ROUTE_DATA = Symbol.for('fluixi.hot.reloadRouteData');

const KEY = Symbol.for('fluixi.hot');
/** Kept in step with the name in @fluixi/devtools' hook.ts. */
const DEVTOOLS = '__FLUIXI_DEVTOOLS_HOOK__';

interface DevtoolsMarks {
  mark?(label: string): void;
  flash?(elements: readonly Element[], label: string): void;
}

/** The registry, created on first use. Present only once a hot module has loaded. */
export function hotRegistry(): HotRegistry {
  const host = globalThis as Record<symbol, HotRegistry | undefined>;
  return (host[KEY] ??= { elements: new Map(), announce, keep: keepRender, reset: (on) => void (resetting = on) });
}

function announce(label: string, swap: () => void, rebuilt?: () => Element[]): void {
  const devtools = (globalThis as unknown as Record<string, DevtoolsMarks | undefined>)[DEVTOOLS];
  devtools?.mark?.(label);
  swap();
  if (devtools?.flash && rebuilt) devtools.flash(rebuilt(), label);
}

/** The part of Vite's `import.meta.hot` this uses. */
interface ViteHot {
  data: Record<string, unknown>;
  invalidate(message?: string): void;
}

export interface HotModuleOptions {
  /** Keep the signals and stores of a rebuilt instance and of its children. */
  keepState?: boolean;
}

type View = () => unknown;

type Entry =
  | { kind: 'component'; proxy: (props: unknown) => unknown; set: (impl: () => unknown) => void; views: Set<View> }
  | { kind: 'data'; proxy: (...args: unknown[]) => unknown; impl: (...args: unknown[]) => unknown };

/**
 * One module's exports. On the server, and in a build, `hot` is undefined: the proxies still
 * render, so the server and the browser produce the same structure, and nothing is swapped.
 */
export function createHotModule(hot: ViteHot | undefined, id: string, options: HotModuleOptions = {}) {
  const entries = ((hot?.data ?? {}) as { fluixiHot?: Record<string, Entry> }).fluixiHot ?? {};
  if (hot) (hot.data as { fluixiHot?: Record<string, Entry> }).fluixiHot = entries;
  const update = Object.keys(entries).length > 0;
  const keep = !!hot && !!options.keepState;
  if (keep) keepState();
  // The module body has run: a `// @refresh reset` set at its top applied to it alone.
  resetting = false;
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
        const views = previous.views;
        hotRegistry().announce(`hot update: ${name} (${id})`, () => previous.set(() => impl), () => elementsOf(views));
        copyStatics(previous.proxy, impl);
        return previous.proxy as T;
      }
      const [current, set] = createSignal<(props: unknown) => unknown>(impl as never);
      const views = new Set<View>();
      const proxy = (props: unknown) => {
        // Each build owns its effects and cleanups, so a swap disposes the old build's before
        // the new one runs, rather than leaving them on the parent until it goes.
        const scope = createChildOwner(getOwner());
        const instance: Instance = { scope, last: null, slot: -1 };
        let built = false;
        const view = createMemo(() => {
          const Component = current();
          if (built) disposeScope(scope, false);
          built = true;
          // Untracked: the body's own reads must not re-render it whole, only a new implementation.
          const render = () => runWithOwner(scope, () => untrack(() => createComponent(Component as never, props as never)));
          return frames ? build(proxy, keep, instance, render) : render();
        });
        views.add(view);
        onCleanup(() => views.delete(view));
        return view;
      };
      Object.defineProperty(proxy, 'name', { value: (impl as { name?: string }).name || name });
      copyStatics(proxy, impl);
      entries[name] = { kind: 'component', proxy, set: (next) => set(next as never), views };
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
      const reload = (globalThis as Record<symbol, (() => void) | undefined>)[RELOAD_ROUTE_DATA];
      if (dataChanged && reload) hotRegistry().announce(`hot update: route data (${id})`, reload);
    },
  };
}

/**
 * What one build of one instance created, in order, and the instances built under it. The
 * next build of the same place reads it back.
 */
interface Frame {
  component: unknown;
  kinds: HotStateKind[];
  reads: Array<() => unknown>;
  resets: Array<() => void>;
  /** Positions that started from the previous build's value. */
  restored: number[];
  children: Frame[];
  /** The previous build of this place, when its state is kept. */
  from: Frame | null;
}

interface Instance {
  /** The owner its builds run under. */
  scope: Owner;
  /** This instance's last build. */
  last: Frame | null;
  /** Its position among its parent's children, fixed at the first build. */
  slot: number;
}

/** Set once a module keeps state; until then no frame is made and signals pay nothing. */
let frames: WeakMap<object, Frame> | null = null;
/** Builds in progress: signals and stores go to the innermost one. */
const stack: Frame[] = [];

const hook: HotState = {
  take(kind, initial) {
    const frame = stack[stack.length - 1];
    if (!frame) return initial;
    const at = frame.kinds.push(kind) - 1;
    const old = frame.from;
    if (!old || old.kinds[at] !== kind) return initial;
    frame.restored.push(at);
    const value = old.reads[at]!();
    return kind === 'store' ? copyOr(value, initial) : value;
  },
  keep(read, reset) {
    const frame = stack[stack.length - 1];
    if (!frame) return;
    frame.reads.push(read);
    frame.resets.push(reset);
  },
};

function keepState(): void {
  if (frames) return;
  frames = new WeakMap();
  setHotState(hook);
}

function build(component: unknown, keep: boolean, instance: Instance, render: () => unknown): unknown {
  const parent = nearestFrame((instance.scope as { parent?: unknown }).parent);
  if (parent && instance.slot < 0) instance.slot = parent.children.length;
  // A rebuild starts from this instance's last build; a first build, from whatever stood at
  // its position under the parent's previous build, if it was the same component.
  let from = instance.last;
  if (!from && parent?.from) {
    const before = parent.from.children[instance.slot];
    if (before?.component === component) from = before;
  }
  const frame: Frame = { component, kinds: [], reads: [], resets: [], restored: [], children: [], from: keep ? from : null };
  if (parent) parent.children[instance.slot] = frame;
  frames!.set(instance.scope, frame);
  return run(frame, render, (done) => (instance.last = done));
}

/** A custom element's renders, by element: it is its own root, so its last render is enough. */
const elementRenders = new WeakMap<object, Frame>();
/** Set by a `// @refresh reset` module while its body runs. */
let resetting = false;

function keepRender<T>(host: object, render: () => T): T {
  if (!frames) return render();
  const frame: Frame = { component: host, kinds: [], reads: [], resets: [], restored: [], children: [], from: resetting ? null : elementRenders.get(host) ?? null };
  // Components rendered inside it find it as their parent, by their owner.
  const owner = getOwner();
  if (owner) frames.set(owner, frame);
  return run(frame, render, (done) => elementRenders.set(host, done)) as T;
}

function run(frame: Frame, render: () => unknown, settle: (frame: Frame) => void): unknown {
  stack.push(frame);
  try {
    return render();
  } finally {
    stack.pop();
    settle(frame);
    // A different number of signals means the order no longer says which is which: start
    // fresh, as without keepState. After the build, since a write inside it would re-enter it.
    if (frame.from && frame.restored.length && frame.kinds.length !== frame.from.kinds.length) {
      const resets = frame.restored.map((at) => frame.resets[at]!);
      queueMicrotask(() => resets.forEach((reset) => reset()));
    }
  }
}

function nearestFrame(owner: unknown): Frame | null {
  for (let at = owner as { parent?: unknown } | null | undefined; at; at = at.parent as typeof at) {
    const frame = frames!.get(at);
    if (frame) return frame;
  }
  return null;
}

/** A store's old state, copied so the new store does not share the old one's objects. */
function copyOr(value: unknown, fallback: unknown): unknown {
  try {
    return structuredClone(value);
  } catch {
    return fallback;
  }
}

/** The elements the given views render now, for the devtools to outline. */
function elementsOf(views: Set<View>): Element[] {
  const out: Element[] = [];
  const walk = (value: unknown): void => {
    if (typeof Element !== 'undefined' && value instanceof Element) out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (typeof value === 'function') walk(untrack(value as () => unknown));
  };
  for (const view of views) walk(untrack(view));
  return out;
}

/** Compound components (`Tabs.List = TabsList`) keep their parts on the proxy. */
function copyStatics(proxy: object, impl: unknown): void {
  for (const key of Object.keys(impl as object)) {
    (proxy as Record<string, unknown>)[key] = (impl as Record<string, unknown>)[key];
  }
}

hotRegistry();
