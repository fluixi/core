/**
 * The reactivity rule, tested twice: once as pure shapes with no parser in sight,
 * and once through the Babel front-end's mapping, so a front-end that mis-maps a
 * syntax is caught separately from a rule that decides wrongly.
 *
 * The source-level table is the one to extend. It is the behaviour a second
 * front-end has to reproduce, written the way an author would hit it.
 */
import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import { isReactiveShape, type ExprShape } from './reactive-expr.js';
import { isReactiveExpr } from '../frontend/babel/build-ir.js';
import { shapeOf } from './expr-shape.js';

describe('isReactiveShape (no parser involved)', () => {
  it('a call is reactive', () => {
    expect(isReactiveShape({ kind: 'call' })).toBe(true);
  });

  it('a member access is reactive, except .children', () => {
    expect(isReactiveShape({ kind: 'member', property: 'value' })).toBe(true);
    expect(isReactiveShape({ kind: 'member', property: null })).toBe(true);
    expect(isReactiveShape({ kind: 'member', property: 'children' })).toBe(false);
  });

  it('a compound is reactive when any part is', () => {
    const inert: ExprShape = { kind: 'compound', parts: [{ kind: 'opaque' }, { kind: 'opaque' }] };
    const live: ExprShape = { kind: 'compound', parts: [{ kind: 'opaque' }, { kind: 'call' }] };
    expect(isReactiveShape(inert)).toBe(false);
    expect(isReactiveShape(live)).toBe(true);
  });

  it('nests', () => {
    const deep: ExprShape = {
      kind: 'compound',
      parts: [{ kind: 'compound', parts: [{ kind: 'compound', parts: [{ kind: 'call' }] }] }],
    };
    expect(isReactiveShape(deep)).toBe(true);
  });

  it('an empty compound is inert — `{}` and `[]` react to nothing', () => {
    expect(isReactiveShape({ kind: 'compound', parts: [] })).toBe(false);
  });

  it('opaque is never reactive', () => {
    expect(isReactiveShape({ kind: 'opaque' })).toBe(false);
  });
});

/** Parse a single expression the way the front-end sees one. */
function parse(src: string): any {
  const file = babel.parseSync(`(${src});`, {
    filename: 'e.tsx',
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['jsx', 'typescript'] },
  })!;
  return (file as any).program.body[0].expression;
}

const REACTIVE: Array<[string, string]> = [
  ['count()', 'a signal read'],
  ['t("key")', 'any call'],
  ['a?.()', 'an optional call'],
  ['store.value', 'a property read'],
  ['a?.b', 'an optional member'],
  ['obj[key]', 'a computed member — no static name to exempt'],
  ['obj["children"]', 'computed, so not the .children exemption'],
  ['cond ? a() : b', 'reactive in one branch of a ternary'],
  ['a && b()', 'reactive on the right of a logical'],
  ['x() + 1', 'reactive on the left of a binary'],
  ['`${name()}`', 'a template literal with a reactive hole'],
  ['{ active: active() }', 'an object whose value is reactive'],
  ['{ width: w() }', 'the style-object case'],
  ['[a, b()]', 'an array with a reactive element'],
  ['{ a: { b: c() } }', 'nested objects'],
];

const INERT: Array<[string, string]> = [
  ['count', 'a bare identifier'],
  ['"text"', 'a string literal'],
  ['42', 'a number'],
  ['true', 'a boolean'],
  ['props.children', 'the subtree reference — must not be thunked'],
  ['a.b.children', 'any .children access'],
  ['cond ? a : b', 'a ternary of identifiers'],
  ['a && b', 'a logical of identifiers'],
  ['`${name}`', 'a template literal with no call'],
  ['{ active: true }', 'a static object'],
  ['[a, b]', 'a static array'],
  ['{ [k()]: 1 }', 'a computed key — the compiler cannot see the value it names'],
  ['[...rest]', 'a spread — same reason'],
  ['{ m() { return x(); } }', 'an object method body is not a prop value'],
  ['() => count()', 'a function is passed through, not tracked'],
  ['{}', 'an empty object'],
  ['[]', 'an empty array'],
];

describe('the front-end maps syntax onto those shapes', () => {
  for (const [src, why] of REACTIVE) {
    it(`${src} is reactive — ${why}`, () => {
      expect(isReactiveExpr(parse(src))).toBe(true);
    });
  }

  for (const [src, why] of INERT) {
    it(`${src} is inert — ${why}`, () => {
      expect(isReactiveExpr(parse(src))).toBe(false);
    });
  }

  it('reports the shape, not just the verdict', () => {
    expect(shapeOf(parse('count()'))).toEqual({ kind: 'call' });
    expect(shapeOf(parse('props.children'))).toEqual({ kind: 'member', property: 'children' });
    expect(shapeOf(parse('obj[k]'))).toEqual({ kind: 'member', property: null });
    expect(shapeOf(parse('name'))).toEqual({ kind: 'opaque' });
    expect(shapeOf(parse('[a, b()]'))).toEqual({
      kind: 'compound',
      parts: [{ kind: 'opaque' }, { kind: 'call' }],
    });
  });
});
