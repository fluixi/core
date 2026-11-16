// @vitest-environment jsdom
/**
 * A route whose data fails with no ErrorBoundary in the app: the router shows an error view in
 * place of the page, instead of leaving the previous page on screen under the new URL.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createComponent, createNativeElement, insert, render } from '@fluixi/dom';
import { createMemo, createRoot } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Outlet, Router, createMemoryHistory, useNavigate, useRouteData, useLocation } from './index.js';
import { Suspense } from '../render/suspense.js';
import { lazy } from '../render/lazy.js';

beforeEach(() => ensureIntegration());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function setup(error?: (e: unknown, reset: () => void) => unknown) {
  let go!: (to: string) => void;
  let path!: () => string;
  const Home = () => {
    go = useNavigate();
    const location = useLocation();
    path = () => location.pathname;
    return document.createTextNode('home page');
  };
  const Fail = () => {
    const data = useRouteData<string>();
    const p = createNativeElement('p');
    insert(p, () => () => String(data()));
    return p;
  };
  const routes = [
    { path: '/', component: Home },
    { path: '/fail', component: Fail, data: () => new Promise((_, reject) => setTimeout(() => reject(new Error('route data failed')), 20)) },
  ];
  const container = document.createElement('div');
  createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/'), error } as never)), container));
  return { container, go: (to: string) => go(to), path: () => path() };
}

describe('a failed route with no ErrorBoundary in the app', () => {
  it('shows the built-in error view, and logs the error', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = setup();
    await wait(20);
    app.go('/fail');
    await wait(150);
    expect(app.container.querySelector('[role=alert]')?.textContent).toBe('Something went wrongThis page could not be loaded.');
    expect(app.container.textContent).not.toContain('home page');
    expect(logged.mock.calls.some((c) => String(c[0]).includes('route data failed'))).toBe(true);
    logged.mockRestore();
  });

  it('renders the Router\'s `error` option with the error', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = setup((e) => document.createTextNode(`custom: ${(e as Error).message}`));
    await wait(20);
    app.go('/fail');
    await wait(150);
    expect(app.container.textContent).toBe('custom: route data failed');
    logged.mockRestore();
  });

  it('leaves the error view behind on the next navigation', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = setup();
    await wait(20);
    app.go('/fail');
    await wait(150);
    app.go('/');
    await wait(150);
    expect(app.container.textContent).toBe('home page');
    logged.mockRestore();
  });
  it('shows it for a page that returns a plain function, which its inserter calls', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    let go!: (to: string) => void;
    const Home = () => {
      go = useNavigate();
      return document.createTextNode('home page');
    };
    const Fail = () => {
      const data = useRouteData<string>();
      return () => String(data());
    };
    const routes = [
      { path: '/', component: Home },
      { path: '/fail', component: Fail, data: () => new Promise((_, reject) => setTimeout(() => reject(new Error('route data failed')), 20)) },
    ];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/') } as never)), container));
    await wait(20);
    go('/fail');
    await wait(150);
    expect(container.querySelector('[role=alert]')?.textContent).toBe('Something went wrongThis page could not be loaded.');
    logged.mockRestore();
  });

  it('shows it in a start-shaped app: a Suspense shell, a layout and a lazy page', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    let go!: (to: string) => void;
    const Shell = () => createComponent(Suspense as never, { fallback: 'loading', get children() { return createMemo(() => createComponent(Outlet as never, {} as never)); } } as never);
    const Layout = () => {
      go = useNavigate();
      const main = createNativeElement('div');
      insert(main, createMemo(() => createComponent(Outlet as never, {} as never)));
      return main;
    };
    const Fail = () => {
      const data = useRouteData<string>();
      const p = createNativeElement('p');
      p.append('fail page: ');
      insert(p, () => () => String(data()));
      return p;
    };
    const routes = [{ path: '/', component: Shell, children: [{ path: '/x', component: Layout, children: [
      { path: '/x', component: lazy(() => Promise.resolve({ default: () => document.createTextNode('index page') })) },
      { path: '/x/fail', component: lazy(() => Promise.resolve({ default: Fail })), data: () => new Promise((_, reject) => setTimeout(() => reject(new Error('route data failed')), 20)) },
    ] }] }];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/x') } as never)), container));
    await wait(50);
    expect(container.textContent).toBe('index page');
    go('/x/fail');
    await wait(200);
    expect(container.querySelector('[role=alert]')?.textContent).toBe('Something went wrongThis page could not be loaded.');
    logged.mockRestore();
  });
});
