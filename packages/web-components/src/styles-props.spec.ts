/**
 * Shadow styles shared as one sheet across instances, and props with a custom conversion.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { HTMLReactiveElement, prop, typedElement, type ElementStyles } from './index.js';

let n = 0;
const tag = (base: string) => `${base}-sp-${++n}`;
const flush = () => new Promise((r) => setTimeout(r, 0));

function mount<T extends HTMLElement>(name: string): T {
  const el = document.createElement(name) as T;
  document.body.append(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('shadow styles', () => {
  it('falls back to a <style> where adoptedStyleSheets is missing, keeping a parent list', () => {
    class Base extends HTMLReactiveElement {
      static override shadow = 'open' as const;
      // Annotated: a bare string would narrow the static and reject the child's list.
      static override styles: ElementStyles = ':host { display: block; }';
    }
    class Child extends Base {
      static override styles = [Base.styles, undefined, '.x { color: red; }'];
    }
    const name = tag('fx-styled');
    customElements.define(name, Child);
    const el = mount(name);

    const texts = Array.from(el.shadowRoot!.querySelectorAll('style'), (s) => s.textContent);
    expect(texts).toEqual([':host { display: block; }', '.x { color: red; }']);
  });

  it('adopts one sheet shared by every instance and every class with the same text', () => {
    // jsdom has CSSStyleSheet but not adoptedStyleSheets; give shadow roots a plain one.
    const store = new WeakMap<ShadowRoot, CSSStyleSheet[]>();
    Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', {
      configurable: true,
      get(this: ShadowRoot) { return store.get(this) ?? []; },
      set(this: ShadowRoot, value: CSSStyleSheet[]) { store.set(this, value); },
    });
    try {
      const css = ':host { display: inline-block; }';
      class A extends HTMLReactiveElement {
        static override shadow = true;
        static override styles = css;
      }
      class B extends HTMLReactiveElement {
        static override shadow = true;
        static override styles = [css];
      }
      const a = tag('fx-adopt');
      const b = tag('fx-adopt');
      customElements.define(a, A);
      customElements.define(b, B);
      const [one, two, three] = [mount(a), mount(a), mount(b)];

      const sheet = one.shadowRoot!.adoptedStyleSheets[0];
      expect(sheet).toBeInstanceOf(CSSStyleSheet);
      expect(two.shadowRoot!.adoptedStyleSheets).toEqual([sheet]);
      expect(three.shadowRoot!.adoptedStyleSheets[0]).toBe(sheet);
      expect(one.shadowRoot!.querySelector('style')).toBeNull();
    } finally {
      delete (ShadowRoot.prototype as { adoptedStyleSheets?: unknown }).adoptedStyleSheets;
    }
  });
});

describe('prop conversions', () => {
  const dateProps = {
    due: prop.custom(
      new Date(0),
      { fromAttribute: (v) => new Date(v), toAttribute: (d) => d.toISOString().slice(0, 10) },
      { reflect: true, equals: (x, y) => x.getTime() === y.getTime() },
    ),
    tags: prop.custom<string[]>([], { fromAttribute: (v) => v.split(',').map((s) => s.trim()).filter(Boolean) }),
    size: prop.number(3),
  };
  class Task extends typedElement(dateProps) {}
  const TASK = tag('fx-task');
  customElements.define(TASK, Task);

  it('reads an attribute through a custom converter, and removal goes back to initial', () => {
    const el = mount<Task>(TASK);
    el.setAttribute('tags', 'a, b,,c');
    expect(el.tags).toEqual(['a', 'b', 'c']);
    el.setAttribute('due', '2026-10-01');
    expect(el.due.toISOString().slice(0, 10)).toBe('2026-10-01');
    el.removeAttribute('tags');
    expect(el.tags).toEqual([]);
  });

  it('reflects through the converter', async () => {
    const el = mount<Task>(TASK);
    el.due = new Date('2027-01-02T00:00:00Z');
    await flush();
    expect(el.getAttribute('due')).toBe('2027-01-02');
  });

  it('keeps the initial number for unparseable text rather than NaN', () => {
    const el = mount<Task>(TASK);
    el.setAttribute('size', 'abc');
    expect(el.size).toBe(3);
    el.setAttribute('size', '7');
    expect(el.size).toBe(7);
  });
});
