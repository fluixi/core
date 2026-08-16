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
} from '@fluixi/reactive/signal';
import {
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
  matchRoutes,
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
  /** Only set on the ROOT: rendered when nothing matched, instead of a blank page. */
  notFound?: () => any;
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
    if (!component) {
      // No route at this depth. At the ROOT (the only ctx carrying `notFound`) that means the
      // URL matched nothing — render the not-found fallback instead of a blank page. Nested
      // Outlets have no `notFound`, so they stay null (a missing child is just an empty Outlet).
      return ctx.notFound ? ctx.notFound() : null;
    }
    const m = untrack(() => ctx.matched())[childIdx];
    return renderLayer(m, childIdx, {
      matched: ctx.matched,
      params: ctx.params,
      location: ctx.location,
    });
  });
}

/**
 * Resolve the Router's `notFound` prop to a renderable view. A component is instantiated; an
 * element/value is returned as-is; when omitted, a minimal built-in 404 keeps the page from
 * rendering blank. Prefer a catch-all file route (`[...slug].tsx` → `*`) when the 404 should sit
 * inside your layout — this prop is the app-level fallback for an otherwise unmatched URL.
 */
function renderNotFound(notFound: any): any {
  if (notFound == null) return buildDefaultNotFound();
  return typeof notFound === 'function' ? createComponent(notFound, {}) : notFound;
}

/** Minimal, unstyled-enough default 404 (single element so it hydrates cleanly). */
function buildDefaultNotFound(): any {
  const el = createNativeElement('div');
  setAttribute(el, 'class', 'fx-not-found');
  setAttribute(el, 'role', 'main');
  setAttribute(
    el,
    'style',
    'min-height:60vh;display:grid;place-content:center;gap:.25rem;text-align:center;' +
      'font-family:system-ui,-apple-system,sans-serif',
  );
  const h1 = createNativeElement('h1');
  setAttribute(h1, 'style', 'margin:0;font-size:2.5rem;font-weight:700');
  insert(h1, '404');
  const p = createNativeElement('p');
  setAttribute(p, 'style', 'margin:0;opacity:.7');
  insert(p, 'This page could not be found.');
  el.appendChild(h1);
  el.appendChild(p);
  return el;
}

// ─── Router ────────────────────────────────────────────────────────────────────

