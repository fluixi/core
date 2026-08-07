// Bin-independent SSG build (the fluixi bin isn't linked in fresh CI/Cloudflare installs).
import { loadConfig, build } from '@fluixi/start';
import { generateSitemap } from '@fluixi/start/head';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

await build(await loadConfig());

// Generate sitemap.xml from the prerendered pages (each route lands at <path>/index.html), with
// en/fr hreflang alternates per doc. Keeps the sitemap in lockstep with whatever was crawled —
// no hand-maintained URL list. Canonical (no trailing slash) matches the in-app links + seo().
const SITE = 'https://docs.fluixi.com';
const clientDir = 'dist/client';

function pages(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) pages(p, acc);
    else if (name === 'index.html') acc.push(relative(clientDir, dir).split('\\').join('/'));
  }
  return acc;
}

const entries = pages(clientDir).map((path) => {
  const loc = path === '' ? `${SITE}/` : `${SITE}/${path}`;
  const m = path.match(/^(v\d+)\/(en|fr)\/(.+)$/);
  const alternates = m
    ? [
        { hreflang: 'en', href: `${SITE}/${m[1]}/en/${m[3]}` },
        { hreflang: 'fr', href: `${SITE}/${m[1]}/fr/${m[3]}` },
        { hreflang: 'x-default', href: `${SITE}/${m[1]}/en/${m[3]}` },
      ]
    : undefined;
  return { loc, changefreq: 'weekly', priority: path === '' ? 1 : 0.8, ...(alternates ? { alternates } : {}) };
});

writeFileSync(join(clientDir, 'sitemap.xml'), generateSitemap(entries));
console.log(`  ✓ sitemap.xml (${entries.length} urls)`);

// Search index — built from the markdown sources, written as its own asset.
//
// Deliberately NOT imported by the app: the page chunk already carries more than it should,
// and the index is only needed once someone opens search. It is fetched on first open and
// cached for the session.
//
// One record per page, with the headings kept separate so a heading match can outrank a body
// match, and the body flattened to plain text — code fences included, since "how do I write
// bind:value" is a real query and the answer is in a code block.
const contentDir = 'src/content';

function markdownFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) markdownFiles(p, acc);
    else if (name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

const index = markdownFiles(contentDir).map((file) => {
  const md = readFileSync(file, 'utf8');
  const [, version, lang, slug] = file.split(/[/\\]/).slice(-3).join('/').match(/^([^/]+)\/([^/]+)\/(.+)\.md$/) ?? [];
  const headings = [...md.matchAll(/^#{1,3}\s+(.+)$/gm)].map((m) => m[1].trim());
  const body = md
    .replace(/^#{1,6}\s+.+$/gm, ' ')      // headings are indexed separately
    .replace(/```/g, ' ')                 // keep code text, drop the fences
    .replace(/[*_>`|#\[\]()]/g, ' ')       // markdown punctuation carries no meaning here
    .replace(/\s+/g, ' ')
    .trim();
  return { v: version, l: lang, s: slug, t: headings[0] ?? slug, h: headings.slice(1), b: body };
}).filter((r) => r.s);

writeFileSync(join(clientDir, 'search-index.json'), JSON.stringify(index));
const kb = (JSON.stringify(index).length / 1024).toFixed(0);
console.log(`  ✓ search-index.json (${index.length} pages, ${kb} KB)`);
