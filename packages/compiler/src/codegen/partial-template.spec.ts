import { describe, it, expect } from 'vitest';
import { planPartialTemplate } from './partial-template.js';
import { analyzeStatic } from '../optimize/analyze-static.js';
import type { IRElement, IRNode, IRProp } from '../ir/nodes.js';

const el = (tag: string, props: IRProp[] = [], children: IRNode[] = []): IRElement => ({
  kind: 'element', tag, svg: false, props, children, static: false,
});
const text = (value: string): IRNode => ({ kind: 'text', value });
const hole = (code = 'v()'): IRNode => ({ kind: 'expr', code, reactive: true });
const attr = (name: string, literal: string): IRProp => ({ name, kind: 'attr', literal });
const plan = (n: IRElement) => (analyzeStatic(n), planPartialTemplate(n));

describe('planPartialTemplate', () => {
  it('brackets each hole with a marker pair', () => {
    const p = plan(el('li', [attr('className', 'row')], [text('tick '), hole()]))!;
    expect(p.html).toBe('<li class="row">tick <!--fx--><!--fx/--></li>');
    expect(p.holes).toHaveLength(1);
    expect(p.holes[0]!.parentRef).toBe('_el$');
  });

  it('walks from the previous sibling, never by index', () => {
    // Index arithmetic describes a fresh clone only: the server's DOM has rendered
    // content between the markers, so everything after a hole is shifted.
    const p = plan(el('div', [], [text('a '), hole(), el('p', [], [hole()])]))!;
    expect(p.steps.map((s) => s.expr)).toEqual([
      '_el$.firstChild',
      '_n$0.nextSibling',
      'holeEnd(_n$1)',
      '_n$2.nextSibling',
      '_n$3.firstChild',
      'holeEnd(_n$4)',
    ]);
  });

  it('resolves each hole end at runtime rather than by position', () => {
    const p = plan(el('div', [], [hole()]))!;
    const end = p.steps.find((s) => s.ref === p.holes[0]!.endRef)!;
    expect(end.expr).toBe(`holeEnd(${p.holes[0]!.startRef})`);
  });

  it('addresses a hole inside a nested element', () => {
    const p = plan(el('div', [], [el('h3', [], [hole()]), el('p', [], [text('s')])]))!;
    expect(p.html).toBe('<div><h3><!--fx--><!--fx/--></h3><p>s</p></div>');
    expect(p.holes[0]!.parentRef).toBe('_n$0');
  });

  it('handles a hole between two texts, which the markers keep apart', () => {
    // Omitting holes made this unrepresentable: the texts merged and there was nothing
    // to insert between.
    const p = plan(el('p', [], [text('a '), hole(), text(' b')]))!;
    expect(p.html).toBe('<p>a <!--fx--><!--fx/--> b</p>');
    expect(p.holes).toHaveLength(1);
  });

  it('stops walking after the last dynamic child', () => {
    // No reference is needed for trailing static nodes.
    const p = plan(el('div', [], [hole(), el('p', [], [text('x')]), el('em', [], [text('y')])]))!;
    expect(p.steps).toHaveLength(2);
  });

  it('returns null for a fully static subtree — that has a cheaper path', () => {
    expect(plan(el('div', [], [text('x')]))).toBeNull();
  });

  it('binds a dynamic attribute instead of refusing the template', () => {
    const node = el('div', [{ name: 'id', kind: 'attr', expr: 'f()', reactive: true }], [hole()]);
    const p = plan(node)!;
    expect(p).not.toBeNull();
    expect(p.html).toBe('<div><!--fx--><!--fx/--></div>');
    expect(p.bindings).toHaveLength(1);
    expect(p.bindings[0]!.ref).toBe('_el$');
    expect(p.bindings[0]!.prop.name).toBe('id');
  });

  it('binds an attribute on a nested element and walks to it', () => {
    const inner = el('span', [{ name: 'title', kind: 'attr', expr: 't()', reactive: true }], [text('x')]);
    const p = plan(el('div', [], [el('p', [], [text('a')]), inner]))!;
    expect(p).not.toBeNull();
    expect(p.html).toBe('<div><p>a</p><span>x</span></div>');
    expect(p.bindings).toHaveLength(1);
    expect(p.bindings[0]!.prop.name).toBe('title');
  });

  it('keeps a static attribute in the template beside a bound one', () => {
    const node = el(
      'div',
      [attr('id', 'a'), { name: 'title', kind: 'attr', expr: 't()', reactive: true }],
      [hole()],
    );
    const p = plan(node)!;
    expect(p.html).toBe('<div id="a"><!--fx--><!--fx/--></div>');
    expect(p.bindings.map((b) => b.prop.name)).toEqual(['title']);
  });
});

describe('shapes that stay imperative', () => {
  it('a spread, whose keys are not known at compile time', () => {
    const node = el('div', [{ name: '', kind: 'spread', expr: 'p' }], [hole()]);
    expect(plan(node)).toBeNull();
  });

  it('an svg subtree, whose clone would be the wrapper rather than the element', () => {
    const node = el('svg', [{ name: 'className', kind: 'attr', expr: 'c()', reactive: true }], [hole()]);
    node.svg = true;
    expect(plan(node)).toBeNull();
  });

  it('a property-only name, which is assigned rather than set as an attribute', () => {
    const node = el('input', [{ name: 'value', kind: 'attr', expr: 'v()', reactive: true }], []);
    expect(plan(node)).toBeNull();
  });

  it('a custom element, whose props go to properties decided at runtime', () => {
    const node = el('my-el', [{ name: 'label', kind: 'attr', expr: 'v()', reactive: true }], [hole()]);
    expect(plan(node)).toBeNull();
  });
});

describe('rejects positions it cannot address', () => {
  // These are the shapes that produced `Cannot read properties of null (reading
  // 'nextSibling')`: the DOM merges adjacent text, so IR child indices stop matching.
  it('adjacent text children', () => {
    expect(plan(el('div', [], [text('a'), text('b'), el('p', [], [hole()])]))).toBeNull();
  });

  it('an empty text child, which serializes to nothing', () => {
    expect(plan(el('div', [], [text(''), el('p', [], [hole()])]))).toBeNull();
  });

  it('the same shapes nested deeper', () => {
    const inner = el('p', [], [text('a'), text('b'), hole()]);
    expect(plan(el('div', [], [el('section', [], [inner])]))).toBeNull();
  });

  it('raw-text elements, whose content must not be entity-escaped', () => {
    expect(plan(el('style', [], [text('a{}'), hole()]))).toBeNull();
  });
});
