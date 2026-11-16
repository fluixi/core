/**
 * An app's own ErrorBoundary around its pages, on the server: a page whose data fails renders the
 * boundary's fallback in the HTML, instead of the empty element the page was writing into.
 */
import { describe, it, expect, vi } from 'vitest';
import { createComponent, createNativeElement, insert, ErrorBoundary } from '@fluixi/dom';
import { Router, Outlet, createMemoryHistory, useRouteData } from '@fluixi/core/router';
import { renderRequestAsync } from '@fluixi/server';

const failing = () => Promise.reject(Object.assign(new Error('no such record'), { status: 404 }));
const routes = [
  {
    path: '/',
    component: () =>
      createComponent(ErrorBoundary as never, {
        fallback: (error: { status?: number }) => `app fallback ${error.status}`,
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
});
