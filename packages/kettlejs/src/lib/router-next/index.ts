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
  createRoot,
  runWithOwner,
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

import {
  createRouter as createCoreRouter,
  createBrowserHistory,
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

  return RouteDataContext.Provider({
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
}

/**
 * Renders the next matched layer, reactively but keyed on its component ref so the
 * child is only rebuilt when the route at this depth changes. Used by both <Outlet/>
 * and the Router root.
 */
function renderChild(ctx: OutletCtxValue): any {
  const childIdx = ctx.depth + 1;
  const childComponent = createMemo(() => ctx.matched()[childIdx]?.component);

  // The owner where the <Outlet/> lives — inside the parent layout's providers.
  // We render the child UNDER this owner so it inherits that context. (Reading it
  // inside the memo below would give the memo's own scope, which the deferred
  // imperative <Outlet/> detaches from the provider chain.)
  const outletOwner = getOwner();

  // Cache the rendered child by component ref. It is built in its own createRoot so
  // the memo re-running (this reactive core marks the whole downstream memo chain
  // stale on any signal write, regardless of value) does not dispose or rebuild it;
  // we only rebuild when the child's component actually changes.
  let cachedComponent: any;
  let cachedNode: any = null;
  let cachedDispose: (() => void) | undefined;
  let primed = false;
  onCleanup(() => cachedDispose?.());

  return createMemo(() => {
    const component = childComponent();
    if (primed && component === cachedComponent) return cachedNode;
    primed = true;
    cachedComponent = component;
    cachedDispose?.();
    if (!component) {
      cachedNode = null;
      cachedDispose = undefined;
      return null;
    }
    const m = untrack(() => ctx.matched())[childIdx];
    runWithOwner(outletOwner, () => {
      createRoot((dispose) => {
        cachedDispose = dispose;
        cachedNode = renderLayer(m, childIdx, {
          matched: ctx.matched,
          params: ctx.params,
          location: ctx.location,
        });
      });
    });
    return cachedNode;
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

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useRouter(): RouterCtxValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('[router-next] useRouter must be used within <Router>');
  return ctx;
}

/** Reactive merged params across all matched layers (an accessor). */
export function useParams(): () => Record<string, string> {
  return useRouter().params;
}

/** Params introduced at the nearest matched layer. */
export function useLevelParams(): Record<string, string> {
  return useContext(LevelParamsContext) ?? {};
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
