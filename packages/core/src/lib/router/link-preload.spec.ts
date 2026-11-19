// @vitest-environment jsdom
/** A link loads its target route's code on intent, so the click finds it ready. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createComponent, createNativeElement, insert, render } from '@fluixi/dom';
import { createMemo, createRoot } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Link, Router, createBrowserHistory, usePreloadRoute } from './index.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('route preload on intent', () => {
  let loads: string[];
  let dispose!: () => void;
  let preloadRoute!: (href: string) => void;

  const lazyPage = (name: string) =>
    Object.assign(() => createNativeElement('main'), {
      preload: () => (loads.push(name), Promise.resolve()),
    });

  beforeEach(() => {
    ensureIntegration();
    loads = [];
    history.replaceState(null, '', '/');
    const Home = () => {
      preloadRoute = usePreloadRoute();
      const nav = createNativeElement('nav');
      insert(nav, [
        createComponent(Link, { href: '/orders?page=2', class: 'orders', children: 'Orders' } as never),
        createComponent(Link, { href: '/settings', class: 'settings', preload: false, children: 'Settings' } as never),
        createComponent(Link, { href: 'https://example.test/x', class: 'out', children: 'Out' } as never),
      ]);
      return nav;
    };
    const routes = [
      { path: '/', component: Home },
      { path: '/orders', component: lazyPage('orders') },
      { path: '/settings', component: lazyPage('settings') },
      { path: '/reports', component: lazyPage('reports') },
    ];
    const container = document.createElement('div');
    document.body.append(container);
    dispose = createRoot((done) => {
      render(createMemo(() => createComponent(Router, { routes, history: createBrowserHistory() } as never)), container);
      return () => (done(), container.remove());
    });
  });
  afterEach(() => dispose());

  it('loads the route code when the pointer reaches the link, once per path', async () => {
    await tick();
    const orders = document.querySelector('a.orders')!;
    orders.dispatchEvent(new Event('pointerenter'));
    orders.dispatchEvent(new Event('focus'));
    orders.dispatchEvent(new Event('pointerenter'));
    expect(loads).toEqual(['orders']);
  });

  it('loads nothing for preload={false} or a link leaving the app', async () => {
    await tick();
    document.querySelector('a.settings')!.dispatchEvent(new Event('pointerenter'));
    document.querySelector('a.out')!.dispatchEvent(new Event('pointerenter'));
    expect(loads).toEqual([]);
  });

  it('lets code that navigates without a link preload a path', async () => {
    await tick();
    preloadRoute('/reports');
    expect(loads).toEqual(['reports']);
  });
});
