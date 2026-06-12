/**
 * @fileoverview KettleJS adapter for the framework-agnostic @fluixi/router core.
 *
 * The core (@fluixi/router) resolves a URL to a parent → child match tree. This
 * adapter renders that tree TOP-DOWN: each layer is wrapped in an OutletContext
 * provider whose value is a thunk that renders the NEXT layer. <Outlet/> simply
 * reads that thunk and calls it.
 *
 * Why this fixes deeply nested <Outlet/>: there is no per-level outlet signal, no
 * deferred content memo, and no parentGate. A child is never built by re-entering
 * a still-building parent — it is a plain recursive render over a resolved array.
 * Layouts compose by construction at any depth.
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
import { createSignal, createMemo, onCleanup, createComponent } from '@fluixi/dom';
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
 * Carries THIS level's child renderer. Boxed in an object because kettlejs's
 * createProvider RESOLVES function-valued context (it calls accessors) — a bare
 * thunk would be invoked at provide time. The object passes through untouched.
 */
interface OutletSlot {
  render: () => any;
}
const OutletContext = createContext<OutletSlot | undefined>();
/** This level's own params (the delta it introduced). Plain object, re-provided per render. */
const LevelParamsContext = createContext<Record<string, string>>();

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
  onCleanup(() => {
    unsub();
    router.destroy();
  });

  const ctx: RouterCtxValue = {
    router: router as CoreRouter<any>,
    location: createMemo(() => state().location),
    params: createMemo(() => state().match?.params ?? {}),
  };

  // The view: render the resolved match tree top-down. Re-runs when the match
  // changes (navigation). renderLevel is a plain recursion over the matched
  // array — no re-entrant build.
  const view = createMemo(() => {
    const m = state().match;
    if (!m || m.matched.length === 0) return null;
    return renderLevel(m.matched, 0);
  });

  return RouterContext.Provider({ value: ctx, children: view });
}

/** Render matched[index] with its child wired as its <Outlet/> content. */
function renderLevel(matched: MatchedRoute<any>[], index: number): any {
  if (index >= matched.length) return null;
  const level = matched[index];
  // Pathless layout group (no component): transparently render the child.
  if (!level.component) return renderLevel(matched, index + 1);

  const slot: OutletSlot = { render: () => renderLevel(matched, index + 1) };
  // Getters defer evaluation until AFTER each reactive provider stamps its
  // context, so the layout component (and its <Outlet/>) can read both.
  return OutletContext.Provider({
    value: slot,
    get children() {
      return LevelParamsContext.Provider({
        value: level.params,
        get children() {
          return createComponent(level.component, {});
        },
      });
    },
  });
}

// ─── Outlet ───────────────────────────────────────────────────────────────────

/**
 * Renders this layout's child route. Reads the child thunk from context and
 * calls it — a synchronous, top-down render. No outlet signal, no deferral.
 */
export function Outlet() {
  const slot = useContext(OutletContext);
  return slot ? slot.render() : null;
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
