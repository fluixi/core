// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@fluixi/dom';
import { signal } from '@fluixi/reactive';
import { html, define } from './index.js';

function mount(build: () => unknown) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(build as () => never, container);
  return container;
}

describe('html`` without a build step', () => {
  it('builds static markup', () => {
    const el = mount(() => html`<p class="out">hi</p>`);
    expect(el.querySelector('.out')?.textContent).toBe('hi');
  });

  it('decodes character references in text and attributes, as JSX does', () => {
    const el = mount(
      () => html`<p title="Tom &amp; Jerry" data-mixed="${'A'}&nbsp;B">a&nbsp;b &copy; &#169; &#xA9; &lt;b&gt; &unknown; &constructor;</p>`,
    );
    const p = el.querySelector('p')!;
    expect(p.textContent).toBe('a\u00a0b \u00a9 \u00a9 \u00a9 <b> &unknown; &constructor;');
    expect(p.querySelector('b')).toBeNull();
    expect(p.getAttribute('title')).toBe('Tom & Jerry');
    expect(p.getAttribute('data-mixed')).toBe('A\u00a0B');
  });

  it('inserts a plain value', () => {
    const el = mount(() => html`<p>${'hello'}</p>`);
    expect(el.textContent).toBe('hello');
  });

  it('tracks a signal in text position', () => {
    const count = signal(0);
    const el = mount(() => html`<span>${count}</span>`);
    expect(el.textContent).toBe('0');
    count.set(1);
    expect(el.textContent).toBe('1');
  });

  it('tracks a signal in an attribute', () => {
    const cls = signal('one');
    const el = mount(() => html`<p class=${cls}>x</p>`);
    expect(el.querySelector('p')?.getAttribute('class')).toBe('one');
    cls.set('two');
    expect(el.querySelector('p')?.getAttribute('class')).toBe('two');
  });

  it('passes an event handler without calling it', () => {
    let fired = 0;
    const el = mount(() => html`<button @click=${() => (fired += 1)}>go</button>`);
    expect(fired).toBe(0);
    el.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fired).toBe(1);
  });

  it('renders a component passed as a hole', () => {
    const Label = (props: { text: string }) => html`<i>${props.text}</i>`;
    const el = mount(() => html`<${Label} text="hi" />`);
    expect(el.querySelector('i')?.textContent).toBe('hi');
  });

  it('compiles a call site once', () => {
    const one = signal('a');
    const build = () => html`<p>${one}</p>`;
    const first = mount(build);
    const second = mount(build);
    expect(first.textContent).toBe('a');
    expect(second.textContent).toBe('a');
    one.set('b');
    expect(first.textContent).toBe('b');
    expect(second.textContent).toBe('b');
  });

  it('reports a template it cannot parse', () => {
    expect(() => mount(() => html`<p>`)).toThrow(/Unclosed/);
  });
});

describe('bare component tags', () => {
  const Label = (props: { text: string }) => html`<i class="lbl">${props.text}</i>`;

  it('resolves a registered component', () => {
    define({ Label });
    const el = mount(() => html`<div><Label text="hi" /></div>`);
    expect(el.querySelector('.lbl')?.textContent).toBe('hi');
  });

  it('names the component it cannot find', () => {
    expect(() => mount(() => html`<div><Missing /></div>`)).toThrow(/<Missing> is not defined/);
  });
});

describe('bind:', () => {
  it('reads and writes through the signal', () => {
    const name = signal('one');
    const el = mount(() => html`<input class="bound" bind:value=${name} />`);
    const input = el.querySelector('.bound') as HTMLInputElement;
    expect(input.value).toBe('one');

    name.set('two');
    expect(input.value).toBe('two');

    input.value = 'typed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(name()).toBe('typed');
  });
});

describe('a call site called with different hole shapes', () => {
  it('handles a signal first, then a plain value', () => {
    const build = (v: unknown) => html`<p>${v}</p>`;
    const s = signal('sig');
    expect(mount(() => build(s)).textContent).toBe('sig');
    expect(mount(() => build('plain')).textContent).toBe('plain');
  });

  it('handles a plain value first, then a signal', () => {
    const build = (v: unknown) => html`<em>${v}</em>`;
    expect(mount(() => build('plain')).textContent).toBe('plain');
    const s = signal('sig');
    const el = mount(() => build(s));
    expect(el.textContent).toBe('sig');
    s.set('changed');
    expect(el.textContent).toBe('changed');
  });
});

describe('a list that grows', () => {
  it('keeps the nodes it already rendered', () => {
    const items = signal(['a', 'b']);
    const el = mount(
      () => html`<ul each=${items}>${(i: string) => html`<li>${i}</li>`}</ul>`,
    );
    expect(el.querySelectorAll('ul')).toHaveLength(1);
    const before = [...el.querySelectorAll('li')];
    expect(before).toHaveLength(2);

    items.set([...items(), 'c']);
    const after = [...el.querySelectorAll('li')];
    expect(after).toHaveLength(3);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
  });
});
