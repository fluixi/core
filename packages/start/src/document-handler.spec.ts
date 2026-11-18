import { describe, expect, it } from 'vitest';
import { createComponent, createDynamicElement, getRequestLocals } from '@fluixi/dom';
import { createHandlerFrom } from './handler-core.js';
import { documentVitePlugin, DOCUMENT_EXPORT, RENDER_DOCUMENT_EXPORT } from './document-plugin.js';
import { Head, Html, Main, Scripts, renderDocument, type DocumentProps } from './document-shell.js';

const assets = { scripts: ['/assets/entry.js'], styles: [], preloads: [] };

function Document(props: DocumentProps) {
  return createComponent(Html as never, {
    lang: (props.locals as { locale?: string }).locale ?? 'en',
    get children() {
      return [
        createComponent(Head as never, {}),
        createDynamicElement('body', {
          get children() {
            return [createComponent(Main as never, {}), createComponent(Scripts as never, {})];
          },
        }),
      ];
    },
  });
}

describe('a document component in the production handler', () => {
  const mod = {
    render: (url: string) => `<p>${url}</p>`,
    [DOCUMENT_EXPORT]: Document,
    [RENDER_DOCUMENT_EXPORT]: renderDocument,
  };

  it('renders the page into the document, per request', async () => {
    const handler = createHandlerFrom({
      template: '',
      mod: mod as never,
      cfg: { ssr: true, mountId: 'root' },
      document: { assets, file: 'src/document.tsx' },
    });
    const html = await (await handler(new Request('http://x/hello'))).text();
    expect(html).toMatch(/^<!DOCTYPE html><html lang="en"><head><\/head><body><div id="root"[^>]*><p>\/hello<\/p><\/div>/);
    expect(html).toContain('<script type="module" crossorigin="" src="/assets/entry.js"></script></body></html>');
  });

  it('gives the document what middleware put on the locals', async () => {
    const handler = createHandlerFrom({
      template: '',
      mod: mod as never,
      cfg: { ssr: true, mountId: 'root' },
      document: { assets, file: 'src/document.tsx' },
    });
    const request = new Request('http://x/');
    (getRequestLocals(request) as { locale?: string }).locale = 'fr';
    expect(await (await handler(request)).text()).toContain('<html lang="fr">');
  });

  it('uses index.html when the build wrote no document assets', async () => {
    const handler = createHandlerFrom({
      template: '<html><body><div id="root"></div></body></html>',
      mod: mod as never,
      cfg: { ssr: true, mountId: 'root' },
    });
    expect(await (await handler(new Request('http://x/a'))).text()).toContain('<body><div id="root"');
  });

  it('answers 500 when the document fails', async () => {
    const handler = createHandlerFrom({
      template: '',
      mod: { ...mod, [DOCUMENT_EXPORT]: () => { throw new Error('shell broke'); } } as never,
      cfg: { ssr: true, mountId: 'root' },
      document: { assets, file: 'src/document.tsx' },
    });
    expect((await handler(new Request('http://x/'))).status).toBe(500);
  });
});

describe('the document plugin', () => {
  const plugin = documentVitePlugin({ root: '/app', serverEntry: 'src/entry-server.ts', document: 'src/document.tsx' });

  it('re-exports the document and its renderer from the server entry', () => {
    const out = plugin.transform('export const render = 1;', '/app/src/entry-server.ts', { ssr: true });
    expect(out.code).toContain(`export { default as ${DOCUMENT_EXPORT} } from "/app/src/document.tsx";`);
    expect(out.code).toContain(`export { renderDocument as ${RENDER_DOCUMENT_EXPORT} } from '@fluixi/start/document';`);
  });

  it('leaves the client build and an app without a document alone', () => {
    expect(plugin.transform('x', '/app/src/entry-server.ts', { ssr: false })).toBeNull();
    const none = documentVitePlugin({ root: '/app', serverEntry: 'src/entry-server.ts', document: null });
    expect(none.transform('x', '/app/src/entry-server.ts', { ssr: true })).toBeNull();
  });
});
