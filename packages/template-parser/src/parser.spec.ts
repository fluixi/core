import { describe, expect, it } from 'vitest';
import { parse } from './index.js';
import type { ElementNode, ComponentNode, EachDirectiveNode } from './ast.js';

/** Parse `html\`...\`` written as a raw string list (statics split on holes). */
function p(statics: TemplateStringsArray | string[]) {
  return parse(statics as string[]);
}

describe('template parser — structure', () => {
  it('parses a nested element tree with text', () => {
    const { root, diagnostics } = p(['<div><button>Hello</button></div>']);
    expect(diagnostics).toHaveLength(0);
    expect(root.children).toHaveLength(1);
    const div = root.children[0] as ElementNode;
    expect(div.kind).toBe('Element');
    expect(div.tag).toBe('div');
    const btn = div.children[0] as ElementNode;
    expect(btn.tag).toBe('button');
    expect(btn.children[0]).toMatchObject({ kind: 'Text', value: 'Hello' });
  });

  it('child hole becomes an Expression node with its index', () => {
    const { root } = p(['<p>', '</p>']); // <p>${0}</p>
    const p0 = root.children[0] as ElementNode;
    expect(p0.children[0]).toMatchObject({ kind: 'Expression', hole: 0 });
  });

  it('capitalized/member tags are components', () => {
    const { root } = p(['<Button/><Ctx.Provider></Ctx.Provider>']);
    expect((root.children[0] as ComponentNode).kind).toBe('Component');
    expect((root.children[1] as ComponentNode).tag).toBe('Ctx.Provider');
  });

  it('dynamic tag `<${Comp}/>` is a component carrying the tag hole', () => {
    const { root } = p(['<', ' />']); // <${0} />
    const c = root.children[0] as ComponentNode;
    expect(c.kind).toBe('Component');
    expect(c.tag).toBe('');
    expect(c.tagHole).toBe(0);
    expect(c.selfClosing).toBe(true);
  });

  it('dynamic tag with children and a `</${Comp}>` close', () => {
    const { root, diagnostics } = p(['<', '>hi</', '>']); // <${0}>hi</${1}>
    expect(diagnostics).toHaveLength(0);
    const c = root.children[0] as ComponentNode;
    expect(c.tagHole).toBe(0);
    expect(c.children[0]).toMatchObject({ kind: 'Text', value: 'hi' });
  });

  it('recognizes `<${Comp}>` even when preceded by text (readText must not eat `<`)', () => {
    // Regression: a newline/text before <${Comp}> made readText consume the `<`,
    // turning the tag into stray text + a bare Expression → cascading mismatch.
    const { root, diagnostics } = p(['<main>\n<', '><em>c</em></', '>\n<span>y</span>\n</main>']);
    expect(diagnostics).toHaveLength(0);
    const main = root.children[0] as ElementNode;
    expect(main.children.some((c) => c.kind === 'Component' && (c as ComponentNode).tagHole === 0)).toBe(true);
    expect(main.children.some((c) => c.kind === 'Element' && (c as ElementNode).tag === 'span')).toBe(true);
  });

  it('multiple roots keep every sibling (fragment is the caller\'s concern)', () => {
    const { root } = p(['<a/><b/>']);
    expect(root.children).toHaveLength(2);
  });

  it('explicit <> fragment', () => {
    const { root } = p(['<><span/></>']);
    expect(root.children[0]).toMatchObject({ kind: 'Fragment' });
  });

  it('void elements take no children and need no close tag', () => {
    const { root, diagnostics } = p(['<input value="x"><span>after</span>']);
    expect(diagnostics).toHaveLength(0);
    const input = root.children[0] as ElementNode;
    expect(input.tag).toBe('input');
    expect(input.children).toHaveLength(0);
    expect(root.children[1]).toMatchObject({ kind: 'Element', tag: 'span' });
  });

  it('raw-text elements keep content verbatim', () => {
    const { root } = p(['<style>.a{color:red}</style>']);
    const style = root.children[0] as ElementNode;
    expect(style.rawText).toBe(true);
    expect(style.children[0]).toMatchObject({ kind: 'Text', value: '.a{color:red}', raw: true });
  });

  it('svg option puts the subtree in the svg namespace', () => {
    const { root } = parse(['<g><rect/></g>'], { svg: true });
    expect((root.children[0] as ElementNode).namespace).toBe('svg');
  });
});

