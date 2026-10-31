// @vitest-environment jsdom
/**
 * A lazy page rendered by <Outlet/> under <Suspense>, through a layout component's
 * {props.children}, appears exactly once. Runs the real router, not a stand-in for it.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, Suspense } from '@fluixi/core';
import { Router, Outlet, createMemoryHistory, lazy } from '@fluixi/core/router';
import { createResource, flush } from '@fluixi/reactive/signal';

describe('router <Outlet/> through {props.children}', () => {
  it('lazy resource page appears exactly once through Shell children', async () => {
    const Page = lazy(async () => ({
      default: () => {
        const [data] = createResource(async () => 'PAGE-DATA');
        return <div class="page">{() => data() ?? ''}</div>;
      },
    }));
    const Shell = (props: { children?: any }) => (
      <div class="layout"><main class="slot">{props.children}</main></div>
    );
    const RootLayout = () => (
      <Shell>
        <Suspense fallback={<i>loading</i>}>
          <Outlet />
        </Suspense>
      </Shell>
    );
    const routes = [{ path: '/', component: RootLayout, children: [{ path: '/p', component: Page }] }];
    const host = document.createElement('div');
    render(() => <Router routes={routes} history={createMemoryHistory('/p')} />, host);
    await vi.waitFor(() => expect(host.querySelector('.slot .page')?.textContent).toBe('PAGE-DATA'));
    await flush();
    const pages = host.querySelectorAll('.slot .page');
    expect(pages.length).toBe(1);
    expect(pages[0]?.textContent).toBe('PAGE-DATA');
  });
});
