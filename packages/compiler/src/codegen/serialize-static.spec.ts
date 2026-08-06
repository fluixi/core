import { describe, it, expect } from 'vitest';
import { serializeStatic, isSerializable } from './serialize-static.js';
import { analyzeStatic } from '../optimize/analyze-static.js';
import type { IRElement, IRNode, IRProp } from '../ir/nodes.js';

const el = (tag: string, props: IRProp[] = [], children: IRNode[] = []): IRElement => ({
  kind: 'element', tag, svg: false, props, children, static: false,
});
const text = (value: string): IRNode => ({ kind: 'text', value });
const attr = (name: string, literal: IRProp['literal']): IRProp => ({ name, kind: 'attr', literal });
const mark = (n: IRElement) => (analyzeStatic(n), n);

describe('serializeStatic', () => {
  it('writes attributes back to their HTML spelling', () => {
    expect(serializeStatic(el('div', [attr('className', 'card'), attr('htmlFor', 'x')]))).toBe(
      '<div class="card" for="x"></div>',
    );
  });

  it('nests children', () => {
    const node = el('li', [attr('className', 'row')], [el('span', [], [text('Label')])]);
    expect(serializeStatic(node)).toBe('<li class="row"><span>Label</span></li>');
  });

  it('writes a valueless attribute bare', () => {
    expect(serializeStatic(el('input', [attr('disabled', true)]))).toBe('<input disabled>');
  });

  it('omits a false attribute', () => {
    expect(serializeStatic(el('input', [attr('disabled', false)]))).toBe('<input>');
  });

  it('does not close void elements', () => {
    expect(serializeStatic(el('br'))).toBe('<br>');
    expect(serializeStatic(el('img', [attr('src', 'a.png')]))).toBe('<img src="a.png">');
  });

  it('escapes markup in attribute values, which go into innerHTML', () => {
    expect(serializeStatic(el('div', [attr('title', 'a<b>"c"&d')]))).toBe(
      '<div title="a&lt;b&gt;&quot;c&quot;&amp;d"></div>',
    );
  });

  it('escapes markup in text', () => {
    expect(serializeStatic(el('p', [], [text('1 < 2 & 3 > 0')]))).toBe(
      '<p>1 &lt; 2 &amp; 3 &gt; 0</p>',
    );
  });
});

describe('isSerializable', () => {
  it('accepts a literal subtree', () => {
    expect(isSerializable(mark(el('div', [attr('className', 'a')], [text('x')])))).toBe(true);
  });

  it('refuses a non-static node', () => {
    const node = el('div', [{ name: 'id', kind: 'attr', expr: 'f()' }]);
    analyzeStatic(node);
    expect(isSerializable(node)).toBe(false);
  });

  it.each(['prop:value', 'attr:x', 'bool:disabled', 'on:click'])(
    'refuses the namespaced name %s, which instructs the runtime rather than HTML',
    (name) => {
      expect(isSerializable(mark(el('input', [attr(name, 'v')])))).toBe(false);
    },
  );

  it.each(['innerHTML', 'textContent', 'value', 'checked'])(
    'refuses %s, which the runtime assigns as a DOM property',
    (name) => {
      // `innerHTML` in a template would be escaped into visible text; `value` as an
      // attribute sets the default rather than the current value.
      expect(isSerializable(mark(el('div', [attr(name, '<b>x</b>')])))).toBe(false);
    },
  );

  it('refuses a subtree whose descendant is unserializable', () => {
    const node = el('div', [], [el('input', [attr('value', 'x')])]);
    expect(isSerializable(mark(node))).toBe(false);
  });
});
