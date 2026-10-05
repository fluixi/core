import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { transformTemplates } from './transform/templates.js';
import type { StyleNode } from './transform/styles.js';
import { createComponentStyles, styleId } from './vite-styles.js';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

// The engine's part, faked as in the compiler specs: a piece of CSS comes back as one rule
// named after its selector.
const echo = (css: string): StyleNode[] => [{ kind: 'rule', selector: css.trim().split(/\s*\{/)[0]!, nodes: [] }];
const cssPlugin = (calls: string[]) => ({
  name: 'fluixi',
  api: {
    fluixiCss: {
      styles: () => ({ process: echo, minify: true }),
      useComponentStyles: () => calls.push('useComponentStyles'),
    },
  },
});

describe('component styles in Vite', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'fx-styles-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const setup = () => {
    const calls: string[] = [];
    const styles = createComponentStyles((code, id, s) => transformTemplates(code, id, { sourceRoot: dir, styles: s }));
    styles.connect([{ name: 'other' }, cssPlugin(calls)]);
    return { styles, calls };
  };
  const ctx = { resolve: async (source: string) => ({ id: join(dir, source.replace('./', '') + '.ts') }) };

  it('connects to @fluixi-css/vite and turns the global sheet to keeping every token', () => {
    const { styles, calls } = setup();
    expect(styles.active).toBe(true);
    expect(calls).toEqual(['useComponentStyles']);
  });

  it('makes the component import its style block, and serves the block', async () => {
    const { styles } = setup();
    const file = join(dir, 'Card.tsx');
    const code = 'export function Card() { return <div class="card"><style scoped>{`.card { a: 1 }`}</style></div>; }';
    writeFileSync(file, code);
    const out = await styles.compile(code, file, ctx);
    expect(out?.code).toContain(`import ${JSON.stringify(styleId(file, 0))};`);
    expect(styles.isStyle(styleId(file, 0))).toBe(true);
    expect((await styles.load(styleId(file, 0), ctx))?.code).toMatch(/^\.card\[data-fx-s="\w+"\]\{\}$/);
  });

  it('compiles the file again when it changed before its style was asked for', async () => {
    const { styles } = setup();
    const file = join(dir, 'Card.tsx');
    writeFileSync(file, 'export function Card() { return <div><style>{`.old { a: 1 }`}</style></div>; }');
    await styles.compile('export function Card() { return <div><style>{`.old { a: 1 }`}</style></div>; }', file, ctx);
    writeFileSync(file, 'export function Card() { return <div><style>{`.new { a: 1 }`}</style></div>; }');
    expect((await styles.load(styleId(file, 0), ctx))?.code).toBe('.new{}');
  });

  it('resolves a style value imported from another module through Vite', async () => {
    const { styles } = setup();
    writeFileSync(join(dir, 'base.ts'), "import { css } from '@fluixi/core';\nexport const base = css`.base { a: 1 }`;");
    const file = join(dir, 'Card.tsx');
    const code = `import { base } from './base';\nexport function Card() { return <div><style scoped>{\`\${base} .card { a: 1 }\`}</style></div>; }`;
    writeFileSync(file, code);
    await styles.compile(code, file, ctx);
    expect((await styles.load(styleId(file, 0), ctx))?.code).toMatch(/^\.base\[data-fx-s="\w+"\]\{\}\.card\[data-fx-s="\w+"\]\{\}$/);
  });

  it("maps a value composed from another module back to that module's line", async () => {
    const styles = createComponentStyles((code, id, s) => transformTemplates(code, id, { sourceRoot: dir, styles: s }));
    // Each piece comes back as one rule placed where it starts, as the engine would.
    const located = (css: string, from: string): StyleNode[] => {
      const before = css.slice(0, css.search(/\S/)).split('\n');
      const loc = { source: from, line: before.length, column: before.at(-1)!.length };
      return [{ kind: 'rule', selector: css.trim().split(/\s*\{/)[0]!, nodes: [], loc }];
    };
    styles.connect([{ name: 'fluixi', api: { fluixiCss: { styles: () => ({ process: located, minify: true }), useComponentStyles: () => {} } } }]);
    const base = "import { css } from '@fluixi/core';\nexport const base = css`\n.base { a: 1 }`;";
    writeFileSync(join(dir, 'base.ts'), base);
    const file = join(dir, 'Card.tsx');
    const code = `import { base } from './base';\nexport function Card() {\n  return <div><style scoped>{\`\${base}\n.card { a: 1 }\`}</style></div>;\n}`;
    writeFileSync(file, code);
    await styles.compile(code, file, ctx);
    const loaded = await styles.load(styleId(file, 0), ctx);
    const map = loaded?.map as { sources: string[]; sourcesContent: string[] };
    expect(map.sources).toEqual([file, join(dir, 'base.ts')]);
    expect(map.sourcesContent).toEqual([code, base]);
    const trace = new TraceMap(map as never);
    const at = (selector: string) => originalPositionFor(trace, { line: 1, column: loaded!.code.indexOf(selector) });
    expect(at('.base')).toMatchObject({ source: join(dir, 'base.ts'), line: 3, column: 0 });
    expect(at('.card')).toMatchObject({ source: file, line: 4, column: 0 });
  });

  it('reloads a block whose CSS changed', async () => {
    const { styles } = setup();
    const reloaded: unknown[] = [];
    const mod = { id: 'css-module' };
    styles.setServer({ moduleGraph: { getModuleById: () => mod }, reloadModule: async (m: never) => void reloaded.push(m) });
    const file = join(dir, 'Card.tsx');
    await styles.compile('export function Card() { return <div><style>{`.a { a: 1 }`}</style></div>; }', file, ctx);
    await styles.compile('export function Card() { return <div><style>{`.a { a: 1 }`}</style></div>; }', file, ctx);
    expect(reloaded).toEqual([]);
    await styles.compile('export function Card() { return <div><style>{`.b { a: 1 }`}</style></div>; }', file, ctx);
    expect(reloaded).toEqual([mod]);
  });

  it('serves a shadow element\'s block and a css`` value as inline CSS, and imports neither as a page sheet', async () => {
    const { styles } = setup();
    const file = join(dir, 'fx-card.tsx');
    const code = [
      "import { css } from '@fluixi/core';",
      'export const extra = css`.extra { a: 1 }`;',
      'class FxCard extends HTMLReactiveElement {',
      '  static shadow = true;',
      '  static styles = [extra];',
      '  render() { return <article><style>{`.card { a: 1 }`}</style></article>; }',
      '}',
    ].join('\n');
    writeFileSync(file, code);
    const out = await styles.compile(code, file, ctx);
    expect(out?.code).not.toContain(`import ${JSON.stringify(styleId(file, 0))};`);
    expect(styles.isStyle(`${file}.fx-0.css?inline`)).toBe(true);
    expect((await styles.load(`${file}.fx-0.css?inline`, ctx))?.code).toBe('.card{}');
    expect((await styles.load(`${file}.fx-literal-extra.css?inline`, ctx))?.code).toBe('.extra{}');
    await expect(styles.load(`${file}.fx-literal-nope.css?inline`, ctx)).rejects.toThrow(/not a css`` value/);
  });

  it('in a library build, writes each block as a file next to the module and imports it relatively', async () => {
    const { styles } = setup();
    styles.setLibrary(dir);
    const file = join(dir, 'parts', 'Card.tsx');
    const code = 'export function Card() { return <div><style>{`.card { a: 1 }`}</style><style>{`.b { a: 1 }`}</style></div>; }';
    mkdirSync(join(dir, 'parts'));
    writeFileSync(file, code);
    const out = await styles.compile(code, file, ctx);
    expect(out?.code).toContain('import "./Card.css";');
    expect(out?.code).not.toContain('.fx-0.css');
    expect(styles.isLibraryImport('./Card.css', file)).toBe(true);
    expect(styles.isLibraryImport('./Other.css', file)).toBe(false);
    const files = styles.libraryFiles();
    expect(files.get(join('parts', 'Card.css'))).toBe('.card{}\n.b{}');
    expect(files.get(join('parts', 'Card.css.js'))).toContain('new URL("./Card.css", import.meta.url)');
  });

  it('refuses to overwrite a stylesheet already next to the module', async () => {
    const { styles } = setup();
    styles.setLibrary(dir);
    const file = join(dir, 'Card.tsx');
    const code = 'export function Card() { return <div><style>{`.card { a: 1 }`}</style></div>; }';
    writeFileSync(file, code);
    writeFileSync(join(dir, 'Card.css'), '.mine {}');
    await expect(styles.compile(code, file, ctx)).rejects.toThrow(/would be overwritten/);
  });

  it('names a style module by its file, however it was requested, so an edit invalidates it', async () => {
    const { styles } = setup();
    styles.connect([cssPlugin([])], dir);
    writeFileSync(join(dir, 'Card.tsx'), '');
    const card = join(dir, 'Card.tsx');
    expect(await styles.resolveId('/Card.tsx.fx-0.css', undefined, ctx)).toBe(`${card}.fx-0.css`);
    expect(await styles.resolveId(`${card}.fx-literal-base.css?inline`, undefined, ctx)).toBe(`${card}.fx-literal-base.css?inline`);
    // A value imported from another module names it relatively, as written.
    expect(await styles.resolveId('./base.fx-literal-base.css?inline', card, ctx)).toBe(`${join(dir, 'base.ts')}.fx-literal-base.css?inline`);
  });

  it("names an edited component's style modules for the update, which Vite cannot connect to it", async () => {
    const { styles } = setup();
    const file = join(dir, 'Card.tsx');
    const code = 'export function Card() { return <div><style>{`.a { a: 1 }`}</style><style>{`.b { a: 1 }`}</style></div>; }';
    writeFileSync(file, code);
    await styles.compile(code, file, ctx);
    const graph = new Map<string, Set<string>>([
      [`${file}.fx-0.css`, new Set(['block 0', 'block 0 inline'])],
      [`${file}.fx-1.css`, new Set(['block 1'])],
    ]);
    expect(styles.hotModules(file, { getModulesByFile: (f) => graph.get(f) })).toEqual(['block 0', 'block 0 inline', 'block 1']);
    expect(styles.hotModules(join(dir, 'Other.tsx'), { getModulesByFile: (f) => graph.get(f) })).toEqual([]);
  });
});

