import {
  createSignal,
  createMemo,
  onCleanup,
  createEffect,
  untrack,
  createRoot,
  createResource,
} from '@awc/reactive/signal';
import { $component, Component, createComponent, type ComponentProps } from '../render/component.js';
import { RouteDataProvider, type RouteLoadFunc } from './data.js';
import { createContext, useContext } from '../context/index.js';
import { asOutlet, asRouter, asRoutes, insert, isComponent, isPromise } from '@awc/dom';
import { Accessor} from '@awc/reactive';

// --- Types ---

export interface Location {
  pathname: string;
  search: string;
  hash: string;
  state: any;
  query: Record<string, string>;
  key: string;
}

export interface NavigateOptions {
  resolve?: boolean;
  replace?: boolean;
  scroll?: boolean;
  state?: any;
}

export type Navigator = (to: string, options?: NavigateOptions) => void;

export interface RouterContextValue {
  location: ()=> Location;
  base: string;
  navigate: Navigator;
  data?: any;
}

export interface RouteContextValue {
  parentPath: string;
  outlet: () => any;
  params: Record<string, string>;
}

export interface RouteDefinition {
  path: string;
  component?: any;
  children?: RouteDefinition | RouteDefinition[];
  data?: RouteLoadFunc;
}

// --- Utils ---

function joinPaths(base: string, path: string) {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function parseQuery(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const q: Record<string, string> = {};
  params.forEach((v, k) => (q[k] = v));
  return q;
}

function matchPath(
  pattern: string,
  path: string,
  exact: boolean = false
): { params: Record<string, string>; path: string } | null {
  const keys: string[] = [];

  if (pattern === path) {
    return { params: {}, path };
  }

  // Root "/" as a non-exact prefix matches any path starting with "/"
  if (!exact && pattern === '/' && path.startsWith('/')) {
    return { params: {}, path: '/' };
  }

  let regexStr = pattern
    .replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    })
    .replace(/\*([a-zA-Z0-9_]*)/g, (_, name) => {
      if (name) keys.push(name);
      return '(.*)';
    });

  if (!regexStr.startsWith('/')) regexStr = '/' + regexStr;
  if (regexStr === '') regexStr = '/';

  const regex = new RegExp(`^${regexStr}${exact ? '$' : '(?=/|$)'}`);
  const match = path.match(regex);

  if (!match) return null;

  const params: Record<string, string> = {};
  keys.forEach((key, i) => {
    params[key] = match[i + 1];
  });

  return { params, path: match[0] };
}

/**
 * Score a route definition for ranking.
 * Higher score = more specific = matched first.
 * Static > dynamic > catch-all.
 */
function scoreRoute(def: RouteDefinition): number {
  // console.log('scoring', def)
  const segments = def.path.split('/').filter(Boolean);
  let score = 0;

  // Index route "/" has no segments — rank above catch-all but below dynamic
  if (segments.length === 0) {
    return 5;
  }

  for (const seg of segments) {
    if (seg.startsWith('*')) {
      score += 1; // catch-all: lowest
    } else if (seg.startsWith(':')) {
      score += 10; // dynamic param
    } else {
      score += 100; // static segment
    }
  }
  return score;
}

function rankRoutes(defs: RouteDefinition[]): RouteDefinition[] {
  return [...defs].sort((a, b) => scoreRoute(b) - scoreRoute(a));
}

// --- Module-level references ---
// Fallback for when reactive context chain is broken
// (e.g., lit-html async rendering outside ownership tree)
let _activeRouter: RouterContextValue | null = null;
let _activeRouteCtx: RouteContextValue | null = null;

// --- Contexts ---

export const RouterContext = createContext<RouterContextValue>();
const RouteContext = createContext<RouteContextValue>();

// --- Internal helpers ---

/**
 * Get the router context. Tries reactive context first,
 * falls back to module-level reference.
 */
function getRouterCtx(): RouterContextValue | null {
  const ctx = useContext(RouterContext);
  return ctx || _activeRouter;
}

/**
 * Get the route context. Tries reactive context first,
 * falls back to module-level reference.
 */
function getRouteCtx(): RouteContextValue | undefined {
  const ctx = useContext(RouteContext);
  return ctx || _activeRouteCtx || undefined;
}

// const locks: any[] = []
// --- Components ---

