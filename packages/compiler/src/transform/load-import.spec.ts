/**
 * `load:` on a component the file imported itself.
 *
 * Deferring means creating the reference as a dynamic import, so a static one has to go.
 * That is only safe when the name is used exclusively as a tag, JSX names are
 * `JSXIdentifier`, so "any `Identifier` reference at all" is an exact disqualifier rather
 * than a heuristic.
 */
import { describe, it, expect } from 'vitest';
import { transformTemplates } from './templates.js';

const OPTS = { format: 'jsx', runtimeModule: '@fluixi/dom' } as never;
const run = (code: string) => transformTemplates(code, 'a.tsx', OPTS)!;

describe('an imported component with a deferring load:', () => {
  const SRC = "import { Chart } from './Chart';\nexport function App() { return <Chart load:visible />; }";

  it('defers it instead of warning', () => {
    const out = run(SRC);
    expect(out.code).toContain("deferred(() => import(\"./Chart\")");
    expect(out.code).toContain('export: "Chart"');
    expect(out.loadDiagnostics).toBeUndefined();
  });

  it('takes the static import away, or the chunk would not split', () => {
    expect(run(SRC).code).not.toMatch(/import \{ Chart \} from '\.\/Chart'/);
  });

  it('declares the binding before the code that uses it', () => {
    const code = run(SRC).code;
    expect(code.indexOf('const Chart = deferred')).toBeLessThan(code.indexOf('export function App'));
  });

  it('imports `deferred` once', () => {
    const out = run(SRC);
    expect(out.code.match(/import \{ deferred \}/g)).toHaveLength(1);
  });

  it('carries the strategy across', () => {
    const out = run(
      "import { Chart } from './Chart';\nexport function App() { return <Chart load:media=\"(min-width: 40rem)\" />; }",
    );
    expect(out.code).toContain('media');
    expect(out.code).toContain('(min-width: 40rem)');
  });

  it('handles a default import', () => {
    const out = run("import Chart from './Chart';\nexport function App() { return <Chart load:idle />; }");
    expect(out.code).toContain('export: "default"');
  });

  it('keeps the siblings of the specifier it removed', () => {
    const out = run(
      "import { Chart, Legend } from './charts';\n" +
        'export function App() { return <div><Chart load:idle /><Legend /></div>; }',
    );
    expect(out.code).toContain('import { Legend } from "./charts"');
    expect(out.code).toContain('deferred(() => import("./charts")');
  });
});

describe('when the import has to stay', () => {
  it('refuses when the name is used as a value, and says so', () => {
    const out = run(
      "import { Chart } from './Chart';\n" +
        'export function App() { register(Chart); return <Chart load:idle />; }',
    );
    expect(out.code).toContain("import { Chart } from './Chart'");
    expect(out.code).not.toContain('deferred(');
    expect(out.loadDiagnostics).toHaveLength(1);
  });

  it('refuses a namespace import — there is no single export to defer', () => {
    const out = run(
      "import * as Chart from './Chart';\nexport function App() { return <Chart load:idle />; }",
    );
    expect(out.code).not.toContain('deferred(');
    expect(out.loadDiagnostics).toHaveLength(1);
  });

  it('refuses a component declared in the file — there is no module to import', () => {
    const out = run('function Chart() { return <i />; }\nexport function App() { return <Chart load:idle />; }');
    expect(out.code).not.toContain('deferred(');
    expect(out.loadDiagnostics).toHaveLength(1);
  });

  it('leaves load:eager alone, which defers nothing', () => {
    const out = run("import { Chart } from './Chart';\nexport function App() { return <Chart load:eager />; }");
    expect(out.code).toContain("import { Chart } from './Chart'");
    expect(out.loadDiagnostics).toBeUndefined();
  });
});
