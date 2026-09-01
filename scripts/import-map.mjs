#!/usr/bin/env node
// Generate the import map a plain <script type="module"> page needs to load the
// framework without a bundler.
//
//   node scripts/import-map.mjs --layer min        core + dom + utils, and their closure
//   node scripts/import-map.mjs --layer templates  adds compiling html`` in the page
//   node scripts/import-map.mjs --layer full       everything a browser can use
//   node scripts/import-map.mjs --layer min --target local --html
//
// A browser resolves bare specifiers only through this map, and it does not walk
// package.json, so every transitive subpath has to be listed — including the ones
// a component reaches through its own dependencies.

import { readFileSync, existsSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

// What a page imports to build something by hand. `@fluixi/core` re-exports the
// common surface of both layers, so one specifier covers most of it — the rest of
// these entries are the graph behind it. `jsx` is absent on purpose: it is the
// runtime that compiled output calls, and nothing compiles in a script-tag page.
const MIN = ['@fluixi/core', '@fluixi/dom', '@fluixi/utils'];

// Compiling html`` in the page, on top of the minimum.
const TEMPLATES = ['@fluixi/template-runtime'];

// Everything a browser can use. The node-only packages — start, cli, server,
// vite-plugin, ts-plugin, the compiler's root entry — are not here.
const FULL = [...MIN, ...TEMPLATES, '@fluixi/router', '@fluixi/head', '@fluixi/reactive'];

const options = {
  packages: (flag('packages', '') || '').split(',').map((s) => s.trim()).filter(Boolean),
  layer: flag('layer', 'min'),
  target: flag('target', 'cdn'), // cdn | local
  cdn: flag('cdn', 'https://unpkg.com'),
  // loader: the .css.js sibling injects a <link>, so importing a component still
  // brings its styles. link: map the css away and emit <link> tags to paste.
  // none: map it away and take care of styles yourself.
  css: flag('css', 'loader'),
  out: flag('out', null),
  html: has('html'),
};

const manifestCache = new Map();
function manifest(dir) {
  if (!manifestCache.has(dir)) {
    manifestCache.set(dir, JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')));
  }
  return manifestCache.get(dir);
}

/** Where a package lives: a workspace folder first, then node_modules. */
function packageDir(name) {
  const local = join(ROOT, 'packages', name.replace(/^@fluixi\//, ''));
  if (name.startsWith('@fluixi/') && existsSync(join(local, 'package.json'))) return local;
  const installed = join(ROOT, 'node_modules', name);
  if (existsSync(join(installed, 'package.json'))) return installed;
  // pnpm keeps the real copies under .pnpm/<name>@<version>/node_modules/<name>,
  // and a package only appears at the top level if something depends on it directly.
  const store = join(ROOT, 'node_modules', '.pnpm');
  if (existsSync(store)) {
    const prefix = name.replace('/', '+') + '@';
    const matches = readdirSync(store)
      .filter((d) => d.startsWith(prefix))
      .sort()
      .reverse();
    for (const dir of matches) {
      const real = join(store, dir, 'node_modules', name);
      if (existsSync(join(real, 'package.json'))) return real;
    }
  }
  return null;
}

function splitSpecifier(spec) {
  const parts = spec.split('/');
  const pkg = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const sub = spec.length > pkg.length ? '.' + spec.slice(pkg.length) : '.';
  return { pkg, sub };
}

/**
 * Follow an exports entry to something a browser can fetch. Conditions nest —
 * `{ import: { types, default } }` is as common as `{ import: './x.js' }` — so
 * this recurses rather than handing back an object.
 */
function pickTarget(entry) {
  if (typeof entry === 'string') return entry;
  if (Array.isArray(entry)) {
    for (const alt of entry) {
      const found = pickTarget(alt);
      if (found) return found;
    }
    return null;
  }
  if (entry && typeof entry === 'object') {
    // Never the source condition: it is TypeScript, and only the workspace uses it.
    for (const key of ['browser', 'import', 'default', 'require']) {
      if (entry[key] === undefined) continue;
      const found = pickTarget(entry[key]);
      if (found) return found;
    }
  }
  return null;
}

function resolveExport(dir, sub) {
  const m = manifest(dir);
  const exp = m.exports;
  if (!exp) return sub === '.' ? m.module || m.main || null : null;
  // `exports` is either a map of subpaths or, when no key starts with '.', a bare
  // set of conditions that IS the root entry — `{ import, require, types }`.
  const isSubpathMap = Object.keys(exp).some((k) => k.startsWith('.'));
  if (!isSubpathMap) return sub === '.' ? pickTarget(exp) : null;
  if (exp[sub] !== undefined) return pickTarget(exp[sub]);
  // one wildcard level, which is how ./css/* and ./lib/* are written
  for (const [pattern, entry] of Object.entries(exp)) {
    if (!pattern.includes('*')) continue;
    const [before, after] = pattern.split('*');
    if (sub.startsWith(before) && sub.endsWith(after)) {
      const filled = sub.slice(before.length, sub.length - (after.length || 0));
      const target = pickTarget(entry);
      if (target) return target.replace('*', filled);
    }
  }
  return null;
}

const IMPORT_RE = /(?:from|import)\s*["']([^"']+)["']/g;

function scanImports(file) {
  const found = [];
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    return found;
  }
  for (const [, spec] of src.matchAll(IMPORT_RE)) {
    // Doc comments quote specifiers too; a real one has no whitespace or ${}.
    if (/\s|\$\{/.test(spec)) continue;
    found.push(spec);
  }
  return found;
}

const imports = {};
const stylesheets = new Set();
const unresolved = new Set();
const visited = new Set();

function urlFor(name, dir, target) {
  const clean = target.replace(/^\.\//, '');
  if (options.target === 'local') {
    return '/' + relative(ROOT, join(dir, clean)).split('\\').join('/');
  }
  return `${options.cdn}/${name}@${manifest(dir).version}/${clean}`;
}

function addSpecifier(spec) {
  if (visited.has(spec)) return;
  visited.add(spec);

  const { pkg, sub } = splitSpecifier(spec);
  const dir = packageDir(pkg);
  if (!dir) {
    unresolved.add(spec);
    return;
  }

  if (spec.endsWith('.css')) {
    const target = resolveExport(dir, sub);
    if (!target) {
      unresolved.add(spec);
      return;
    }
    stylesheets.add(urlFor(pkg, dir, target));
    imports[spec] =
      options.css === 'loader'
        ? urlFor(pkg, dir, target + '.js')
        : // An empty module: the specifier resolves, and importing it does nothing.
          'data:text/javascript,';
    return;
  }

  const target = resolveExport(dir, sub);
  if (!target) {
    unresolved.add(spec);
    return;
  }
  imports[spec] = urlFor(pkg, dir, target);

  // Walk the package's own file graph so nested bare specifiers are covered.
  const entryFile = join(dir, target.replace(/^\.\//, ''));
  const seen = new Set();
  const stack = [entryFile];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    for (const nested of scanImports(file)) {
      if (nested.startsWith('.')) {
        const next = normalize(join(dirname(file), nested));
        stack.push(existsSync(next) ? next : next + '.js');
      } else if (!nested.startsWith('node:')) {
        addSpecifier(nested);
      }
    }
  }
}

function collect(specifiers) {
  for (const key of Object.keys(imports)) delete imports[key];
  visited.clear();
  stylesheets.clear();
  for (const name of specifiers) addSpecifier(name);
  return { ...imports };
}

if (options.packages.length > 0) {
  collect(options.packages);
} else if (options.layer === 'templates') {
  // The minimum is its own file; a page loads both, so leave out what it covers.
  const min = new Set(Object.keys(collect(MIN)));
  collect(TEMPLATES);
  for (const key of Object.keys(imports)) {
    if (min.has(key)) delete imports[key];
  }
} else if (options.layer === 'full') {
  collect(FULL);
} else {
  collect(MIN);
}

const map = { imports: Object.fromEntries(Object.entries(imports).sort(([a], [b]) => a.localeCompare(b))) };
const json = JSON.stringify(map, null, 2);

if (options.out) {
  writeFileSync(options.out, json + '\n');
  process.stderr.write(`wrote ${options.out} — ${Object.keys(map.imports).length} entries\n`);
} else if (options.html) {
  const links =
    options.css === 'link'
      ? [...stylesheets].sort().map((href) => `<link rel="stylesheet" href="${href}" />`).join('\n')
      : '';
  process.stdout.write(`<script type="importmap">\n${json}\n</script>\n${links ? links + '\n' : ''}`);
} else {
  process.stdout.write(json + '\n');
}

if (unresolved.size) {
  process.stderr.write(`\nnot in the map (check they are installed):\n`);
  for (const u of [...unresolved].sort()) process.stderr.write(`  ${u}\n`);
}
