import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import type { FluixiConfig } from '../config.js';
import { resolveConfig } from '../config.js';
import { createProdHandler } from '../adapter.js';
import { step, done, c } from '../ui.js';

// dist/client path for a route url: '/' → index.html, '/about' → about/index.html
export function htmlPath(url: string): string {
  const clean = url.split(/[?#]/)[0].replace(/\/+$/, '');
  return clean === '' ? 'index.html' : `${clean.replace(/^\//, '')}/index.html`;
}

// internal links from rendered HTML: skip files (.js/.css/…), anchors, queries, external
export function extractLinks(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/href=["'](\/[^"'#?]*)["']/g)) {
    const href = m[1];
    if (/\.[a-z0-9]+$/i.test(href)) continue;
    out.add(href.replace(/\/+$/, '') || '/');
  }
  return [...out];
}

const norm = (u: string) => {
  const p = (u.startsWith('/') ? u : '/' + u).replace(/\/+$/, '');
  return p || '/';
};

/**
 * Render routes to static HTML in dist/client, via the real prod handler, so each page is
 * byte-identical to what `fluixi start` would serve (assets, __FX_DATA__, hydration), it just
 * lives on disk. Seeds from `prerender.routes` (default `/`) and, when `crawl`, follows internal
 * links. Returns the written route paths.
 */
export async function prerender(config: FluixiConfig = {}): Promise<string[]> {
  const cfg = resolveConfig(config);
  if (!cfg.prerender) return [];
  if (!cfg.ssr) {
    process.stdout.write(`  ${c.yellow('!')} prerender needs ssr:true — skipped\n`);
    return [];
  }

  step('prerender');
  const clientDir = resolve(cfg.root, 'dist/client');
  const handler = await createProdHandler(config);
  const { routes, crawl } = cfg.prerender;

  const queue = routes.map(norm);
  const seen = new Set<string>();
  const written: string[] = [];

  while (queue.length) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);

    let html: string;
    try {
      const res = await handler(new Request('http://prerender.local' + url));
      if (!res.ok) {
        process.stdout.write(`    ${c.yellow('skip')} ${url} ${c.gray('→ ' + res.status)}\n`);
        continue;
      }
      if (!(res.headers.get('content-type') || '').includes('html')) continue;
      html = await res.text();
    } catch (e) {
      process.stdout.write(`    ${c.yellow('skip')} ${url} ${c.gray('→ ' + (e as Error).message)}\n`);
      continue;
    }

    const file = join(clientDir, htmlPath(url));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html);
    written.push(url);

    if (crawl) for (const link of extractLinks(html)) if (!seen.has(link)) queue.push(link);
  }

  done(`${c.bold('prerendered')} ${c.bold(String(written.length))} page(s)  ${c.gray('→ dist/client')}\n`);
  return written;
}
