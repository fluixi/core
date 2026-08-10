/**
 * Where compile time goes. Skipped unless FLUIXI_BENCH is set — a measurement,
 * not an assertion.
 *
 *   FLUIXI_BENCH=1 npx vitest run src/compile-cost.spec.ts
 *
 * Splits parsing, our own IR build + emit, and the rest: babel's traversal plus
 * the reparse of each emitted string back into the host AST.
 */
import { describe, it } from 'vitest';
import * as babel from '@babel/core';
import plugin from './frontend/babel/plugin.js';
import { buildIR } from './frontend/babel/build-ir.js';
import { imperativeBackend } from './codegen/backends/imperative.js';
import { transformTemplates } from './transform/templates.js';

const unit = (i: number) => `
export function C${i}({ items, on }: any) {
  return <section class="card" data-i="${i}">
    <h2 onClick={on}>{title()}</h2>
    <ul>{items().map((x: any) => <li class={x.cls} style={{ width: w() }}>{x.name}</li>)}</ul>
    <Show when={open()}><p>{body()}</p></Show>
  </section>;
}`;

const SRC = Array.from({ length: 100 }, (_, i) => unit(i)).join('\n');
const BASE = { filename: 't.tsx', configFile: false, babelrc: false } as const;
const OPTS = { importSource: '@fluixi/dom' };

function time(label: string, runs: number, fn: () => void): number {
  fn(); // warm
  const start = performance.now();
  for (let i = 0; i < runs; i++) fn();
  const ms = (performance.now() - start) / runs;
  console.log(`  ${label.padEnd(34)} ${ms.toFixed(1)} ms`);
  return ms;
}

/** Every JSX root in the file, so the IR pipeline can be timed without the host. */
function jsxRoots(ast: unknown): any[] {
  const roots: any[] = [];
  const walk = (node: any): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return void node.forEach(walk);
    if (node.type === 'JSXElement') return void roots.push(node);
    for (const key of Object.keys(node)) if (key !== 'loc') walk(node[key]);
  };
  walk(ast);
  return roots;
}

describe.runIf(process.env.FLUIXI_BENCH)('compile cost', () => {
  it('splits parse / IR / host overhead', () => {
    console.log(`  source: ${(SRC.length / 1024).toFixed(1)} KB, 100 components`);

    const parse = time('babel parse (tsx) only', 10, () => {
      babel.parseSync(SRC, { ...BASE, parserOpts: { plugins: ['jsx', 'typescript'] } });
    });
    const full = time('full transform (plugin)', 10, () => {
      babel.transformSync(SRC, { ...BASE, plugins: [[plugin, OPTS]] });
    });
    const native = time('full transform (native)', 10, () => {
      transformTemplates(SRC, 't.tsx', { runtimeModule: '@fluixi/dom' });
    });

    const ast = babel.parseSync(SRC, { ...BASE, parserOpts: { plugins: ['jsx', 'typescript'] } });
    const roots = jsxRoots(ast);
    const emit = time(`build-ir + emit (${roots.length} roots)`, 10, () => {
      for (const node of roots) imperativeBackend.emit(buildIR(node, new Set()), {} as any);
    });

    console.log(`  parse is ${((parse / full) * 100).toFixed(0)}% of a full transform`);
    console.log(`  framework IR work is ${((emit / full) * 100).toFixed(0)}%`);
    console.log(`  host overhead (traverse + reparse + print) is ${(((full - parse - emit) / full) * 100).toFixed(0)}%`);
    console.log(`  native is ${(full / native).toFixed(1)}x the plugin on the same source`);
  }, 120_000);
});
