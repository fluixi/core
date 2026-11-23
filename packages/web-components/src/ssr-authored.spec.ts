/**
 * A light DOM element the server rendered, with children the page wrote between its tags:
 * after the page hydrates, each child sits where render() places it, once.
 */
import { describe, it, expect } from 'vitest';
import { beginAppHydration, createNativeElement, endAppHydration, hydrate, insert, templateNode } from '@fluixi/dom';
import { HTMLReactiveElement, defineCustomElement } from './index.js';
// A page that hydrates server-rendered elements installs element hydration (`@fluixi/start` adds it).
import './hydrate.js';

class Panel extends HTMLReactiveElement {
  protected override render(): unknown {
    const header = createNativeElement('header');
    const body = createNativeElement('div');
    insert(header, this.slotted('header') as never);
    insert(body, this.slotted() as never);
    return [header, body];
  }
}

describe('an element the server rendered, with authored children', () => {
  it('places the page children in its slots after hydration', async () => {
    defineCustomElement('fx-authored-panel', Panel);
    document.body.innerHTML =
      '<div id="app"><fx-authored-panel data-fx-ssr><header><h2 slot="header">Head</h2></header><div><p>Body</p></div></fx-authored-panel></div>';
    const app = document.getElementById('app')!;
    const host = app.querySelector('fx-authored-panel')!;

    beginAppHydration();
    hydrate(() => {
      const el = createNativeElement('fx-authored-panel');
      insert(el, templateNode('<h2 slot="header">Head</h2>', 'h2'), null as never);
      insert(el, templateNode('<p>Body</p>', 'p'), null as never);
      return el;
    }, app);
    endAppHydration();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    expect(app.querySelector('fx-authored-panel')).toBe(host);
    expect(host.innerHTML.replace(/<!--[^>]*-->/g, '')).toBe('<header><h2 slot="header">Head</h2></header><div><p>Body</p></div>');
  });
});
