/**
 * An element the server rendered, on a page that never installed element hydration (an element
 * used in another framework, or a client entry without `@fluixi/web-components/hydrate`). It
 * renders its content again in the browser, once, rather than adopting the server's nodes or
 * leaving them beside its own; in development it says why.
 */
import { describe, it, expect, vi } from 'vitest';
import { createNativeElement, insert } from '@fluixi/dom';
import { typedElement, prop, defineCustomElement } from './index.js';

const h = (tag: string, children: unknown) => {
  const node = createNativeElement(tag);
  insert(node, children as never);
  return node;
};

class Deals extends typedElement({ heading: prop.string(''), items: prop.object<string[]>([]) }) {
  protected override render(): unknown {
    return [h('h2', () => this.heading), h('ul', () => this.items.map((item) => h('li', item)))];
  }
}

describe('an element the server rendered, without element hydration', () => {
  it('renders its content once in the browser, with the carried props, and warns in development', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML =
      '<fx-plain-deals heading="Pipeline" data-fx-ssr data-fx-props="{&quot;items&quot;:[&quot;A&quot;,&quot;B&quot;]}">' +
      '<h2>Pipeline</h2><ul><li>A</li><li>B</li></ul></fx-plain-deals>';
    const host = document.querySelector('fx-plain-deals') as HTMLElement & { heading: string; items: string[] };
    const serverHeading = host.querySelector('h2');

    defineCustomElement('fx-plain-deals', Deals);
    await Promise.resolve();

    expect(host.querySelectorAll('h2')).toHaveLength(1);
    expect(host.querySelector('h2')).not.toBe(serverHeading);
    expect([...host.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['A', 'B']);
    expect(warn.mock.calls.some(([m]) => String(m).includes('@fluixi/web-components/hydrate'))).toBe(true);

    host.items = ['A', 'B', 'C'];
    await Promise.resolve();
    expect(host.querySelectorAll('li')).toHaveLength(3);
    warn.mockRestore();
  });
});
