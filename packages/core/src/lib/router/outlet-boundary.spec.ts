// @vitest-environment jsdom
/**
 * A boundary around the Outlet, as the routing docs show it: navigating into a child page whose
 * data fails shows the failure there, and navigating on to a page that loads leaves it behind.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorBoundary, createComponent, createNativeElement, insert, render } from '@fluixi/dom';
import { createMemo, createRoot } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Outlet, Router, createMemoryHistory, useNavigate, useRouteData } from './index.js';
import { lazy } from '../render/lazy.js';
import { Suspense } from '../render/suspense.js';

beforeEach(() => ensureIntegration());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('an ErrorBoundary around the Outlet', () => {
  it('shows a failing page\'s error on that page, and not on the next one', async () => {
    let go!: (to: string) => void;
    const Layout = () => {
      go = useNavigate();
      return ErrorBoundary({
        fallback: (error: unknown) => document.createTextNode(`failed: ${(error as Error).message}`),
        get children() {
          return Outlet();
        },
      });
    };
    const Plain = () => document.createTextNode('plain page');
    const Fail = () => {
      const data = useRouteData<string>();
      return [document.createTextNode('fail page: '), () => String(data() ?? '')];
    };
    const routes = [
      {
        path: '/',
        component: Layout,
        children: [
          { path: '/', component: Plain },
          { path: '/fail', component: Fail, data: () => new Promise((_, reject) => setTimeout(() => reject(new Error('route data failed')), 20)) },
          { path: '/other', component: () => document.createTextNode('other page') },
        ],
      },
    ];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/') } as never)), container));
    await wait(20);
    expect(container.textContent).toBe('plain page');

    go('/fail');
    await wait(150);
    expect(container.textContent).toBe('failed: route data failed');

    go('/other');
    await wait(150);
    expect(container.textContent).toBe('other page');
  });
  it('shows the error when the page reads its data inside an element, as compiled JSX does', async () => {
    let go!: (to: string) => void;
    const Layout = () => {
      go = useNavigate();
      return ErrorBoundary({
        fallback: (error: unknown) => document.createTextNode(`failed: ${(error as Error).message}`),
        get children() {
          return Outlet();
        },
      });
    };
    const Fail = () => {
      const data = useRouteData<string>();
      const p = createNativeElement('p');
      p.append('fail page: ');
      insert(p, () => String(data()));
      return p;
    };
    const routes = [
      {
        path: '/',
        component: Layout,
        children: [
          { path: '/', component: () => document.createTextNode('plain page') },
          { path: '/fail', component: Fail, data: () => new Promise((_, reject) => setTimeout(() => reject(new Error('route data failed')), 20)) },
        ],
      },
    ];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/') } as never)), container));
    await wait(20);
    go('/fail');
    await wait(150);
    expect(container.textContent).toBe('failed: route data failed');
  });
  it('shows the error for a lazy page, as file routes are', async () => {
    let go!: (to: string) => void;
    const Layout = () => {
      go = useNavigate();
      return ErrorBoundary({
        fallback: (error: unknown) => document.createTextNode(`failed: ${(error as Error).message}`),
        get children() {
          return Outlet();
        },
      });
    };
    const Fail = () => {
      const data = useRouteData<string>();
      const p = createNativeElement('p');
      p.append('fail page: ');
      insert(p, () => String(data()));
      return p;
    };
    const routes = [
      {
        path: '/',
        component: Layout,
        children: [
          { path: '/', component: () => document.createTextNode('plain page') },
          { path: '/fail', component: lazy(() => Promise.resolve({ default: Fail })), data: () => new Promise((_, reject) => setTimeout(() => reject(new Error('route data failed')), 20)) },
        ],
      },
    ];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/') } as never)), container));
    await wait(20);
    go('/fail');
    await wait(150);
    expect(container.textContent).toBe('failed: route data failed');
  });
  it('shows the error under a shell that wraps the Outlet in Suspense, as start apps do', async () => {
    let go!: (to: string) => void;
    const Shell = () => createComponent(Suspense as never, { fallback: 'loading', get children() { return Outlet(); } } as never);
    const Layout = () => {
      go = useNavigate();
      return ErrorBoundary({
        fallback: (error: unknown) => document.createTextNode(`failed: ${(error as Error).message}`),
        get children() {
          return Outlet();
        },
      });
    };
    const Fail = () => {
      const data = useRouteData<string>();
      const p = createNativeElement('p');
      p.append('fail page: ');
      insert(p, () => String(data()));
      return p;
    };
    const routes = [
      {
        path: '/',
        component: Shell,
        children: [
          {
            path: '/app',
            component: Layout,
            children: [
              { path: '/app', component: lazy(() => Promise.resolve({ default: () => document.createTextNode('plain page') })) },
              { path: '/app/fail', component: lazy(() => Promise.resolve({ default: Fail })), data: () => new Promise((_, reject) => setTimeout(() => reject(new Error('route data failed')), 20)) },
            ],
          },
        ],
      },
    ];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/app') } as never)), container));
    await wait(50);
    expect(container.textContent).toBe('plain page');
    go('/app/fail');
    await wait(200);
    expect(container.textContent).toBe('failed: route data failed');
  });
  it('shows the error when the boundary gets its children as compiled JSX passes them', async () => {
    let go!: (to: string) => void;
    const Layout = () => {
      go = useNavigate();
      return createMemo(() => createComponent(ErrorBoundary as never, {
        fallback: (error: unknown) => document.createTextNode(`failed: ${(error as Error).message}`),
        get children() {
          return createMemo(() => createComponent(Outlet as never, {} as never));
        },
      } as never));
    };
    const Fail = () => {
      const data = useRouteData<string>();
      const p = createNativeElement('p');
      p.append('fail page: ');
      insert(p, () => () => String(data()));
      return p;
    };
    const routes = [
      {
        path: '/',
        component: Layout,
        children: [
          { path: '/', component: () => document.createTextNode('plain page') },
          { path: '/fail', component: Fail, data: () => new Promise((_, reject) => setTimeout(() => reject(new Error('route data failed')), 20)) },
        ],
      },
    ];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/') } as never)), container));
    await wait(20);
    go('/fail');
    await wait(150);
    expect(container.textContent).toBe('failed: route data failed');
  });
});
