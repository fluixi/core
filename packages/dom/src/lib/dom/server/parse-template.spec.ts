import { describe, it, expect } from 'vitest';
import { parseTemplate, TemplateParseError } from './parse-template.js';
import { serializeNode } from './serialize.js';

/**
 * The parser's contract is a round trip: whatever the compiler serialized must parse back
 * into a tree that serializes to the same string. That pins the parser to the serializer
 * without either having to describe the grammar in prose, and it is the check that would
 * have caught template cloning breaking SSR before it shipped.
 */
/** Tag, attributes and children, so two canonical spellings compare equal. */
function shape(node: any): unknown {
  if (node.nodeType === 3) return { text: node.data };
  if (node.nodeType === 8) return { comment: node.data };
  return {
    tag: node.localName,
    attrs: Object.fromEntries([...node.attributes].sort(([a]: [string], [b]: [string]) => a.localeCompare(b))),
    children: (node.childNodes ?? []).map(shape),
  };
}

/**
 * Parsing then serializing then parsing again must reach the same tree.
 *
 * Structural rather than byte-for-byte: the two serializers have small differences in
 * canonical form, the compiler writes `<input disabled>` where the server writes
 * `disabled=""`, which lose no information. What must never differ is the tree.
 */
function roundTrips(html: string): void {
  const once = parseTemplate(html);
  const twice = parseTemplate(serializeNode(once));
  expect(shape(twice)).toEqual(shape(once));
}

describe('round trip', () => {
  it.each([
    ['<div></div>'],
    ['<div class="card"></div>'],
    ['<div class="card" data-variant="outlined"></div>'],
    ['<p>hello</p>'],
    ['<li class="row"><span class="k">Label</span><span class="v">42</span></li>'],
    ['<div><header><h3 class="t">Title</h3><p class="s">Sub</p></header></div>'],
    ['<div><br><img src="a.png"></div>'],
    ['<input disabled>'],
    ['<div title="a&lt;b&gt;&quot;c&quot;&amp;d"></div>'],
    ['<p>1 &lt; 2 &amp; 3 &gt; 0</p>'],
    ['<div><span>a</span>text<span>b</span></div>'],
    ['<section class="a"><div class="b"><div class="c"><em>deep</em></div></div></section>'],
    ['<div><h3><!----></h3><p>a <!----> b</p></div>'],
    ['<p>a <!----> b</p>'],
  ])('%s', (html) => {
    roundTrips(html);
  });
});

describe('tree shape', () => {
  it('returns the root element, not a fragment', () => {
    const root = parseTemplate('<div class="card"><span>x</span></div>');
    expect(root.localName).toBe('div');
    expect(root.getAttribute('class')).toBe('card');
    expect(root.childNodes).toHaveLength(1);
  });

  it('wires parents so the walk the codegen emits works', () => {
    // `_el$.firstChild` / `.nextSibling` is how generated code reaches a hole.
    const root = parseTemplate('<div><span>a</span><em>b</em></div>');
    const first = root.firstChild!;
    expect((first as { localName: string }).localName).toBe('span');
    expect((first.nextSibling as { localName: string }).localName).toBe('em');
    expect(first.parentNode).toBe(root);
  });

  it('leaves an empty hole element childless, ready to be filled', () => {
    const root = parseTemplate('<div><h3 class="t"></h3></div>');
    expect(root.firstChild!.childNodes).toHaveLength(0);
  });

  it('does not descend into void elements', () => {
    const root = parseTemplate('<div><br><span>after</span></div>');
    expect(root.childNodes).toHaveLength(2);
    expect((root.lastChild as { localName: string }).localName).toBe('span');
  });

  it('decodes entities into text rather than leaving them encoded', () => {
    const root = parseTemplate('<p>a &amp; b</p>');
    expect((root.firstChild as { data: string }).data).toBe('a & b');
  });

  it('treats a valueless attribute as the empty string, as the DOM does', () => {
    expect(parseTemplate('<input disabled>').getAttribute('disabled')).toBe('');
  });
});

describe('hole markers', () => {
  // The marker is what makes the clone, the server's markup and the hydrated DOM the
  // same shape, so the generated paths address all three.
  it('keeps the marker as a comment node', () => {
    const root = parseTemplate('<div><!----></div>');
    expect(root.childNodes).toHaveLength(1);
    expect((root.firstChild as { nodeType: number }).nodeType).toBe(8);
  });

  it('keeps text on both sides of a marker separate', () => {
    const root = parseTemplate('<p>a <!----> b</p>');
    expect(root.childNodes).toHaveLength(3);
    expect((root.firstChild as { data: string }).data).toBe('a ');
    expect((root.lastChild as { data: string }).data).toBe(' b');
  });
});

describe('refuses input the serializer would never produce', () => {
  // Better to fail loudly than to half-parse something and produce a subtly wrong tree.
  it.each([
    ['unquoted attribute value', '<div class=card></div>'],
    ['mismatched close tag', '<div><span></div></span>'],
    ['unclosed element', '<div><span></div>'],
    ['two roots', '<div></div><div></div>'],
    ['no root element', 'just text'],
  ])('%s', (_label, html) => {
    expect(() => parseTemplate(html)).toThrow(TemplateParseError);
  });
});
