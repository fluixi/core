// @vitest-environment jsdom
// router.ts uses the lit `html` tag (lit renderer needs HTMLElement) — DOM env.
/**
 * @fileoverview Router unit tests
 *
 * Groups:
 *  1. matchRoutes — pure function, no reactive system needed
 *  2. createRouter reactive behavior — navigate(), params, layout reuse,
 *     routeStates single-run guarantee
 *  3. StaticRouter — simple non-navigating render
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, createRenderEffect, untrack } from '@fluixi/reactive/signal';

// ---------------------------------------------------------------------------
// Mock @fluixi/dom
//
// The router (and component.ts / context.ts) depend on symbol-stamping helpers
// and DOM insertion utilities from @fluixi/dom.  For unit tests we only need the
// symbol helpers to work; DOM insertion can be a no-op.
// ---------------------------------------------------------------------------

vi.mock('@fluixi/dom', async () => {
  // Spread the real reactive module (createSignal, createMemo, … re-exported by
  // @fluixi/dom) so signal-based code works in node; dom render helpers that
  // touch a live DOM are stubbed in the overrides below.
  const reactive = await vi.importActual<Record<string, unknown>>(
    '@fluixi/reactive/signal',
  );

  function stamp(sym: symbol) {
    return (v: any) => {
      if (typeof v === 'function')
        Object.defineProperty(v, sym, { value: true, enumerable: true, configurable: true });
      return v;
    };
  }

  const $COMPONENT = Symbol.for('kettle-component');
  const $ROUTER    = Symbol.for('kettle-router');
  const $ROUTES    = Symbol.for('kettle-routes');
  const $OUTLET    = Symbol.for('kettle-outlet');
  const $PROVIDER  = Symbol.for('kettle-provider');
  const $SUSPENSE  = Symbol.for('kettle-suspense');
  const $ROUTE     = Symbol.for('kettle-route');
  const $CONTEXT   = Symbol.for('kettle-context');

  return {
    ...reactive,
    // dom render helpers not provided by reactive (stubbed — no live DOM in node).
    // Mirror the real fallback shapes: both return an accessor (a function).
    createComponent: (Comp: any, props: any) =>
      () => (typeof Comp === 'function' ? Comp(props) : Comp),
    resolveChildren: (value: any) => () => value,
    render: vi.fn(),
    hydrate: vi.fn(),
    registerLitRender: vi.fn(),
    intergartionInitialized: false,
    For: (props: any) => props,
    asComponent:  stamp($COMPONENT),
    asRouter:     stamp($ROUTER),
    asRoutes:     stamp($ROUTES),
    asOutlet:     stamp($OUTLET),
    asProvider:   stamp($PROVIDER),
    asSuspense:   stamp($SUSPENSE),
    asRoute:      stamp($ROUTE),
    asContext:    stamp($CONTEXT),

    isComponent: (v: any) => typeof v === 'function' && !!v[$COMPONENT],
    isRouter:    (v: any) => typeof v === 'function' && !!v[$ROUTER],
    isRoutes:    (v: any) => typeof v === 'function' && !!v[$ROUTES],
    isOutlet:    (v: any) => typeof v === 'function' && !!v[$OUTLET],
    isProvider:  (v: any) => typeof v === 'function' && !!v[$PROVIDER],
    isSuspense:  (v: any) => typeof v === 'function' && !!v[$SUSPENSE],
    isRoute:     (v: any) => typeof v === 'function' && !!v[$ROUTE],
    isContext:   (v: any) => typeof v === 'function' && !!v[$CONTEXT],

    isPromise: (v: any) => v != null && typeof (v as any).then === 'function',
    isDOMNode: () => false,

    html:   (...args: any[]) => args,
    insert: vi.fn(),


    initializeIntegration:   vi.fn(),
    registerBatch:           vi.fn(),
    registerEffectCreator:   vi.fn(),
    registerCreateComponent: vi.fn(),

    // Used by jsx-runtime (not exercised here but must be exportable)
    checkRenderType:               () => ({ type: 'none', value: null }),
    makeArrayFlat:                 (v: any) => v,
    delegateEvents:                vi.fn(),
    removeDelegatedEventListener:  vi.fn(),
    addDelegatedEventListener:     vi.fn(),
    isSVGElement:                  () => false,
    isDelegatedEvent:              () => false,
    setAttribute:                  vi.fn(),
    setClassName:                  vi.fn(),
    setStyle:                      vi.fn(),
    handleRef:                     vi.fn(),
    isAccessor:                    () => false,
    createRenderEffect:            vi.fn(),
    spread:                        vi.fn(),
    applyProps:                    vi.fn(),
    mergeProps: vi.fn(),
    // childrens: vi.fn(),
  };
});

// Import AFTER the mock is registered.
import {
  matchRoutes,
  createRouter,
  Route,
  Routes,
  useNavigate,
  useParams,
  useLocation,
  type RouteDefinition,
  type Navigator,
} from './router.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Route component factory.
 * Route components MUST return a function (thunk) so that `view()` inside
 * createLevelState works — the router calls `view()` to pass children to the
 * Provider.  Returning a plain value would throw "view is not a function".
 */
