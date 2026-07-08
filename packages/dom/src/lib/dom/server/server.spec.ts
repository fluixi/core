import { describe, it, expect, beforeAll } from 'vitest';
import { createSignal, createMemo } from '@fluixi/reactive/signal';
import {
  renderToString,
  createNativeElement,
  insert,
  spread,
  createComponent,
  registerCreateComponent,
} from '@fluixi/dom';
import { Show } from '../../flow/show.js';
import { For } from '../../flow/for.js';

// Wire a faithful component runner (createComponent is unregistered until core
// calls registerCreateComponent). Mirrors the runtime contract spec — Comp(props)
// lets components read props (including the `get children()` getter the codegen emits).
beforeAll(() => {
  registerCreateComponent(((Comp: any, props: any) => Comp(props)) as any);
});

// Helpers that mirror exactly what the imperative codegen emits, so these tests
// exercise the same runtime calls a compiled app would make on the server.
function el(tag: string, props: any, ...children: any[]) {
  const node = createNativeElement(tag) as any;
  if (props) spread({ element: node, props } as any);
  for (const c of children) insert(node, c, null);
  return node;
}
function comp(Comp: any, props: any, children?: any) {
  const p = children !== undefined ? { ...props, get children() { return children; } } : props;
  return createMemo(() => createComponent(Comp as any, p as any));
}

describe('renderToString — elements + text', () => {
  it('renders a simple element with a text child', () => {
    expect(renderToString(() => el('div', null, 'hello'))).toBe('<div>hello</div>');
  });

  it('renders nested elements and multiple children', () => {
    const html = renderToString(() =>
      el('ul', null, el('li', null, 'a'), el('li', null, 'b')),
    );
    expect(html).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  it('self-closes void elements', () => {
    expect(renderToString(() => el('input', { type: 'text', value: 'x' }))).toBe(
      '<input type="text" value="x">',
    );
    expect(renderToString(() => el('br', null))).toBe('<br>');
  });
});

describe('renderToString — attributes', () => {
  it('serializes string attrs, class, and a style object', () => {
    const html = renderToString(() =>
      el('div', { id: 'box', class: 'a b', style: { color: 'red', fontSize: '12px' } }),
    );
    expect(html).toBe('<div id="box" class="a b" style="color: red; font-size: 12px"></div>');
  });

  it('emits boolean attrs as empty and drops false ones', () => {
    // `disabled` is not a JSX property on the mock, so it routes through
    // setAttribute; spread sends boolean true → setAttribute('disabled','').
    const html = renderToString(() => el('button', { disabled: true }, 'go'));
    expect(html).toBe('<button disabled="">go</button>');
  });

  it('maps htmlFor → for and className → class', () => {
    const html = renderToString(() => el('label', { htmlFor: 'n', className: 'lbl' }, 'Name'));
    expect(html).toBe('<label for="n" class="lbl">Name</label>');
  });
});

describe('renderToString — reactive children resolved once', () => {
  it('reads a signal accessor child a single time', () => {
    const html = renderToString(() => {
      const [name] = createSignal('world');
      return el('p', null, () => name());
    });
    expect(html).toBe('<p>world</p>');
  });
});

describe('renderToString — control flow', () => {
  it('Show renders children when true, fallback when false', () => {
    expect(
      renderToString(() => el('div', null, Show({ when: () => true, children: () => 'yes', fallback: 'no' } as any))),
    ).toBe('<div>yes</div>');
    expect(
      renderToString(() => el('div', null, Show({ when: () => false, children: () => 'yes', fallback: 'no' } as any))),
    ).toBe('<div>no</div>');
  });

  it('For renders a list', () => {
    const html = renderToString(() =>
      el('ul', null, For({ each: ['x', 'y'], children: (item: string) => el('li', null, item) } as any)),
    );
    expect(html).toBe('<ul><li>x</li><li>y</li></ul>');
  });
});

describe('renderToString — components + children', () => {
  it('renders a component tree', () => {
    const Hello = (p: any) => el('span', null, p.label);
    expect(renderToString(() => comp(Hello, { label: 'hi' }))).toBe('<span>hi</span>');
  });

  it('renders content passed through a component {props.children} (sync)', () => {
    const Shell = (p: any) => el('main', null, () => p.children);
    const tree = () => comp(Shell, {}, el('h1', null, 'title'));
    expect(renderToString(tree)).toBe('<main><h1>title</h1></main>');
  });
});

describe('renderToString — escaping', () => {
  it('escapes text and attribute values', () => {
    const html = renderToString(() => el('div', { title: '<a> & "b"' }, 'x < y & z'));
    expect(html).toBe('<div title="<a> &amp; &quot;b&quot;">x &lt; y &amp; z</div>');
  });
});

describe('renderToString — isolation', () => {
  it('does not leak nodes between sequential renders', () => {
    const a = renderToString(() => el('div', null, 'A'));
    const b = renderToString(() => el('div', null, 'B'));
    expect(a).toBe('<div>A</div>');
    expect(b).toBe('<div>B</div>');
  });
});
