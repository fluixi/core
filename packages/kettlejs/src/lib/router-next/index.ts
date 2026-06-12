/**
 * @fileoverview KettleJS adapter for the framework-agnostic @fluixi/router core.
 *
 * Renders the resolved match tree TOP-DOWN with LAYOUT REUSE:
 *
 *   - Each matched layer is rendered ONCE, in its own createRoot, and cached.
 *   - On navigation the level stack is diffed by component reference; layers up
 *     to the first change are reused, the rest are disposed and rebuilt.
 *   - A layer exposes its child via an outlet SIGNAL. <Outlet/> reads that signal;
 *     wiring each level's signal to the next level's node lets a parent's outlet
 *     re-render when only the child changed — without re-running the parent.
 *
 * Why this fixes deeply nested <Outlet/>: a child is rendered in its OWN root and
 * pushed into the parent's outlet signal. It is never built by re-entering a
 * still-building parent (no parentGate, no deferred content memo), so layouts
 * compose at any depth.
 */

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
import {
  createSignal,
  createMemo,
  createRoot,
  createRenderEffect,
  createResource,
  getOwner,
  onCleanup,
  createComponent,
} from '@fluixi/dom';
// Use the REACTIVE context directly (not kettlejs createProvider): its Provider
// reads `props.children` lazily, so a `get children()` getter is evaluated AFTER
// the context is stamped. kettlejs's createProvider destructures children eagerly,
// which would render the child (and its <Outlet/>) before the provider stamps.
import { createContext, useContext } from '@fluixi/reactive/signal';

// ─── Contexts ──────────────────────────────────────────────────────────────

interface RouterCtxValue {
  router: CoreRouter<any>;
  location: () => RouterLocation;
  params: () => Record<string, string>;
}

const RouterContext = createContext<RouterCtxValue>();
/**
 * Carries THIS level's outlet accessor (the child node signal). Boxed in an
 * object because the reactive provider RESOLVES function-valued context.
 */
interface OutletSlot {
  child: () => any;
}
const OutletContext = createContext<OutletSlot | undefined>();
/** Params introduced at the nearest matched layer. */
const LevelParamsContext = createContext<Record<string, string>>();
/** Resolved data for the nearest matched layer that declared a `data` loader. */
const RouteDataContext = createContext<(() => any) | undefined>();

/** Args passed to a route's `data` loader. */
interface RouteDataArgs {
  params: () => Record<string, string>;
  location: () => RouterLocation;
}
/** Accessors threaded into reconcile so data loaders see reactive params/location. */
interface ReconcileDeps {
  params: () => Record<string, string>;
  location: () => RouterLocation;
}

// ─── Level reconciliation ────────────────────────────────────────────────────

interface LevelState {
  component: any;
  /** The rendered node for this layer (stable while the layer is reused). */
  node: any;
  /** Read this layer's outlet content (the next level's node, or null). */
  child: () => any;
  /** Set this layer's outlet content. */
  setChild: (v: any) => void;
  dispose: () => void;
}

/** Diff `matched` against the live `prev` levels, reusing the stable prefix. */
function reconcile(
  matched: MatchedRoute<any>[],
  prev: LevelState[],
  deps: ReconcileDeps
): LevelState[] {
  // Pathless layers (no component) don't render a layer — drop them. Their params
  // still appear in the merged params exposed via RouterContext.
  const effective = matched.filter((m) => m.component);

  let firstChanged = 0;
  while (
    firstChanged < prev.length &&
    firstChanged < effective.length &&
    prev[firstChanged].component === effective[firstChanged].component
  ) {
    firstChanged++;
  }

  // Dispose changed/excess levels.
  for (let i = firstChanged; i < prev.length; i++) prev[i].dispose();
  const next = prev.slice(0, firstChanged);

  // Build new levels (each in its own root so parent re-runs never dispose it).
  for (let i = firstChanged; i < effective.length; i++) {
    const m = effective[i];
    let st!: LevelState;
    createRoot((dispose) => {
      const [child, setChild] = createSignal<any>(null);
      const slot: OutletSlot = { child };

      // Load this level's data once (createResource integrates with the nearest
      // Suspense and is owned by this level's root, so it is not re-fetched while
      // the level is reused across sibling navigation).
      let data: (() => any) | undefined;
      const loader = (m.route as RouteDefinition<any>).data as
        | ((args: RouteDataArgs, owner: unknown, isCancelled: () => boolean) => any)
        | undefined;
      if (typeof loader === 'function') {
        let cancelled = false;
        onCleanup(() => {
          cancelled = true;
        });
        const owner = getOwner();
        const [resource] = createResource(() =>
          loader(
            { params: deps.params, location: deps.location },
            owner,
            () => cancelled
          )
        );
        data = resource as () => any;
      }

      const node = OutletContext.Provider({
        value: slot,
        get children() {
          return RouteDataContext.Provider({
            value: data,
            get children() {
              return LevelParamsContext.Provider({
                value: m.params,
                get children() {
                  return createComponent(m.component, {});
                },
              });
            },
          });
        },
      });
      st = { component: m.component, node, child, setChild, dispose };
    });
    next.push(st);
  }

  // Wire each level's outlet to the next level's node (null for the leaf). This is
  // idempotent for reused levels (same node → signal no-ops), and re-renders the
  // single outlet whose child actually changed.
  for (let i = 0; i < next.length; i++) {
    next[i].setChild(i + 1 < next.length ? next[i + 1].node : null);
  }
  return next;
}

