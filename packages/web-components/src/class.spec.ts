/**
 * Authoring by class: `class X extends HTMLReactiveElement`, registered with the standard
 * `customElements.define`.
 */
import { describe, it, expect, vi } from 'vitest';
import { signal } from '@fluixi/reactive/signal';
import { HTMLReactiveElement, prop, typedElement } from './index.js';

let n = 0;
const tag = (base: string) => `${base}-class-${++n}`;

const counterProps = { step: prop.number(1), label: prop.string('Count') };

class Counter extends typedElement(counterProps) {
  static renders = 0;
  #count = signal(0);

  protected override render(): unknown {
    Counter.renders++;
    const out = document.createElement('output');
    out.textContent = '0';
    return out;
  }

  /** Public: callable by page code and other frameworks. */
  increment(): number {
    this.#count.set(this.#count() + this.step);
    this.emit('change', { value: this.#count() });
    return this.#count();
  }

  get count(): number {
    return this.#count();
  }
}
const COUNTER = tag('fx-counter');
customElements.define(COUNTER, Counter);

describe('a class element', () => {
  it('takes props as attributes and properties, and exposes public methods', () => {
    document.body.innerHTML = `<${COUNTER} step="5"></${COUNTER}>`;
    const el = document.querySelector(COUNTER) as Counter;
    const seen: unknown[] = [];
    el.addEventListener('change', (e: Event) => seen.push((e as CustomEvent).detail));

    expect(el.step).toBe(5);
    expect(el.increment()).toBe(5);
    el.step = 2;
    expect(el.increment()).toBe(7);
    expect(seen).toEqual([{ value: 5 }, { value: 7 }]);
  });

  it('runs render once, however often props change', () => {
    Counter.renders = 0;
    document.body.innerHTML = `<${COUNTER}></${COUNTER}>`;
    const el = document.querySelector(COUNTER) as Counter;
    el.step = 3;
    el.setAttribute('label', 'Other');
    expect(Counter.renders).toBe(1);
    expect(el.querySelector('output')).not.toBeNull();
  });

  it('keeps private state private at runtime', () => {
    const el = document.createElement(COUNTER) as Counter;
    expect(Object.keys(el)).not.toContain('count');
    expect((el as unknown as Record<string, unknown>)['#count']).toBeUndefined();
  });
});

describe('inheritance', () => {
  it('inherits props, and lets a subclass redeclare one', () => {
    class Base extends HTMLReactiveElement {
      static override props = { size: prop.number(1), tone: prop.string('plain') };
    }
    // The subclass spreads its parent's props: TypeScript requires the static side to stay
    // compatible, and the runtime merges the chain either way.
    class Child extends Base {
      static override props = { ...Base.props, tone: prop.string('loud'), extra: prop.boolean(false) };
    }
    const name = tag('fx-child');
    customElements.define(name, Child);
    const el = document.createElement(name) as Child & { size: number; tone: string; extra: boolean };

    expect([el.size, el.tone, el.extra]).toEqual([1, 'loud', false]);
    expect(Child.observedAttributes.sort()).toEqual(['extra', 'size', 'tone']);
  });
});

describe('a class field named like a prop', () => {
  it('is adopted into the prop on connect, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class Fielded extends typedElement({ step: prop.number(1) }) {
      // The mistake: an own field hides the accessor on the prototype.
      override step = 9;
    }
    const name = tag('fx-fielded');
    customElements.define(name, Fielded);
    document.body.innerHTML = `<${name}></${name}>`;
    const el = document.querySelector(name) as Fielded;

    expect(Object.prototype.hasOwnProperty.call(el, 'step')).toBe(false);
    expect(el.step).toBe(9);
    el.setAttribute('step', '4');
    expect(el.step).toBe(4);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('class field named "step"'));
    warn.mockRestore();
  });
});

describe('mixins, the standard way', () => {
  it('compose over the base with protected members a subclass can use', () => {
    type Ctor = abstract new (...args: any[]) => HTMLReactiveElement;
    const Pressable = <B extends Ctor>(Base: B) => {
      abstract class P extends Base {
        protected pressed = 0;
        protected press(): void {
          this.pressed++;
        }
      }
      return P;
    };
    class Button extends Pressable(HTMLReactiveElement) {
      protected override render(): unknown {
        const b = document.createElement('button');
        b.addEventListener('click', () => this.press());
        return b;
      }
      get presses(): number {
        return this.pressed;
      }
    }
    const name = tag('fx-button');
    customElements.define(name, Button);
    document.body.innerHTML = `<${name}></${name}>`;
    const el = document.querySelector(name) as Button;
    el.querySelector('button')!.click();
    expect(el.presses).toBe(1);
  });
});

describe('ElementInternals', () => {
  it.skipIf(typeof HTMLElement.prototype.attachInternals !== 'function')(
    'is attached on first use, once',
    () => {
      class Field extends HTMLReactiveElement {
        static formAssociated = true;
        get ownInternals(): ElementInternals {
          return this.internals;
        }
      }
      const name = tag('fx-field');
      customElements.define(name, Field);
      const el = document.createElement(name) as Field;
      expect(el.ownInternals).toBe(el.ownInternals);
    },
  );
});
