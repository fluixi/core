/**
 * @fileoverview KettleJS adapter for the framework-agnostic @fluixi/router core.
 *
 * Renders the resolved match tree TOP-DOWN. Each layer's component is rendered
 * inside the PARENT layer's <Outlet/> scope, so a child route inherits whatever
 * context a parent layout provides. <Outlet/> is reactive but keyed on the child's
 * component reference, so it only re-renders when the child route at that depth
 * actually changes — sibling navigation reuses the layout, deeper navigation
 * leaves shallower layouts untouched.
 *
 * No parentGate, no deferred content memo: a child is rendered straight from the
 * matched array, never by re-entering a still-building parent, so deeply nested
 * <Outlet/> works at any depth.
 */

import {
  createSignal,
  createMemo,
  createResource,
  createEffect,
  getOwner,
  onCleanup,
  untrack,
  insert,
  createComponent,
} from '@fluixi/dom';
import { html } from '@fluixi/lit';
// Reactive context (not kettlejs createProvider, which destructures children
// eagerly) so a `get children()` getter renders AFTER the context is stamped.
import { createContext, useContext } from '@fluixi/reactive/signal';
import { get, type GetAtPath } from '@fluixi/utils/object';
import type { IsUndefined } from '@fluixi/utils/primitive';
import { deepEqual } from '@fluixi/utils/compare';

import {
  createRouter as createCoreRouter,
  createBrowserHistory,
  matchPath,
  type RouteDefinition,
  type MatchedRoute,
  type Router as CoreRouter,
  type HistoryAdapter,
  type RouterLocation,
  type NavigateOptions,
} from '@fluixi/router';

// ─── Contexts ──────────────────────────────────────────────────────────────

interface RouterCtxValue {
  router: CoreRouter<any>;
  location: () => RouterLocation;
  params: () => Record<string, string>;
}
const RouterContext = createContext<RouterCtxValue>();

/** What an <Outlet/> needs to render the next layer. */
interface OutletCtxValue {
  depth: number;
  matched: () => MatchedRoute<any>[];
  params: () => Record<string, string>;
  location: () => RouterLocation;
}
const OutletContext = createContext<OutletCtxValue | undefined>();

const LevelParamsContext = createContext<Record<string, string>>();
const RouteDataContext = createContext<(() => any) | undefined>();

interface RouteDataArgsLocal {
  params: () => Record<string, string>;
  location: () => RouterLocation;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

/** Render one matched layer: load its data, stamp its contexts, run its component. */
function renderLayer(
  m: MatchedRoute<any>,
  depth: number,
  base: Omit<OutletCtxValue, 'depth'>
): any {
  // Load this layer's data once. createResource integrates with the nearest
  // Suspense; it is owned by the enclosing memo, so it is recreated only when this
  // layer's route changes (not on deeper navigation).
  let data: (() => any) | undefined;
  const loader = (m.route as RouteDefinition<any>).data as
    | ((args: RouteDataArgsLocal, owner: unknown, isCancelled: () => boolean) => any)
    | undefined;
  if (typeof loader === 'function') {
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });
    const owner = getOwner();
    const [resource] = createResource(() =>
      loader({ params: base.params, location: base.location }, owner, () => cancelled)
    );
    data = resource as () => any;
  }

  const buildPage = () =>
    RouteDataContext.Provider({
      value: data,
      get children() {
        return LevelParamsContext.Provider({
          value: m.params,
          get children() {
            return OutletContext.Provider({
              value: { depth, ...base },
              get children() {
                return createComponent(m.component, {});
              },
            });
          },
        });
      },
    });

  if (!data) return buildPage();

  // Gate on the data being resolved — like the old router — so the page reads
  // ready data (rd() returns the value, not a thrown promise) and works without a
  // Suspense boundary. Signal-gated (`ready` only flips when loading actually
  // changes) so navigation re-renders don't re-run this and rebuild the page.
  const res = data as () => any;
  const isLoading = () => (res as any).loading as boolean;
  // untrack the initial read so the enclosing render memo doesn't subscribe to the
  // resource state (that would re-run renderLayer and recreate the resource — a loop).
  const [ready, setReady] = createSignal(untrack(() => !isLoading()));
  createEffect(() => setReady(!isLoading()));
  return createMemo(() => (ready() ? buildPage() : null));
}

/**
 * Renders the next matched layer, reactively but keyed on its component ref so the
 * child is only rebuilt when the route at this depth changes. Used by both <Outlet/>
 * and the Router root.
 */
function renderChild(ctx: OutletCtxValue): any {
  const childIdx = ctx.depth + 1;

  // Gate rendering on the child component reference through a SIGNAL, not a direct
  // memo read. This reactive core marks the whole downstream memo chain stale on any
  // signal write (no value check), so a memo that read `matched` would re-run on
  // every navigation and re-render the child. A signal only notifies when its value
  // actually changes, so the render memo below re-runs only when the route at this
  // depth changes — sibling navigation reuses the layout, deeper navigation leaves
  // this level untouched. The child is rendered INLINE (no detached createRoot), so
  // it stays connected to the Suspense / context owner chain.
  const [childComp, setChildComp] = createSignal<any>(
    untrack(() => ctx.matched()[childIdx]?.component)
  );
  createEffect(() => {
    const c = ctx.matched()[childIdx]?.component;
    setChildComp(() => c);
  });

  return createMemo(() => {
    const component = childComp();
    if (!component) return null;
    const m = untrack(() => ctx.matched())[childIdx];
    return renderLayer(m, childIdx, {
      matched: ctx.matched,
      params: ctx.params,
      location: ctx.location,
    });
  });
}

