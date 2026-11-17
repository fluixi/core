/**
 * The props rewrite, on real source.
 *
 * The point of the JSX and html`` pairs is that neither authoring mode is special: both
 * come out reading `props.x`, because the rewrite happens to the function body before
 * either one is compiled.
 */
import { describe, it, expect } from 'vitest';
import { transformProps } from './props.js';

const run = (code: string) => transformProps(code, 'test.tsx');
const out = (code: string) => run(code).code;

describe('rewriting a component', () => {
  it('replaces the pattern with a parameter and the uses with property reads', () => {
    const code = out('function Card({ title }) { return <h1>{title}</h1>; }');
    expect(code).toContain('function Card(props)');
    expect(code).toContain('{props.title}');
  });

  it('does the same for an html template', () => {
    const code = out('function Card({ title }) { return html`<h1>${title}</h1>`; }');
    expect(code).toContain('function Card(props)');
    expect(code).toContain('${props.title}');
  });

  it('handles an arrow assigned to a capitalised name', () => {
    const code = out('const Card = ({ title }) => <h1>{title}</h1>;');
    expect(code).toContain('const Card = (props) =>');
    expect(code).toContain('{props.title}');
  });

  it('keeps an alias pointing at the original property', () => {
    expect(out('function C({ title: heading }) { return <h1>{heading}</h1>; }')).toContain('{props.title}');
  });

  it('follows a nested pattern', () => {
    const code = out('function C({ user: { name } }) { return <p>{name}</p>; }');
    expect(code).toContain('{props.user.name}');
  });

  it('tests a default against undefined, not with ??', () => {
    // `??` would also swallow null, which a JS default does not.
    const code = out("function C({ size = 'md' }) { return <b>{size}</b>; }");
    expect(code).toContain("(props.size === undefined ? 'md' : props.size)");
  });

  it('rewrites every use, not just the first', () => {
    const code = out('function C({ n }) { const twice = n + n; return <b>{twice + n}</b>; }');
    expect(code.match(/props\.n/g)).toHaveLength(3);
  });

  it('reports how much it changed', () => {
    expect(run('function C({ a, b }) { return <i>{a}{b}</i>; }').rewritten).toBe(2);
  });
});

describe('what it must not touch', () => {
  it('leaves a member property with the same name alone', () => {
    const code = out('function C({ name }) { return <b>{other.name}{name}</b>; }');
    expect(code).toContain('{other.name}');
    expect(code).toContain('{props.name}');
  });

  it('writes the key out when rewriting a shorthand property', () => {
    const code = out('function C({ name }) { const o = { name }; return <b>{o.name}</b>; }');
    expect(code).toContain('{ name: props.name }');
  });

  it('leaves a non-computed object key alone', () => {
    const code = out('function C({ name }) { const o = { name: 1, other: name }; return <b>{o}</b>; }');
    expect(code).toContain('name: 1');
    expect(code).toContain('other: props.name');
  });

  it('leaves lowercase functions alone — only components take reactive props', () => {
    const code = 'function helper({ a }) { return a + 1; }';
    expect(out(code)).toBe(code);
  });

  it('leaves a plain identifier parameter alone', () => {
    const code = 'function C(props) { return <b>{props.a}</b>; }';
    expect(out(code)).toBe(code);
  });

  it('leaves the whole function alone when any binding bails', () => {
    // Half a rewrite would read as if the part it skipped were fine too.
    const code = 'function C({ a, size = makeSize() }) { return <b>{a}{size}</b>; }';
    expect(out(code)).toBe(code);
  });

  it('leaves a reassigned binding alone', () => {
    const code = 'function C({ n }) { n = 2; return <b>{n}</b>; }';
    expect(out(code)).toBe(code);
  });

  it('keeps the props type exactly as written', () => {
    // Babel's pattern range covers the annotation, so a naive overwrite eats the type.
    const code = out('function C({ title }: { title: string }) { return <h1>{title}</h1>; }');
    expect(code).toContain('function C(props: { title: string })');
    expect(code).toContain('{props.title}');
  });

  it('avoids colliding with an existing props name', () => {
    const code = out('function C({ a }) { const props = 1; return <b>{a}{props}</b>; }');
    expect(code).toContain('function C(_props)');
    expect(code).toContain('{_props.a}');
  });
});

