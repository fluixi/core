// @vitest-environment jsdom
/**
 * A route whose data fails, with no error boundary anywhere: one load, never a loop, and the
 * error reaches the top once. With no boundary the runtime rethrows it; it leaves through the
 * resource's settle callback, so here it is an unhandled rejection, which the test takes over
 * from Vitest while it runs.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createComponent, render } from '@fluixi/dom';
import { Suspense } from '../render/suspense.js';
import { createMemo, createRoot } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Outlet, Router, createMemoryHistory, useRouteData } from './index.js';

beforeEach(() => ensureIntegration());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('a route whose data rejects with no boundary', () => {
  it('under a layout and Suspense, loads once and renders a bounded number of times', async () => {
    let loads = 0;
    let renders = 0;
    const errors: unknown[] = [];
    const vitest = process.listeners('unhandledRejection');
    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', (reason) => errors.push(reason));
    const Layout = () => Suspense({ fallback: document.createTextNode('loading'), get children() { return Outlet(); } } as never);
    const Page = () => {
      renders++;
      const data = useRouteData<string>();
      return () => String(data() ?? '');
    };
    const routes = [
      {
        path: '/',
        component: Layout,
        children: [{ path: '/', component: Page, data: () => (loads++, Promise.reject(new Error('signed_out'))) }],
      },
    ];
    const container = document.createElement('div');
    createRoot(() => render(createMemo(() => createComponent(Router, { routes, history: createMemoryHistory('/') } as never)), container));
    await wait(300);
    process.removeAllListeners('unhandledRejection');
    for (const listener of vitest) process.on('unhandledRejection', listener);

    expect(loads).toBe(1);
    expect(renders).toBeLessThanOrEqual(2);
    expect(errors.map((e) => (e as Error).message)).toEqual(['signed_out']);
  });
});
