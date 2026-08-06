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
  it('leaves a marker where the hole goes', () => {
    const p = plan(el('li', [attr('className', 'row')], [text('tick '), hole()]))!;
    expect(p.html).toBe('<li class="row">tick <!----></li>');
    expect(p.holes).toHaveLength(1);
    expect(p.holes[0]!.parentPath).toBe('_el$');
    expect(p.holes[0]!.markerPath).toBe('_el$.firstChild.nextSibling');
  });

  it('addresses a hole inside a nested element', () => {
    const p = plan(el('div', [], [el('h3', [], [hole()]), el('p', [], [text('s')])]))!;
    expect(p.html).toBe('<div><h3><!----></h3><p>s</p></div>');
    expect(p.holes[0]!.parentPath).toBe('_el$.firstChild');
    expect(p.holes[0]!.markerPath).toBe('_el$.firstChild.firstChild');
  });

  it('walks siblings with nextSibling, not indices', () => {
    const p = plan(el('div', [], [el('a', [], [text('x')]), el('b', [], [hole()])]))!;
    expect(p.holes[0]!.parentPath).toBe('_el$.firstChild.nextSibling');
  });

  it('counts the marker when addressing later siblings', () => {
    // The marker occupies a position, so a following element is the *second* child.
    const p = plan(el('div', [], [hole(), el('p', [], [hole()])]))!;
    expect(p.holes[0]!.markerPath).toBe('_el$.firstChild');
    expect(p.holes[1]!.parentPath).toBe('_el$.firstChild.nextSibling');
  });

  it('handles a hole between two texts, which the marker keeps apart', () => {
    // Omitting holes made this unrepresentable — the texts merged and there was
    // nothing to insert between.
    const p = plan(el('p', [], [text('a '), hole(), text(' b')]))!;
    expect(p.html).toBe('<p>a <!----> b</p>');
    expect(p.holes[0]!.markerPath).toBe('_el$.firstChild.nextSibling');
  });

  it('returns null for a fully static subtree — that has a cheaper path', () => {
    expect(plan(el('div', [], [text('x')]))).toBeNull();
  });

  it('returns null when the element itself is dynamic', () => {
    const node = el('div', [{ name: 'id', kind: 'attr', expr: 'f()' }], [hole()]);
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
