import { describe, it, expect } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { createHead, resolveHead, renderHead, runWithHead, seo, setActiveHead, getActiveHead, setHeadScope } from './index.js';
import { jsonld } from './jsonld.js';
import { generateRobots, generateSitemap, generateSitemapIndex } from './sitemap.js';
import { encodeHeadMarker, extractHeadMarker } from './transport.js';
import type { HeadTag } from './types.js';

const meta = (tags: HeadTag[], pred: (a: Record<string, string>) => boolean) =>
  tags.filter((t): t is Extract<HeadTag, { tag: 'meta' }> => t.tag === 'meta' && pred(t.attrs));
const title = (tags: HeadTag[]) => tags.find((t) => t.tag === 'title') as Extract<HeadTag, { tag: 'title' }> | undefined;

describe('resolve + dedupe', () => {
  it('last source wins for singletons (title, description, canonical)', () => {
    const h = createHead();
    h.push({ title: 'A', description: 'da', canonical: 'https://x/a' });
    h.push({ title: 'B', description: 'db', canonical: 'https://x/b' });
    const { tags } = resolveHead(h);
    expect(title(tags)!.children).toBe('B');
    expect(meta(tags, (a) => a.name === 'description')).toHaveLength(1);
    expect(meta(tags, (a) => a.name === 'description')[0].attrs.content).toBe('db');
    expect(tags.filter((t) => t.tag === 'link' && t.attrs.rel === 'canonical')).toHaveLength(1);
  });

  it('applies an inherited titleTemplate to the most specific title', () => {
    const h = createHead();
    h.push({ titleTemplate: '%s · Fluixi' }); // layout
    h.push({ title: 'Docs' }); // page
    expect(title(resolveHead(h).tags)!.children).toBe('Docs · Fluixi');
  });

  it('merges nested layout → page: keeps siteName, overrides type/title, accumulates images', () => {
    const h = createHead();
    h.push({ og: { siteName: 'Site', type: 'website', image: 'https://x/default.png' } });
    h.push({ title: 'Post', og: { type: 'article', title: 'Post', image: 'https://x/post.png' } });
    const { tags } = resolveHead(h);
    expect(meta(tags, (a) => a.property === 'og:site_name')[0].attrs.content).toBe('Site');
    expect(meta(tags, (a) => a.property === 'og:type')[0].attrs.content).toBe('article'); // overridden
    expect(meta(tags, (a) => a.property === 'og:image')).toHaveLength(2); // both accumulate
  });

  it('expands robots object + hreflang alternates', () => {
    const h = createHead();
    h.push({ robots: { index: false, follow: true, maxImagePreview: 'large' }, alternates: [{ hreflang: 'fr', href: 'https://x/fr' }, { hreflang: 'en', href: 'https://x/en' }] });
    const { tags } = resolveHead(h);
    expect(meta(tags, (a) => a.name === 'robots')[0].attrs.content).toBe('noindex, follow, max-image-preview:large');
    expect(tags.filter((t) => t.tag === 'link' && t.attrs.rel === 'alternate')).toHaveLength(2);
  });

  it('lang resolves to an <html> attribute, not a tag', () => {
    const h = createHead();
    h.push({ lang: 'fr' });
    const { tags, htmlAttrs } = resolveHead(h);
    expect(htmlAttrs.lang).toBe('fr');
    expect(tags.find((t) => (t as any).name === 'lang')).toBeUndefined();
  });

  it('seo() registers into the active head', () => {
    const h = createHead();
    runWithHead(h, () => seo({ title: 'Active' }));
    expect(title(resolveHead(h).tags)!.children).toBe('Active');
  });

  it('drops a source when its owner unmounts — client route transitions', () => {
    const h = createHead();
    let dispose!: () => void;
    createRoot((d) => {
      dispose = d;
      runWithHead(h, () => seo({ meta: [{ name: 'robots', content: 'noindex' }] }));
    });
    expect(resolveHead(h).tags.some((t) => t.tag === 'meta')).toBe(true);
    dispose();
    expect(resolveHead(h).tags).toHaveLength(0);
  });
});

