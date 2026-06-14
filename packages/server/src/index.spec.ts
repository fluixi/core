import { describe, it, expect } from 'vitest';
import { createNativeElement, insert, spread } from '@fluixi/dom';
import { createResource } from '@fluixi/reactive/signal';
import {
  startServer,
  renderToString,
  renderRequest,
  renderRequestAsync,
  createHtmlDocument,
  getRequestEvent,
  runWithRequestContext,
  createRequestContext,
} from './index.js';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const App = ({ url }: { url: string }) => {
  const div = createNativeElement('div') as any;
  spread({ element: div, props: { id: 'app' } });
  insert(div, () => `url=${getRequestEvent()?.url ?? '?'}|prop=${url}`, null);
  return div;
};

describe('@fluixi/server', () => {
  it('renders a request and exposes the event', () => {
    expect(renderRequest(App, { url: '/x' })).toBe('<div id="app">url=/x|prop=/x</div>');
  });

  it('startServer.render / .page', () => {
    const { render, page } = startServer(App);
    expect(render('/a')).toBe('<div id="app">url=/a|prop=/a</div>');
    const html = page('/b', { title: 'T' });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<title>T</title>');
    expect(html).toContain('<div id="app">url=/b|prop=/b</div>');
  });

  it('createHtmlDocument wraps content', () => {
    expect(createHtmlDocument('<p>hi</p>', { lang: 'fr' })).toContain('<html lang="fr">');
  });

  it('renderToString with an explicit event', () => {
    const html = renderToString(() => App({ url: '/z' }), { event: { url: '/z' } });
    expect(html).toBe('<div id="app">url=/z|prop=/z</div>');
  });

  it('renderRequestAsync awaits a data loader (ALS auto-injected on import)', async () => {
    const DataApp = ({ url }: { url: string }) => {
      const [data] = createResource(() => new Promise<string>((r) => setTimeout(() => r(`data:${url}`), 5)));
      const div = createNativeElement('div') as any;
      insert(div, () => data() ?? '…', null);
      return div;
    };
    expect(await renderRequestAsync(DataApp, { url: '/p' })).toBe('<div>data:/p</div>');
  });

  it('isolates concurrent interleaved renders (ALS auto-injected on import)', async () => {
    async function flow(tag: string, ms: number) {
      return runWithRequestContext(createRequestContext({ url: `/${tag}` }), async () => {
        await delay(ms);
        return getRequestEvent()!.url;
      });
    }
    const [a, b] = await Promise.all([flow('alice', 20), flow('bob', 5)]);
    expect(a).toBe('/alice');
    expect(b).toBe('/bob');
  });
});
