import { describe, it, expect } from 'vitest';
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
      { id, scoped: true, component: 'Card', css: `.card[data-fx-s="${id}"]{padding:1rem;}`, line: 5, column: 12 },
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
    expect(result.styleDiagnostics?.[0]?.message).toContain('one static template literal');
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
