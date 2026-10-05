import { describe, it, expect } from 'vitest';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import { transformTemplates } from './templates.js';
import { hash, printStyle, scopeNodes, scopeSelector, type StyleNode } from './styles.js';

const s = '[data-fx-s="x"]';
const scope = (selector: string) => scopeSelector(selector, 'x');

describe('scopeSelector', () => {
  it('puts the scope on the last compound, before its pseudo-classes and pseudo-elements', () => {
    expect(scope('.card')).toBe(`.card${s}`);
    expect(scope('.card > header')).toBe(`.card > header${s}`);
    expect(scope('.list li + li')).toBe(`.list li + li${s}`);
    expect(scope('.a:hover::before')).toBe(`.a${s}:hover::before`);
    expect(scope('div')).toBe(`div${s}`);
  });

  it('scopes each selector of a list, and leaves commas inside :is() alone', () => {
    expect(scope('.a, .b:focus')).toBe(`.a${s}, .b${s}:focus`);
    expect(scope('.x :is(.a, .b)')).toBe(`.x :is(.a, .b)${s}`);
  });

  it('leaves escapes and quoted values as written', () => {
    expect(scope('.hover\\:flex')).toBe(`.hover\\:flex${s}`);
    expect(scope('[data-t="a:b"] .c')).toBe(`[data-t="a:b"] .c${s}`);
  });

  it('never scopes :global() and leaves :deep() content free', () => {
    expect(scope(':global(body)')).toBe('body');
    expect(scope(':global(.dark) .card')).toBe(`.dark .card${s}`);
    expect(scope('.a :deep(.b)')).toBe(`.a${s} .b`);
  });

  it('warns about shadow-only selectors in a light-DOM component and leaves them', () => {
    const warnings: string[] = [];
    expect(scopeSelector(':host(.dark) .x', 'x', (m) => warnings.push(m))).toBe(':host(.dark) .x');
    expect(warnings).toHaveLength(1);
  });
});

describe('scopeNodes', () => {
  it('goes through @media and leaves keyframes alone', () => {
    const nodes: StyleNode[] = [
      { kind: 'at-rule', name: 'media', params: '(min-width: 40rem)', nodes: [{ kind: 'rule', selector: '.a', nodes: [] }] },
      { kind: 'at-rule', name: 'keyframes', params: 'spin', nodes: [{ kind: 'rule', selector: 'from', nodes: [] }] },
    ];
    expect(printStyle(scopeNodes(nodes, 'x'), true)).toBe(`@media (min-width: 40rem){.a${s}{}}@keyframes spin{from{}}`);
  });
});

// The engine's part, faked: what processCss returns for `.card { padding: 1rem }` and the like.
const card = (selector = '.card'): StyleNode[] => [
  { kind: 'rule', selector, nodes: [{ kind: 'declaration', property: 'padding', value: '1rem', important: false }] },
];