describe('template parser — attributes & directives', () => {
  it('static, quoted-mixed, and single-hole attribute values', () => {
    const { root } = p(['<div id="x" class="box ', '" title=', '></div>']);
    const div = root.children[0] as ElementNode;
    const [id, cls, title] = div.attributes;
    expect(id).toMatchObject({ kind: 'Attribute', name: 'id', value: { kind: 'static', value: 'x' } });
    expect(cls).toMatchObject({ kind: 'Attribute', name: 'class' });
    expect((cls as any).value.kind).toBe('mixed');
    expect(title).toMatchObject({ kind: 'Attribute', value: { kind: 'hole', hole: 1 } });
  });

  it('event bindings: @click and onClick', () => {
    const { root } = p(['<button @click=', ' onMouseDown=', '></button>']);
    const btn = root.children[0] as ElementNode;
    expect(btn.attributes[0]).toMatchObject({ kind: 'EventBinding', name: 'click', syntax: 'at', hole: 0 });
    // `name` is the DOM event name whatever the spelling, so `onMouseDown` and
    // `@mousedown` agree; `syntax` is what records which form was written.
    expect(btn.attributes[1]).toMatchObject({ kind: 'EventBinding', name: 'mousedown', syntax: 'on', hole: 1 });
  });

  it('event bindings: on:click (native) + dotted modifiers', () => {
    const { root } = p(['<button on:click=', ' @input.capture.once=', ' @submit.prevent.stop=', '></button>']);
    const btn = root.children[0] as ElementNode;
    expect(btn.attributes[0]).toMatchObject({ kind: 'EventBinding', name: 'click', syntax: 'colon', modifiers: [] });
    expect(btn.attributes[1]).toMatchObject({ kind: 'EventBinding', name: 'input', syntax: 'at', modifiers: ['capture', 'once'] });
    expect(btn.attributes[2]).toMatchObject({ kind: 'EventBinding', name: 'submit', modifiers: ['prevent', 'stop'] });
  });

  it('property, boolean, ref, spread', () => {
    const { root } = p(['<video .currentTime=', ' ?loading ref=', ' ...', '></video>']);
    const v = root.children[0] as ElementNode;
    expect(v.attributes[0]).toMatchObject({ kind: 'PropertyBinding', name: 'currentTime', hole: 0 });
    expect(v.attributes[1]).toMatchObject({ kind: 'Attribute', name: 'loading', boolean: true, value: null });
    expect(v.attributes[2]).toMatchObject({ kind: 'RefBinding', hole: 1 });
    expect(v.attributes[3]).toMatchObject({ kind: 'Spread', hole: 2 });
  });

  it('if / bind: / class: / style: directives', () => {
    const { root } = p(['<div if=', ' bind:value=', ' class:active=', ' style:color=', '></div>']);
    const d = root.children[0] as ElementNode;
    expect(d.attributes[0]).toMatchObject({ kind: 'IfDirective', hole: 0 });
    expect(d.attributes[1]).toMatchObject({ kind: 'BindDirective', name: 'value', hole: 1 });
    expect(d.attributes[2]).toMatchObject({ kind: 'ClassDirective', name: 'active', hole: 2 });
    expect(d.attributes[3]).toMatchObject({ kind: 'StyleDirective', name: 'color', hole: 3 });
  });

  it('each folds a sibling key attribute', () => {
    const { root } = p(['<li each=', ' key="id"></li>']);
    const li = root.children[0] as ElementNode;
    expect(li.attributes).toHaveLength(1);
    const each = li.attributes[0] as EachDirectiveNode;
    expect(each.kind).toBe('EachDirective');
    expect(each.key).toEqual({ static: 'id' });
  });
});

describe('template parser — diagnostics & recovery', () => {
  it('reports an unclosed tag but still returns a tree', () => {
    const { root, diagnostics } = p(['<div><span>hi</div>']);
    expect(diagnostics.some((d) => d.code === 'mismatched-close-tag')).toBe(true);
    expect(root.children[0]).toMatchObject({ kind: 'Element', tag: 'div' });
  });

  it('reports a stray close tag at the root and keeps going', () => {
    const { root, diagnostics } = p(['</div><span/>']);
    expect(diagnostics.some((d) => d.code === 'stray-close-tag')).toBe(true);
    expect(root.children.some((c) => (c as ElementNode).tag === 'span')).toBe(true);
  });

  it('reports duplicate if directives', () => {
    const { diagnostics } = p(['<div if=', ' if=', '></div>']);
    expect(diagnostics.some((d) => d.code === 'duplicate-directive')).toBe(true);
  });

  it('reports an unknown event modifier', () => {
    const { diagnostics } = p(['<button @click.nope=', '></button>']);
    const d = diagnostics.find((x) => x.code === 'invalid-directive');
    expect(d?.message).toContain('nope');
  });

  it('accepts known event modifiers silently', () => {
    const { diagnostics } = p(['<button @click.capture.once.prevent=', '></button>']);
    expect(diagnostics.filter((x) => x.code === 'invalid-directive')).toHaveLength(0);
  });

  it('accepts `if` and `each` on the same element, which the compiler supports (if gates the list)', () => {
    const { diagnostics } = p(['<div if=', ' each=', '></div>']);
    expect(diagnostics.some((d) => d.code === 'unsupported-combination')).toBe(false);
  });

  it('reports `if` and `else` on the same element', () => {
    const { diagnostics } = p(['<div if=', ' else></div>']);
    expect(diagnostics.some((d) => d.code === 'invalid-directive')).toBe(true);
  });

  it('reports `key` without `each`', () => {
    const { diagnostics } = p(['<li key="id"></li>']);
    expect(diagnostics.some((d) => d.code === 'invalid-directive' && /key/.test(d.message))).toBe(true);
  });

  it('reports duplicate `ref`', () => {
    const { diagnostics } = p(['<input ref=', ' ref=', ' />']);
    expect(diagnostics.some((d) => d.code === 'duplicate-directive' && /ref/.test(d.message))).toBe(true);
  });

  it('reports `else` without a preceding `if`', () => {
    const { diagnostics } = p(['<div>x</div><div else>y</div>']);
    expect(diagnostics.some((d) => d.code === 'else-without-if')).toBe(true);
  });

  it('accepts a valid `if`/`else` pair (whitespace between is ok)', () => {
    const { diagnostics } = p(['<div if=', '>a</div>\n<div else>b</div>']);
    expect(diagnostics.filter((d) => d.code === 'else-without-if')).toHaveLength(0);
  });
});
