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