function makeComponent(label: string) {
  const fn = vi.fn(() => () => label);
  return fn;
}

// ---------------------------------------------------------------------------
// 1. matchRoutes — pure function tests (no reactive system)
// ---------------------------------------------------------------------------

describe('matchRoutes', () => {
  it('matches an exact path', () => {
    const routes: RouteDefinition[] = [{ path: '/home' }, { path: '/about' }];
    const result = matchRoutes(routes, '/home');
    expect(result).toHaveLength(1);
    expect(result[0].route.path).toBe('/home');
  });

  it('returns empty array for no match', () => {
    const routes: RouteDefinition[] = [{ path: '/home' }];
    expect(matchRoutes(routes, '/not-found')).toHaveLength(0);
  });

  it('extracts named params', () => {
    const routes: RouteDefinition[] = [{ path: '/user/:id' }];
    const result = matchRoutes(routes, '/user/42');
    expect(result[0].params).toEqual({ id: '42' });
  });

  it('extracts multiple named params', () => {
    const routes: RouteDefinition[] = [{ path: '/org/:orgId/user/:userId' }];
    const result = matchRoutes(routes, '/org/acme/user/99');
    expect(result[0].params).toEqual({ orgId: 'acme', userId: '99' });
  });

  it('ranks static segments higher than named params', () => {
    const routes: RouteDefinition[] = [
      { path: '/user/:id' },
      { path: '/user/profile' },
    ];
    const results = matchRoutes(routes, '/user/profile');
    expect(results[0].route.path).toBe('/user/profile');
  });

  it('ranks named params higher than wildcards', () => {
    const routes: RouteDefinition[] = [
      { path: '/files/*' },
      { path: '/files/:name' },
    ];
    const results = matchRoutes(routes, '/files/readme.txt');
    expect(results[0].route.path).toBe('/files/:name');
  });

  it('matches wildcard routes', () => {
    const routes: RouteDefinition[] = [{ path: '/docs/*' }];
    const result = matchRoutes(routes, '/docs/guide/intro');
    expect(result).toHaveLength(1);
  });

  it('matches root path', () => {
    const routes: RouteDefinition[] = [{ path: '/' }];
    const result = matchRoutes(routes, '/');
    expect(result).toHaveLength(1);
    expect(result[0].params).toEqual({});
  });

  it('returns matches sorted by specificity (highest score first)', () => {
    const routes: RouteDefinition[] = [
      { path: '/:catchAll' },
      { path: '/about' },
    ];
    const results = matchRoutes(routes, '/about');
    expect(results[0].route.path).toBe('/about');
  });
});

// ---------------------------------------------------------------------------
// 2. createRouter — reactive routing behavior
// ---------------------------------------------------------------------------

