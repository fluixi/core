/**
 * Two rules about babel, both worth failing a build over.
 *
 * The IR entries (`.`, `./builtins`) reach no babel at all, `@fluixi/ts-plugin`
 * imports the builtin map and nothing else, and a stray import here is a module
 * that fails to resolve for it.
 *
 * The transform may use `@babel/parser`, and only that. A parser is a library;
 * `@babel/core`, `traverse` and `generator` are a pipeline we would be living
 * inside. That line is the difference between owning the compile and being a
 * plugin in someone else's.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)));

/** Entries that must not reach babel at all. */
const BABEL_FREE_ENTRIES = ['index.ts', 'resolve/builtins.ts'];

/** Entries allowed the parser, and nothing else from that namespace. */
const PARSER_ONLY_ENTRIES = ['transform/index.ts', 'integrations.ts'];

const STATIC_PATTERNS = [
  // import … from 'x'  /  export … from 'x'. `import type` and `export type` are
  // erased before anything runs, so they cannot pull a package in.
  // `[^;]` keeps a match inside one statement: without it an `export interface`
  // runs on to the `from` of some later line.
  /(?:^|\n)\s*(?:import|export)(?!\s+type\b)\b[^;]*?\sfrom\s*['"]([^'"]+)['"]/g,
  // import 'x' : a side-effect import has no `from`, and is exactly how a
  // Babel polyfill or plugin registration would sneak in.
  /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
];

// A dynamic import is the opt-in boundary: `integrations` reaches the babel
// front-end that way, and nothing loads it unless a caller asks for it.
const DYNAMIC_PATTERNS = [
  /\bimport\(\s*['"]([^'"]+)['"]/g,
  /\brequire\(\s*['"]([^'"]+)['"]/g,
];

function specifiers(code: string, dynamic: boolean): string[] {
  const out: string[] = [];
  for (const re of dynamic ? [...STATIC_PATTERNS, ...DYNAMIC_PATTERNS] : STATIC_PATTERNS) {
    re.lastIndex = 0;
    for (let m = re.exec(code); m; m = re.exec(code)) out.push(m[1]);
  }
  return out;
}

/** Every source file reachable from `entry`, plus the bare specifiers seen on the way. */
function walk(entry: string, dynamic = true): { files: Set<string>; bare: Map<string, string[]> } {
  const files = new Set<string>();
  const bare = new Map<string, string[]>();
  const queue = [resolve(SRC, entry)];

  while (queue.length) {
    const file = queue.pop()!;
    if (files.has(file)) continue;
    files.add(file);

    for (const spec of specifiers(readFileSync(file, 'utf-8'), dynamic)) {
      if (!spec.startsWith('.')) {
        // Record where it was imported from: a bare specifier that turns out to
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

  for (const entry of PARSER_ONLY_ENTRIES) {
    it(`${entry} reaches the parser and nothing else`, () => {
      // Static imports only: importing this module must not pull a toolchain the
      // default path never calls. integrations reaches the babel front-end behind
      // a dynamic import, which is the opt-in.
      const { bare } = walk(entry, false);
      const babel = [...bare.keys()].filter((s) => s.startsWith('@babel/'));
      expect(babel.filter((s) => s !== '@babel/parser')).toEqual([]);
    });
  }

  it('depends on the parser, never on the pipeline', () => {
    const pkg = JSON.parse(readFileSync(resolve(SRC, '../package.json'), 'utf-8'));
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps.filter((d) => d.startsWith('@babel/'))).toEqual(['@babel/parser']);

    // The plugin machinery stays an optional peer: it belongs to the front-end,
    // which @fluixi/vite-plugin and @fluixi/start depend on for real.
    for (const name of ['@babel/core', '@babel/generator', '@babel/helper-plugin-utils']) {
      expect(deps).not.toContain(name);
      expect(pkg.peerDependenciesMeta?.[name]?.optional).toBe(true);
    }
  });

  it('the front-end is where the pipeline is allowed', () => {
    const { bare } = walk('frontend/babel/index.ts');
    expect([...bare.keys()]).toContain('@babel/core');
  });
});
