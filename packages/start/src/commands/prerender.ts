import { writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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

// internal links from rendered HTML: skip files (.js/.css/...), anchors, queries, external
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
  /** Every internal link a written page holds, with the first page that holds it. */
  const linkedFrom = new Map<string, string>();

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

    for (const link of extractLinks(html)) {
      if (!linkedFrom.has(link)) linkedFrom.set(link, url);
      if (crawl && !seen.has(link)) queue.push(link);
    }
  }

  done(`${c.bold('prerendered')} ${c.bold(String(written.length))} page(s)  ${c.gray('→ dist/client')}\n`);
  if (cfg.prerender.static) {
    for (const line of await staticProblems(cfg.root, written, linkedFrom)) {
      process.stdout.write(`    ${c.yellow('!')} ${line}\n`);
    }
  }
  return written;
}

async function jsFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await jsFiles(path)));
    else if (entry.name.endsWith('.js')) out.push(path);
  }
  return out;
}

/** Whether a concrete path matches a route pattern (`/blog/:slug`, `/files/*`). */
export function matchesPattern(pattern: string, path: string): boolean {
  const p = pattern.split('/').filter(Boolean);
  const u = path.split('/').filter(Boolean);
  for (let i = 0; i < p.length; i++) {
    if (p[i]!.startsWith('*')) return true;
    if (i >= u.length) return false;
    if (!p[i]!.startsWith(':') && p[i] !== u[i]) return false;
  }
  return p.length === u.length;
}

/**
 * What fails on a static host, for a site built with `prerender: { static: true }`:
 * links to pages that were not written (no file to serve), and pages whose code calls a
 * server function (the request goes to a server that is not there, on the first client
 * navigation to them). A server function is found by its id: every one the server bundle
 * registers is a `"<hash>:<n>"` literal there, and its client stub carries the same one (a minifier may
 * quote it with backticks).
 */
export async function staticProblems(root: string, written: string[], linkedFrom: Map<string, string>): Promise<string[]> {
  const out: string[] = [];
  const pages = new Set(written);
  for (const [link, from] of linkedFrom) {
    if (!pages.has(link)) out.push(`${from} links to ${link}, which was not prerendered: a static host has no page there. Add it to prerender.routes, or deploy the server.`);
  }

  const serverDir = resolve(root, 'dist/server');
  const assetsFile = join(serverDir, 'route-assets.json');
  if (!existsSync(serverDir) || !existsSync(assetsFile)) return out;
  const ids = new Set<string>();
  for (const file of await jsFiles(serverDir)) {
    for (const m of (await readFile(file, 'utf-8')).matchAll(/["'`]([0-9a-f]{1,8}:\d+)["'`]/g)) ids.add(m[1]!);
  }
  if (!ids.size) return out;
  const assets: Record<string, string[]> = JSON.parse(await readFile(assetsFile, 'utf-8'));
  const clientDir = resolve(root, 'dist/client');
  for (const [pattern, files] of Object.entries(assets)) {
    if (!written.some((page) => matchesPattern(pattern, page))) continue;
    for (const file of files) {
      const path = join(clientDir, file.replace(/^\//, ''));
      if (!file.endsWith('.js') || !existsSync(path)) continue;
      const code = await readFile(path, 'utf-8');
      const id = [...code.matchAll(/["'`]([0-9a-f]{1,8}:\d+)["'`]/g)].map((m) => m[1]!).find((x) => ids.has(x));
      if (id) {
        out.push(`${pattern} calls a server function (${file}): on a static host it fails when reached by client navigation. Load its data another way, or deploy the server.`);
        break;
      }
    }
  }
  return out;
}
