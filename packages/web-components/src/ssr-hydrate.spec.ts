/**
 * The client half: an element whose content came from the server adopts it on upgrade,
 * with the props the server carried, instead of rendering a second copy.
 */
import { describe, it, expect } from 'vitest';
import { createNativeElement, insert } from '@fluixi/dom';

// What compiled JSX does: create the element, then insert its (reactive) children.
const h = (tag: string, children: unknown) => {
  const node = createNativeElement(tag);
  insert(node, children as never);
  return node;
};
import { typedElement, prop, defineCustomElement } from './index.js';

class Deals extends typedElement({ heading: prop.string(''), items: prop.object<string[]>([]) }) {
  protected override render(): unknown {
    return [h('h2', () => this.heading), h('ul', () => this.items.map((item) => h('li', item)))];
  }
}

describe('an element the server rendered', () => {
  it('adopts the server markup on upgrade and stays reactive', async () => {
    document.body.innerHTML =
      '<fx-hydrate-deals heading="Pipeline" data-fx-ssr data-fx-props="{&quot;items&quot;:[&quot;A&quot;,&quot;B&quot;]}">' +
      '<h2>Pipeline</h2><ul><li>A</li><li>B</li></ul></fx-hydrate-deals>';
    const host = document.querySelector('fx-hydrate-deals') as HTMLElement & { heading: string; items: string[] };
    const heading = host.querySelector('h2');

    defineCustomElement('fx-hydrate-deals', Deals);

    expect(host.querySelectorAll('h2')).toHaveLength(1);
    expect(host.querySelector('h2')).toBe(heading);
    expect(host.querySelectorAll('li')).toHaveLength(2);
    expect(host.items).toEqual(['A', 'B']);
    expect(host.hasAttribute('data-fx-ssr')).toBe(false);

    host.heading = 'Pipeline, cette semaine';
    host.items = ['A', 'B', 'C'];
    await Promise.resolve();
    expect(host.querySelector('h2')?.textContent).toBe('Pipeline, cette semaine');
    expect([...host.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['A', 'B', 'C']);
  });
});
