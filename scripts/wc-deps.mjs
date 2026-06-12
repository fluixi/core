#!/usr/bin/env node
/**
 * Switch this repo's dependencies on the sibling fluixi-webcomponents packages
 * (@fluixi/flx-*, @fluixi/components, @fluixi/helpers, ...) between local links
 * (to pick up local webcomponents changes) and their published "*" spec.
 *
 * Usage:
 *   node scripts/wc-deps.mjs              -> interactive menu
 *   node scripts/wc-deps.mjs local        -> link: <relative path to fluixi-webcomponents>
 *   node scripts/wc-deps.mjs published    -> "*"
 *
 * Webcomponents packages are auto-discovered from ../fluixi-webcomponents, and any
 * dependency/devDependency in this repo's packages whose name matches one is
 * switched. After switching, run `pnpm install` (and rebuild @fluixi/webui, which
 * bundles the webcomponents at build time).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..'); // fluixi-core
const wcRoot = resolve(repoRoot, '..', 'fluixi-webcomponents');
const PUBLISHED = '*';

if (!existsSync(wcRoot)) {
  console.error(`fluixi-webcomponents not found at ${wcRoot}`);
  process.exit(1);
}

/** Recursively find package.json files (skipping node_modules/dist). */
function findPackageJsons(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    const pj = join(full, 'package.json');
    if (existsSync(pj)) out.push(pj);
    findPackageJsons(full, out);
  }
  return out;
}

/** Map of webcomponents package name -> absolute dir. */
const wcPackages = {};
for (const pj of findPackageJsons(join(wcRoot, 'packages'))) {
  try {
    const name = JSON.parse(readFileSync(pj, 'utf8')).name;
    if (name) wcPackages[name] = dirname(pj);
  } catch {}
}
const wcNames = new Set(Object.keys(wcPackages));

async function resolveMode() {
  const arg = process.argv[2];
  if (arg === 'local' || arg === 'published') return arg;
  const rl = createInterface({ input, output });
  console.log('Switch fluixi-webcomponents deps:\n  1) local    (link: to ../fluixi-webcomponents)\n  2) published (*)');
  const ans = (await rl.question('Choose [1/2]: ')).trim();
  rl.close();
  return ans === '1' || ans.toLowerCase() === 'local' ? 'local' : 'published';
}

const mode = await resolveMode();

let changedFiles = 0;
let changedDeps = 0;
for (const pj of findPackageJsons(join(repoRoot, 'packages'))) {
  const pkg = JSON.parse(readFileSync(pj, 'utf8'));
  const pkgDir = dirname(pj);
  let touched = false;
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const name of Object.keys(deps)) {
      if (!wcNames.has(name)) continue;
      const next =
        mode === 'local'
          ? `link:${relative(pkgDir, wcPackages[name]).split('\\').join('/')}`
          : PUBLISHED;
      if (deps[name] !== next) {
        deps[name] = next;
        changedDeps++;
        touched = true;
      }
    }
  }
  if (touched) {
    writeFileSync(pj, JSON.stringify(pkg, null, 2) + '\n');
    changedFiles++;
    console.log(`  ${relative(repoRoot, pj)}`);
  }
}

console.log(
  `\n${mode}: updated ${changedDeps} dep(s) in ${changedFiles} file(s).` +
    (changedDeps ? '\nRun `pnpm install` (and rebuild @fluixi/webui) to apply.' : '')
);
