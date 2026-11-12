/**
 * Named slots in light DOM: the element sorts the children written between its tags by their
 * `slot` attribute and places each group itself, as a shadow root's `<slot name>` would.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { HTMLReactiveElement } from './index.js';

let n = 0;
const tag = () => `fx-slots-${++n}`;
afterEach(() => {
  document.body.innerHTML = '';
});

class Framed extends HTMLReactiveElement {
  protected override render(): unknown {
    const header = document.createElement('header');
    const main = document.createElement('main');
    const footer = document.createElement('footer');
    header.append(...this.slotted('header'));
    main.append(...this.slotted());
    footer.append(...this.slotted('footer'));
    return [header, main, footer];
  }
}

describe('slotted', () => {
  it('places each named group and leaves the rest to the default slot', () => {
    const name = tag();
    customElements.define(name, class extends Framed {});
    document.body.innerHTML = `<${name}><b slot="footer">end</b>text<i>body</i><h2 slot="header">title</h2></${name}>`;
    const el = document.body.firstElementChild!;
    expect(el.querySelector('header')!.innerHTML).toBe('<h2 slot="header">title</h2>');
    expect(el.querySelector('main')!.innerHTML).toBe('text<i>body</i>');
    expect(el.querySelector('footer')!.innerHTML).toBe('<b slot="footer">end</b>');
  });

  it('gives an empty list for a slot nobody filled', () => {
    const name = tag();
    customElements.define(name, class extends Framed {});
    document.body.innerHTML = `<${name}>only body</${name}>`;
    const el = document.body.firstElementChild!;
    expect(el.querySelector('header')!.childNodes.length).toBe(0);
    expect(el.querySelector('main')!.textContent).toBe('only body');
  });
});
