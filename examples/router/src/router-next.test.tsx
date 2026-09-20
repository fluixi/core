// @vitest-environment jsdom
//
// Regression for the framework-agnostic router (@fluixi/router) + its fluixi
// adapter (@fluixi/core/router). This example uses the IMPERATIVE backend
// (see vite.config.ts), store-admin's backend: so these prove the adapter works
// with deferred <Outlet/> AND renders deeply nested layouts (the case the old
// fluixi router could not render).
import { describe, it, expect } from 'vitest';
import { render, Suspense } from '@fluixi/core';
import {
  Router,
  Outlet,
  Redirect,
  useNavigate,
  useParams,
  useParam,
  useParamSelector,
  useMatch,
  useSearchParams,
  useRouteData,
  createMemoryHistory,
} from '@fluixi/core/router';
import { lazy } from '@fluixi/core/router';
import { createContext, useContext } from '@fluixi/core';
import { flush } from '@fluixi/reactive/signal';

const tick = async (ms = 30) => {
  await new Promise((r) => setTimeout(r, ms));
  await flush();
};

describe('router adapter (imperative backend)', () => {
  it('single-level layout renders its child', async () => {
    const routes = [
      {
        path: '/app',
        component: () => <div class="app"><nav>nav</nav><Outlet /></div>,
        children: [{ path: '/app/home', component: () => <div class="home">HOME</div> }],
      },
    ];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/app/home')} />, host);
    await tick();
    expect(host.querySelector('.app .home')?.textContent).toBe('HOME');
  });

  it('renders DEEPLY nested markup-wrapped <Outlet/> (the old-router bug)', async () => {
    const routes = [
      {
        path: '/',
        component: () => <div class="a"><Outlet /></div>,
        children: [
          {
            path: '/',
            component: () => <div class="b"><Outlet /></div>,
            children: [
              {
                path: '/',
                component: () => <div class="c"><Outlet /></div>,
                children: [{ path: '/', component: () => <span class="leaf">DEEP</span> }],
              },
            ],
          },
        ],
      },
    ];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/')} />, host);
    await tick(50);
    expect(host.querySelector('.a .b .c .leaf')?.textContent).toBe('DEEP');
  });

  it('renders a nested lazy leaf inside Suspense', async () => {
    const routes = [
      {
        path: '/',
        component: () => <aside class="sb"><Outlet /></aside>,
        children: [
          {
            path: '/',
            component: () => <main class="m"><Outlet /></main>,
            children: [
              {
                path: '/',
                component: lazy(async () => ({ default: () => <span class="leaf">LEAF</span> })),
              },
            ],
          },
        ],
      },
    ];
    const host = document.createElement('div');
    render(
      () => (
        <Suspense fallback={<div class="fb">loading</div>}>
          <Router routes={routes} history={createMemoryHistory('/')} />
        </Suspense>
      ),
      host
    );
    await tick(120);
    expect(host.querySelector('.sb .m .leaf')?.textContent).toBe('LEAF');
  });

  it('navigates between siblings and REUSES the shared layout', async () => {
    let navigate!: (to: string) => void;
    let layoutRuns = 0;
    const Layout = () => {
      layoutRuns++;
      navigate = useNavigate();
      return <div class="app"><Outlet /></div>;
    };
    const routes = [
      {
        path: '/app',
        component: Layout,
        children: [
          { path: '/app/home', component: () => <div class="home">HOME</div> },
          { path: '/app/settings', component: () => <div class="settings">SETTINGS</div> },
        ],
      },
    ];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/app/home')} />, host);
    await tick();
    expect(host.querySelector('.app .home')?.textContent).toBe('HOME');
    const layoutEl = host.querySelector('.app');

    navigate('/app/settings');
    await tick();
    expect(host.querySelector('.app .settings')?.textContent).toBe('SETTINGS');
    expect(host.querySelector('.home')).toBeNull();

    // Layout reuse: the layout component ran exactly once and the same DOM node
    // is preserved across the sibling navigation.
    expect(layoutRuns).toBe(1);
    expect(host.querySelector('.app')).toBe(layoutEl);
  });

  it('loads route data (async) and exposes it via useRouteData under Suspense', async () => {
    let loads = 0;
    const routes = [
      {
        path: '/dash',
        component: () => {
          const data = useRouteData<{ name: string }>();
          return <div class="dash">hi {data?.()?.name}</div>;
        },
        data: async () => {
          loads++;
          return { name: 'Ada' };
        },
      },
    ];
    const host = document.createElement('div');
    render(
      () => (
        <Suspense fallback={<div class="fb">loading</div>}>
          <Router routes={routes} history={createMemoryHistory('/dash')} />
        </Suspense>
      ),
      host
    );
    await tick(60);
    expect(host.querySelector('.dash')?.textContent).toContain('Ada');
    expect(loads).toBe(1);
  });

  it('child route inherits context provided by a parent layout', async () => {
    // The store-admin case: a layout provides context (its admin providers) and the
    // child page reads it. Uses the lazy `<Ctx.Provider>` form store-admin uses.
    const Ctx = createContext<string>();
    const routes = [
      {
        path: '/app',
        component: () => (
          <Ctx.Provider value="FROM_LAYOUT">
            <div class="app"><Outlet /></div>
          </Ctx.Provider>
        ),
        children: [
          {
            path: '/app/page',
            component: () => <div class="page">{useContext(Ctx)}</div>,
          },
        ],
      },
    ];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/app/page')} />, host);
    await tick();
    expect(host.querySelector('.app .page')?.textContent).toBe('FROM_LAYOUT');
  });

  it('exposes route params reactively', async () => {
    const routes = [
      {
        path: '/users/:id',
        component: () => {
          const params = useParams();
          return <div class="user">user {params().id}</div>;
        },
      },
    ];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/users/42')} />, host);
    await tick();
    expect(host.querySelector('.user')?.textContent).toContain('42');
  });
});

