/**
 * A `load:` the compiler cannot act on has to say so.
 *
 * Deferring means the compiler creates the binding as a dynamic import. When it doesn't
 * supply the name, the directive does nothing — and the only symptom is a chunk that was
 * never split, which is not something you notice by reading the code.
 */
import { describe, it, expect } from 'vitest';
import { transformTemplates } from './templates.js';

const OPTS = { format: 'jsx', runtimeModule: '@fluixi/dom' } as never;
const run = (code: string) => transformTemplates(code, 'a.tsx', OPTS)!;

describe('a load: that cannot take effect', () => {
  it('reports a statically imported component', () => {
    const out = run(
      "import { Chart } from './Chart';\nexport function App() { return <Chart load:visible />; }",
    );
    expect(out.loadDiagnostics).toHaveLength(1);
    expect(out.loadDiagnostics![0].name).toBe('Chart');
    expect(out.loadDiagnostics![0].message).toMatch(/already imported/);
    expect(out.loadDiagnostics![0].message).toMatch(/resolve/);
  });

  it('reports a name nothing supplies, with the other fix', () => {
    const out = run('export function App() { return <Chart load:idle />; }');
    expect(out.loadDiagnostics![0].message).toMatch(/nothing supplies/);
  });

  it('names the strategy that was ignored', () => {
    const out = run(
      "import { Chart } from './Chart';\nexport function App() { return <Chart load:media=\"(min-width: 40rem)\" />; }",
    );
    expect(out.loadDiagnostics![0].strategy.kind).toBe('media');
    expect(out.loadDiagnostics![0].message).toContain('load:media');
  });

  it('reports each name once, not once per usage', () => {
    const out = run(
      "import { Chart } from './Chart';\n" +
        'export function App() { return <div><Chart load:idle /><Chart load:idle /></div>; }',
    );
    expect(out.loadDiagnostics).toHaveLength(1);
  });
});

describe('a load: that does take effect', () => {
  const RESOLVED = {
    ...(OPTS as object),
    resolve: [{ components: { Chart: '/src/Chart.tsx' } }],
  } as never;

  it('says nothing when the compiler supplies the binding', () => {
    const out = transformTemplates('export function App() { return <Chart load:visible />; }', 'a.tsx', RESOLVED)!;
    expect(out.loadDiagnostics).toBeUndefined();
    // And it actually defers, which is the behaviour the diagnostic is about.
    expect(out.code).toMatch(/deferred|import\(/);
  });

  it('says nothing about load:eager, which defers nothing by definition', () => {
    const out = run("import { Chart } from './Chart';\nexport function App() { return <Chart load:eager />; }");
    expect(out.loadDiagnostics).toBeUndefined();
  });
});

describe('a tag nothing supplies', () => {
  it('reports it, since it compiles to an undefined reference', () => {
    const out = run('export function App() { return <Summary total={1} />; }');
    expect(out.unresolvedDiagnostics).toHaveLength(1);
    expect(out.unresolvedDiagnostics![0].name).toBe('Summary');
    expect(out.unresolvedDiagnostics![0].message).toMatch(/renders\s+nothing/);
  });

  it('says nothing when the file imports it', () => {
    const out = run("import { Summary } from './Summary';\nexport function App() { return <Summary />; }");
    expect(out.unresolvedDiagnostics).toBeUndefined();
  });

  it('says nothing about a component declared in the file', () => {
    const out = run('function Row() { return <li />; }\nexport function App() { return <Row />; }');
    expect(out.unresolvedDiagnostics).toBeUndefined();
  });

  it('says nothing about one declared inside a function', () => {
    // Scope-blind on purpose: warning here would be pure noise.
    const out = run('export function App() { const Row = () => <li />; return <Row />; }');
    expect(out.unresolvedDiagnostics).toBeUndefined();
  });

  it('says nothing about a resolved component, or a builtin', () => {
    const resolved = transformTemplates(
      'export function App() { return <div><Summary /><Show when={1}>x</Show></div>; }',
      'a.tsx',
      { ...(OPTS as object), resolve: [{ components: { Summary: '/src/Summary.tsx' } }] } as never,
    )!;
    expect(resolved.unresolvedDiagnostics).toBeUndefined();
  });

  it('reports each name once, however many usages', () => {
    const out = run('export function App() { return <div><Summary /><Summary /></div>; }');
    expect(out.unresolvedDiagnostics).toHaveLength(1);
  });
});