// TODO: rendering-coupled — needs the real reactive↔dom integration (jsdom).
  // Covered by framework.integration.spec.ts. Re-enable if migrated off the @fluixi/dom mock.
  describe.skip('createRouter reactive behavior', () => {
  // Shared memory-location for each test.  Initialised in beforeEach so every
  // test starts clean and avoids state leakage from makeMemRouter helpers.
  let currentPath = '/';
  let disposeRoot: (() => void) | null = null;

  beforeEach(() => {
    currentPath = '/';
  });

  afterEach(() => {
    disposeRoot?.();
    disposeRoot = null;
    currentPath = '/';
  });

  /** Build a memory router backed by `currentPath`. */
  function makeMemRouter() {
    return createRouter({
      get: () => currentPath,
      set: ({ value }) => { currentPath = value; },
    });
  }

  /**
   * Force-evaluate a memo / signal to establish the reactive dependency chain.
   * Using untrack avoids accidentally tracking the caller as an observer.
   * The chain created is:  routeContent ← routeStates ← routeMatch ← loc
   * After this call, navigating triggers routeStates to re-run (instantiating
   * the new component) because routeContent is registered as observer of
   * routeStates.
   */
  function forceEval(accessor: () => any) {
    untrack(() => accessor());
  }

  // ── 2a: correct component instantiated for initial path ────────────────────

  it('instantiates the component matching the initial path', () => {
    currentPath = '/about';
    const MemRouter = makeMemRouter();
    const Home  = makeComponent('home');
    const About = makeComponent('about');

    createRoot(dispose => {
      disposeRoot = dispose;
      MemRouter({ children: null }); // registers _activeRouter
      const output = Routes({
        children: [
          Route({ path: '/', component: Home }),
          Route({ path: '/about', component: About }),
        ],
      });
      forceEval(output);
    });

    expect(About).toHaveBeenCalledTimes(1);
    expect(Home).not.toHaveBeenCalled();
  });

  it('instantiates the root component when at /', () => {
    currentPath = '/';
    const MemRouter = makeMemRouter();
    const Home  = makeComponent('home');
    const About = makeComponent('about');

    createRoot(dispose => {
      disposeRoot = dispose;
      MemRouter({ children: null });
      const output = Routes({
        children: [
          Route({ path: '/', component: Home }),
          Route({ path: '/about', component: About }),
        ],
      });
      forceEval(output);
    });

    expect(Home).toHaveBeenCalledTimes(1);
    expect(About).not.toHaveBeenCalled();
  });

  // ── 2b: navigate() changes the matched component ───────────────────────────

  it('navigate() swaps the rendered component', () => {
    currentPath = '/';
    const MemRouter = makeMemRouter();
    const Home  = makeComponent('home');
    const About = makeComponent('about');
    let navigate!: Navigator;

    createRoot(dispose => {
      disposeRoot = dispose;
      MemRouter({ children: null });
      navigate = useNavigate();
      const output = Routes({
        children: [
          Route({ path: '/', component: Home }),
          Route({ path: '/about', component: About }),
        ],
      });
      // Establish the reactive chain so cascade will re-run routeStates.
      forceEval(output);
    });

    expect(Home).toHaveBeenCalledTimes(1);
    expect(About).not.toHaveBeenCalled();

    navigate('/about');

    expect(About).toHaveBeenCalledTimes(1);
  });

  // ── 2c: routeStates runs exactly once per navigate call ────────────────────

  it('each route component is instantiated exactly once per visit', () => {
    currentPath = '/';
    const MemRouter = makeMemRouter();
    const PageA = makeComponent('a');
    const PageB = makeComponent('b');
    let navigate!: Navigator;

    createRoot(dispose => {
      disposeRoot = dispose;
      MemRouter({ children: null });
      navigate = useNavigate();
      const output = Routes({
        children: [
          Route({ path: '/', component: PageA }),
          Route({ path: '/b', component: PageB }),
        ],
      });
      forceEval(output);
    });

    expect(PageA).toHaveBeenCalledTimes(1);
    expect(PageB).not.toHaveBeenCalled();

    navigate('/b');
    expect(PageB).toHaveBeenCalledTimes(1); // exactly once — no double-trigger

    navigate('/');
    expect(PageA).toHaveBeenCalledTimes(2); // new instance for second visit
  });

  // ── 2d: params update reactively on navigation ─────────────────────────────

  it('useParams() returns reactive params that update on navigation', () => {
    currentPath = '/user/alice';
    const MemRouter = makeMemRouter();
    let capturedParams: (() => Record<string, string>) | null = null;

    function UserComponent() {
      capturedParams = useParams<{ id: string }>();
      return () => 'user';
    }
    let navigate!: Navigator;

    createRoot(dispose => {
      disposeRoot = dispose;
      MemRouter({ children: null });
      navigate = useNavigate();
      const output = Routes({
        children: [Route({ path: '/user/:id', component: UserComponent })],
      });
      forceEval(output);
    });

    expect(capturedParams).not.toBeNull();
    expect(capturedParams!()).toEqual({ id: 'alice' });

    navigate('/user/bob');
    expect(capturedParams!()).toEqual({ id: 'bob' });
  });

  // ── 2e: layout component reused across child-route navigations ─────────────

  it('reuses the layout component when navigating between child routes', () => {
    currentPath = '/app/home';
    const MemRouter = makeMemRouter();
    const Layout = makeComponent('layout');
    const PageA  = makeComponent('page-a');
    const PageB  = makeComponent('page-b');
    let navigate!: Navigator;

    createRoot(dispose => {
      disposeRoot = dispose;
      MemRouter({ children: null });
      navigate = useNavigate();
      const output = Routes({
        children: [
          Route({
            path: '/app',
            component: Layout,
            children: [
              Route({ path: '/app/home',     component: PageA }),
              Route({ path: '/app/settings', component: PageB }),
            ],
          }),
        ],
      });
      forceEval(output);
    });

    // Initial render
    expect(Layout).toHaveBeenCalledTimes(1);
    expect(PageA).toHaveBeenCalledTimes(1);
    expect(PageB).not.toHaveBeenCalled();

    // Navigate within the same layout — Layout must NOT be re-instantiated
    navigate('/app/settings');

    expect(Layout).toHaveBeenCalledTimes(1); // still 1: reused
    expect(PageB).toHaveBeenCalledTimes(1);
  });

  // ── 2f: useLocation() reflects the current pathname ────────────────────────

  it('useLocation() reflects the current pathname after navigate', () => {
    currentPath = '/start';
    const MemRouter = makeMemRouter();
    let navigate!: Navigator;

    // useLocation() returns the Location object directly (not a getter fn).
    // Read it inside a reactive context so it tracks loc changes.
    let pathname: string | null = null;

    createRoot(dispose => {
      disposeRoot = dispose;
      MemRouter({ children: null });
      navigate = useNavigate();

      createRenderEffect(() => {
        pathname = useLocation().pathname;
      });
    });

    expect(pathname).toBe('/start');

    navigate('/destination');
    expect(pathname).toBe('/destination');
  });

  // ── 2g: no content rendered when no route matches ──────────────────────────

  it('returns null content when no route matches', () => {
    currentPath = '/no-match';
    const MemRouter = makeMemRouter();
    const Home = makeComponent('home');

    let content: any = 'not-read';
    createRoot(dispose => {
      disposeRoot = dispose;
      MemRouter({ children: null });
      const output = Routes({
        children: [Route({ path: '/home', component: Home })],
      });
      content = untrack(() => output());
    });

    expect(content).toBeNull();
    expect(Home).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. StaticRouter-style: memory router with a fixed, non-navigable URL
// ---------------------------------------------------------------------------

// TODO: rendering-coupled — needs the real reactive↔dom integration (jsdom).
  // Covered by framework.integration.spec.ts. Re-enable if migrated off the @fluixi/dom mock.
  describe.skip('memory router with fixed URL', () => {
  it('renders the component matching the given path', () => {
    let disposeStatic: (() => void) | null = null;

    const StaticMem = createRouter({
      get: () => '/docs/intro',
      set: () => {},
    });

    const DocsPage = makeComponent('docs');

    createRoot(dispose => {
      disposeStatic = dispose;
      StaticMem({ children: null });
      const output = Routes({
        children: [Route({ path: '/docs/:slug', component: DocsPage })],
      });
      untrack(() => output());
    });

    expect(DocsPage).toHaveBeenCalledTimes(1);
    disposeStatic?.();
  });
});
