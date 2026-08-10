import { describe, it, expect } from 'vitest';
import { compile as compileFixture } from '../../../test/fixtures.js';

const RULES = [
  { components: { Chart: '@app/chart', Dialog: '@app/dialog', Button: '@app/button' } },
];

const compile = (code: string, options: Record<string, unknown> = {}): string =>
  compileFixture(code, { filename: 'test.tsx', format: 'both', resolve: RULES, ...options });

describe('load: directive', () => {
  it('emits a dynamic import instead of a static one', () => {
    const out = compile('const v = <Chart load:visible/>;');
    expect(out).toContain('const Chart = deferred(() => import("@app/chart")');
    expect(out).not.toContain('import { Chart }');
  });

  it('imports the runtime from core', () => {
    const out = compile('const v = <Chart load:idle/>;');
    expect(out).toContain('import { deferred } from "@fluixi/core"');
  });

  it('passes the strategy and the export name through', () => {
    const out = compile('const v = <Chart load:visible="200px"/>;');
    expect(out).toContain('kind: "visible"');
    expect(out).toContain('rootMargin: "200px"');
    expect(out).toContain('export: "Chart"');
  });

  it('defaults interaction to pointer, focus and key', () => {
    const out = compile('const v = <Dialog load:interaction/>;');
    expect(out).toContain('"pointerdown"');
    expect(out).toContain('"focusin"');
    expect(out).toContain('"keydown"');
  });

  it('takes named interaction events', () => {
    const out = compile('const v = <Dialog load:interaction="click focus"/>;');
    expect(out).toContain('events: ["click","focus"]');
  });

  it('carries a media query', () => {
    const out = compile('const v = <Chart load:media="(min-width: 1024px)"/>;');
    expect(out).toContain('query: "(min-width: 1024px)"');
  });

  it('never becomes a prop on the component', () => {
    const out = compile('const v = <Chart load:visible data-x="1"/>;');
    expect(out).not.toMatch(/["']load:visible["']\s*:/);
  });

  it('leaves an eager component as a static import', () => {
    const out = compile('const v = <Button/>;');
    expect(out).toContain('import { Button } from "@app/button"');
    expect(out).not.toContain('deferred(');
  });
});

describe('collapsing within a file', () => {
  // A deferred boundary around a module that is already in the chunk adds a wrapper,
  // a promise and a re-render in order to fetch nothing — and emitting both forms
  // would redeclare the binding.
  it('collapses when the eager usage comes first', () => {
    const out = compile('const v = <><Button/><Button load:visible/></>;');
    expect(out).toContain('import { Button } from "@app/button"');
    expect(out).not.toContain('deferred(');
  });

  it('collapses when the eager usage comes second', () => {
    const out = compile('const v = <><Button load:visible/><Button/></>;');
    expect(out).toContain('import { Button } from "@app/button"');
    expect(out).not.toContain('deferred(');
  });

  it('emits exactly one binding for the collapsed name', () => {
    const out = compile('const v = <><Button/><Button load:idle/></>;');
    // Declarations of the name, not usages of it.
    const bindings = out
      .split('\n')
      .filter((l) => /^import .*\bButton\b/.test(l) || /^const Button\b/.test(l));
    expect(bindings).toHaveLength(1);
  });

  it('keeps distinct modules apart', () => {
    const out = compile('const v = <><Button/><Chart load:visible/></>;');
    expect(out).toContain('import { Button } from "@app/button"');
    expect(out).toContain('deferred(() => import("@app/chart")');
  });
});

describe('load: rejects what it cannot honour', () => {
  it('rejects an unknown strategy', () => {
    expect(() => compile('const v = <Chart load:whenever/>;')).toThrow(/Unknown load strategy/);
  });

  it('rejects a runtime value, since the strategy is compile-time', () => {
    expect(() => compile('const v = <Chart load:visible={margin}/>;')).toThrow(/compile-time/);
  });

  it('requires a query for load:media', () => {
    expect(() => compile('const v = <Chart load:media/>;')).toThrow(/needs a query/);
  });
});

describe('an author-written import still wins', () => {
  it('does not defer a name bound in the file', () => {
    const out = compile("import { Chart } from './mine.js';\nconst v = <Chart load:visible/>;");
    expect(out).not.toContain('deferred(');
    expect(out).toContain("from './mine.js'");
  });
});

describe('html`` produces the same result as JSX', () => {
  const strip = (out: string) =>
    out.split('\n').filter((l) => /^(import|const \w+ = deferred)/.test(l)).sort();

  it('defers a tag in a template', () => {
    const out = compile('const v = html`<Chart load:visible="200px"/>`;', { format: 'lit' });
    expect(out).toContain('deferred(() => import("@app/chart")');
    expect(out).toContain('rootMargin: "200px"');
  });

  it('injects the same bindings from either syntax', () => {
    const lit = compile('const v = html`<Chart load:idle/>`;', { format: 'lit' });
    const jsx = compile('const v = <Chart load:idle/>;', { format: 'jsx' });
    expect(strip(lit)).toEqual(strip(jsx));
  });

  it('collapses inside a template too', () => {
    const out = compile('const v = html`<Button/><Button load:visible/>`;', { format: 'lit' });
    expect(out).toContain('import { Button } from "@app/button"');
    expect(out).not.toContain('deferred(');
  });

  it('does not leak load: into the props object', () => {
    const out = compile('const v = html`<Chart load:idle/>`;', { format: 'lit' });
    expect(out).not.toContain('load:');
  });
});
