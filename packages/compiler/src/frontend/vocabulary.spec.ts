/**
 * The vocabulary contract, enforced the same way `no-babel-in-core.spec.ts`
 * enforces the babel one: read the source, find what it actually does, fail with
 * the file named.
 *
 * Two directions, and the second matters as much as the first. An unlisted name
 * means the layer grew a coupling nobody recorded. A listed name nobody uses
 * means the table is describing a compiler that no longer exists, and a front-end
 * author would port a branch that is not there.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOCABULARY, DIALECT_DIVERGENT, ESTREE_ALIASES, PARSER_AGNOSTIC_DIRS } from './vocabulary.js';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sources(path));
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) out.push(path);
  }
  return out;
}

interface Use {
  name: string;
  where: string;
}

/**
 * Names branched on in one file: `x.type === 'Name'` either way round, and the
 * `case` labels of a switch whose discriminant is a `.type`.
 *
 * Only PascalCase literals count. Every dialect spells node types that way, and
 * it is what separates a real branch from `typeof (v as Node).type === 'string'`,
 * which has the same shape and names no node.
 */
const NODE_NAME = "'([A-Z][A-Za-z]*)'";

function branchedNames(code: string, file: string): Use[] {
  const out: Use[] = [];
  const lines = code.split('\n');
  const where = (i: number) => `${file.slice(SRC.length + 1)}:${i + 1}`;

  const comparison = new RegExp(String.raw`\.type\s*(?:===|!==)\s*${NODE_NAME}`, 'g');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(comparison)) out.push({ name: m[1], where: where(i) });
  });

  // Case labels, but only while inside a switch that discriminates on `.type`.
  const label = new RegExp(String.raw`case\s+${NODE_NAME}\s*:`, 'g');
  let depth: number | null = null;
  lines.forEach((line, i) => {
    if (depth === null && /switch\s*\(\s*[\w$][\w$.?]*\.type\s*\)/.test(line)) depth = 0;
    if (depth === null) return;
    for (const m of line.matchAll(label)) out.push({ name: m[1], where: where(i) });
    depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
    if (depth <= 0 && line.includes('}')) depth = null;
  });

  return out;
}

function allUses(): Use[] {
  const out: Use[] = [];
  for (const dir of PARSER_AGNOSTIC_DIRS) {
    for (const file of sources(join(SRC, dir))) {
      out.push(...branchedNames(readFileSync(file, 'utf-8'), file));
    }
  }
  return out;
}

describe('the parser vocabulary is a contract, not a convention', () => {
  it('branches on no name outside VOCABULARY', () => {
    const unlisted = allUses().filter((u) => !(u.name in VOCABULARY));
    expect(unlisted.map((u) => `${u.name} at ${u.where}`)).toEqual([]);
  });

  it('lists no name the layer has stopped using', () => {
    const used = new Set(allUses().map((u) => u.name));
    expect(Object.keys(VOCABULARY).filter((name) => !used.has(name))).toEqual([]);
  });

  it('pairs every divergent name with the ESTree spelling it collapses into', () => {
    for (const [name, entry] of Object.entries(DIALECT_DIVERGENT)) {
      expect(entry.estree, `${name} has no ESTree spelling recorded`).toBeTruthy();
      expect(Object.keys(ESTREE_ALIASES)).toContain(entry.estree);
    }
  });

  it('records the ESTree gap in static-graph rather than letting it pass unnoticed', () => {
    // The three sites the contract calls out. If someone adds the missing branch,
    // this fails and the docstring above ESTREE_ALIASES is the thing to update.
    const graph = readFileSync(join(SRC, 'analyze/static-graph.ts'), 'utf-8');
    expect(graph).not.toContain("'Literal'");
    expect(graph).not.toContain("'Property'");
  });
});
