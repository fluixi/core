// @vitest-environment jsdom
//
// Regression for the framework-agnostic router (@fluixi/router) + its kettlejs
// adapter (@fluixi/kettlejs/router-next). This example uses the IMPERATIVE backend
// (see vite.config.ts) — store-admin's backend — so these prove the adapter works
// with deferred <Outlet/> AND renders deeply nested layouts (the case the old
// kettlejs router could not render).
import { describe, it, expect } from 'vitest';
import { render, Suspense } from '@fluixi/kettlejs';
import {
  Router,
  Outlet,
  useNavigate,
  useParams,
  useRouteData,
  createMemoryHistory,
} from '@fluixi/kettlejs/router-next';
import { lazy } from '@fluixi/kettlejs/router';
import { flush } from '@fluixi/reactive/signal';

const tick = async (ms = 30) => {
  await new Promise((r) => setTimeout(r, ms));
  await flush();
};

describe('router-next adapter (imperative backend)', () => {
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
