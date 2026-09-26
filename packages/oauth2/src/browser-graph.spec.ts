/**
 * Entry points a client bundle imports must not reach the verifier.
 *
 * `presets` once imported `rolesFrom` from `api-guard.ts`, which imports `TokenError` from
 * `verify.ts`, which re-exports `env-credentials.ts` and its `node:fs`. Every app reading a
 * preset in shared config shipped all of it to the browser, and the only sign was a Vite
 * warning about externalized modules. This walks the runtime imports the way a bundler would.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const src = dirname(fileURLToPath(import.meta.url));

// Static and re-export statements, skipping `import type` and `export type`, plus dynamic imports.
const STATIC = /^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gm;
const DYNAMIC = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

function reach(entry: string): { files: Set<string>; node: Map<string, string> } {
  const files = new Set<string>();
  const node = new Map<string, string>();
  const visit = (file: string): void => {
    if (files.has(file)) return;
    files.add(file);
    const code = readFileSync(join(src, file), 'utf8');
    for (const re of [STATIC, DYNAMIC]) {
      for (const [, spec] of code.matchAll(re)) {
        if (spec.startsWith('node:')) node.set(spec, file);
        else if (spec.startsWith('./')) visit(spec.slice(2).replace(/\.js$/, '.ts'));
      }
    }
  };
  visit(entry);
  return { files, node };
}

describe.each(['roles.ts', 'presets.ts', 'env-config.ts', 'callback.ts', 'index.ts'])('%s', (entry) => {
  const { files, node } = reach(entry);

  it('does not reach the verifier', () => {
    expect([...files].filter((f) => f === 'verify.ts' || f === 'api-guard.ts')).toEqual([]);
  });

  it('imports no node: builtin', () => {
    expect(Object.fromEntries(node)).toEqual({});
  });
});

it('the walk does find the verifier where it is meant to be', () => {
  // Guards the regexes: a walk that matched nothing would pass everything above.
  const { files, node } = reach('api-guard.ts');
  expect(files.has('verify.ts')).toBe(true);
  expect(node.size).toBeGreaterThan(0);
});
