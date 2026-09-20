// Bin-independent SSG build (the fluixi bin isn't linked in fresh CI/Cloudflare installs).
import { loadConfig } from '@fluixi/start/config';
import { build } from '@fluixi/start/commands';
import { generateSitemap } from '@fluixi/start/head';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
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

// search-index.json is generated into `public/` by the prestep in package.json, so
// the dev server and the build serve the same asset; the build copies it from there.
