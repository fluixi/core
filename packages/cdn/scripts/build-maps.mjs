#!/usr/bin/env node
// Write the import maps this package ships, so a page references a URL instead of
// running a generator. Layers are separate files because a page takes only what it
// needs, and because a page that already pins the framework should not be handed
// a second copy of those entries.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildLayer } from 'mappel';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const out = join(here, '..', 'dist');

const config = (await import(pathToFileURL(join(root, 'importmap.config.mjs')).href)).default;
const run = (layer) => ({ imports: buildLayer(layer, config, { root, workspaces: config.workspaces }).imports });

mkdirSync(out, { recursive: true });
for (const layer of ['min', 'templates', 'full']) {
  writeFileSync(join(out, `${layer}.json`), JSON.stringify(run(layer), null, 2) + '\n');
}
process.stderr.write('maps: min, templates, full\n');
