// A bare `process.env` read is replaced at build time but survives in dev, where the
// browser loads this source directly and throws on the first component that hits it.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// `plugins` is a vite plugin and `server` never leaves node, so both may read
// process freely.
const SERVER_ONLY = ['plugins', 'server'];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory())
      return SERVER_ONLY.includes(entry) ? [] : sources(full);
    return /\.tsx?$/.test(entry) && !/\.spec\.tsx?$/.test(entry) ? [full] : [];
  });
}

describe('browser-reachable source', () => {
  it('never reads process without checking for it first', () => {
    const offenders: string[] = [];

    for (const file of sources(ROOT)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (line.trimStart().startsWith('//')) return;
        if (!/(?<!typeof\s)\bprocess\s*\./.test(line)) return;
        if (line.includes('typeof process')) return;
        // The first statement of a `try`: the catch handles a page with no `process`, and the
        // read stays in the exact form a bundler replaces, which a `typeof` guard would not.
        if (lines[i - 1]?.trim() === 'try {') return;
        offenders.push(
          `${file.slice(ROOT.length + 1)}:${i + 1} ${line.trim()}`
        );
      });
    }

    expect(offenders).toEqual([]);
  });
});