describe('transformTemplates with <style>', () => {
  const run = (code: string, process = (_css: string) => card()) => {
    const seen: string[] = [];
    const result = transformTemplates(code, '/app/src/Card.tsx', {
      sourceRoot: '/app',
      styles: { process: (css) => (seen.push(css), process(css)), minify: true },
    });
    return { result: result!, seen };
  };

  it('takes a scoped block out of the template and stamps every element the component renders', () => {
    const { result, seen } = run(`
      export function Card() {
        return (
          <section class="card">
            <style scoped>{\`.card { padding: 1rem }\`}</style>
            <h2>Title</h2>
            <Button />
          </section>
        );
      }
    `);
    const id = hash('src/Card.tsx:Card');
    expect(seen).toEqual(['.card { padding: 1rem }']);
    expect(result.styles).toEqual([
      expect.objectContaining({ id, scoped: true, component: 'Card', css: `.card[data-fx-s="${id}"]{padding:1rem;}`, line: 5, column: 12 }),
    ]);
    expect(result.code).not.toContain('<style');
    // Static attributes in the template itself: no runtime work, every render carries them.
    expect(result.code).toContain(`<section data-fx-s=\\"${id}\\" class=\\"card\\"><h2 data-fx-s=\\"${id}\\">Title</h2>`);
    // A component draws its own elements; the scope belongs to this one's.
    expect(result.code).not.toMatch(/Button[^\\n]*data-fx-s/);
  });

  it('names an arrow-function component after its variable, and keeps a global block unscoped', () => {
    const { result } = run(`
      export const Panel = () => (
        <div>
          <style>{\`.panel { padding: 1rem }\`}</style>
        </div>
      );
    `, () => card('.panel'));
    expect(result.styles?.[0]).toMatchObject({ component: 'Panel', scoped: false, css: '.panel{padding:1rem;}' });
    expect(result.code).not.toContain('data-fx-s');
    expect(result.code).not.toContain('<style');
  });

  it('gives the same component the same id on every compile', () => {
    const code = `export function Card() { return <div><style scoped>{\`.a{}\`}</style></div>; }`;
    expect(run(code).result.styles?.[0]?.id).toBe(run(code).result.styles?.[0]?.id);
  });

  it('says why a block with interpolation or bare CSS is left alone', () => {
    const { result } = run(`
      export function Card() {
        const x = 'red';
        return <div><style scoped>{\`.a { color: \${x} }\`}</style></div>;
      }
    `);
    expect(result.styles).toBeUndefined();
    expect(result.styleDiagnostics?.[0]?.message).toContain('Only css`` values can be interpolated');
  });

  it('leaves <style> as an ordinary element without a processor', () => {
    const code = `export function Card() { return <div><style>{\`.a{}\`}</style></div>; }`;
    const result = transformTemplates(code, '/app/src/Card.tsx', {});
    expect(result?.styles).toBeUndefined();
    expect(result?.code).toContain('style');
  });

  it('compiles a scoped block in an html template the same way', () => {
    const { result, seen } = run(`
      export function Card() {
        return html\`
          <style scoped>.card { padding: 1rem }</style>
          <section class="card"><h2>Title</h2></section>
        \`;
      }
    `);
    const id = hash('src/Card.tsx:Card');
    expect(seen).toEqual(['.card { padding: 1rem }']);
    expect(result.styles?.[0]).toMatchObject({ id, scoped: true, component: 'Card', css: `.card[data-fx-s="${id}"]{padding:1rem;}` });
    expect(result.code).not.toContain('<style');
    expect(result.code).toContain(`<section data-fx-s=\\"${id}\\" class=\\"card\\"><h2 data-fx-s=\\"${id}\\">Title</h2></section>`);
  });

  it('names a custom element class block after the class', () => {
    const { result } = run(`
      class FxCard extends HTMLElement {
        render() {
          return html\`<style scoped>.card { padding: 1rem }</style><article class="card"></article>\`;
        }
      }
    `);
    expect(result.styles?.[0]).toMatchObject({ component: 'FxCard', id: hash('src/Card.tsx:FxCard'), scoped: true });
  });
});

