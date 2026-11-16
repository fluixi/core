/**
 * A page that throws while the server renders it: the router's error view goes out in its place
 * with a 500, instead of an empty shell with a 200 that only the browser fills in.
 */
import { describe, it, expect, vi } from 'vitest';
import { createComponent } from '@fluixi/dom';
import { Router, createMemoryHistory } from '@fluixi/core/router';
import { renderRequestAsync, renderToBodyStream } from '@fluixi/server';
import { createHandlerFrom } from './handler-core.js';

const routes = [
  { path: '/', component: () => 'fine page' },
  {
    path: '/broken',
    component: () => {
      throw new Error('page failed while rendering');
    },
  },
];
const App = (props: { url: string }) => createComponent(Router as never, { routes, history: createMemoryHistory(props.url) } as never);

const handlerFor = (mod: object) =>
  createHandlerFrom({ template: '<html><head></head><body><div id="root"></div></body></html>', mod: mod as never, cfg: { ssr: true, mountId: 'root' } });

describe('a page that throws during the server render', () => {
  for (const [name, mod] of [
    ['render', { render: (url: string) => renderRequestAsync(App, { url }) }],
    ['renderStream', { renderStream: (url: string) => renderToBodyStream(App, { url }) }],
  ] as const) {
    it(`answers 500 with the router's error view (${name})`, async () => {
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await handlerFor(mod)(new Request('http://x/broken'));
      const html = await res.text();
      expect(res.status).toBe(500);
      expect(html).toContain('role="alert"');
      expect(html).toContain('This page could not be loaded.');
      expect(html).not.toContain('page failed while rendering');
      logged.mockRestore();
    });

    it(`still answers 200 for a page that renders (${name})`, async () => {
      const res = await handlerFor(mod)(new Request('http://x/'));
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('fine page');
    });
  }
});
