/**
 * The client half: an element whose content came from the server adopts it on upgrade,
 * with the props the server carried, instead of rendering a second copy.
 */
import { describe, it, expect } from 'vitest';
import { beginAppHydration, createNativeElement, endAppHydration, hydrate, insert, spread } from '@fluixi/dom';
import { createContext, createRoot, useContext } from '@fluixi/reactive/signal';

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
    // No app is hydrating this page, so it builds after one microtask.
    await Promise.resolve();

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

  it('adopts a node built before a list that follows it', async () => {
    class Rail extends typedElement({ items: prop.object<string[]>([]) }) {
      protected override render(): unknown {
        return [h('a', 'org'), () => this.items.map((item) => h('a', item))];
      }
    }
    document.body.innerHTML =
      '<fx-hydrate-rail data-fx-ssr data-fx-props="{&quot;items&quot;:[&quot;home&quot;,&quot;crm&quot;]}">' +
      '<a>org</a><a>home</a><a>crm</a></fx-hydrate-rail>';
    const host = document.querySelector('fx-hydrate-rail')!;
    const server = [...host.children];

    defineCustomElement('fx-hydrate-rail', Rail);

    expect([...host.children].map((a) => a.textContent)).toEqual(['org', 'home', 'crm']);
    expect([...host.children]).toEqual(server);
  });

  it('keeps its content when the page hydrates around it and passes a new prop', async () => {
    class Rail extends typedElement({ items: prop.object<string[]>([]) }) {
      protected override render(): unknown {
        return [h('a', 'org'), () => this.items.map((item) => h('a', item))];
      }
    }
    document.body.innerHTML =
      '<main id="page"><fx-hydrate-rail2 data-fx-ssr data-fx-props="{&quot;items&quot;:[&quot;home&quot;,&quot;crm&quot;]}">' +
      '<a>org</a><a>home</a><a>crm</a></fx-hydrate-rail2></main>';
    const page = document.getElementById('page')!;
    const host = page.querySelector('fx-hydrate-rail2')!;
    defineCustomElement('fx-hydrate-rail2', Rail);
    const org = host.children[0];

    // The page claims the element and hands it a fresh array, as a template does.
    hydrate(() => {
      const el = createNativeElement('fx-hydrate-rail2');
      spread({ element: el, props: { items: ['home', 'crm'] } });
      return el;
    }, page);
    await Promise.resolve();

    expect([...host.children].map((a) => a.textContent)).toEqual(['org', 'home', 'crm']);
    expect(host.children[0]).toBe(org);
  });

  it('lets the page adopt the elements after it', async () => {
    class Menu extends typedElement({ name: prop.string('') }) {
      protected override render(): unknown {
        return h('span', () => this.name);
      }
    }
    document.body.innerHTML =
      '<nav id="page"><fx-hydrate-menu data-fx-ssr name="AD"><span>AD</span></fx-hydrate-menu><fx-hydrate-menu data-fx-ssr name="FS"><span>FS</span></fx-hydrate-menu></nav>';
    const page = document.getElementById('page')!;
    defineCustomElement('fx-hydrate-menu', Menu);
    const [first, second] = [...page.children];

    hydrate(() => {
      const a = createNativeElement('fx-hydrate-menu');
      spread({ element: a, props: { name: 'AD' } });
      const b = createNativeElement('fx-hydrate-menu');
      spread({ element: b, props: { name: 'FS' } });
      return [a, b];
    }, page);
    await Promise.resolve();

    expect(page.children).toHaveLength(2);
    expect([...page.children]).toEqual([first, second]);
  });

  it('waits for the app hydrating the page, and reads its context', async () => {
    const Theme = createContext('none');
    class Badge extends typedElement({}) {
      protected override render(): unknown {
        return h('span', () => useContext(Theme));
      }
    }
    document.body.innerHTML = '<div id="page"><fx-hydrate-badge data-fx-ssr><span>dark</span></fx-hydrate-badge></div>';
    const page = document.getElementById('page')!;
    const host = page.querySelector('fx-hydrate-badge')!;
    const span = host.querySelector('span');

    beginAppHydration();
    defineCustomElement('fx-hydrate-badge', Badge);
    await Promise.resolve();
    // Upgraded, not built: the app has not handed it an owner yet.
    expect(host.hasAttribute('data-fx-ssr')).toBe(true);

    hydrate(
      () =>
        Theme.Provider({
          value: 'dark',
          get children() {
            return createNativeElement('fx-hydrate-badge');
          },
        }),
      page,
    );
    endAppHydration();

    expect(host.hasAttribute('data-fx-ssr')).toBe(false);
    expect(host.querySelector('span')).toBe(span);
    expect(span?.textContent).toBe('dark');
  });

  it('builds on its own when the app hydration ends without reaching it', async () => {
    class Note extends typedElement({ text: prop.string('') }) {
      protected override render(): unknown {
        return h('p', () => this.text);
      }
    }
    document.body.innerHTML = '<fx-hydrate-note data-fx-ssr text="hi"><p>hi</p></fx-hydrate-note>';
    const host = document.querySelector('fx-hydrate-note') as HTMLElement & { text: string };
    const paragraph = host.querySelector('p');

    beginAppHydration();
    defineCustomElement('fx-hydrate-note', Note);
    await Promise.resolve();
    expect(host.hasAttribute('data-fx-ssr')).toBe(true);

    endAppHydration();
    expect(host.hasAttribute('data-fx-ssr')).toBe(false);
    expect(host.querySelector('p')).toBe(paragraph);
    host.text = 'hello';
    await Promise.resolve();
    expect(paragraph?.textContent).toBe('hello');
  });

  it('waits even when it upgrades under an unrelated owner', async () => {
    const Router = createContext<string | undefined>(undefined);
    class Crumb extends typedElement({}) {
      protected override render(): unknown {
        return h('span', () => useContext(Router) ?? 'no router');
      }
    }
    document.body.innerHTML = '<div id="page"><fx-hydrate-crumb data-fx-ssr><span>router</span></fx-hydrate-crumb></div>';
    const page = document.getElementById('page')!;
    const span = page.querySelector('span');

    beginAppHydration();
    // A route chunk evaluating inside some other scope: the owner current at upgrade is not the host.
    createRoot(() => defineCustomElement('fx-hydrate-crumb', Crumb));
    await Promise.resolve();

    hydrate(
      () =>
        Router.Provider({
          value: 'router',
          get children() {
            return createNativeElement('fx-hydrate-crumb');
          },
        }),
      page,
    );
    endAppHydration();

    expect(span?.textContent).toBe('router');
  });
});
