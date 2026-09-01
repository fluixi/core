#!/usr/bin/env node
// Write the import maps this package ships, so a page references a URL instead of
// running a generator. Layers are separate files because a page takes only what it
// needs, and because a page that already pins the framework should not be handed
// a second copy of those entries.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const out = join(here, '..', 'dist');
const generator = join(repo, 'scripts', 'import-map.mjs');

const run = (layer) =>
  JSON.parse(
    execFileSync('node', [generator, '--layer', layer], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  );

mkdirSync(out, { recursive: true });
for (const layer of ['min', 'templates', 'full']) {
  writeFileSync(join(out, `${layer}.json`), JSON.stringify(run(layer), null, 2) + '\n');
}
process.stderr.write('maps: min, templates, full\n');
