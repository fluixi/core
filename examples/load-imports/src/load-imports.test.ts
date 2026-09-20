// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The proof is the build output.
 *
 * Both components are imported identically and both carry a deferring `load:`. Whether
 * one moves out of the entry chunk is the whole question, and rendering would look the
 * same either way: so this runs the real `vite build` and reads the chunks.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assets = join(root, 'dist', 'assets');

let chunks: { name: string; code: string }[] = [];
let entry: { name: string; code: string };
let output = '';

beforeAll(() => {
  rmSync(join(root, 'dist'), { recursive: true, force: true });
  const run = execFileSync('npx', ['vite', 'build', '--minify', 'false'], {
    cwd: root,
    stdio: 'pipe',
  });
  // The compiler's warnings go to stderr; execFileSync gives stdout, so read both.
  output = String(run);
  try {
    output += readFileSync(join(root, 'dist', '.build-log'), 'utf8');
  } catch {
    /* no log file: stdout is enough for the chunk assertions */
  }

  chunks = readdirSync(assets)
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({ name: f, code: readFileSync(join(assets, f), 'utf8') }));

  const html = readFileSync(join(root, 'dist', 'index.html'), 'utf8');
  entry = chunks.find((c) => html.includes(c.name))!;
}, 180_000);

describe('a component used only as a tag', () => {
  it('leaves the entry chunk', () => {
    expect(entry.code).not.toContain('chart-payload-marker');
  });

  it('gets a chunk of its own', () => {
    const elsewhere = chunks.some(
      (c) => c.name !== entry.name && c.code.includes('chart-payload-marker'),
    );
    expect(elsewhere).toBe(true);
  });

  it('is loaded through a dynamic import', () => {
    expect(entry.code).toMatch(/import\(/);
  });
});

describe('a component also used as a value', () => {
  it('stays in the entry chunk, directive or not', () => {
    // `const widgets = { legend: Legend }` is the reason. Deferring would hand that
    // object a lazy wrapper instead of the component it names.
    expect(entry.code).toContain('legend-payload-marker');
  });

  it('keeps working — it is only the deferral that was refused', () => {
    expect(entry.code).toContain('widgets');
  });
});

describe('the difference is exactly the value reference', () => {
  it('separates the two, having imported them the same way', () => {
    const source = readFileSync(join(root, 'src', 'App.tsx'), 'utf8');
    expect(source).toContain("import { Chart } from './components/Chart'");
    expect(source).toContain("import { Legend } from './components/Legend'");
    // Same shape of directive on both.
    expect(source).toMatch(/<Chart load:visible/);
    expect(source).toMatch(/<Legend load:idle/);
  });
});
