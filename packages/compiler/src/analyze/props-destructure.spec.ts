/**
 * What the analysis rewrites and what it won't touch.
 *
 * Every refusal is a case where substituting would change something beyond when the
 * read happens, which is the only change we're allowing.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import { planPropsDestructure, explainBail } from './props-destructure.js';

/** Parse `function C(<pattern>) { <body> }` and plan the pattern against the body. */
function plan(pattern: string, body = '') {
  const ast = parse(`function C(${pattern}) { ${body} }`, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  const fn = (ast.program.body[0] as any);
  return planPropsDestructure(fn.params[0], fn.body);
}

const names = (p: ReturnType<typeof plan>) => p.reads.map((r) => `${r.name}=${r.path.join('.')}`);
const bail = (p: ReturnType<typeof plan>, name: string) => p.bails.find((b) => b.name === name)?.reason;

describe('what it rewrites', () => {
  it('maps a shorthand binding to its property', () => {
    expect(names(plan('{ name }'))).toEqual(['name=name']);
  });

  it('keeps an alias pointing at the original property', () => {
    expect(names(plan('{ name: userName }'))).toEqual(['userName=name']);
  });

  it('follows a nested pattern into a path', () => {
    expect(names(plan('{ user: { name, email } }'))).toEqual(['name=user.name', 'email=user.email']);
  });

  it('carries a literal default', () => {
    const p = plan("{ size = 'md' }");
    expect(names(p)).toEqual(['size=size']);
    // Only `undefined` triggers a default, so codegen tests for that rather than `??`.
    expect((p.reads[0].fallback as any).value).toBe('md');
  });

  it('takes an identifier default, which re-reads cleanly', () => {
    expect(names(plan('{ theme = DEFAULT_THEME }'))).toEqual(['theme=theme']);
  });

  it('handles several bindings at once', () => {
    expect(names(plan('{ a, b: renamed, c = 1 }'))).toEqual(['a=a', 'renamed=b', 'c=c']);
  });
});

describe('what it leaves alone', () => {
  it('bails on a rest element, which would copy the getters into a plain object', () => {
    const p = plan('{ a, ...rest }');
    expect(bail(p, 'rest')).toBe('rest');
    // Siblings are still fine, only the rest binding is affected.
    expect(names(p)).toEqual(['a=a']);
  });

  it('bails on a computed key', () => {
    expect(bail(plan('{ [key]: value }'), 'value')).toBe('computed');
  });

  it('bails when the binding is assigned to', () => {
    expect(bail(plan('{ count }', 'count = 5;'), 'count')).toBe('reassigned');
    expect(bail(plan('{ n }', 'n++;'), 'n')).toBe('reassigned');
  });

  it('bails when an inner scope binds the same name', () => {
    expect(bail(plan('{ item }', 'const render = (item) => item;'), 'item')).toBe('shadowed');
    expect(bail(plan('{ x }', 'function inner() { const x = 1; return x; }'), 'x')).toBe('shadowed');
  });

  it('bails on a function default, since each read would hand out a new identity', () => {
    expect(bail(plan('{ onClick = () => {} }'), 'onClick')).toBe('unsafe-default');
  });

  it('bails on a call default — it would run on every read', () => {
    expect(bail(plan('{ id = makeId() }'), 'id')).toBe('unsafe-default');
  });

  it('bails on a member default, since a getter would run on every read', () => {
    expect(bail(plan('{ locale = config.locale }'), 'locale')).toBe('unsafe-default');
  });

  it('bails on a defaulted nested pattern rather than materialising the default', () => {
    expect(bail(plan('{ user: { name } = {} }'), 'name')).toBe('unsafe-default');
  });

  it('bails on an array pattern over a property', () => {
    expect(bail(plan('{ range: [from, to] }'), 'from')).toBe('computed');
  });

  it('is a no-op for a plain identifier parameter', () => {
    const p = plan('props', 'return props.name;');
    expect(p.reads).toEqual([]);
    expect(p.bails).toEqual([]);
  });
});

describe('reporting', () => {
  it('explains every reason', () => {
    for (const reason of ['rest', 'computed', 'reassigned', 'shadowed', 'unsafe-default'] as const) {
      expect(explainBail(reason)).toMatch(/\w/);
    }
  });

  it('reports a shadowed binding without dropping the ones that are fine', () => {
    // Same-scope redeclaration is a syntax error, so shadowing is always inner.
    const p = plan('{ a, b }', 'function inner() { const b = 2; return b; }');
    expect(names(p)).toEqual(['a=a']);
    expect(bail(p, 'b')).toBe('shadowed');
  });
});
