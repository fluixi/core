// @vitest-environment node
/**
 * On the server: an element defined with defineElement renders, and slotted() sorts static
 * children, which a page compiles to raw template HTML, by their `slot` attribute.
 */
import { describe, it, expect } from 'vitest';

describe('a custom element in a server render', () => {
  it('renders when it was defined with defineElement', async () => {
    const { defineElement } = await import('./index.js');
    const { createNativeElement, insert } = await import('@fluixi/dom');
    const { renderToString } = await import('@fluixi/dom/server');
    defineElement('fx-ssr-defined', () => {
      const p = createNativeElement('p');
      insert(p, 'rendered on the server');
      return p;
    });
    const out = renderToString(() => createNativeElement('fx-ssr-defined'), { hydrationKeys: false });
    expect(out).toContain('<p>rendered on the server</p>');
    expect(out).toContain('data-fx-ssr');
  });

  it('places static children by their slot attribute', async () => {
    const { HTMLReactiveElement, defineCustomElement } = await import('./index.js');
    const { createNativeElement, insert, templateNode } = await import('@fluixi/dom');
    const { renderToString } = await import('@fluixi/dom/server');
    class Framed extends HTMLReactiveElement {
      protected override render(): unknown {
        const header = createNativeElement('header');
        const main = createNativeElement('main');
        insert(header, this.slotted('header') as never);
        insert(main, this.slotted() as never);
        return [header, main];
      }
    }
    defineCustomElement('fx-ssr-framed', Framed);
    const out = renderToString(() => {
      const el = createNativeElement('fx-ssr-framed');
      // As compiled JSX writes static children: each one a template.
      insert(el, templateNode('<h2 slot="header">title</h2>', 'h2'), null as never);
      insert(el, templateNode('<i>body</i>', 'i'), null as never);
      return el;
    }, { hydrationKeys: false });
    expect(out.replace(/<!--[^>]*-->/g, '')).toMatch(/<header><h2 slot="header">title<\/h2><\/header><main><i>body<\/i><\/main>/);
  });
});