// ─── Router component ────────────────────────────────────────────────────────

export interface RouterProps<C = any> {
  routes: RouteDefinition<C>[];
  base?: string;
  /** Override the history backend (defaults to browser history). */
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

  const ctx: RouterCtxValue = {
    router: router as CoreRouter<any>,
    location: createMemo(() => state().location),
    params: createMemo(() => state().match?.params ?? {}),
  };

  // The level stack is built inside the provider's children getter so RouterContext
  // is already stamped — each level's createRoot then inherits it, and route
  // components can call useRouter/useNavigate/useParams.
  return RouterContext.Provider({
    value: ctx,
    get children() {
      let levels: LevelState[] = [];
      const [rootNode, setRootNode] = createSignal<any>(null);

      // Reconcile whenever the match changes. Diffing reuses stable layouts so they
      // are not re-run/re-fetched on sibling navigation.
      const deps: ReconcileDeps = { params: ctx.params, location: ctx.location };
      createRenderEffect(() => {
        const matched = state().match?.matched ?? [];
        levels = reconcile(matched, levels, deps);
        setRootNode(levels.length > 0 ? levels[0].node : null);
      });

      onCleanup(() => {
        unsub();
        router.destroy();
        for (const l of levels) l.dispose();
      });

      return rootNode;
    },
  });
}

// ─── Outlet ───────────────────────────────────────────────────────────────────

/**
 * Renders this layout's child route. Returns a memo that tracks the outlet signal
 * so the child updates when reconcile() pushes a new node — WITHOUT re-running the
 * layout. A bare `slot.child()` would be read untracked (createComponent runs the
 * component inside untrack), so it would never update on navigation.
 */
export function Outlet() {
  const slot = useContext(OutletContext);
  if (!slot) return null;
  return createMemo(() => slot.child());
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useRouter(): RouterCtxValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('[router-next] useRouter must be used within <Router>');
  return ctx;
}

/** Reactive merged params across all matched layers. */
export function useParams(): () => Record<string, string> {
  return useRouter().params;
}

/** Params introduced at the nearest matched layer. */
export function useLevelParams(): Record<string, string> {
  return useContext(LevelParamsContext) ?? {};
}

/**
 * The resolved data for the nearest route that declared a `data` loader. Always
 * returns a callable accessor (matching the old router): read it to subscribe; it
 * suspends under <Suspense> while loading, and yields undefined when no ancestor
 * route declared data.
 */
export function useRouteData<T = any>(): () => T | undefined {
  const acc = useContext(RouteDataContext) as (() => T | undefined) | undefined;
  return acc ?? (() => undefined);
}

/** Reactive current location. */
export function useLocation(): () => RouterLocation {
  return useRouter().location;
}

export function useNavigate(): (to: string, options?: NavigateOptions) => void {
  const { router } = useRouter();
  return (to, options) => router.navigate(to, options);
}

// ─── Link ─────────────────────────────────────────────────────────────────────

export interface LinkProps {
  href: string;
  replace?: boolean;
  class?: string;
  children?: any;
}

/** Minimal client-side link. Renders an <a> that navigates without a reload. */
export function Link(props: LinkProps) {
  const navigate = useNavigate();
  const a = document.createElement('a');
  a.setAttribute('href', props.href);
  if (props.class) a.className = props.class;
  a.addEventListener('click', (e) => {
    const me = e as MouseEvent;
    if (me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;
    e.preventDefault();
    navigate(props.href, { replace: props.replace });
  });
  if (props.children != null) a.append(props.children as any);
  return a;
}

// Re-export core helpers so apps configure history/routes from one entry point.
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

// ─── Compatibility re-exports ─────────────────────────────────────────────────
// The action/cache/lazy layer is orthogonal to routing, so re-export it from the
// existing kettlejs router modules. This lets a route file swap its import path
// from '@fluixi/kettlejs/router' to '@fluixi/kettlejs/router-next' wholesale.
// NOTE: useRouteData/useNavigate/useParams/useLocation/Outlet/Link/Router above
// are the router-next versions — do NOT pull those from the old router.
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