describe('reporting', () => {
  it('says which binding it could not rewrite and why', () => {
    const { diagnostics } = run('function C({ a, onPick = () => {} }) { return <b>{a}</b>; }');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].name).toBe('onPick');
    expect(diagnostics[0].reason).toBe('unsafe-default');
    expect(diagnostics[0].message).toMatch(/every read/);
  });

  it('reports nothing for source it rewrote cleanly', () => {
    expect(run('function C({ a }) { return <b>{a}</b>; }').diagnostics).toEqual([]);
  });

  it('carries a source map', () => {
    const { map } = run('function C({ a }) { return <b>{a}</b>; }');
    expect(map.mappings.length).toBeGreaterThan(0);
  });
});

describe('a rest element', () => {
  it('writes the splitProps call instead of refusing the pattern', () => {
    const code = out('function C({ a, ...rest }) { return <b {...rest}>{a}</b>; }');
    expect(code).toContain('function C(props)');
    expect(code).toContain('const [, rest] = splitProps(props, ["a"]);');
    expect(code).toContain('{props.a}');
  });

  it('imports splitProps when the module does not already have it', () => {
    const code = out('function C({ a, ...rest }) { return <b {...rest}>{a}</b>; }');
    expect(code).toContain("import { splitProps } from \"@fluixi/dom\"");
  });

  it('does not import it twice', () => {
    const code = out(
      'import { splitProps } from "@fluixi/dom";\nfunction C({ a, ...rest }) { return <b {...rest}>{a}</b>; }',
    );
    expect(code.match(/import \{ splitProps \}/g)).toHaveLength(1);
  });

  it('excludes every named key, under the key rather than the alias', () => {
    const code = out('function C({ a, b: renamed, ...rest }) { return <b {...rest}>{a}{renamed}</b>; }');
    expect(code).toContain('splitProps(props, ["a", "b"])');
  });

  it('reports nothing, because nothing was refused', () => {
    expect(run('function C({ a, ...rest }) { return <b {...rest}>{a}</b>; }').diagnostics).toEqual([]);
  });

  it('leaves an expression-bodied arrow alone, having nowhere to put the call', () => {
    const code = 'const C = ({ a, ...rest }) => <b {...rest}>{a}</b>;';
    expect(out(code)).toBe(code);
  });
});

describe('destructuring the props parameter in the body', () => {
  it('rewrites a destructure at the top of the body, and a rest into splitProps', () => {
    const result = run(
      'function Panel(props) {\n  const { size, onToggle, ...rest } = props;\n  return <div data-size={size} {...rest} onClick={onToggle}>{props.label}</div>;\n}',
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.code).toContain('const [, rest] = splitProps(props, ["size", "onToggle"]);');
    expect(result.code).toContain('data-size={props.size}');
    expect(result.code).toContain('onClick={props.onToggle}');
    expect(result.code).not.toContain('= props;');
  });

  it('rewrites a name read under a type assertion or a non-null mark', () => {
    const code = out('function Link(props: P) {\n  const { children, ...rest } = props;\n  return <a {...rest}>{children as Element}{rest!}</a>;\n}');
    expect(code).toContain('{props.children as Element}');
    expect(code).not.toMatch(/\{children/);
  });

  it('does the same for a destructured parameter', () => {
    const code = out('function Link({ title }: P) { return <a>{title!}{title satisfies string}</a>; }');
    expect(code).toContain('{props.title!}{props.title satisfies string}');
  });

  it('keeps a default, re-run on each read', () => {
    const code = out("function Panel(props) { const { size = 'md' } = props; return <b>{size}</b>; }");
    expect(code).toContain("{(props.size === undefined ? 'md' : props.size)}");
  });

  it('reports one that runs once during setup and cannot be taken over', () => {
    const inBlock = run('function Panel(props) { if (props.on) { const { size } = props; log(size); } return <b />; }');
    expect(inBlock.diagnostics.map((d) => `${d.name}:${d.reason}`)).toEqual(['size:placement']);
    const shared = run('function Panel(props) { const { size } = props, n = 1; return <b>{size}{n}</b>; }');
    expect(shared.diagnostics.map((d) => `${d.name}:${d.reason}`)).toEqual(['size:placement']);
    expect(shared.code).toContain('const { size } = props, n = 1;');
  });

  it('leaves one inside an inner function alone, which reads each time it runs', () => {
    const code = 'function Panel(props) { const f = () => { const { size } = props; return size; }; return <b>{f()}</b>; }';
    const result = run(code);
    expect(result.diagnostics).toEqual([]);
    expect(result.code).toBe(code);
  });

  it('reports a binding it cannot rewrite, as for a parameter', () => {
    const result = run('function Panel(props) { let { size } = props; size = 2; return <b>{size}</b>; }');
    expect(result.diagnostics.map((d) => `${d.name}:${d.reason}`)).toEqual(['size:reassigned']);
  });
});
