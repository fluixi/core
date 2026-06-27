import { describe, it, expect } from 'vitest';
import { htmlPath, extractLinks } from './commands/prerender.js';
import { resolveConfig } from './config.js';

describe('prerender', () => {
  it('maps a route url to a dist/client file path', () => {
    expect(htmlPath('/')).toBe('index.html');
    expect(htmlPath('/about')).toBe('about/index.html');
    expect(htmlPath('/blog/hello/')).toBe('blog/hello/index.html');
    expect(htmlPath('/x?q=1#h')).toBe('x/index.html');
  });

  it('extracts internal links, skipping files/anchors/external/queries', () => {
    const html = `
      <a href="/">home</a>
      <a href="/about">about</a>
      <a href="/blog/p/">post</a>
      <a href="/app.js">asset</a>
      <a href="#top">anchor</a>
      <a href="https://x.com/ext">ext</a>
      <a href="/search?q=1">query</a>
    `;
    // query-string links are skipped (don't prerender infinite filter combos)
    expect(extractLinks(html).sort()).toEqual(['/', '/about', '/blog/p']);
  });

  it('config: prerender true → crawl from /, object sets routes + crawl', () => {
    expect(resolveConfig({}).prerender).toBe(false);
    expect(resolveConfig({ prerender: true }).prerender).toEqual({ routes: ['/'], crawl: true });
    expect(resolveConfig({ prerender: { routes: ['/a', '/b'], crawl: false } }).prerender).toEqual({
      routes: ['/a', '/b'],
      crawl: false,
    });
  });
});
