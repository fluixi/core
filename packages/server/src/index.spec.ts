import { describe, it, expect } from 'vitest';
import { createNativeElement, insert, spread } from '@fluixi/dom';
import { createResource } from '@fluixi/reactive/signal';
import { seo, extractHeadMarker } from '@fluixi/head';
import {
  startServer,
  renderToString,
  renderRequest,
  renderRequestAsync,
  renderToStream,
  renderToBodyStream,
  createHtmlDocument,
  getRequestEvent,
  runWithRequestContext,
  createRequestContext,
} from './index.js';

/** The markup without hydration keys: these specs are about the document, not the keys. */
const plain = (html: string) => html.replace(/ data-hk="[^"]*"/g, '');

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function collectStream(stream: ReadableStream<Uint8Array>): Promise<string[]> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  const chunks: string[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(dec.decode(value));
  }
  return chunks;
}

describe('@fluixi/server renderToStream', () => {
  const DataApp = ({ url }: { url: string }) => {
    const [data] = createResource(() => new Promise<string>((r) => setTimeout(() => r(`d:${url}`), 5)));
    const div = createNativeElement('div') as any;
    insert(div, () => data() ?? '…', null);
    return div;
  };

  it('flushes the document shell first, then the resolved content, then closes', async () => {
    const stream = renderToStream(DataApp, { url: '/p' }, { title: 'T', scripts: ['/client.js'] });
    const chunks = await collectStream(stream);

    // shell is its own (first) chunk: before the body content
    expect(chunks[0]).toContain('<title>T</title>');
    expect(chunks[0]).toContain('<body');
    expect(chunks[0]).not.toContain('d:/p'); // content not in the shell

    const full = chunks.join('');
    expect(plain(full)).toContain('<div>d:/p</div>'); // awaited data resolved
    expect(full).toContain('/client.js'); // close chunk scripts
    expect(full.trimEnd().endsWith('</html>')).toBe(true);
    expect(chunks.length).toBeGreaterThanOrEqual(2); // shell flushed separately
  });

  it('startServer().stream returns a web ReadableStream', async () => {
    const { stream } = startServer(DataApp);
    const s = stream('/x');
    expect(s).toBeInstanceOf(ReadableStream);
    const full = (await collectStream(s)).join('');
    expect(plain(full)).toContain('<div>d:/x</div>');
  });

  it('renderToBodyStream streams the app body only — no document shell', async () => {
    const full = (await collectStream(renderToBodyStream(DataApp, { url: '/p' }))).join('');
    expect(plain(full)).toContain('<div>d:/p</div>'); // awaited data resolved
    expect(full).not.toContain('<!DOCTYPE'); // host owns the document
    expect(full).not.toContain('<body');
    expect(full).not.toContain('<title>');
  });

  it('startServer().bodyStream returns a body-only ReadableStream', async () => {
    const { bodyStream } = startServer(DataApp);
    const s = bodyStream('/y');
    expect(s).toBeInstanceOf(ReadableStream);
    expect(plain((await collectStream(s)).join(''))).toContain('<div>d:/y</div>');
  });
});

const App = ({ url }: { url: string }) => {
  const div = createNativeElement('div') as any;
  spread({ element: div, props: { id: 'app' } });
  insert(div, () => `url=${getRequestEvent()?.url ?? '?'}|prop=${url}`, null);
  return div;
};

describe('@fluixi/server', () => {
  it('renders a request and exposes the event', () => {
    expect(plain(renderRequest(App, { url: '/x' }))).toBe('<div id="app">url=/x|prop=/x</div>');
  });

  it('startServer.render / .page', () => {
    const { render, page } = startServer(App);
    expect(plain(render('/a'))).toBe('<div id="app">url=/a|prop=/a</div>');
    const html = page('/b', { title: 'T' });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<title>T</title>');
    expect(plain(html)).toContain('<div id="app">url=/b|prop=/b</div>');
  });

  it('createHtmlDocument wraps content', () => {
    expect(createHtmlDocument('<p>hi</p>', { lang: 'fr' })).toContain('<html lang="fr">');
  });

  it('collects seo() head during render and carries it back as a marker', async () => {
    const SeoApp = ({ url }: { url: string }) => {
      seo({ title: 'P', description: 'hi', lang: 'fr', canonical: 'https://x' + url });
      const div = createNativeElement('div') as any;
      insert(div, () => 'body', null);
      return div;
    };
    const html = await renderRequestAsync(SeoApp, { url: '/p' });
    const { head, body } = extractHeadMarker(html);
    expect(head).not.toBeNull();
    expect(head!.headHtml).toContain('<title');
    expect(head!.headHtml).toContain('name="description"');
    expect(head!.headHtml).toContain('rel="canonical" href="https://x/p"');
    expect(head!.htmlAttrs).toEqual({ lang: 'fr' });
    expect(body).toContain('body');
  });

  it('keeps each request its own head when renders overlap and seo() runs after an await', async () => {
    // A lazy route calls seo() once its chunk resolves, after the render began. Two requests
    // in flight used to share one module-global registry: the first to finish cleared it and
    // the other lost its title, or wrote it into the wrong response.
    const Late = ({ url }: { url: string }) => {
      const [page] = createResource(() => delay(url === '/slow' ? 30 : 5).then(() => url));
      const div = createNativeElement('div') as any;
      insert(
        div,
        () => {
          const v = page();
          if (v) seo({ title: 'T' + v });
          return v ?? '';
        },
        null,
      );
      return div;
    };
    const [slow, fast] = await Promise.all([
      renderRequestAsync(Late, { url: '/slow' }),
      renderRequestAsync(Late, { url: '/fast' }),
    ]);
    expect(extractHeadMarker(slow).head?.headHtml).toContain('T/slow');
    expect(extractHeadMarker(slow).head?.headHtml).not.toContain('T/fast');
    expect(extractHeadMarker(fast).head?.headHtml).toContain('T/fast');
    expect(extractHeadMarker(fast).head?.headHtml).not.toContain('T/slow');
  });

  it('renderToString with an explicit event', () => {
    const html = renderToString(() => App({ url: '/z' }), { event: { url: '/z' } });
    expect(plain(html)).toBe('<div id="app">url=/z|prop=/z</div>');
  });

  it('renderRequestAsync awaits a data loader (ALS auto-injected on import)', async () => {
    const DataApp = ({ url }: { url: string }) => {
      const [data] = createResource(() => new Promise<string>((r) => setTimeout(() => r(`data:${url}`), 5)));
      const div = createNativeElement('div') as any;
      insert(div, () => data() ?? '…', null);
      return div;
    };
    const html = await renderRequestAsync(DataApp, { url: '/p' });
    expect(plain(html)).toContain('<div>data:/p</div>');
    expect(html).toContain('<script type="application/json" id="__FX_DATA__">'); // serialized for hydration
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