export interface RouterProps<C = any> {
  routes: RouteDefinition<C>[];
  base?: string;
  history?: HistoryAdapter;
  /**
   * Rendered when the current URL matches no route — a component, an element, or any renderable.
   * Defaults to a minimal built-in 404 so an unmatched URL never renders a blank page. For a 404
   * that keeps your layout/chrome, add a catch-all file route instead (`[...slug].tsx` → `*`).
   */
  notFound?: any;
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
    // Only the root carries this — renderChild shows it when the URL matched nothing.
    notFound: () => renderNotFound(props.notFound),
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
  // Navigate AFTER the current render commits. Navigating during render (an effect
  // running mid-render) updated the location but the route never re-matched, so the
  // target never showed. Guard against firing if this Redirect is torn down first.
  let cancelled = false;
  onCleanup(() => (cancelled = true));
  queueMicrotask(() => {
    if (!cancelled) ctx.router.navigate(props.to, { replace: props.replace !== false });
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

export interface LinkNavigationOptions {
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
  /**
   * Called with the resolved URL before navigating. Return false to leave the click
   * alone — for a section of the app that must load as a document (a different
   * bundle, a server-rendered admin area, a file route).
   */
  shouldNavigate?: (url: URL, anchor: HTMLAnchorElement) => boolean;
}

/**
 * A delegated click handler that turns plain `<a>` elements into client-side navigations.
 *
 * `<Link>` covers the links an app writes as JSX. This covers the ones it doesn't own:
 * markdown or CMS HTML dropped in through `innerHTML`, where there is no component to
 * bind to and the anchors arrive as prerendered text. Put it on the container and every
 * link inside it navigates without reloading the document:
 *
 * ```tsx
 * const onClick = useLinkNavigation();
 * <article onClick={onClick} innerHTML={doc.html} />
 * ```
 *
 * The anchors stay real anchors — middle-click, right-click → open in new tab, "copy
 * link address" and crawlers all keep working, because the element is untouched and only
 * a plain left-click is intercepted.
 *
 * Left alone: modified clicks, anything but the primary button, an already-prevented
 * event, `target`, `download`, `rel="external"`, a non-http scheme (`mailto:`, `tel:`),
 * another origin, and a hash pointing inside the current page — that last one is the
 * browser's scroll, and hijacking it breaks in-page anchors.
 */
export function useLinkNavigation(
  options: LinkNavigationOptions = {},
): (event: MouseEvent) => void {
  const ctx = useContext(RouterContext);

  return (event: MouseEvent): void => {
    if (!ctx || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target as Element | null;
    const anchor = target?.closest?.('a') as HTMLAnchorElement | null;
    if (!anchor || !anchor.getAttribute('href')) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;
    if (/(^|\s)external(\s|$)/.test(anchor.getAttribute('rel') ?? '')) return;

    // `anchor.href` is resolved against the document, so a relative `./guide` from
    // prerendered markdown lands on the right absolute path.
    const url = new URL(anchor.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.origin !== window.location.origin) return;
    if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) return;
    if (options.shouldNavigate && !options.shouldNavigate(url, anchor)) return;

    event.preventDefault();
    ctx.router.navigate(url.pathname + url.search + url.hash, { replace: options.replace });
  };
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
  /**
   * Everything else is forwarded onto the `<a>` — id, style, title, aria-*,
   * data-*, event handlers. Typed openly because the forwarding is
   * allow-by-default: a prop this interface forgot still reaches the DOM, and
   * refusing it here would only mean the type disagreeing with the runtime.
   */
  [key: string]: unknown;
}

// Props Link handles itself, so they aren't blindly forwarded as <a> attributes.
const LINK_OWN_PROPS = new Set([
  'href',
  'slot',
  'class',
  'className',
  'active',
  'activeClass',
  'replace',
  'children',
]);

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

  // Forward any other author attributes (data-*, aria-*, style, id, title, role, …)
  // onto the <a>, the way <Form> does. Without this a component composed via
  // `as={Link}` (polymorphic) silently loses its styling hooks — e.g. @fluixi-ui
  // parts carry `data-*` slots + inline styles that would otherwise be dropped, so
  // the element renders unstyled. Own-props handled elsewhere are skipped:
  // href/slot above, class/className/active/activeClass in the effect, and
  // children/replace by navigation.
  // Keys, not entries: `Object.entries` reads every prop, and `children` is a getter
  // that builds fresh nodes per access. Under hydration that discarded first build
  // consumes the server's nodes, so the real read below produced a second copy of
  // them — a duplicated logo and pager on every prerendered page.
  for (const k of Object.keys(props)) {
    if (LINK_OWN_PROPS.has(k)) continue;
    const v = (props as Record<string, unknown>)[k];
    if (v != null && typeof v !== 'function') setAttribute(a, k, String(v));
  }

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

  const linkChildren = props.children; // read once (getter builds fresh nodes per access)
  if (linkChildren != null) insert(a, linkChildren as any);
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
  // Keys, not entries — same reason as Link: reading `children` here would build its
  // nodes once and throw them away.
  for (const k of Object.keys(props)) {
    if (k === 'action' || k === 'children' || k === 'class' || k === 'className') continue;
    const v = (props as Record<string, unknown>)[k];
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

  // Read children ONCE: the compiler emits `get children()` as a getter that builds fresh
  // nodes on every access, so reading it twice (here + the null check) created a duplicate
  // set — under hydration that meant two <input>s in the form.
  const children = props.children;
  if (children != null) insert(form, children as any);
  return form;
}

// ─── Hydration preload ───────────────────────────────────────────────────────────

/**
 * Download the lazy component chunks for the route(s) matching `pathname` and resolve when
 * they're all loaded. Await this BEFORE hydrating: once each matched lazy file-route is
 * resolved it renders synchronously on the first pass (no Suspense fallback, no late
 * re-render), so hydration adopts the server DOM in place instead of building a duplicate
 * subtree next to it. No-op for routes with no lazy components. Safe to call when the URL
 * matches nothing (resolves immediately).
 */
export async function preloadRoutes<C = any>(
  routes: RouteDefinition<C>[],
  pathname: string,
): Promise<void> {
  const match = matchRoutes(routes, pathname);
  if (!match) return;
  const loads: Promise<unknown>[] = [];
  for (const m of match.matched) {
    const c = m.component as { preload?: () => Promise<unknown> } | undefined;
    if (c && typeof c.preload === 'function') loads.push(c.preload());
  }
  await Promise.all(loads);
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
export { runWithOwner } from '@fluixi/reactive/signal';