import { Link, A } from '@fluixi/core/router';
describe('router Link', () => {
  const tick2 = async (ms = 30) => { await new Promise((r) => setTimeout(r, ms)); await flush(); };
  it('navigates on click and applies active class', async () => {
    const routes = [{ path: '/app', component: () => (
      <div class="app">
        <Link href="/app/home" class="nav" activeClass="on">home</Link>
        <Link href="/app/settings" class="nav" activeClass="on">settings</Link>
        <Outlet />
      </div>
    ), children: [
      { path: '/app/home', component: () => <div class="home">HOME</div> },
      { path: '/app/settings', component: () => <div class="settings">SET</div> },
    ]}];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/app/home')} />, host);
    await tick2();
    const links = host.querySelectorAll('a.nav');
    expect(links.length).toBe(2);
    expect((links[0] as HTMLAnchorElement).getAttribute('href')).toBe('/app/home');
    expect((links[0] as HTMLElement).className).toContain('on'); // home active
    expect((links[1] as HTMLElement).className).not.toContain('on');
    (links[1] as HTMLElement).click();
    await tick2();
    expect(host.querySelector('.settings')?.textContent).toBe('SET');
  });
  it('A is an alias for Link', () => { expect(A).toBe(Link); });

  // A data page that destructures rd()! (the store-admin shape) must render WITHOUT
  // a Suspense boundary: the layer gates its component on the data being resolved,
  // like the old router, so rd() yields the value instead of throwing.
  it('data page works without <Suspense>, loader runs once, survives nav away/back', async () => {
    let loads = 0;
    const Dash = lazy(async () => ({
      default: () => {
        const rd = useRouteData<{ n: number }>();
        const { n } = rd()!;
        return <div class="dash">DASH {n}</div>;
      },
    }));
    const Other = lazy(async () => ({ default: () => <div class="other">OTHER</div> }));
    let nav: any;
    const routes = [
      {
        path: '/',
        component: () => {
          nav = useNavigate();
          return <div class="app"><nav>side</nav><Outlet /></div>;
        },
        children: [
          {
            path: '/dashboard',
            component: Dash,
            data: async () => {
              loads++;
              await new Promise((r) => setTimeout(r, 20));
              return { n: 7 };
            },
          },
          { path: '/other', component: Other },
        ],
      },
    ];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/dashboard')} />, host);
    await tick(120);
    expect(host.querySelector('.dash')?.textContent).toContain('DASH 7');
    expect(loads).toBe(1);

    nav('/other');
    await tick(80);
    expect(host.querySelector('.other')?.textContent).toBe('OTHER');
    expect(host.querySelector('.dash')).toBeNull();

    nav('/dashboard');
    await tick(120);
    expect(host.querySelector('.dash')?.textContent).toContain('DASH 7');
  });

  // Hooks ported from the old router for API parity.
  it('useParams<T> + useParam single key', async () => {
    let p: any, one: any;
    const routes = [{ path: '/u/:id', component: () => { p = useParams<{ id: string }>(); one = useParam('id'); return <div class="u">{p().id}</div>; } }];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/u/42')} />, host);
    await tick();
    expect(host.querySelector('.u')?.textContent).toBe('42');
    expect(one()).toBe('42');
  });

  it('useParamSelector derives a value from params', async () => {
    let sel: any;
    const routes = [{ path: '/w/:ws/c/:ch', component: () => { sel = useParamSelector((x) => `${x.ws}-${x.ch}`); return <div />; } }];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/w/a/c/b')} />, host);
    await tick();
    expect(sel()).toBe('a-b');
  });

  it('useMatch matches the current pathname', async () => {
    let m: any;
    const routes = [{ path: '/p/:id', component: () => { m = useMatch('/p/:id'); return <div />; } }];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/p/9')} />, host);
    await tick();
    expect(m()?.params.id).toBe('9');
  });

  it('useSearchParams reads and writes the query', async () => {
    let sp: any;
    const routes = [{ path: '/s', component: () => { sp = useSearchParams(); return <div />; } }];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/s?q=hi')} />, host);
    await tick();
    expect(sp[0]().q).toBe('hi');
    sp[1]({ q: 'bye' });
    await tick();
    expect(sp[0]().q).toBe('bye');
  });

  it('Redirect navigates to its target', async () => {
    const routes = [
      { path: '/from', component: () => <Redirect to="/to" /> },
      { path: '/to', component: () => <div class="to">TO</div> },
    ];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/from')} />, host);
    await tick(50);
    expect(host.querySelector('.to')?.textContent).toBe('TO');
  });

  // storefront/pos wrap the flat plugin routes under a synthetic root layout that
  // holds the app chrome: [{ path: '/', component: Shell, children: routes }] where
  // children include an index ('/') plus absolute-path siblings. The chrome must
  // persist and the page render at <Outlet/> on both direct load and navigation.
  it('wraps a flat routes array under a synthetic root layout (index + siblings)', async () => {
    let nav: any;
    const pages = [
      { path: '/', component: () => <div class="home">HOME</div> },
      { path: '/cart', component: () => <div class="cart">CART</div> },
    ];
    const appRoutes = [
      {
        path: '/',
        component: () => {
          nav = useNavigate();
          return <div class="shell"><header>chrome</header><Outlet /></div>;
        },
        children: pages,
      },
    ];
    const host = document.createElement('div');
    render(() => <Router routes={appRoutes} history={createMemoryHistory('/')} />, host);
    await tick();
    expect(host.querySelector('.shell header')?.textContent).toBe('chrome');
    expect(host.querySelector('.shell .home')?.textContent).toBe('HOME');

    nav('/cart');
    await tick();
    // chrome persists, only the outlet content swaps
    expect(host.querySelector('.shell header')?.textContent).toBe('chrome');
    expect(host.querySelector('.shell .cart')?.textContent).toBe('CART');
    expect(host.querySelector('.home')).toBeNull();
  });

  // Regression (was an OPEN BUG on the imperative backend): async/lazy route
  // content threaded through a child component's {props.children} rendered empty.
  // Two causes, both fixed in the compiler (inline codegen):
  //   1. `{props.children}` compiled to a reactive `() => props.children` thunk;
  //      now `.children` is non-reactive so insert binds the child's own memo.
  //   2. JSX whitespace between <Shell> and <Suspense> made children an array
  //      `[" ", memo, " "]`: an array insert doesn't reactively bind the inner
  //      memo; canonical JSX whitespace cleaning drops it so the child stays lone.
  it('lazy <Suspense><Outlet/> through a component {props.children}', async () => {
    const Page = lazy(async () => ({ default: () => <div class="page"><input class="x" /></div> }));
    const Shell = (props: { children?: any }) => (
      <div class="layout"><main class="slot">{props.children}</main></div>
    );
    const RootLayout = () => (
      <Shell>
        <Suspense fallback={<i>l</i>}>
          <Outlet />
        </Suspense>
      </Shell>
    );
    const appRoutes = [{ path: '/', component: RootLayout, children: [{ path: '/p', component: Page }] }];
    const host = document.createElement('div');
    render(() => <Router routes={appRoutes} history={createMemoryHistory('/p')} />, host);
    await tick(150);
    expect(host.querySelector('.slot .x')).not.toBeNull();
  });
});