// ─── Router ────────────────────────────────────────────────────────────────────

export interface RouterProps<C = any> {
  routes: RouteDefinition<C>[];
  base?: string;
  history?: HistoryAdapter;
}

export function Router<C = any>(props: RouterProps<C>) {
  const history = props.history ?? createBrowserHistory();
  const router = createCoreRouter<C>({
    routes: props.routes,
    base: props.base,
    history,
  });

  const [state, setState] = createSignal(router.state());
  const unsub = router.subscribe(setState);
  onCleanup(() => {
    unsub();
    router.destroy();
  });

  // Drop pathless layers (no component) — their params still appear in the merged
  // params exposed by RouterContext.
  const matched = createMemo(() =>
    (state().match?.matched ?? []).filter((m) => m.component)
  );

  const ctx: RouterCtxValue = {
    router: router as CoreRouter<any>,
    location: createMemo(() => state().location),
    params: createMemo(() => state().match?.params ?? {}),
  };

  // Render depth 0 (a virtual parent at depth -1 so the root reuses the same path).
  const root: OutletCtxValue = {
    depth: -1,
    matched,
    params: ctx.params,
    location: ctx.location,
  };

  // Build the root view once, lazily, inside the provider's children getter: the
  // getter must run in the provider scope (so components can useRouter), but the
  // reactive provider re-invokes it whenever content changes — caching keeps the
  // root chain from being rebuilt on every navigation.
  let rootView: any;
  return RouterContext.Provider({
    value: ctx,
    get children() {
      return (rootView ??= renderChild(root));
    },
  });
}

// ─── Outlet ───────────────────────────────────────────────────────────────────

/** Renders this layout's child route, inside this layout's context. */
export function Outlet() {
  const ctx = useContext(OutletContext);
  if (!ctx) return null;
  return renderChild(ctx);
}

/** Navigate to `to` on mount (replace by default). Renders nothing. */
export function Redirect(props: { to: string; replace?: boolean }) {
  const ctx = useContext(RouterContext);
  if (!ctx || typeof window === 'undefined') return null;
  createEffect(() => {
    ctx.router.navigate(props.to, { replace: props.replace !== false });
  });
  return null;
}


// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useRouter(): RouterCtxValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('[router-next] useRouter must be used within <Router>');
  return ctx;
}

/**
 * Reactive merged params across all matched layers, as an accessor. Deep-equal
 * memoized so it only notifies when a value actually changes (the underlying
 * params object is rebuilt on every transition).
 */
export function useParams<
  T extends Record<string, string> = Record<string, string>,
