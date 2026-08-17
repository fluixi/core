/** Every claim the README makes about what the compiler does to your code. */
import { describe, it, expect } from 'vitest';
import { transformTemplates } from './templates.js';
const OPTS = { format: 'both', runtimeModule: '@fluixi/dom' } as never;
const run = (code: string, extra: object = {}) =>
  transformTemplates(code, 'a.tsx', { ...(OPTS as object), ...extra } as never)!;

describe('README claims', () => {
  it('destructured props become property reads, rest becomes splitProps', () => {
    const out = run('function Card({ title, ...rest }) { return <b {...rest}>{title}</b>; }');
    expect(out.code).toContain('props.title');
    expect(out.code).toContain('splitProps(props, ["title"])');
  });

  it('propsDestructure: false turns it off', () => {
    const out = run('function Card({ title }) { return <b>{title}</b>; }', { propsDestructure: false });
    expect(out.code).not.toContain('props.title');
  });

  it('every listed intrinsic compiles', () => {
    const out = run(`
      const a = $signal(0); const b = $memo(() => 1); $effect(() => {});
      const c = $store({}); const d = $resource(f); const e = $selector(s);
      const g = $deferred(h); const i = $untrack(() => 1); const j = $untrackStore(() => 1);
      export const v = <b>{a()}</b>;
    `);
    for (const name of ['signal(', 'memo(', 'effect(', 'store(', 'resource(', 'createSelector(', 'createDeferred(', 'untrack(', 'untrackStore(']) {
      expect(out.code).toContain(name);
    }
  });

  it('a pattern rule resolves a family', () => {
    const out = run('export const v = <Summary />;', {
      resolve: [{ match: /^([A-Z]\w+)$/, module: '/src/components/$1.tsx' }],
    });
    expect(out.code).toContain('from "/src/components/Summary.tsx"');
  });

  it('load: works through a rule and through your own import', () => {
    const viaRule = run('export const v = <Chart load:idle />;', {
      resolve: [{ components: { Chart: './Chart' } }],
    });
    const viaImport = run("import { Chart } from './Chart';\nexport const v = <Chart load:idle />;");
    expect(viaRule.code).toContain('deferred(');
    expect(viaImport.code).toContain('deferred(');
  });

  it('reports what it refused, under the documented names', () => {
    const unresolved = run('export const v = <Summary />;');
    expect(unresolved.unresolvedDiagnostics).toBeTruthy();

    const load = run("import { Chart } from './Chart';\nexport const v = (register(Chart), <Chart load:idle />);");
    expect(load.loadDiagnostics).toBeTruthy();

    const props = run('function C({ a, id = makeId() }) { return <b>{a}{id}</b>; }');
    expect(props.propsDiagnostics).toBeTruthy();

    const intrinsic = run('function $signal() {} export const v = ($signal(), <b>x</b>);');
    expect(intrinsic.intrinsicDiagnostics).toBeTruthy();
  });

  it('returns null only when there is nothing to do', () => {
    expect(transformTemplates('export const x = 1;', 'a.ts', OPTS)).toBeNull();
    expect(transformTemplates('const a = $signal(0);', 'b.ts', OPTS)).not.toBeNull();
  });
});
