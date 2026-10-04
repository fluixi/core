import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { transformTemplates } from './transform/templates.js';
import type { StyleNode } from './transform/styles.js';
import { createComponentStyles, styleId } from './vite-styles.js';

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
    expect(styles.isStyle(`${file}?fx-style&index=0&inline&lang.css`)).toBe(true);
    expect((await styles.load(`${file}?fx-style&index=0&inline&lang.css`, ctx))?.code).toBe('.card{}');
    expect((await styles.load(`${file}?fx-literal=extra&inline&lang.css`, ctx))?.code).toBe('.extra{}');
    await expect(styles.load(`${file}?fx-literal=nope&inline&lang.css`, ctx)).rejects.toThrow(/not a css`` value/);
  });
});

