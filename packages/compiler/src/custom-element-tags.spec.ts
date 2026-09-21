/**
 * The compiler says which tags are custom elements.
 *
 * A dash in the tag is the whole rule, and the tag is known while compiling, so the
 * runtime is told rather than left to read it back off the node. It still checks when
 * nothing told it, which is what keeps a hand-written `spread` call correct.
 */
import { describe, expect, it } from 'vitest';
import { transformTemplates } from './transform/templates.js';

const compile = (source: string): string =>
  transformTemplates(source, 'test.tsx', { runtimeModule: '@fluixi/dom' })?.code ?? '';

describe('isCustomElement in the emitted spread', () => {
  it('is set for a dash tag', () => {
    const out = compile('const v = html`<my-counter count=${n}></my-counter>`;');
    expect(out).toContain('isCustomElement: true');
  });

  it('is absent for a plain element', () => {
    const out = compile('const v = html`<div title=${n}></div>`;');
    expect(out).not.toContain('isCustomElement');
  });

  it('is set for a namespaced tag, which is still a custom element', () => {
    const out = compile('const v = html`<ion-button size=${n}></ion-button>`;');
    expect(out).toContain('isCustomElement: true');
  });

  it('does not appear when every attribute is a literal', () => {
    // Literals are written straight onto the element and never reach `spread`, so there
    // is nothing to flag.
    const out = compile('const v = html`<my-counter count="3"></my-counter>`;');
    expect(out).not.toContain('isCustomElement');
  });
});
