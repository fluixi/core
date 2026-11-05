// @vitest-environment jsdom
/** `throw redirect()` in a route's data: the reader lands elsewhere, and the page never renders. */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createComponent,
  createNativeElement,
  insert,
  render,
  takeResponseHeaders,
  takeResponseRedirect,
} from '@fluixi/dom';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { createMemo, createRoot } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Outlet, Router, createMemoryHistory, redirect } from './index.js';

beforeEach(() => ensureIntegration());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function text(tag: string, value: string) {
  const element = createNativeElement(tag);
  insert(element, value);
  return element;
}

let pageRenders = 0;
const routesWith = (data: () => unknown) => [
  { path: '/organisations', component: () => text('p', 'picker') },
  {
    path: '/app',
    component: () => [text('nav', 'shell'), Outlet()],
    data,
    children: [{ path: '/app', component: () => (pageRenders++, text('main', 'workspace')) }],
  },
];

describe('redirect() in route data', () => {
  it('sends the browser to the target, thrown at once or after an await, without rendering the page', async () => {
    for (const data of [() => redirect('/organisations'), async () => (await wait(1), redirect('/organisations'))]) {
      pageRenders = 0;
      const container = document.createElement('div');
      createRoot(() => render(createMemo(() => createComponent(Router, { routes: routesWith(data), history: createMemoryHistory('/app') } as never)), container));
      await wait(50);
      expect(container.textContent).toBe('picker');
      expect(pageRenders).toBe(0);
    }
  });

  it('answers a server render with the redirect, not the page', async () => {
    const request = new Request('http://app.test/app', { headers: { accept: 'text/html' } });
    setServerMode(true);
    try {
      const html = await renderToStringAsync(
        () => Router({ routes: routesWith(async () => redirect('/organisations', { status: 302 })), history: createMemoryHistory('/app') } as never),
        { event: { request } },
      );
      expect(takeResponseRedirect(request)).toEqual({ location: '/organisations', status: 302 });
      expect(html).not.toContain('workspace');
    } finally {
      setServerMode(false);
    }
  });

  it('redirects from the page once the headers have gone out', async () => {
    const request = new Request('http://app.test/app', { headers: { accept: 'text/html' } });
    takeResponseHeaders(request);
    setServerMode(true);
    try {
      const html = await renderToStringAsync(
        () => Router({ routes: routesWith(async () => redirect('/organisations')), history: createMemoryHistory('/app') } as never),
        { event: { request } },
      );
      expect(takeResponseRedirect(request)).toBeUndefined();
      expect(html).toContain('location.replace("/organisations")');
      expect(html).toContain('http-equiv="refresh"');
      expect(html).not.toContain('workspace');
    } finally {
      setServerMode(false);
    }
  });
});
