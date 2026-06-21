/**
 * @fileoverview Fluixi adapter for the framework-agnostic @fluixi/router core.
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
  createNativeElement,
  setAttribute,
} from '@fluixi/dom';
// Reactive context (not fluixi createProvider, which destructures children
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

// Safe stub returned by useRouter on the SERVER when no RouterContext is on the owner
// chain. That happens during a late/detached re-render — e.g. a slow data resource
// settling AFTER renderToStringAsync already serialized the response and disposed the
// root — whose output is discarded. Returning this (instead of throwing) prevents a
// floating rejection that crashes the dev server / shows an error overlay seconds
// after the page already rendered.
const _ssrRouterStub: RouterCtxValue = {
  router: { navigate: () => {} } as unknown as CoreRouter<any>,
  location: () =>
    ({ pathname: '', search: '', hash: '', query: {} }) as unknown as RouterLocation,
  params: () => ({}),
};

export function useRouter(): RouterCtxValue {
  const ctx = useContext(RouterContext);
  if (ctx) return ctx;
  // On the server, degrade to a no-op stub (see above). On the client, a missing
  // router is genuine misuse — throw.
  if (typeof window === 'undefined') return _ssrRouterStub;
  throw new Error('[router-next] useRouter must be used within <Router>');
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
  // useRouter is SSR-safe (returns a no-op stub on the server when the context is
  // detached), so navigation degrades to a no-op during SSR and only throws on
  // genuine client-side misuse outside <Router>.
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
  slot?: string;
  children?: any;
}

export function Link(props: LinkProps) {
  const ctx = useContext(RouterContext);
  const isServer = typeof document === 'undefined';

  const navigate = () =>
    ctx?.router.navigate(read(props.href) ?? '', { replace: read(props.replace) });

  // createNativeElement branches on isServer → a real ServerNode <a> (serialized as a true
  // element, not an escaped string) on the server, a real DOM <a> on the client.
  const a = createNativeElement('a') as any;
  setAttribute(a, 'href', read(props.href) ?? '');
  if (props.slot) setAttribute(a, 'slot', read(props.slot) as string);

  // Client only (ServerNode has no addEventListener). Direct listener (not delegated) so
  // preventDefault reliably blocks navigation.
  if (typeof a.addEventListener === 'function') {
    a.addEventListener('click', (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      navigate();
    });
  } else {
    // Server: set the static class so the markup matches the client's first render.
    const base = (read(props.className ?? props.class) ?? '') as string;
    if (base) setAttribute(a, 'class', base);
  }

  // Client only: keep href + active class in sync with reactive props / location.
  // (Skipped on the server — `a` is a ServerNode without these DOM setters; the static
  // href/class were set above.)
  if (typeof a.addEventListener === 'function') {
    createEffect(() => {
      const href = read(props.href) ?? '';
      a.setAttribute('href', href);
      const base = read(props.className ?? props.class) ?? '';
      const activeClass = read(props.activeClass) ?? '';
      const active = read(props.active) ?? ctx?.location().pathname === href;
      a.className = [base, active ? activeClass : ''].filter(Boolean).join(' ');
    });
  }

  if (props.children != null) insert(a, props.children as any);
  return a;
}

/** Alias for {@link Link}. */
export const A = Link;

import type { Action } from './data.js';

export interface FormProps {
  /** The action to run on submit (typically wrapping a `"use server"` function). */
  action: Action<any, any>;
  /** Extra class on the <form>. */
  class?: string;
  children?: any;
  [key: string]: any;
}

/**
 * A `<form>` wired to an action: on submit it builds `FormData` from the form and calls
 * `action(formData)` (which tracks submission state via `useSubmission`), without a full
 * page navigation. The markup carries `method="post"` + `action={action.url}` so it's
 * progressive-enhancement-ready.
 *
 *   <Form action={save}>
 *     <input name="title" />
 *     <button>Save</button>
 *   </Form>
 */
export function Form(props: FormProps) {
  const action = props.action;
  const cls = (props.className ?? props.class) as string | undefined; // compiler passes class→className
  const url = (action as any).url ?? '';

  // createNativeElement/setAttribute branch on isServer, so this builds a real ServerNode
  // <form> on the server (serialized as a true element, NOT an escaped string) and a real
  // DOM <form> on the client — hydration reuses the same element.
  const form = createNativeElement('form') as any;
  setAttribute(form, 'method', 'post');
  if (url) setAttribute(form, 'action', url);
  if (cls) setAttribute(form, 'class', cls);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'action' || k === 'children' || k === 'class' || k === 'className') continue;
    if (v != null && typeof v !== 'function') setAttribute(form, k, String(v));
  }

  // Client only (ServerNode has no addEventListener). Direct listener so preventDefault
  // reliably blocks the native submit/navigation. Fields are passed as a plain object so
  // a `"use server"` action (JSON RPC) gets them unchanged. (File uploads are a follow-up.)
  if (typeof form.addEventListener === 'function') {
    form.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const data: Record<string, any> = {};
      new FormData(form).forEach((v, k) => {
        data[k] = v;
      });
      Promise.resolve((action as any)(data)).catch(() => {
        /* error is captured in the submission state via useSubmission */
      });
    });
  }

  if (props.children != null) insert(form, props.children as any);
  return form;
}

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
} from './data.js';
export type {
  RouteDataArgs,
  RouteLoadFunc,
  Action,
  Submission,
  CacheFn,
} from './data.js';
export { lazy } from '../render/lazy.js';
// Parity with the retired '@fluixi/core/router' barrel (route codegen used it).
export { runWithOwner } from '@fluixi/dom';