>(): () => T {
  const params = useRouter().params;
  return createMemo(() => params() as T, {} as T, {
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
}

/** Params introduced at the nearest matched layer. */
export function useLevelParams(): Record<string, string> {
  return useContext(LevelParamsContext) ?? {};
}

/**
 * Reactive accessor for a single route param. Default `===` equality on the
 * string value, so it only re-triggers when THIS key changes — not when other
 * params at the same level change.
 */
export function useParam(key: string): () => string | undefined {
  const params = useParams();
  return createMemo(() => params()[key]);
}

/**
 * Derive a stable value from route params. Only re-triggers when the selector's
 * return value changes. For object returns, pass a custom `equals`.
 *
 * @example
 * const ids = useParamSelector((p) => ({ wsId: p.workspaceId, chId: p.channelId }), deepEqual);
 */
export function useParamSelector<T>(
  selector: (params: Record<string, string>) => T,
  equals?: (a: T, b: T) => boolean
): () => T {
  const params = useParams();
  return createMemo(
    () => selector(params()),
    undefined as T,
    equals ? { equals } : undefined
  );
}

/**
 * Match a path pattern against the current pathname, reactively. Returns the
 * matched `{ params, path }` or null.
 */
export function useMatch(
  path: (() => string) | string
): () => { params: Record<string, string>; path: string } | null {
  const location = useLocation();
  return createMemo(() =>
    matchPath(typeof path === 'function' ? path() : path, location.pathname)
  );
}

/**
 * Read/write the current query string. Returns `[params, setParams]`: `params`
 * is a reactive accessor of the parsed query; `setParams` merges the given keys
 * (null deletes) and navigates. Matches the old router.
 */
export function useSearchParams(): readonly [
  () => Record<string, string>,
  (next: Record<string, string | null>, options?: NavigateOptions) => void,
] {
  const location = useLocation();
  const navigate = useNavigate();
  const params = createMemo(() => location.query);

  const setParams = (
    next: Record<string, string | null>,
    options?: NavigateOptions
  ) => {
    const current = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(next)) {
      if (v === null) current.delete(k);
      else current.set(k, v);
    }
    const search = current.toString();
    navigate(location.pathname + (search ? `?${search}` : ''), options);
  };

  return [params, setParams] as const;
}

/**
 * Stable accessor from any reactive source with deep-equal memoization. Pass a
 * `key` to select a nested property. Only re-triggers downstream when the value
 * (or selected field) actually changes.
 *
 * @example
 * const ws = select(store.activeWorkspace);        // whole object
 * const id = select(store.activeWorkspace, 'id');  // single field
 */
export function select<T, K extends string = never>(
  source: () => T,
  key?: K
): () => IsUndefined<K> extends true ? T : GetAtPath<T, K> {
  const equals = (a: any, b: any) => deepEqual(a, b);
  if (key !== undefined) {
    return createMemo(
      () => get(source() as any, key as any) as any,
      undefined,
      { equals }
    ) as any;
  }
  return createMemo(source, undefined, { equals }) as any;
}

/**
 * The current location as a reactive object: reading a property (pathname, etc.)
 * subscribes to location changes. Matches the old router's useLocation().
 */
export function useLocation(): RouterLocation {
  const { location } = useRouter();
  return new Proxy({} as RouterLocation, {
    get: (_t, key) => (location() as any)[key],
    has: (_t, key) => key in location(),
    ownKeys: () => Reflect.ownKeys(location() as object),
    getOwnPropertyDescriptor: (_t, key) =>
      Object.getOwnPropertyDescriptor(location(), key),
  });
}

export function useNavigate(): (to: string, options?: NavigateOptions) => void {
  const { router } = useRouter();
  return (to, options) => router.navigate(to, options);
}

/**
 * The resolved data for the nearest route that declared a `data` loader. Always
 * returns a callable accessor (matching the old router): it suspends under
 * <Suspense> while loading and yields undefined when no ancestor declared data.
 */
export function useRouteData<T = any>(): () => T | undefined {
  const acc = useContext(RouteDataContext) as (() => T | undefined) | undefined;
  return acc ?? (() => undefined);
}

// ─── Link ─────────────────────────────────────────────────────────────────────

type MaybeAccessor<T> = T | (() => T);
const read = <T,>(v: MaybeAccessor<T> | undefined): T | undefined =>
  typeof v === 'function' ? (v as () => T)() : v;

export interface LinkProps {
  href: MaybeAccessor<string>;
  replace?: MaybeAccessor<boolean>;
  /** Override active state. Defaults to current pathname === href. */
  active?: MaybeAccessor<boolean>;
  class?: MaybeAccessor<string>;
  className?: MaybeAccessor<string>;
  /** Class added while the link is active. */
  activeClass?: MaybeAccessor<string>;
  /** Render a lit template instead of a DOM node. */
  lit?: boolean;
  slot?: string;
  children?: any;
}

export function Link(props: LinkProps) {
  const ctx = useContext(RouterContext);
  const isServer = typeof document === 'undefined';

  const navigate = () =>
    ctx?.router.navigate(read(props.href) ?? '', { replace: read(props.replace) });

  if (isServer || props.lit) {
    const href = read(props.href) ?? '';
    const cls = read(props.class) ?? '';
    if (props.lit) {
      return html`<a @click="${navigate}" class="${cls}">${props.children ?? ''}</a>`;
    }
    return `<a href="${href}" class="${cls}">${props.children ?? ''}</a>`;
  }

  const a = document.createElement('a');
  a.setAttribute('href', read(props.href) ?? '');
  if (props.slot) a.slot = props.slot;

  // Direct listener (not delegated) so preventDefault reliably blocks navigation.
  a.addEventListener('click', (e) => {
    const me = e as MouseEvent;
    if (me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;
    e.preventDefault();
    navigate();
  });

  // Keep href + active class in sync with reactive props / current location.
  createEffect(() => {
    const href = read(props.href) ?? '';
    a.setAttribute('href', href);
    const base = read(props.className ?? props.class) ?? '';
    const activeClass = read(props.activeClass) ?? '';
    const active = read(props.active) ?? ctx?.location().pathname === href;
    a.className = [base, active ? activeClass : ''].filter(Boolean).join(' ');
  });

  if (props.children != null) insert(a, props.children as any);
  return a;
}

/** Alias for {@link Link}. */
export const A = Link;

// ─── Re-exports ────────────────────────────────────────────────────────────────

export {
  createMemoryHistory,
  createBrowserHistory,
  matchRoutes,
  matchPath,
} from '@fluixi/router';
export type {
  RouteDefinition,
  RouteMatch,
  MatchedRoute,
  RouterLocation,
  NavigateOptions,
  HistoryAdapter,
} from '@fluixi/router';

// Action/cache/lazy layer is orthogonal to routing — re-export so a route file can
// swap its import path wholesale. (Routing hooks above are the router-next ones.)
export {
  cache,
  action,
  revalidate,
  createAsync,
  useSubmission,
  useAction,
} from '../router/data.js';
export type {
  RouteDataArgs,
  RouteLoadFunc,
  Action,
  Submission,
  CacheFn,
} from '../router/data.js';
export { lazy } from '../render/lazy.js';
