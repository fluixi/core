import { describe, it, expect } from 'vitest';
import { analyzeStatic, staticRoots } from './analyze-static.js';
import type { IRElement, IRNode, IRProp } from '../ir/nodes.js';

const el = (tag: string, props: IRProp[] = [], children: IRNode[] = []): IRElement => ({
  kind: 'element',
  tag,
  svg: false,
  props,
  children,
  static: false,
});

const text = (value: string): IRNode => ({ kind: 'text', value });
const expr = (code: string, reactive = false): IRNode => ({ kind: 'expr', code, reactive });
const attr = (name: string, literal: string): IRProp => ({ name, kind: 'attr', literal });

describe('analyzeStatic', () => {
  it('marks a literal element with literal text', () => {
    const node = el('div', [attr('className', 'card')], [text('hello')]);
    analyzeStatic(node);
    expect(node.static).toBe(true);
  });

  it('marks a whole nested subtree of literals', () => {
    const inner = el('span', [attr('className', 'k')], [text('Label')]);
    const outer = el('li', [attr('className', 'row')], [inner]);
    analyzeStatic(outer);
    expect(inner.static).toBe(true);
    expect(outer.static).toBe(true);
  });

  it('rejects an element with a reactive prop', () => {
    const node = el('div', [{ name: 'className', kind: 'attr', expr: 'cls()', reactive: true }]);
    const { reasons } = analyzeStatic(node);
    expect(node.static).toBe(false);
    expect(reasons.get(node)).toBe('reactive-prop');
  });

  it('rejects a non-reactive expression prop too, since it still runs per instance', () => {
    const node = el('div', [{ name: 'id', kind: 'attr', expr: 'makeId()' }]);
    const { reasons } = analyzeStatic(node);
    expect(node.static).toBe(false);
    expect(reasons.get(node)).toBe('expression-prop');
  });

  it.each([
    ['event', { name: 'onClick', kind: 'event' } as IRProp, 'event'],
    ['ref', { name: 'ref', kind: 'ref' } as IRProp, 'ref'],
    ['spread', { name: '', kind: 'spread' } as IRProp, 'spread'],
    ['class directive', { name: 'classList', kind: 'class' } as IRProp, 'class-or-style-directive'],
    ['style directive', { name: 'style', kind: 'style' } as IRProp, 'class-or-style-directive'],
  ])('rejects an element with a %s', (_label, prop, reason) => {
    const node = el('div', [prop]);
    const { reasons } = analyzeStatic(node);
    expect(node.static).toBe(false);
    expect(reasons.get(node)).toBe(reason);
  });

  it('rejects an ancestor of a dynamic hole', () => {
    const node = el('div', [], [text('a'), expr('count()', true)]);
    const { reasons } = analyzeStatic(node);
    expect(node.static).toBe(false);
    expect(reasons.get(node)).toBe('expression-child');
  });

  it('rejects an ancestor of a component, which builds its own subtree', () => {
    const node = el('div', [], [{ kind: 'component', name: 'Button', props: [], children: [] }]);
    const { reasons } = analyzeStatic(node);
    expect(node.static).toBe(false);
    expect(reasons.get(node)).toBe('component-child');
  });

  it('rejects an ancestor of control flow', () => {
    const node = el('div', [], [{ kind: 'control', control: 'show', props: [], children: [] }]);
    const { reasons } = analyzeStatic(node);
    expect(node.static).toBe(false);
    expect(reasons.get(node)).toBe('control-child');
  });

  it('still marks a static subtree nested under a dynamic parent', () => {
    // The parent cannot be cloned wholesale, but the child is worth a template of its own.
    const staticChild = el('span', [attr('className', 'k')], [text('Label')]);
    const parent = el('div', [], [expr('count()', true), staticChild]);
    analyzeStatic(parent);
    expect(parent.static).toBe(false);
    expect(staticChild.static).toBe(true);
  });

  it('walks into components to mark their static children', () => {
    const inner = el('span', [], [text('x')]);
    const root: IRNode = {
      kind: 'component',
      name: 'Card',
      props: [],
      children: [inner],
    };
    analyzeStatic(root);
    expect(inner.static).toBe(true);
  });

  it('is conservative about unknown-shaped props', () => {
    const node = el('div', [{ name: 'x', kind: 'attr' }]);
    analyzeStatic(node);
    // No literal and no expr: nothing positively inert, but also nothing dynamic;
    // a valueless attribute is genuinely static.
    expect(node.static).toBe(true);
  });
});

describe('staticRoots', () => {
  it('returns the outermost static element, not its children', () => {
    const inner = el('span', [], [text('a')]);
    const outer = el('div', [], [inner]);
    analyzeStatic(outer);
    expect(staticRoots(outer)).toEqual([outer]);
  });

  it('descends past a dynamic parent to the static children beneath', () => {
    const a = el('span', [], [text('a')]);
    const b = el('em', [], [text('b')]);
    const parent = el('div', [], [a, expr('x()', true), b]);
    analyzeStatic(parent);
    expect(staticRoots(parent)).toEqual([a, b]);
  });

  it('returns nothing when everything is dynamic', () => {
    const parent = el('div', [], [expr('x()', true)]);
    analyzeStatic(parent);
    expect(staticRoots(parent)).toEqual([]);
  });
});

describe('the frontends produce honest static flags', () => {
  // Regression guard: `IRElement.static` was hardcoded false with no producer for the
  // life of the IR, so the field lied to anything that read it.
  it('marks a literal JSX subtree static', async () => {
    const { buildIR } = await import('../frontend/babel/build-ir.js');
    const { parse } = await import('@babel/core');
    const file = parse('const v = <div class="card"><span>hi</span></div>;', {
      parserOpts: { plugins: ['jsx', 'typescript'] },
      configFile: false,
      babelrc: false,
    })!;
    let jsx: unknown;
    (await import('@babel/core')).traverse(file, {
      JSXElement(path) {
        if (!jsx) jsx = path.node;
        path.stop();
      },
    });
    const ir = buildIR(jsx as never) as IRElement;
    expect(ir.static).toBe(true);
  });

  it('does not mark a subtree containing a hole', async () => {
    const { buildIR } = await import('../frontend/babel/build-ir.js');
    const { parse, traverse } = await import('@babel/core');
    const file = parse('const v = <div class="card">{count()}</div>;', {
      parserOpts: { plugins: ['jsx', 'typescript'] },
      configFile: false,
      babelrc: false,
    })!;
    let jsx: unknown;
    traverse(file, {
      JSXElement(path) {
        if (!jsx) jsx = path.node;
        path.stop();
      },
    });
    const ir = buildIR(jsx as never) as IRElement;
    expect(ir.static).toBe(false);
  });
});
