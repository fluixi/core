// Points the maps at bundled files instead of each package's own dist.
//
// The packages' builds split every module into its own file, which a bundler reading them never
// notices but a browser resolving a map fetches one by one: about 180 requests for a page that
// imports `@fluixi/core`. One esbuild build over every entry the maps name, with code splitting,
// gives each entry one file and the shared code a few chunks. One build, so state a module keeps
// exists once, whichever map a page loads.
import { build } from 'esbuild';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
const packages = join(here, '..', '..');
const { version } = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));
const LAYERS = ['min', 'templates', 'full'];
/** `https://unpkg.com/@fluixi/dom@<version>/dist/index.mjs` → `dom`, `dist/index.mjs` */
const PACKAGE_URL = /^https:\/\/unpkg\.com\/@fluixi\/([^@/]+)@[^/]+\/(.+)$/;

const maps = Object.fromEntries(LAYERS.map((layer) => [layer, JSON.parse(readFileSync(join(dist, `${layer}.json`), 'utf8')).imports]));

/** Every specifier any map names, by the file its package publishes for it. */
const entries = new Map();
for (const imports of Object.values(maps)) {
  for (const [specifier, url] of Object.entries(imports)) {
    const match = PACKAGE_URL.exec(url);
    if (!match) throw new Error(`bundle: ${specifier} maps to ${url}, not a @fluixi package file`);
    // Already pointed at this package's bundles: the maps come from `mappel`, run it first.
    if (match[1] === 'cdn') throw new Error('bundle: the maps already point at dist/esm; run `mappel` first');
    entries.set(specifier, { url, file: join(packages, match[1], match[2]) });
  }
}

/** `@fluixi/reactive/signal` → `reactive-signal` */
const nameOf = (specifier) => specifier.replace(/^@fluixi\//, '').replace(/\//g, '-');

const out = join(dist, 'esm');
rmSync(out, { recursive: true, force: true });
await build({
  entryPoints: Object.fromEntries([...entries].map(([specifier, { file }]) => [nameOf(specifier), file])),
  outdir: out,
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  minify: true,
  // Production: a page loading these has no bundler to say so, and without it the packages'
  // development code would ship and run.
  define: { __DEV__: 'false', 'process.env.NODE_ENV': '"production"' },
  chunkNames: 'chunk-[hash]',
  banner: { js: `/*! @fluixi/cdn v${version} | (c) 2026 Ibrahima Touré and Fluixi contributors | MIT */` },
  legalComments: 'none',
  logLevel: 'warning',
  // The packages' entries import some of their chunks bare, for order only; those chunks declare
  // and run nothing, which is what each package's `"sideEffects": false` already promises.
  logOverride: { 'ignored-bare-import': 'silent' },
});

const base = `https://unpkg.com/@fluixi/cdn@${version}/dist/esm`;
for (const layer of LAYERS) {
  for (const ext of ['json', 'js']) {
    const file = join(dist, `${layer}.${ext}`);
    let text = readFileSync(file, 'utf8');
    for (const specifier of Object.keys(maps[layer])) {
      text = text.split(entries.get(specifier).url).join(`${base}/${nameOf(specifier)}.js`);
    }
    writeFileSync(file, text);
  }
}
console.log(`bundle: ${entries.size} entries into dist/esm, maps pointed at @fluixi/cdn@${version}`);
