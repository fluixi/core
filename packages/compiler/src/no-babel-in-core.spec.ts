/**
 * The compiler core must not import Babel.
 *
 * `@babel/*` is an optional peer, so a consumer that only wants the IR or the
 * builtin map (`@fluixi/ts-plugin`) never installs it — a stray import here is a
 * module that fails to resolve for them, not a style slip. Walks the real import
 * graph, since the failure is transitive.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)));

/** Entry points documented as Babel-free (the `.` and `./builtins` subpaths). */
const BABEL_FREE_ENTRIES = ['index.ts', 'resolve/builtins.ts'];

const PATTERNS = [
  // import … from 'x'  /  export … from 'x'
  /(?:^|\n)\s*(?:import|export)\b[\s\S]*?\sfrom\s*['"]([^'"]+)['"]/g,
  // import 'x'  — a side-effect import has no `from`, and is exactly how a
  // Babel polyfill or plugin registration would sneak in.
  /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
  // import('x')  /  require('x')
  /\bimport\(\s*['"]([^'"]+)['"]/g,
  /\brequire\(\s*['"]([^'"]+)['"]/g,
];

function specifiers(code: string): string[] {
  const out: string[] = [];
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    for (let m = re.exec(code); m; m = re.exec(code)) out.push(m[1]);
  }
  return out;
}

/** Every source file reachable from `entry`, plus the bare specifiers seen on the way. */
function walk(entry: string): { files: Set<string>; bare: Map<string, string[]> } {
  const files = new Set<string>();
  const bare = new Map<string, string[]>();
  const queue = [resolve(SRC, entry)];

  while (queue.length) {
    const file = queue.pop()!;
    if (files.has(file)) continue;
    files.add(file);

    for (const spec of specifiers(readFileSync(file, 'utf-8'))) {
      if (!spec.startsWith('.')) {
        // Record where it was imported from — a bare specifier that turns out to
        // be Babel is far easier to fix with the importer named.
        bare.set(spec, [...(bare.get(spec) ?? []), file.slice(SRC.length + 1)]);
        continue;
      }
      // Emitted ESM uses `.js`; the source beside it is `.ts`.
      const target = resolve(dirname(file), spec).replace(/\.js$/, '.ts');
      if (existsSync(target)) queue.push(target);
    }
  }
  return { files, bare };
}

describe('@fluixi/compiler core is Babel-free', () => {
  for (const entry of BABEL_FREE_ENTRIES) {
    it(`${entry} reaches no @babel/* module`, () => {
      const { bare } = walk(entry);
      const babel = [...bare.entries()].filter(([spec]) => spec.startsWith('@babel/'));
      expect(
        babel.map(([spec, importers]) => `${spec} <- ${importers.join(', ')}`),
      ).toEqual([]);
    });
  }

  it('declares Babel as an optional peer, never a dependency', () => {
    const pkg = JSON.parse(readFileSync(resolve(SRC, '../package.json'), 'utf-8'));
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps.filter((d) => d.startsWith('@babel/'))).toEqual([]);

    // Optional, so `pnpm add @fluixi/compiler` does not drag in a toolchain the
    // importer may never call. The packages that always run a Babel compile
    // (@fluixi/vite-plugin, @fluixi/start, @fluixi/babel-plugin-jsx) depend on it
    // for real, so nothing an app does has to change.
    for (const name of Object.keys(pkg.peerDependencies ?? {})) {
      if (name.startsWith('@babel/')) {
        expect(pkg.peerDependenciesMeta?.[name]?.optional).toBe(true);
      }
    }
  });

  it('the front-end and integrations are where Babel is allowed', () => {
    // Not a rule for its own sake — a guard on the sentence above. If these stop
    // importing Babel, the peer declaration is dead weight and should go.
    const { bare } = walk('frontend/babel/index.ts');
    expect([...bare.keys()].some((s) => s.startsWith('@babel/'))).toBe(true);
  });
});
