/**
 * An app's own ErrorBoundary around its pages, on the server: a page whose data fails renders the
 * boundary's fallback in the HTML, instead of the empty element the page was writing into, and
 * the response takes the error's status, or 500.
 */
import { describe, it, expect, vi } from 'vitest';
import { createComponent, createNativeElement, insert, ErrorBoundary, setResponseStatus } from '@fluixi/dom';
import { Router, Outlet, createMemoryHistory, useRouteData } from '@fluixi/core/router';
import { renderRequestAsync } from '@fluixi/server';
import { createHandlerFrom } from './handler-core.js';

const failing = () => Promise.reject(Object.assign(new Error('no such record'), { status: 404 }));
const routes = [
  {
    path: '/',
    component: () =>
      createComponent(ErrorBoundary as never, {
        fallback: (error: { status?: number; message?: string }) => {
          // A fallback that decides the status itself.
          if (error.message === 'down for maintenance') setResponseStatus(503);
          return `app fallback ${error.status}`;
        },
        get children() {
          return createComponent(Outlet as never, {});
        },
      } as never),
    children: [
      {
        path: 'element',
        data: failing,
        component: () => {
          const data = useRouteData<string>();
          const p = createNativeElement('p');
          insert(p, () => String(data()));
          return p;
        },
      },
      {
        path: 'crash',
        data: () => Promise.reject(new Error('backend crashed')),
        component: () => {
          const data = useRouteData<string>();
          return () => String(data());
        },
      },
      {
        path: 'maintenance',
        data: () => Promise.reject(new Error('down for maintenance')),
        component: () => {
          const data = useRouteData<string>();
          return () => String(data());
        },
      },
      { path: 'fine', component: () => 'fine page' },
      {
        path: 'thunk',
        data: failing,
        component: () => {
          const data = useRouteData<string>();
          return () => String(data());
        },
      },
    ],
  },
];
const App = (props: { url: string }) => createComponent(Router as never, { routes, history: createMemoryHistory(props.url) } as never);

describe("an app's ErrorBoundary in a server render", () => {
  for (const shape of ['element', 'thunk']) {
    it(`renders its fallback for a page whose data failed (${shape})`, async () => {
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
      const html = await renderRequestAsync(App, { url: `/${shape}` });
      expect(html).toContain('app fallback 404');
      expect(html).not.toContain('no such record');
      logged.mockRestore();
    });
  }

  it('answers with the status the error carries, or 500', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createHandlerFrom({
      template: '<html><head></head><body><div id="root"></div></body></html>',
      mod: { render: (url: string) => renderRequestAsync(App, { url }) } as never,
      cfg: { ssr: true, mountId: 'root' },
    });
    const status = async (url: string) => (await handler(new Request(`http://x${url}`))).status;
    expect(await status('/element')).toBe(404);
    expect(await status('/thunk')).toBe(404);
    expect(await status('/crash')).toBe(500);
    expect(await status('/maintenance')).toBe(503);
    expect(await status('/fine')).toBe(200);
    logged.mockRestore();
  });
});
