import { describe, it, expect, beforeAll } from 'vitest';
import { createRoot, createSignal } from '@fluixi/reactive/signal';
import { createDynamicElement } from './dynamic-element.js';
import { registerCreateComponent } from './integration.js';

// The point of this module: an `as`-polymorphic component can build an element or
// a component from a runtime type WITHOUT depending on @fluixi/jsx.
beforeAll(() => registerCreateComponent((Comp: any, props: any) => Comp(props)));

describe('createDynamicElement', () => {
  it('builds a native element from a tag name', () => {
    const el = createDynamicElement('section', { id: 'x' });
    expect(el.tagName).toBe('SECTION');
    expect(el.getAttribute('id')).toBe('x');
  });

  it('builds an element in the SVG namespace when the tag is one', () => {
    const el = createDynamicElement('circle', {});
    expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('inserts static children', () => {
    const el = createDynamicElement('p', { children: 'hello' });
    expect(el.textContent).toBe('hello');
  });

  it('inserts an array of children', () => {
    const el = createDynamicElement('ul', { children: ['a', 'b'] });
    expect(el.textContent).toBe('ab');
  });

  it('keeps a function child reactive', () => {
    createRoot(() => {
      const [count, setCount] = createSignal(1);
      const el = createDynamicElement('span', { children: () => count() });
      expect(el.textContent).toBe('1');
      setCount(2);
      expect(el.textContent).toBe('2');
    });
  });

  it('instantiates a component when given a function', () => {
    const Comp = (props: { label: string }) => {
      const el = document.createElement('b');
      el.textContent = props.label;
      return el;
    };
    const out = createDynamicElement(Comp, { label: 'hi' });
    expect(out.tagName).toBe('B');
    expect(out.textContent).toBe('hi');
  });

  it('returns null for a type it cannot build', () => {
    expect(createDynamicElement('' as never, {})).toBeNull();
    expect(createDynamicElement(undefined as never, {})).toBeNull();
  });

  it('applies reactive props', () => {
    createRoot(() => {
      const [cls, setCls] = createSignal('a');
      const el = createDynamicElement('div', { class: () => cls() });
      expect(el.getAttribute('class')).toBe('a');
      setCls('b');
      expect(el.getAttribute('class')).toBe('b');
    });
  });
});
