/**
 * When a page's head replaces `<html>` attributes in the server's document, the template's own
 * values are recorded on `<html>`, so the browser can restore them when the page goes.
 */
import { describe, it, expect } from 'vitest';
import { encodeHeadMarker, ORIGINAL_ATTR, readOriginalHtmlAttrs } from '@fluixi/head';
import { injectAppAndHead } from './document.js';

const template = '<!doctype html><html lang="en"><head><title>App</title></head><body><div id="root"></div></body></html>';
const originalOf = (html: string) => readOriginalHtmlAttrs(new RegExp(`${ORIGINAL_ATTR}="([^"]*)"`).exec(html)?.[1] ?? null);

describe('<html> attributes from the head', () => {
  it('records what the template had for each one replaced', () => {
    const marker = encodeHeadMarker({ headHtml: '', htmlAttrs: { lang: 'fr', 'data-page': 'other' } });
    const html = injectAppAndHead(template, `${marker}<p>page</p>`);
    expect(html).toMatch(/<html[^>]*\slang="fr"/);
    expect(html).toMatch(/<html[^>]*\sdata-page="other"/);
    expect(originalOf(html)).toEqual({ lang: 'en', 'data-page': null });
  });

  it('adds nothing when the head sets no <html> attribute', () => {
    const marker = encodeHeadMarker({ headHtml: '<title>Page</title>', htmlAttrs: {} });
    expect(injectAppAndHead(template, `${marker}<p>page</p>`)).not.toContain(ORIGINAL_ATTR);
  });
});