export function Router(
  props: ComponentProps & { base?: string; url?: string }
) {
  // console.log('route match router', getOwner())
  const base = props.base || '';
  const isServer = typeof window === 'undefined';

  const getRawLocation = () => {
    if (isServer) {
      // SSR: use provided url prop
      const url = props.url || '/';
      const [pathname, searchAndHash = ''] = url.split('?');
      const [search, hash = ''] = searchAndHash.split('#');
      return {
        pathname: pathname || '/',
        search: search ? '?' + search : '',
        hash: hash ? '#' + hash : '',
        state: null,
        key: 'server',
      };
    }
    return {
      pathname:
        window.location.pathname.replace(new RegExp(`^${base}`), '') || '/',
        search: window.location.search,
        hash: window.location.hash,
      state: window.history.state,
      key: Math.random().toString(36).substring(2),
    };
  };

  const [loc, setLoc] = createSignal(getRawLocation());

  const locationProxy = new Proxy({} as Location, {
    get(_, prop) {
      const l = loc();
      // console.log('returning outlet  match path location proxy get', _, prop, l)
      if (prop === 'query') return parseQuery(l.search);
      // console.log('loc', prop, l)
      return l[prop as keyof typeof l];
    },
  });

  const navigate: Navigator = (to, options = {}) => {
    if (isServer) return;
    const target = to.startsWith('http') ? to : joinPaths(base, to);

    // console.log('navigating', options.replace)
    if (options.replace) {
      window.history.replaceState(options.state, '', target);
    } else {
      window.history.pushState(options.state, '', target);
    }
    // console.log('navigating', setLoc)
    setLoc(getRawLocation());
    if (options.scroll) window.scrollTo(0, 0);
  };

  const handlePopState = () => setLoc(getRawLocation());

  if (!isServer) {
    window.addEventListener('popstate', handlePopState);
    onCleanup(() => window.removeEventListener('popstate', handlePopState));
  }

  const ctx: RouterContextValue = {
    location: ()=> locationProxy,
    // location: l,
    base,
    navigate,
  };

  // Store module-level reference as fallback
  _activeRouter = ctx;
  onCleanup(() => {
    if (_activeRouter === ctx) _activeRouter = null;
  });

  return asRouter(createMemo(() => {
    return createComponent(RouterContext.Provider, {
      value: ctx,
      children:  props.children,
    })
    // return RouterContext.Provider({
    //   value: ctx,
    //   children:  props.children,
    // })
  }));
}

const $ROUTES = Symbol.for('kettle-routes');
const $ROUTER = Symbol.for('kettle-router');
const $OUTLET = Symbol.for('kettle-outlet');
export function Route(props: RouteDefinition) {
  return props;
}

Object.defineProperty(Routes, $ROUTES, { value: true, enumerable: true });


const isRouterObject = (a: any) => {
  if (Array.isArray(a)) {
    return a.some(isRouterObject)
  }
  return typeof a === 'object' && a!==null && typeof a.path!=='undefined'
}

// Unwrap $COMPONENT thunks to get the actual route definition
const unwrapRouteThunk = (a: any): any => {
  // If it's a $COMPONENT thunk, call it to get the route definition
  while (typeof a === 'function' && isComponent(a)) {
    a = a();
  }
  return a;
}

const filterRouter = (v: any[]) => {
  // First unwrap any thunks, then filter for route objects
  const unwrapped = v.map(unwrapRouteThunk);
  // console.log('filtering', v, 'unwrapped', unwrapped)
  return unwrapped.filter(a => isRouterObject(a))
}


