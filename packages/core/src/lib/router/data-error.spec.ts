// @vitest-environment jsdom
/** A route whose data fails: one error, not a loop. */
import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorBoundary, createComponent, render } from '@fluixi/dom';
import { createMemo, createRoot } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Outlet, Router, createMemoryHistory, useNavigate, useRouteData } from './index.js';

beforeEach(() => ensureIntegration());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('a route whose data rejects', () => {
  it('loads once, renders once, and the page\'s boundary shows the error', async () => {
    let loads = 0;
    let renders = 0;
    const Page = () => {
      renders++;
      const data = useRouteData<string>();
      return ErrorBoundary({
        fallback: (error: unknown) => document.createTextNode(`failed: ${(error as Error).message}`),
        get children() {
          return () => String(data() ?? '');
        },
      });
    };
    const routes = [{ path: '/', component: Page, data: () => (loads++, Promise.reject(new Error('Choose an organisation first.'))) }];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/') } as never)), container));
    await wait(200);

    expect(loads).toBe(1);
    expect(renders).toBeLessThanOrEqual(1);
    expect(container.textContent).toBe('failed: Choose an organisation first.');
  });

  it('navigating into a layout whose data rejects does not loop', async () => {
    let loads = 0;
    let layoutRenders = 0;
    let go!: (to: string) => void;
    const Home = () => {
      go = useNavigate();
      return document.createTextNode('home');
    };
    // Where an app catches a failed load: an error boundary in the layout.
    const Layout = () => {
      layoutRenders++;
      const data = useRouteData<string>();
      return ErrorBoundary({
        fallback: (error: unknown) => document.createTextNode(`failed: ${(error as Error).message}`),
        get children() {
          return [document.createTextNode('layout:'), () => String(data() ?? ''), Outlet()];
        },
      });
    };
    const Index = () => document.createTextNode('index');
    const routes = [
      { path: '/', component: Home },
      {
        path: '/app',
        component: Layout,
        data: () => (loads++, Promise.reject(new Error('Choose an organisation first.'))),
        children: [{ path: '/app', component: Index }],
      },
    ];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/') } as never)), container));
    await wait(20);
    go('/app');
    await wait(300);
    expect(loads).toBe(1);
    expect(layoutRenders).toBeLessThanOrEqual(1);
    // The failed route replaced the page, and its error reached the boundary.
    expect(container.textContent).toBe('failed: Choose an organisation first.');
  });
});
