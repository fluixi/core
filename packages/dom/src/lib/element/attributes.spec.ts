/**
 * Types only: these assertions fail the typecheck, not the run.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, IntrinsicElements } from './attributes.js';

type EventOf<H> = NonNullable<H> extends (event: infer E) => void ? E : never;

describe('event handler types', () => {
  it('give currentTarget the element the handler is on', () => {
    type Click = EventOf<ButtonHTMLAttributes['onClick']>;
    expectTypeOf<Click['currentTarget']>().toExtend<HTMLButtonElement>();
    expectTypeOf<Click>().toExtend<MouseEvent>();
  });

  it('give target the control for input and change events on a control', () => {
    expectTypeOf<EventOf<InputHTMLAttributes['onInput']>['target']['value']>().toEqualTypeOf<string>();
    expectTypeOf<EventOf<InputHTMLAttributes['onChange']>['target']['value']>().toEqualTypeOf<string>();
  });

  it('keep target an Element where the event can come from a child', () => {
    type DivInput = EventOf<HTMLAttributes<HTMLDivElement>['onInput']>['target'];
    expectTypeOf<DivInput>().toExtend<Element>();
    expectTypeOf<DivInput>().not.toExtend<HTMLDivElement>();
    expectTypeOf<EventOf<ButtonHTMLAttributes['onClick']>['target']>().toExtend<Element>();
  });

  it('accept a handler written for the plain event', () => {
    expectTypeOf<(event: MouseEvent) => void>().toExtend<NonNullable<ButtonHTMLAttributes['onClick']>>();
  });
});

describe('ref types', () => {
  it('accept the element itself on a tag, which the compiler assigns to a variable', () => {
    expectTypeOf<HTMLCanvasElement>().toExtend<NonNullable<IntrinsicElements['canvas']['ref']>>();
    expectTypeOf<SVGCircleElement>().toExtend<NonNullable<IntrinsicElements['circle']['ref']>>();
  });

  it('keep a forwarded ref a callback or an object in the attributes a component extends', () => {
    expectTypeOf<HTMLCanvasElement>().not.toExtend<NonNullable<HTMLAttributes<HTMLCanvasElement>['ref']>>();
    // Props typed for any element spread onto a paragraph.
    expectTypeOf<HTMLAttributes<HTMLElement>['ref']>().toExtend<HTMLAttributes<HTMLParagraphElement>['ref']>();
  });
});
