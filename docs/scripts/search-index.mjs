// Search index, built from the markdown sources into `public/` so the dev server and
// the build serve the same asset. Written there rather than imported by the app: the
// page chunk carries enough already, and the index is only needed once someone opens
// search.
//
// One record per page, headings kept separate so a heading match can outrank a body
// match, and the body flattened to plain text: code fences included, since "how do I
// write bind:value" is a real query and the answer is in a code block.
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function markdownFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) markdownFiles(p, acc);
    else if (name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

export function buildSearchIndex() {
  return markdownFiles(join(root, 'src/content'))
    .map((file) => {
      const md = readFileSync(file, 'utf8');
      const [, version, lang, slug] =
        file.split(/[/\\]/).slice(-3).join('/').match(/^([^/]+)\/([^/]+)\/(.+)\.md$/) ?? [];
      const headings = [...md.matchAll(/^#{1,3}\s+(.+)$/gm)].map((m) => m[1].trim());
      const body = md
        .replace(/^#{1,6}\s+.+$/gm, ' ')      // headings are indexed separately
        .replace(/```/g, ' ')                 // keep code text, drop the fences
        .replace(/[*_>`|#[\]()]/g, ' ')       // markdown punctuation carries no meaning here
        .replace(/\s+/g, ' ')
        .trim();
      return { v: version, l: lang, s: slug, t: headings[0] ?? slug, h: headings.slice(1), b: body };
    })
    .filter((r) => r.s);
}

export function writeSearchIndex(dir = join(root, 'public')) {
  const index = buildSearchIndex();
  const json = JSON.stringify(index);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'search-index.json'), json);
  return { pages: index.length, kb: (json.length / 1024).toFixed(0) };
}

// Run directly (`node scripts/search-index.mjs`) as the dev and build prestep.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[/\\]/).pop())) {
  const { pages, kb } = writeSearchIndex();
  console.log(`  ✓ search-index.json (${pages} pages, ${kb} KB)`);
}
