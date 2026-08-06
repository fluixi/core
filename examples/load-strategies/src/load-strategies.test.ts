// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The proof is the build output, not the rendered DOM.
 *
 * `load:` exists to move code out of the entry chunk, so the assertion has to be about
 * which chunk each module lands in — rendering would pass either way. The real
 * `vite build` is run rather than vite's programmatic API so this tests the command a
 * developer actually runs.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assets = join(root, 'dist', 'assets');

let chunks: { name: string; code: string }[] = [];
let entry: { name: string; code: string };

beforeAll(() => {
  rmSync(join(root, 'dist'), { recursive: true, force: true });
  execFileSync('npx', ['vite', 'build', '--minify', 'false'], { cwd: root, stdio: 'pipe' });

  chunks = readdirSync(assets)
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({ name: f, code: readFileSync(join(assets, f), 'utf8') }));

  // The entry is the chunk the generated index.html loads.
  const html = readFileSync(join(root, 'dist', 'index.html'), 'utf8');
  entry = chunks.find((c) => html.includes(c.name))!;
}, 180_000);

describe('load: moves modules out of the entry chunk', () => {
  it('produces a chunk per deferred component', () => {
    // entry + visible + interaction + media
    expect(chunks.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps the eager component in the entry chunk', () => {
    expect(entry.code).toContain('Revenue this month');
  });

  it('ships the visible-deferred component elsewhere', () => {
    expect(entry.code).not.toContain('revenue-chart-payload-row-');
    expect(chunks.some((c) => c.name !== entry.name && c.code.includes('revenue-chart-payload-row-'))).toBe(true);
  });

  it('ships the interaction-deferred component elsewhere', () => {
    expect(entry.code).not.toContain('first pointer, focus or key event');
  });

  it('ships the media-deferred component elsewhere', () => {
    expect(entry.code).not.toContain('at least 1024px wide');
  });

  it('carries each strategy into the runtime call', () => {
    expect(entry.code).toContain('"visible"');
    expect(entry.code).toContain('"interaction"');
    expect(entry.code).toContain('(min-width: 1024px)');
    expect(entry.code).toContain('200px');
  });

  it('compiled a source file that imports none of them', () => {
    const source = readFileSync(join(root, 'src', 'App.tsx'), 'utf8');
    for (const name of ['Summary', 'RevenueChart', 'ExportDialog', 'AuditLog']) {
      expect(source).not.toMatch(new RegExp(`import\\b.*\\b${name}\\b`));
    }
  });
});