describe('SSR serialize', () => {
  it('emits escaped tags with managed markers + html attrs', () => {
    const h = createHead();
    h.push({ lang: 'en', title: 'Hi & <bye>', description: 'd"q', canonical: 'https://x/?a=1&b=2', jsonLd: jsonld.website({ name: 'S', url: 'https://x' }) });
    const { headHtml, htmlAttrs } = renderHead(h);
    expect(htmlAttrs).toEqual({ lang: 'en' });
    expect(headHtml).toContain('<title data-fh>Hi &amp; &lt;bye&gt;</title>');
    expect(headHtml).toContain('name="description" content="d&quot;q" data-fh');
    expect(headHtml).toContain('rel="canonical" href="https://x/?a=1&amp;b=2"');
    expect(headHtml).toContain('<script type="application/ld+json" data-fh');
    expect(headHtml).toContain('"@type":"WebSite"');
  });
});

describe('JSON-LD helpers', () => {
  it('builds website with SearchAction, breadcrumb, faq', () => {
    const site = jsonld.website({ name: 'S', url: 'https://x', searchUrl: 'https://x/s?q=' }) as any;
    expect(site['@type']).toBe('WebSite');
    expect(site.potentialAction['@type']).toBe('SearchAction');
    const bc = jsonld.breadcrumb([{ name: 'Home', url: 'https://x' }, { name: 'Docs', url: 'https://x/docs' }]) as any;
    expect(bc.itemListElement).toHaveLength(2);
    expect(bc.itemListElement[1].position).toBe(2);
    const faq = jsonld.faq([{ question: 'Q?', answer: 'A.' }]) as any;
    expect(faq.mainEntity[0]['@type']).toBe('Question');
  });
});

describe('robots.txt + sitemap.xml', () => {
  it('generates a production robots with rules + sitemap', () => {
    const r = generateRobots({ rules: [{ userAgent: '*', disallow: ['/admin'] }], sitemaps: ['https://x/sitemap.xml'], host: 'https://x' });
    expect(r).toContain('User-agent: *');
    expect(r).toContain('Disallow: /admin');
    expect(r).toContain('Sitemap: https://x/sitemap.xml');
  });
  it('emits disallow-all for non-production', () => {
    expect(generateRobots({ production: false })).toBe('User-agent: *\nDisallow: /\n');
  });
  it('generates a sitemap with lastmod/priority/alternates/images', () => {
    const xml = generateSitemap([
      { loc: 'https://x/', priority: 1, changefreq: 'daily', lastmod: '2026-01-01', alternates: [{ hreflang: 'fr', href: 'https://x/fr' }], images: [{ loc: 'https://x/og.png', title: 'OG' }] },
    ]);
    expect(xml).toContain('<loc>https://x/</loc>');
    expect(xml).toContain('<priority>1.0</priority>');
    expect(xml).toContain('hreflang="fr"');
    expect(xml).toContain('<image:loc>https://x/og.png</image:loc>');
    expect(generateSitemapIndex([{ loc: 'https://x/sitemap-1.xml' }])).toContain('<sitemapindex');
  });
});

describe('head transport (SSR marker)', () => {
  it('round-trips head + html attrs through a body marker', () => {
    const h = createHead();
    h.push({ lang: 'fr', title: 'T', description: 'd' });
    const marker = encodeHeadMarker(renderHead(h));
    const body = `<div id="root">hi</div>`;
    const { head, body: cleaned } = extractHeadMarker(marker + body);
    expect(cleaned).toBe(body); // marker stripped
    expect(head!.htmlAttrs).toEqual({ lang: 'fr' });
    expect(head!.headHtml).toContain('<title');
    expect(head!.headHtml).toContain('name="description"');
  });
  it('emits nothing when no head was used', () => {
    expect(encodeHeadMarker(renderHead(createHead()))).toBe('');
    expect(extractHeadMarker('<div>plain</div>')).toEqual({ head: null, body: '<div>plain</div>' });
  });
});

describe('active registry', () => {
  it('prefers the host scope and falls back to setActiveHead', () => {
    const plain = createHead();
    const scoped = createHead();
    setActiveHead(plain);
    try {
      setHeadScope(() => scoped);
      expect(getActiveHead()).toBe(scoped);
      setHeadScope(() => undefined);
      expect(getActiveHead()).toBe(plain);
    } finally {
      setHeadScope(null);
      setActiveHead(null);
    }
  });

  it('lives on globalThis, so a second copy of the package sees the same registry', () => {
    // What a second copy would do: read the slot by its registered symbol.
    const slot = (globalThis as any)[Symbol.for('fluixi.head')];
    const h = createHead();
    slot.active = h;
    try {
      expect(getActiveHead()).toBe(h);
    } finally {
      slot.active = null;
    }
  });
});