export function Routes(props: ComponentProps) {
  const router = getRouterCtx();

  const definitions: RouteDefinition[] = filterRouter(Array.isArray(props.children)
    ? props.children.flat()
    : [props.children]);

  // Rank route definitions once (static > dynamic > catch-all)
  const rankedDefs = rankRoutes(definitions);

  const routeMatch = createMemo(() => {
    const path = router ? router.location().pathname : '/';
    // if (path !== currentPath) {
    //   currentPath = path
    // // console.log('lazy load match', router)
    // }
    // console.log('route match path', path)

    function findMatch(
      defs: RouteDefinition[] | undefined,
      currentPath: string
    ): {
      defs: RouteDefinition[];
      params: Record<string, string>;
      matchedPath: string;
    } | null {
      if (!defs) {

        return null;
      }

      // Rank children too
      const ranked = rankRoutes(defs);

      const normalizePath = (p: string) => {
        if (p.startsWith('//')) {
          return p.replace('//', '/')
        }
        return p

      }
      for (const def of ranked) {
        const match = matchPath(def.path, currentPath, !def.children);
        if (match) {
          let remainingPath = currentPath.slice(match.path.length);
          // Ensure remaining path always starts with /
          if (!remainingPath || !remainingPath.startsWith('/')) {
            remainingPath = '/' + (remainingPath || '');
          }

          if (
            def.children &&
            !(Array.isArray(def.children) && (def.children as any).length === 0)
          ) {
            const childDefs = Array.isArray(def.children)
              ? def.children
              : [def.children];
            const childMatch = findMatch(childDefs, remainingPath);
            if (childMatch) {
              const mp = match.path + childMatch.matchedPath
              return {
                defs: [def, ...childMatch.defs],
                params: { ...match.params, ...childMatch.params },
                matchedPath: normalizePath(mp),
              };
            }
          } else {
            return {
              defs: [def],
              params: match.params,
              matchedPath: normalizePath(match.path === '//' ? '/' : match.path),
            };
          }
        }
      }
      return null;
    }
    return findMatch(rankedDefs, path);
  }, undefined, {name: 'routeMatchMemo'});

  // Track the current route's disposal function.
  // When the route changes, dispose the previous ownership root
  // so all resources/effects owned by the old route are cleaned up.
  let disposeCurrentRoute: (() => void) | null = null;

  onCleanup(() => {
    if (disposeCurrentRoute) {
      disposeCurrentRoute();
      disposeCurrentRoute = null;
    }
    _activeRouteCtx = null;
  });

  // let matched: any = null

  const routeContent = createMemo(() => {
    const match = routeMatch();
    if (!match) {
      if (disposeCurrentRoute) {
        disposeCurrentRoute();
        disposeCurrentRoute = null;
      }
      return null;
    }

    // Dispose previous route's ownership tree
    if (disposeCurrentRoute) {
      disposeCurrentRoute();
      disposeCurrentRoute = null;
    }

    // Create new ownership root for this route's data + rendering
    return createRoot((dispose) => {
      disposeCurrentRoute = dispose;

      // Load data for each matched route definition.
      // def.data() can return:
      //   - A Promise<Accessor> (from dynamic import wrapping createAsync result) → unwrap
      //   - A reactive accessor (from createAsync called synchronously) → pass through
      //   - A plain value → pass through
      const routeData = match.defs.map((def) => {
        if (def.data) {
          const result = def.data({
            params: match.params,
            location: router
              ? router.location
              : ({ pathname: '', search: '' } as any),
          });
          if (isPromise(result)) {
            // console.log('promise result', result)
            // Dynamic import wraps routeData result in Promise.
            // routeData typically returns an Accessor (from createAsync).
            // Use createResource to track the async loading state,
            // then unwrap: if the resolved value is a function (accessor),
            // call it to get the actual data value.
            const [resource] = createResource(() => result);
            return () => {
              const val = resource();
              return typeof val === 'function' ? val() : val;
            };
          }
          return result;
        }
        return undefined;
      });
      // console.log('route data', routeData)

      let result: any = null;

      // Build nested route tree from innermost to outermost
      for (let i = match.defs.length - 1; i >= 0; i--) {
        const def = match.defs[i];
        const Component = def.component;
        const currentParams = match.params;
        const currentData = routeData[i];
        console.log('comp', Component, routeData, def)

        const nextContent = result;
        const OutletFn = () => nextContent;

        const routeCtxValue: RouteContextValue = {
          parentPath: '',
          outlet: OutletFn,
          params: currentParams,
        };

        // Set module-level fallback for RouteContext.
        // The outermost iteration (i === 0) has the most complete context,
        // but all levels share the same aggregated params.
        if (i === 0) {
          _activeRouteCtx = routeCtxValue;
        }
        // Create view once, cache it to prevent multiple executions
        let cachedView: any = null;
        const ViewWithData = () => {
          // console.log('cached view run', Component, currentData)
          if (cachedView === null) {
            if (!currentData) {
              cachedView = (Component) ? createComponent(Component, {}) : nextContent;
            } else {
              // Children must be lazy so Component runs INSIDE RouteDataProvider's
              // context scope — otherwise useRouteData() can't find the provider.
              cachedView = createComponent(RouteDataProvider, {
                value: currentData,
                children: (Component) ? createComponent(Component, {}) : nextContent,
              });
            }
          }
          return cachedView;
        };


        result = RouteContext.Provider({
          value: routeCtxValue,
          children: ViewWithData,
        })
        // result = createComponent(RouteContext.Provider, {
        //   value: routeCtxValue,
        //   children: ViewWithData,
        // });
      }

      return result;
    });
  }, undefined, {name: 'routeContentMemo'});
  return asRoutes(routeContent);
}

