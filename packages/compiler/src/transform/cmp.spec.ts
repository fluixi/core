/**
 * Two spellings of the same intent must compile to the same thing.
 *
 * A `resolve` rule and an import the author wrote both end in a deferred binding; if the
 * outputs merely resembled each other, the choice would carry a hidden cost.
 */
import { describe, it, expect } from 'vitest';
import { transformTemplates } from './templates.js';

const BASE = { format: 'jsx', runtimeModule: '@fluixi/dom' } as const;

const viaResolve = (src: string) =>
  transformTemplates(src, 'a.tsx', {
    ...BASE,
    resolve: [{ components: { Chart: './Chart' } }],
  } as never)!.code;

const viaImport = (src: string) =>
  transformTemplates(`import { Chart } from './Chart';\n${src}`, 'a.tsx', BASE as never)!.code;

describe('a resolve rule and your own import', () => {
  it('compile to the same output', () => {
    const body = 'export function App() { return <Chart load:visible="200px" />; }';
    expect(viaImport(body)).toBe(viaResolve(body));
  });

  it('agree for every strategy', () => {
    for (const directive of ['load:idle', 'load:interaction', 'load:media="(min-width: 40rem)"']) {
      const body = `export function App() { return <Chart ${directive} />; }`;
      expect(viaImport(body)).toBe(viaResolve(body));
    }
  });
});

describe('load:never', () => {
  const compile = (ssr: boolean | undefined) =>
    transformTemplates(
      `import { Price } from './Price';\nexport function App() { return <Price load:never />; }`,
      'a.tsx',
      { ...BASE, ssr } as never,
    )!.code;

  it('leaves the browser build with no import of the component', () => {
    const code = compile(false);
    expect(code).not.toContain('./Price');
    expect(code).toContain('const Price = deferred(null, { strategy: { kind: "never" }');
  });

  it('loads it on the server, and wherever the build is not known', () => {
    for (const ssr of [true, undefined]) {
      const code = compile(ssr);
      expect(code).toContain('deferred(() => import("./Price")');
      expect(code).not.toMatch(/^import \{ Price \}/m);
    }
  });
});

describe('load: diagnostics and mixed uses', () => {
  const run = (code: string) =>
    transformTemplates(code, 'a.tsx', { ...BASE, format: 'both', resolve: [{ components: { Rule: './rule' } }] } as never)!;
  const messages = (code: string) => (run(code) as { loadDiagnostics?: { message: string }[] }).loadDiagnostics?.map((d) => d.message) ?? [];

  it('keeps an imported component eager everywhere when one use has no load:, as a rule does', () => {
    const result = run(`import { Heavy } from './heavy';\nexport function A() { return <div><Heavy load:idle /><Heavy /></div>; }`);
    expect(result.code).toContain(`import { Heavy } from './heavy';`);
    expect(result.code).not.toContain('deferred(');
  });

  it('reports load:never beside an eager use, imported or from a rule', () => {
    expect(messages(`import { Heavy } from './heavy';\nexport function A() { return <div><Heavy load:never /><Heavy /></div>; }`)).toEqual([
      expect.stringContaining('<Heavy> is also rendered without load: in this file'),
    ]);
    expect(messages(`export function A() { return <div><Rule load:never /><Rule /></div>; }`)).toEqual([
      expect.stringContaining('the components from ./rule: the same module is also rendered without load:'),
    ]);
  });

  it('names the namespace import for a namespace member', () => {
    expect(messages(`import * as NS from './heavy';\nexport function A() { return <NS.default load:idle />; }`)).toEqual([
      expect.stringContaining('NS.default came in through a namespace import'),
    ]);
  });

  it('points an html expression tag to the bare form', () => {
    expect(messages("import { Chart } from './chart';\nexport function A() { return html`<${Chart} load:visible=\"200px\" />`; }")).toEqual([
      expect.stringContaining('Write <Chart load:...> instead'),
    ]);
  });

  it('refuses a hole in a load: value in html, as JSX does', () => {
    expect(() => run("import { Chart } from './chart';\nconst m = '1px';\nexport function A() { return html`<Chart load:visible=${m} />`; }")).toThrow(
      "'load:visible' needs a literal value, not an expression: the strategy is compile-time.",
    );
  });
});
