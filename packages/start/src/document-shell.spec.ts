import { describe, expect, it } from 'vitest';
import { createComponent, createDynamicElement } from '@fluixi/dom';
import { Head, Html, Main, Scripts, renderDocument, type DocumentProps } from './document-shell.js';

const assets = { scripts: ['/assets/entry-a1.js'], styles: ['/assets/entry-b2.css'], preloads: ['/assets/chunk-c3.js'] };
const request = new Request('http://localhost/fr/about?x=1');

/** The document an app writes, as the compiler would call it. */
function Document(props: DocumentProps) {
  return createComponent(Html as never, {
    lang: props.url.pathname.split('/')[1],
    get children() {
      return [
        createComponent(Head as never, {
          get children() {
            return createDynamicElement('meta', { charset: 'utf-8' });
          },
        }),
        createDynamicElement('body', {
          get children() {
            return [createComponent(Main as never, {}), createComponent(Scripts as never, {})];
          },
        }),
      ];
    },
  });
}

describe('renderDocument', () => {
  it('renders the page template: the shell, the empty mount, the assets', () => {
    const html = renderDocument(Document, { request, mountId: 'root', assets, file: 'src/document.tsx' });
    expect(html).toBe(
      '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">' +
        '<link rel="stylesheet" crossorigin="" href="/assets/entry-b2.css">' +
        '<link rel="modulepreload" crossorigin="" href="/assets/chunk-c3.js"></head>' +
        '<body><div id="root"></div><script type="module" crossorigin="" src="/assets/entry-a1.js"></script></body></html>',
    );
  });

  it('puts inline scripts first in the head, unescaped', () => {
    const html = renderDocument(Document, { request, mountId: 'root', assets: { ...assets, inline: ['for(var i=0;i<2;i++){}'] }, file: 'src/document.tsx' });
    expect(html).toContain('<head><script>for(var i=0;i<2;i++){}</script><meta charset="utf-8">');
  });

  it('names the file when the document has no Main', () => {
    const Bare = () => createComponent(Html as never, { get children() { return createDynamicElement('body', {}); } });
    expect(() => renderDocument(Bare, { request, mountId: 'root', assets, file: 'src/document.tsx' })).toThrow(
      'src/document.tsx renders no <Main />',
    );
  });

  it('refuses a part used outside the document', () => {
    expect(() => Main()).toThrow('<Main /> renders only in the document component');
  });
});
