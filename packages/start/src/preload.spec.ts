/**
 * Which files a URL needs, and what the document does with them.
 *
 * The failure mode worth testing is silence: a miss here does not throw, it just
 * preloads nothing, and a page that is merely slower looks exactly like a page that is
 * correct. So these pin the lookup on both sides — that a match finds its files, and
 * that the cases which should find none actually find none.
 */
import { describe, it, expect } from 'vitest';
import { createPreloader } from './preload.js';
import { injectPreload } from './document.js';

// URL pattern → files, as `fluixi build` writes it: each route's layouts are already
// folded in, so a lookup is one map access and no union.
const assets = {
  '/': ['/assets/index-a.js'],
  '/about': ['/assets/about-b.js', '/assets/about-b.css'],
  '/blog/:id': ['/assets/blog-layout-c.js', '/assets/blog-id-e.js', '/assets/shared-d.css'],
};

describe('createPreloader', () => {
  it('finds the files for a matched route', () => {
    expect(createPreloader(assets)('/about')).toEqual(['/assets/about-b.js', '/assets/about-b.css']);
  });

  it('matches a dynamic segment the way the router does', () => {
    // A string compare would miss this, and preloading nothing is invisible — which is
    // why matching goes through the router rather than being reimplemented here.
    expect(createPreloader(assets)('/blog/hello')).toContain('/assets/blog-id-e.js');
  });

  it('carries the layers the build folded in', () => {
    const files = createPreloader(assets)('/blog/hello');
    expect(files).toContain('/assets/blog-layout-c.js');
    expect(files).toContain('/assets/shared-d.css');
  });

  it('finds nothing for a path that matches no route', () => {
    expect(createPreloader(assets)('/nope')).toEqual([]);
  });

  it('is inert without a map', () => {
    // An app with no file routes, or a build from before any of this existed.
    expect(createPreloader(undefined)('/about')).toEqual([]);
    expect(createPreloader({})('/about')).toEqual([]);
  });
});

describe('injectPreload', () => {
  const template = '<html><head><title>t</title></head><body><div id="root"></div></body></html>';

  it('preloads a chunk as a module and links a stylesheet', () => {
    const out = injectPreload(template, ['/assets/about-b.js', '/assets/about-b.css']);

    // `modulepreload` fetches the chunk's own static imports too; a stylesheet has to be
    // a real link or it never applies.
    expect(out).toContain('<link rel="modulepreload" href="/assets/about-b.js">');
    expect(out).toContain('<link rel="stylesheet" href="/assets/about-b.css">');
    expect(out.indexOf('<link')).toBeLessThan(out.indexOf('</head>'));
  });

  it('leaves a file the template already references alone', () => {
    // The entry chunk is in the shell from the client build; preloading it again only
    // competes with the request already in flight.
    const withEntry = template.replace('</head>', '<script src="/assets/entry.js"></script></head>');
    expect(injectPreload(withEntry, ['/assets/entry.js'])).toBe(withEntry);
  });

  it('returns the template untouched when there is nothing to add', () => {
    expect(injectPreload(template, [])).toBe(template);
  });

  it('leaves a fragment with no head alone', () => {
    const fragment = '<div id="root"></div>';
    expect(injectPreload(fragment, ['/assets/about-b.js'])).toBe(fragment);
  });
});
