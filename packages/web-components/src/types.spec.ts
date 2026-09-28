/**
 * The declarations a consumer writes, compiled.
 *
 * These assert types rather than behaviour, so the value of the file is that it fails to
 * compile when the inference breaks. `expectTypeOf` keeps that failure readable.
 */
import { describe, expectTypeOf, it } from 'vitest';
import { prop } from './props.js';
import { HTMLReactiveElement, typedElement } from './element.js';
import type { ElementAttributes, ElementOf, PropValues } from './types.js';

const schema = {
  step: prop.number(1),
  label: prop.string(''),
  open: prop.boolean(false),
};

type Events = { change: { value: number } };

describe('PropValues reads the schema', () => {
  it('gives each prop its declared type', () => {
    expectTypeOf<PropValues<typeof schema>>().toEqualTypeOf<{
      step: number;
      label: string;
      open: boolean;
    }>();
  });
});

describe('ElementOf, for HTMLElementTagNameMap', () => {
  it('is an HTMLElement carrying the properties', () => {
    type El = ElementOf<typeof schema, Events>;
    expectTypeOf<El>().toMatchTypeOf<HTMLElement>();
    expectTypeOf<El['step']>().toEqualTypeOf<number>();
    expectTypeOf<El['open']>().toEqualTypeOf<boolean>();
  });
});

describe('ElementAttributes, for the JSX tag', () => {
  type Attrs = ElementAttributes<typeof schema, Events>;

  it('takes every prop, optionally, at its real type', () => {
    expectTypeOf<Attrs['step']>().toEqualTypeOf<number | undefined>();
    // A number stays a number. The runtime sets it as a property, so JSX should not be
    // asking for a string.
    expectTypeOf<Attrs>().toMatchTypeOf<{ step?: number }>();
  });

  it('turns a dispatched event into a handler', () => {
    expectTypeOf<Attrs['onChange']>().toEqualTypeOf<
      ((event: CustomEvent<{ value: number }>) => void) | undefined
    >();
  });

  it('accepts the global attributes', () => {
    expectTypeOf<Attrs>().toMatchTypeOf<{ class?: string; id?: string; slot?: string }>();
  });

  it('accepts data- and aria- names', () => {
    const attrs: Attrs = { 'data-id': '4', 'aria-label': 'Close' };
    expectTypeOf(attrs).toMatchTypeOf<Attrs>();
  });
});

describe('the class form', () => {
  it('types declared props on the instance through typedElement', () => {
    class Counter extends typedElement({ step: prop.number(1), label: prop.string('') }) {
      read(): number {
        expectTypeOf(this.step).toEqualTypeOf<number>();
        return this.step;
      }
    }
    expectTypeOf<Counter['label']>().toEqualTypeOf<string>();
  });

  it('keeps render, emit, targets and internals out of the public surface', () => {
    const el = {} as HTMLReactiveElement;
    // @ts-expect-error protected: for the element's own code
    void el.render;
    // @ts-expect-error protected
    void el.emit;
    // @ts-expect-error protected
    void el.targets;
    // @ts-expect-error protected
    void el.internals;
    // The platform calls these, so they stay public.
    expectTypeOf(el.connectedCallback).toBeFunction();
    expectTypeOf(el.attributeChangedCallback).toBeFunction();
  });
});
