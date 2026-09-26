/**
 * Check that what a package exports in the workspace is what it will export on npm.
 *
 *   node scripts/check-exports.mjs          # after a build
 *
 * `publishConfig.exports` replaces `exports` in the tarball, so a subpath added to one and
 * not the other works in every workspace test and is missing for every install. It has
 * happened to six subpaths across four packages. Two checks, both on built output:
 *
 * - the two maps name the same subpaths
 * - every file a published condition points at exists
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const problems = [];

/** Every file path in an exports entry, skipping `development` (source, never published). */
function targets(entry, out = []) {
  if (typeof entry === 'string') out.push(entry);
  else if (entry && typeof entry === 'object') {
    for (const [condition, value] of Object.entries(entry)) {
      if (condition !== 'development') targets(value, out);
    }
  }
  return out;
}

for (const dir of readdirSync(join(root, 'packages'))) {
  const file = join(root, 'packages', dir, 'package.json');
  if (!existsSync(file)) continue;
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  const published = pkg.publishConfig?.exports;
  if (pkg.private || !published || !pkg.exports) continue;

  const local = Object.keys(pkg.exports);
  const shipped = Object.keys(published);
  for (const key of local.filter((k) => !shipped.includes(k))) {
    problems.push(`${pkg.name}: ${key} is exported but missing from publishConfig.exports`);
  }
  for (const key of shipped.filter((k) => !local.includes(k))) {
    problems.push(`${pkg.name}: ${key} is in publishConfig.exports but not exported locally`);
  }
  for (const [key, entry] of Object.entries(published)) {
    for (const target of targets(entry)) {
      if (target.includes('*')) continue;
      if (!existsSync(join(root, 'packages', dir, target))) {
        problems.push(`${pkg.name}: ${key} points at ${target}, which the build did not produce`);
      }
    }
  }
}

if (problems.length) {
  console.error(problems.map((p) => `  ${p}`).join('\n'));
  process.exit(1);
}
console.log('  exports match publishConfig.exports, and every target exists');
