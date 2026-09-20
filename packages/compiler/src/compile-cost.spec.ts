/**
 * Where compile time goes. Skipped unless FLUIXI_BENCH is set, a measurement,
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

/** The same shape twice, so the only variable is how much directive lowering runs. */
const plainUnit = (i: number) => `
export const P${i} = ({ items, on }: any) => html\`
  <section class="card" data-i="${i}">
    <h2 @click=\${on}>\${title()}</h2>
    <ul>\${items().map((x: any) => html\`<li>\${x.name}</li>\`)}</ul>
  </section>\`;`;

const directiveUnit = (i: number) => `
export const D${i} = ({ items, on, flag, text }: any) => html\`
  <section class="card" data-i="${i}" class:open=\${flag()} style:width=\${w()}>
    <h2 @click.stop.prevent=\${on} use:tip=\${{ side: 'top' }}>\${title()}</h2>
    <input bind:value=\${text} ?disabled=\${flag()} .rich=\${flag()} />
    <ul><li each=\${items()} key="id">\${(x: any) => x.name}</li></ul>
    <p if=\${flag()}>\${body()}</p><p else>none</p>
  </section>\`;`;

const PLAIN = Array.from({ length: 100 }, (_, i) => plainUnit(i)).join('\n');
const DIRECTIVES = Array.from({ length: 100 }, (_, i) => directiveUnit(i)).join('\n');

/**
 * The first compile in this process, captured before any test warms the path.
 * Measured inside a test body it reads 1.0x, because the module is loaded and the
 * JIT has seen everything by then.
 */
const COLD_MS = process.env.FLUIXI_BENCH
  ? (() => {
      const started = performance.now();
      transformTemplates(SRC, 'cold.tsx', { runtimeModule: '@fluixi/dom' });
      return performance.now() - started;
    })()
  : 0;
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

  it('costs what a directive-heavy template costs', () => {
    // Directives are lowerings the element path never runs, so the JSX fixture above
    // says nothing about them.
    // Both fixtures are 100 templates but not the same byte count, so the per-KB
    // figure is the comparable one.
    console.log(
      `  plain ${(PLAIN.length / 1024).toFixed(1)} KB vs directive-heavy ` +
        `${(DIRECTIVES.length / 1024).toFixed(1)} KB, 100 templates each`,
    );

    const plain = time('templates, no directives', 10, () => {
      transformTemplates(PLAIN, 't.ts', { runtimeModule: '@fluixi/dom' });
    });
    const heavy = time('templates, directive-heavy', 10, () => {
      transformTemplates(DIRECTIVES, 't.ts', { runtimeModule: '@fluixi/dom' });
    });
    const perKb = (ms: number, src: string) => ms / (src.length / 1024);
    console.log(`  directives cost ${(heavy / plain).toFixed(1)}x per template,`
      + ` ${(perKb(heavy, DIRECTIVES) / perKb(plain, PLAIN)).toFixed(1)}x per KB`);
  }, 120_000);

  it('separates the first compile from a rebuild', () => {
    // First request for a module against every edit after it.
    const warm = time('rebuild (warm)', 20, () => {
      transformTemplates(SRC, 't.tsx', { runtimeModule: '@fluixi/dom' });
    });
    console.log(`  first compile (cold)               ${COLD_MS.toFixed(1)} ms`);
    console.log(`  cold is ${(COLD_MS / warm).toFixed(1)}x a warm rebuild`);
  }, 120_000);
});