Object.defineProperty(Routes, $ROUTES, { value: true, enumerable: true });
Object.defineProperty(Router, $ROUTER, { value: true, enumerable: true });

// --- Renderer-agnostic components ---
// These return raw DOM elements that work with both lit-html and JSX renderers.

/**
 * Outlet renders the child route content.
 * Renderer-agnostic: returns the outlet value directly.
 */
export function Outlet() {
    // const l = useLocation()
    const ctx = getRouteCtx();
      const thunk = (ctx?.outlet ? ctx.outlet() : null);
        // (thunk as any).$COMPONENT = true
      return asOutlet(thunk);
  // return createMemo(() => {

  // })
}
Object.defineProperty(Outlet, $OUTLET, { value: true, enumerable: true });

export function isRoute(value: any) {
  return value && typeof value === 'function' && (value as any)[$ROUTES] === true
}
export function isRouter(value: any) {
  return value && typeof value === 'function' && (value as any)[$ROUTER] === true
}
export function isOutlet(value: any) {
  return value && typeof value === 'function' && (value as any)[$OUTLET] === true
}

/**
 * Link component for client-side navigation.
 * Renderer-agnostic: returns a raw <a> DOM element.
 */
export function Link(
  props: ComponentProps & {
    href: string;
    replace?: boolean;
    class?: string;
    activeClass?: string;
  }
) {
  const router = getRouterCtx();
  // console.log('router link', router)

  const isServer = typeof document === 'undefined';
  if (isServer) {
    // SSR: return a plain anchor string (or template)
    return `<a href="${props.href}" class="${props.class || ''}">${
      props.children || ''
    }</a>`;
  }

  const el = document.createElement('a');
  el.setAttribute('href', props.href);

  // Click handler for client-side navigation
  el.addEventListener('click', (e: Event) => {
    // Allow modifier keys for new tab/window behavior
    const me = e as MouseEvent;
    if (me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;

    e.preventDefault();
    router?.navigate(props.href, { replace: props.replace });
  });

  // Reactive class binding
  if (props.class || props.activeClass) {
    createEffect(() => {
      const cls = [props.class || ''];
      if (
        router &&
        props.activeClass &&
        router.location().pathname.startsWith(props.href)
      ) {
        cls.push(props.activeClass);
      }
      el.className = cls.filter(Boolean).join(' ');
    });
  }
  // console.log('navigate', props.children)

  // Insert children into the anchor element
  if (props.children != null) {
    insert(el, props.children);
  }

  return el;
}

export const A = Link;

/**
 * Redirect component. Navigates on mount.
 * Renderer-agnostic: returns null (no DOM output).
 */
export function Redirect(props: { to: string; replace?: boolean }) {
  const router = getRouterCtx();
  if (!router) return null;

  const isServer = typeof window === 'undefined';
  if (isServer) return null;

  createEffect(() => {
    router.navigate(props.to, { replace: props.replace !== false });
  });
  return null;
}

// --- Hooks ---

export function useRouter() {
  const ctx = getRouterCtx();
  if (!ctx) throw new Error('useRouter must be used within <Router>');
  return ctx;
}

export function useLocation() {
  return useRouter().location();
}

export function useNavigate() {
  return useRouter().navigate;
}

export function useParams() {
  const ctx = getRouteCtx();
  return ctx?.params || {};
}

export function useMatch(path: () => string | string) {
  const location = useLocation();
  return createMemo(() =>
    matchPath(typeof path === 'function' ? path() : path, location.pathname)
  );
}

export function useSearchParams() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = createMemo(() => location.query);

  const setParams = (
    next: Record<string, string | null>,
    options?: NavigateOptions
  ) => {
    const current = new URLSearchParams(location.search);
    Object.entries(next).forEach(([k, v]) => {
      if (v === null) current.delete(k);
      else current.set(k, v);
    });
    const search = current.toString();
    const query = search ? `?${search}` : '';
    navigate(location.pathname + query, options);
  };

  return [params, setParams] as const;
}
