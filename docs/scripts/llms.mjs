// Files for coding assistants, following the llms.txt convention: an index, the whole guide in
// one file, and each page as Markdown next to its HTML. Generated from the same sources as the
// site, in the sidebar's order, so they never drift from it. English only: one language is
// enough for a model, and two would double what it has to read.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://docs.fluixi.com';
const VERSION = 'v1';
const LANG = 'en';

// nav.ts is TypeScript, and this runs in plain Node: read the groups out of its source.
function navGroups() {
  const src = readFileSync(join(root, 'src/nav.ts'), 'utf8');
  return [...src.matchAll(/group:\s*\{\s*en:\s*'([^']+)'[^}]*\},\s*slugs:\s*\[([^\]]*)\]/g)].map((m) => ({
    title: m[1],
    slugs: [...m[2].matchAll(/'([^']+)'/g)].map((s) => s[1]),
  }));
}

function page(slug) {
  try {
    return readFileSync(join(root, 'src/content', VERSION, LANG, `${slug}.md`), 'utf8');
  } catch {
    return null;
  }
}

// The first paragraph under the title, on one line, as the page's description.
function summary(md) {
  const body = md.replace(/^#\s+.+\n+/, '');
  const para = body.split(/\n\s*\n/).find((p) => p.trim() && !/^(#|```|\||-|\*\*)/.test(p.trim())) ?? '';
  return para.replace(/\s+/g, ' ').trim();
}

const title = (md, slug) => md.match(/^#\s+(.+)$/m)?.[1].trim() ?? slug;

export function writeLlmsFiles(outDir) {
  // The rules ship in the package too, so a tool reading node_modules gets the ones for the
  // installed version. That file is the source; the site serves the same text.
  const head = readFileSync(join(root, '../packages/core/llms.txt'), 'utf8').trim();

  const index = [head];
  const full = [head];
  let count = 0;

  for (const group of navGroups()) {
    const lines = [];
    for (const slug of group.slugs) {
      const md = page(slug);
      if (!md) continue;
      const href = `${SITE}/${VERSION}/${LANG}/${slug}.md`;
      const text = summary(md);
      lines.push(`- [${title(md, slug)}](${href})${text ? `: ${text}` : ''}`);
      full.push(md.trim());
      const dir = join(outDir, VERSION, LANG);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${slug}.md`), md);
      count++;
    }
    if (lines.length) index.push(`## ${group.title}\n\n${lines.join('\n')}`);
  }

  writeFileSync(join(outDir, 'llms.txt'), index.join('\n\n') + '\n');
  writeFileSync(join(outDir, 'llms-full.txt'), full.join('\n\n---\n\n') + '\n');
  return count;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] ?? join(root, 'dist/client');
  console.log(`  ✓ llms.txt, llms-full.txt (${writeLlmsFiles(out)} pages)`);
}
