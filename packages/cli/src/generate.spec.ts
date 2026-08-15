/**
 * `fluixi generate` writes into the directory it runs from, so these run it in a
 * temporary one and read back what landed.
 *
 * What is pinned is the naming: which directory a kind goes to, how a name becomes a
 * component name, and whether the file is `.tsx` or `.ts` — that follows the
 * project's own syntax and has been wrong in both directions.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate } from './generate.js';

let dir: string;
let cwd: string;
let argv: string[];

/** An app rooted at a temp dir, with the tsconfig `detectFormat` reads. */
function app(tsconfig: Record<string, unknown>): void {
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(tsconfig));
}

beforeEach(() => {
  cwd = process.cwd();
  argv = process.argv;
  dir = mkdtempSync(join(tmpdir(), 'fx-cli-'));
  process.chdir(dir);
  // generate() reads flags off argv, which would otherwise be vitest's own.
  process.argv = ['node', 'fluixi', 'generate'];
});

afterEach(() => {
  process.chdir(cwd);
  process.argv = argv;
  rmSync(dir, { recursive: true, force: true });
});

describe('generate component', () => {
  it('writes a .tsx component for a JSX project', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    generate('component', 'button');

    const file = join(dir, 'src/components/Button.tsx');
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toContain('export const Button');
  });

  it('writes a .ts component for a project with no jsx configured', () => {
    // No `jsx` in tsconfig means the app authors in html`` — emitting .tsx there
    // produces a file the project cannot compile.
    app({ compilerOptions: {} });
    generate('component', 'button');

    expect(existsSync(join(dir, 'src/components/Button.ts'))).toBe(true);
    expect(readFileSync(join(dir, 'src/components/Button.ts'), 'utf8')).toContain('html`');
  });

  it('takes the syntax from --html over the project', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    process.argv = ['node', 'fluixi', 'generate', '--html'];
    generate('component', 'button');

    expect(existsSync(join(dir, 'src/components/Button.ts'))).toBe(true);
  });
});

describe('generate route', () => {
  it('keeps the path and names the component after its last segment', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    generate('route', 'blog/[id]');

    // The file keeps the dynamic segment — that is the routing contract — while the
    // component name drops the brackets, which are not valid in an identifier.
    const file = join(dir, 'src/routes/blog/[id].tsx');
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toContain('export default function Id');
  });
});

describe('generate middleware', () => {
  it('writes one file at the root of src', () => {
    app({ compilerOptions: { jsx: 'preserve' } });
    generate('middleware', undefined);

    expect(existsSync(join(dir, 'src/middleware.ts'))).toBe(true);
  });
});
