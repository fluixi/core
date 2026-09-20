// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createSignal, flush } from '@fluixi/reactive/signal';
import { createHead, mountHead, renderHead, runWithHead, seo } from './index.js';

beforeEach(() => {
  document.head.innerHTML = '';
  document.title = '';
  document.documentElement.removeAttribute('lang');
});

describe('client reconcile (reactive)', () => {
  it('updates document.title, meta and <html lang> live on signal change', async () => {
    const [title, setTitle] = createSignal('A');
    const [desc, setDesc] = createSignal('first');
    const h = createHead();
    runWithHead(h, () => {
      seo(() => ({ lang: 'en', title: title(), description: desc(), canonical: 'https://x/a' }));
    });

    const dispose = mountHead(h);
    await flush();

    expect(document.title).toBe('A');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(document.head.querySelector('meta[name="description"]')!.getAttribute('content')).toBe('first');
    expect(document.head.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('https://x/a');

    setTitle('B');
    setDesc('second');
    await flush();

    expect(document.title).toBe('B');
    expect(document.head.querySelector('meta[name="description"]')!.getAttribute('content')).toBe('second');
    // still exactly one (updated in place, not duplicated)
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);

    dispose();
  });

  it('reuses server-rendered tags by key — no duplication on hydration', async () => {
    const h = createHead();
    runWithHead(h, () => seo({ title: 'Page', description: 'd', canonical: 'https://x/p', og: { image: 'https://x/og.png' } }));

    // Simulate SSR: inject the rendered head into the document (as the server would).
    const { headHtml } = renderHead(h);
    document.head.insertAdjacentHTML('beforeend', headHtml);
    document.title = 'Page';
    const beforeMetas = document.head.querySelectorAll('meta').length;

    // Hydrate with the same registry: must adopt existing tags, not append clones.
    const dispose = mountHead(h);
    await flush();

    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[property="og:image"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta').length).toBe(beforeMetas); // no net additions
    dispose();
  });

  it('removes a tag when it disappears from the reactive output', async () => {
    const [show, setShow] = createSignal(true);
    const h = createHead();
    runWithHead(h, () => seo(() => (show() ? { meta: [{ name: 'robots', content: 'noindex' }] } : {})));
    const dispose = mountHead(h);
    await flush();
    expect(document.head.querySelector('meta[name="robots"]')).not.toBeNull();
    setShow(false);
    await flush();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    dispose();
  });
});
