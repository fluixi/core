// @vitest-environment jsdom
/**
 * A <Show> that the server rendered empty, between two siblings, in the shape the element path
 * compiles to: `insert(parent, createMemo(Show), null)` per child. Hydrating must keep its slot
 * between the siblings, so content that turns up later lands there and not at the end.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { ensureIntegration } from './render/component.js';

const { createComponent, createNativeElement, insert, Show } = DOM as any;
const tick = () => new Promise((r) => setTimeout(r, 0));

const order = (el: Element) => [...el.children].map((child) => child.tagName.toLowerCase());

beforeAll(() => ensureIntegration());

describe('hydration: an empty <Show> between siblings', () => {
  it('renders its content in place once it turns true', async () => {
    const [open, setOpen] = S.createSignal(false);
    const App = () => {
      const root = createNativeElement('div');
      insert(root, createNativeElement('nav'), null);
      insert(
        root,
        S.createMemo(() =>
          createComponent(Show, {
            get when() {
              return open();
            },
            get children() {
              return createNativeElement('aside');
            },
          }),
        ),
        null,
      );
      insert(root, createNativeElement('main'), null);
      return root;
    };

    setServerMode(true);
    const html = await renderToStringAsync(() => App());
    setServerMode(false);
    expect(html).not.toContain('<aside');

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    DOM.hydrate(() => App(), container);
    await tick();
    const root = container.firstElementChild!;
    expect(order(root)).toEqual(['nav', 'main']);

    setOpen(true);
    await tick();
    expect(order(root)).toEqual(['nav', 'aside', 'main']);

    setOpen(false);
    await tick();
    setOpen(true);
    await tick();
    expect(order(root)).toEqual(['nav', 'aside', 'main']);
  });

  it('keeps the order when the server rendered it full', async () => {
    const [open, setOpen] = S.createSignal(true);
    const App = () => {
      const root = createNativeElement('div');
      insert(root, createNativeElement('nav'), null);
      insert(
        root,
        S.createMemo(() =>
          createComponent(Show, {
            get when() {
              return open();
            },
            get children() {
              return createNativeElement('aside');
            },
          }),
        ),
        null,
      );
      insert(root, createNativeElement('main'), null);
      return root;
    };

    setServerMode(true);
    const html = await renderToStringAsync(() => App());
    setServerMode(false);

    document.body.innerHTML = `<div id="app">${html}</div>`;
    const container = document.getElementById('app')!;
    const serverAside = container.querySelector('aside');
    DOM.hydrate(() => App(), container);
    await tick();
    const root = container.firstElementChild!;
    expect(order(root)).toEqual(['nav', 'aside', 'main']);
    expect(root.querySelector('aside')).toBe(serverAside);

    setOpen(false);
    await tick();
    setOpen(true);
    await tick();
    expect(order(root)).toEqual(['nav', 'aside', 'main']);
  });
});