describe('css`` literals', () => {
  // Each piece of CSS the engine sees comes back as one rule named after it, so the order and
  // the scoping of composed values can be read straight off the output.
  const echo = (css: string): StyleNode[] => [{ kind: 'rule', selector: css.trim().split(/\s*\{/)[0]!, nodes: [] }];
  const run = (code: string) =>
    transformTemplates(code, '/app/src/card.styles.tsx', { sourceRoot: '/app', styles: { process: echo, minify: true } })!;

  it('compiles a literal to a handle, takes the import away and keeps the CSS for the build', () => {
    const result = run(`import { css, other } from '@fluixi/core';\nexport const base = css\`.base { color: red }\`;`);
    const id = hash('src/card.styles.tsx:css:base');
    expect(result.code).toContain(`export const base = ({ $fxStyle: "${id}" });`);
    expect(result.code).toContain(`import { other } from "@fluixi/core";`);
    expect(result.code).not.toMatch(/\bcss`/);
    expect(result.styleLiterals).toEqual([{ id, name: 'base', css: '.base{}', nodes: expect.any(Array) }]);
    expect(result.styles).toBeUndefined();
  });

  it('composes literals in the order written, on the AST', () => {
    const result = run(`
      import { css } from '@fluixi/core';
      const base = css\`.base { a: 1 }\`;
      const primary = css\`.primary { b: 1 }\`;
      export const button = css\`\${base}\${primary}.button { c: 1 }\`;
    `);
    expect(result.styleLiterals?.find((l) => l.name === 'button')?.css).toBe('.base{}.primary{}.button{}');
  });

  it('scopes a value composed into <style scoped> with the component, as one block', () => {
    const result = run(`
      import { css } from '@fluixi/core';
      const shared = css\`.card { a: 1 }\`;
      export function Card() {
        return <div><style scoped>{\`\${shared} .title { b: 1 }\`}</style></div>;
      }
    `);
    const id = hash('src/card.styles.tsx:Card');
    expect(result.styles).toEqual([
      expect.objectContaining({ id, scoped: true, css: `.card[data-fx-s="${id}"]{}.title[data-fx-s="${id}"]{}` }),
    ]);
  });

  it('uses a value from another module once the build has resolved it, by its export name', () => {
    const result = transformTemplates(
      `
      import { css } from '@fluixi/core';
      import { base as shared } from './base.styles';
      export const card = css\`\${shared} .card { a: 1 }\`;
    `,
      '/app/src/card.styles.tsx',
      {
        sourceRoot: '/app',
        styles: { process: echo, minify: true, imported: new Map([['./base.styles#base', echo('.base { a: 1 }')]]) },
      },
    )!;
    expect(result.styleReferences).toBeUndefined();
    expect(result.styleLiterals?.[0]?.css).toBe('.base{}.card{}');
  });

  it('reports a value from another module for the build, and a cycle', () => {
    const imported = run(`
      import { css } from '@fluixi/core';
      import { base } from './base.styles';
      export const card = css\`\${base} .card { a: 1 }\`;
    `);
    expect(imported.styleReferences).toEqual([expect.objectContaining({ name: 'base', source: './base.styles' })]);
    const cycle = run(`
      import { css } from '@fluixi/core';
      const a = css\`\${b}\`;
      const b = css\`\${a}\`;
    `);
    expect(cycle.styleDiagnostics?.some((d) => d.message.includes('include each other'))).toBe(true);
  });
});

describe('style source maps', () => {
  it('maps each rule and declaration of a block back to where it was written in the module', () => {
    // As the engine reports positions: from the start of the CSS it was given.
    const process = (): StyleNode[] => [
      {
        kind: 'rule',
        selector: '.card',
        loc: { source: 'src/Card.tsx', line: 2, column: 2 },
        nodes: [{ kind: 'declaration', property: 'padding', value: '1rem', important: false, loc: { source: 'src/Card.tsx', line: 3, column: 4 } }],
      },
    ];
    const code = [
      'export function Card() {',
      '  return <div><style scoped>{`',
      '  .card {',
      '    padding: 1rem;',
      '  }`}</style></div>;',
      '}',
    ].join('\n');
    const result = transformTemplates(code, '/app/src/Card.tsx', { sourceRoot: '/app', styles: { process } })!;
    const style = result.styles![0]!;
    expect(style.map?.sources).toEqual(['/app/src/Card.tsx']);
    expect(style.map?.sourcesContent).toEqual([code]);
    const trace = new TraceMap(style.map as never);
    // Generated line 1 is the rule, line 2 the declaration (not minified).
    expect(originalPositionFor(trace, { line: 1, column: 0 })).toMatchObject({ line: 3, column: 2 });
    expect(originalPositionFor(trace, { line: 2, column: 2 })).toMatchObject({ line: 4, column: 4 });
  });
});

describe('shadow-DOM elements', () => {
  const echo = (css: string): StyleNode[] => [{ kind: 'rule', selector: css.trim().split(/\s*\{/)[0]!, nodes: [] }];
  const run = (code: string) =>
    transformTemplates(code, '/app/src/fx-card.tsx', { sourceRoot: '/app', styles: { process: echo, minify: true } })!;

  it('sends a shadow element\'s block to its shadow root: no scope, no stamp, in static styles', () => {
    const result = run(`
      class FxCard extends HTMLReactiveElement {
        static shadow = true;
        render() {
          return <article class="card"><style scoped>{\`.card { a: 1 }\`}</style><slot /></article>;
        }
      }
    `);
    expect(result.styles).toEqual([expect.objectContaining({ shadow: true, scoped: false, css: '.card{}' })]);
    expect(result.code).not.toContain('data-fx-s');
    expect(result.code).toContain('import __fxShadow0 from "/app/src/fx-card.tsx.fx-0.css?inline";');
    expect(result.code).toContain('static styles = [__fxShadow0];');
  });

  it('keeps what static styles had, with css`` values turned into their CSS', () => {
    const result = run(`
      import { css } from '@fluixi/core';
      import { base } from './base.styles';
      const local = css\`.local { a: 1 }\`;
      class FxCard extends HTMLReactiveElement {
        static shadow = 'open';
        static styles = [base, local, ':host { display: block }'];
        render() {
          return html\`<style>.card { a: 1 }</style><article class="card"></article>\`;
        }
      }
    `);
    expect(result.code).toContain('fx-card.tsx.fx-0.css?inline');
    expect(result.code).toMatch(/import (__fxShadow\d+) from "\.\/base\.styles\.fx-literal-base\.css\?inline";/);
    expect(result.code).toMatch(/import (__fxShadow\d+) from "\/app\/src\/fx-card\.tsx\.fx-literal-local\.css\?inline";/);
    expect(result.code).toMatch(/static styles = \[\[__fxShadow\d+, __fxShadow\d+, ':host \{ display: block \}'\], __fxShadow\d+\];/);
  });

  it('scopes a light-DOM element as before', () => {
    const result = run(`
      class FxCard extends HTMLReactiveElement {
        render() {
          return <article class="card"><style scoped>{\`.card { a: 1 }\`}</style></article>;
        }
      }
    `);
    expect(result.styles?.[0]).toMatchObject({ scoped: true });
    expect(result.code).toContain('data-fx-s');
    expect(result.code).not.toContain('static styles');
  });
});


describe('<style> in html`` templates', () => {
  const echo = (css: string): StyleNode[] =>
    css.trim() ? [{ kind: 'rule', selector: css.trim().split(/\s*\{/)[0]!, nodes: [] }] : [];
  const run = (code: string) =>
    transformTemplates(code, '/app/src/card.tsx', { sourceRoot: '/app', styles: { process: echo, minify: true } })!;

  it('composes css`` values interpolated by name, in written order, and scopes them with the block', () => {
    const result = run(`
      import { css } from '@fluixi/core';
      const base = css\`.base { a: 1 }\`;
      export function Card() {
        return html\`<style scoped>\${base} .card { b: 1 }</style><article class="card"></article>\`;
      }
    `);
    const id = hash('src/card.tsx:Card');
    expect(result.styleDiagnostics).toBeUndefined();
    expect(result.styles).toEqual([
      expect.objectContaining({ id, scoped: true, css: `.base[data-fx-s="${id}"]{}.card[data-fx-s="${id}"]{}` }),
    ]);
    expect(result.code).not.toContain('<style');
    expect(result.code).toContain(`<article data-fx-s=\\"${id}\\" class=\\"card\\">`);
  });

  it('keeps blocks apart: an expression outside a <style> is the template\'s own', () => {
    const result = run(`
      export function Card(props) {
        return html\`<style>.a { a: 1 }</style><p>\${() => props.text}</p><style>.b { b: 1 }</style>\`;
      }
    `);
    expect(result.styleDiagnostics).toBeUndefined();
    expect(result.styles?.map((s) => s.css)).toEqual(['.a{}', '.b{}']);
  });

  it('refuses a dynamic value in a block, as in JSX', () => {
    const result = run(`
      export function Card(props) {
        return html\`<style>.a { color: \${props.color} }</style><p></p>\`;
      }
    `);
    expect(result.styleDiagnostics?.[0]?.message).toContain('Only css`` values can be interpolated');
  });

  it('maps a block back to the template line it was written on', () => {
    const code = ['export function Card() {', '  return html`', '    <style>', '      .card { a: 1 }', '    </style>`;', '}'].join('\n');
    const result = transformTemplates(code, '/app/src/card.tsx', { sourceRoot: '/app', styles: { process: () => [{ kind: 'rule', selector: '.card', nodes: [], loc: { source: 'src/card.tsx', line: 2, column: 6 } }] } })!;
    const trace = new TraceMap(result.styles![0]!.map as never);
    expect(originalPositionFor(trace, { line: 1, column: 0 })).toMatchObject({ line: 4, column: 6 });
  });
});

describe('$html, $svg and $css in an app', () => {
  const echo = (css: string): StyleNode[] => (css.trim() ? [{ kind: 'rule', selector: css.trim().split(/\s*\{/)[0]!, nodes: [] }] : []);
  const run = (code: string, intrinsics?: boolean) =>
    transformTemplates(code, '/app/src/card.tsx', { sourceRoot: '/app', styles: { process: echo, minify: true }, ...(intrinsics === false ? { intrinsics } : {}) })!;

  it('compiles the tags with no import, as their markers', () => {
    const result = run(`
      const base = $css\`.base { a: 1 }\`;
      export function Card() {
        return $html\`<style scoped>\${base} .card { b: 1 }</style><article class="card">\${$svg\`<circle r="1"></circle>\`}</article>\`;
      }
    `);
    const id = hash('src/card.tsx:Card');
    expect(result.styleDiagnostics).toBeUndefined();
    expect(result.styleLiterals?.[0]).toMatchObject({ name: 'base', css: '.base{}' });
    expect(result.styles?.[0]?.css).toBe(`.base[data-fx-s="${id}"]{}.card[data-fx-s="${id}"]{}`);
    expect(result.code).not.toMatch(/\$(html|svg|css)`/);
    const svg = (tag: string) => transformTemplates(`export const c = () => ${tag}\`<circle r="1"></circle>\`;`, '/app/src/c.ts', {})!.code;
    expect(svg('$svg')).toBe(svg('svg'));
  });

  it('leaves a module\'s own binding of the name alone, and the tags off when intrinsics are', () => {
    const own = run(`
      const $html = (s) => s.join('');
      export const text = $html\`<p>x</p>\`;
    `);
    expect(own?.code ?? '').not.toContain('createNativeElement');
    const off = transformTemplates('export const v = $css`.a { a: 1 }`;', '/app/src/v.ts', { styles: { process: echo }, intrinsics: false });
    expect(off?.styleLiterals).toBeUndefined();
  });

  it('takes css from @fluixi/core', () => {
    const result = run(`import { css, html } from '@fluixi/core';\nexport const base = css\`.base { a: 1 }\`;`);
    expect(result.styleLiterals?.[0]?.css).toBe('.base{}');
    expect(result.code).toContain('import { html } from "@fluixi/core";');
  });
});
