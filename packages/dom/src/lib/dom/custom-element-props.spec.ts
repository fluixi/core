// @vitest-environment jsdom
/**
 * What a binding on a custom element sets.
 *
 * `key in element` answers this for a plain element and for a custom one that has
 * already upgraded. It answers wrongly for a custom element that has not: the property
 * is absent, so the value went to an attribute, and anything other than a string arrived
 * as `[object Object]`. Upgrading later did not repair it, because nothing had assigned
 * the property.
 *
 * Registration order is not something a page controls. A chunk that defines the element
 * can land after the markup that uses it, so the binding has to work either way.
 */
import { describe, expect, it } from 'vitest';
import { createNativeElement, spread } from './runtime.js';

let n = 0;
/** A fresh tag per test, since a registry entry cannot be removed. */
const tag = (): string => `ce-test-${++n}`;

/** Registers a class that keeps whatever it is given. */
function define(name: string): void {
  customElements.define(
    name,
    class extends HTMLElement {
      declare count: unknown;
      declare user: unknown;
    },
  );
}

describe('a custom element that is already defined', () => {
  it('takes the property, not the attribute', () => {
    const name = tag();
    define(name);
    const el = createNativeElement(name) as HTMLElement & { count?: unknown };

    spread({ element: el, props: { count: { n: 1 } } });

    expect(el.count).toEqual({ n: 1 });
    expect(el.getAttribute('count')).toBeNull();
  });
});

describe('a custom element that is not defined yet', () => {
  it('still takes the property, and keeps the value across the upgrade', () => {
    const name = tag();
    const el = createNativeElement(name) as HTMLElement & { user?: unknown };

    spread({ element: el, props: { user: { id: 7 } } });

    // The regression: this used to be undefined, with `[object Object]` on an attribute.
    expect(el.user).toEqual({ id: 7 });
    expect(el.getAttribute('user')).toBeNull();

    define(name);
    customElements.upgrade(el);
    expect(el.user).toEqual({ id: 7 });
  });

  it('keeps a number a number', () => {
    const el = createNativeElement(tag()) as HTMLElement & { count?: unknown };
    spread({ element: el, props: { count: 3 } });
    expect(el.count).toBe(3);
  });

  it('takes the compiler flag when it is given one', () => {
    const el = createNativeElement(tag()) as HTMLElement & { count?: unknown };
    spread({ element: el, props: { count: 3 }, isCustomElement: true });
    expect(el.count).toBe(3);
  });
});

describe('the global attributes stay attributes', () => {
  it.each(['id', 'class', 'slot', 'title', 'role'])('%s', (key) => {
    const el = createNativeElement(tag());
    spread({ element: el, props: { [key]: 'x' } });
    expect(el.getAttribute(key === 'class' ? 'class' : key)).toBe('x');
  });

  it('slot decides where the element lands, so it is never a property', () => {
    const el = createNativeElement(tag()) as HTMLElement & { slot: string };
    spread({ element: el, props: { slot: 'title' } });
    expect(el.getAttribute('slot')).toBe('title');
  });

  it('aria- and data- are attributes', () => {
    const el = createNativeElement(tag());
    spread({ element: el, props: { 'aria-label': 'Close', 'data-id': '4' } });
    expect(el.getAttribute('aria-label')).toBe('Close');
    expect(el.getAttribute('data-id')).toBe('4');
  });
});

describe('a plain element is unaffected', () => {
  it('unknown names stay attributes', () => {
    const el = createNativeElement('div') as HTMLElement & { foo?: unknown };
    spread({ element: el, props: { foo: 'bar' } });
    expect(el.getAttribute('foo')).toBe('bar');
    expect(el.foo).toBeUndefined();
  });

  it('known properties still go through the property', () => {
    const el = createNativeElement('input') as HTMLInputElement;
    spread({ element: el, props: { value: 'typed' } });
    expect(el.value).toBe('typed');
  });
});
