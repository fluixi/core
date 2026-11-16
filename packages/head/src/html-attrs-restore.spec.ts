// @vitest-environment jsdom
/**
 * `<html>` attributes a page set through seo() (`lang`, `htmlAttrs`) go back to what the document
 * had once the page that set them is gone, as its keyed tags already do.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createRoot, flush } from '@fluixi/reactive/signal';
import { ORIGINAL_ATTR, createHead, mountHead, runWithHead, seo } from './index.js';

beforeEach(() => {
  const root = document.documentElement;
  for (const name of ['lang', 'data-page', ORIGINAL_ATTR]) root.removeAttribute(name);
});

/** A page: its seo() registration lives as long as the root it was made in. */
const page = (head: ReturnType<typeof createHead>, input: Parameters<typeof seo>[0]) =>
  createRoot((dispose) => {
    runWithHead(head, () => seo(input));
    return dispose;
  });

describe('<html> attributes set by a page', () => {
  it('are restored to the template value, or removed, when the page goes', async () => {
    document.documentElement.setAttribute('lang', 'en');
    const head = createHead();
    const stop = mountHead(head);
    const leave = page(head, { lang: 'fr', htmlAttrs: { 'data-page': 'other' } });
    await flush();
    expect(document.documentElement.getAttribute('lang')).toBe('fr');
    expect(document.documentElement.getAttribute('data-page')).toBe('other');

    leave();
    await flush();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(document.documentElement.hasAttribute('data-page')).toBe(false);
    stop();
  });

  it('restore what the server recorded when the first page already set them', async () => {
    // A first load of the French page: the server wrote `fr`, and recorded the template's `en`.
    const root = document.documentElement;
    root.setAttribute('lang', 'fr');
    root.setAttribute(ORIGINAL_ATTR, encodeURIComponent(JSON.stringify({ lang: 'en', 'data-page': null })));
    root.setAttribute('data-page', 'other');
    const head = createHead();
    const leave = page(head, { lang: 'fr', htmlAttrs: { 'data-page': 'other' } });
    const stop = mountHead(head);
    await flush();
    expect(root.getAttribute('lang')).toBe('fr');

    leave();
    page(head, { title: 'home' });
    await flush();
    expect(root.getAttribute('lang')).toBe('en');
    expect(root.hasAttribute('data-page')).toBe(false);
    stop();
  });
});
