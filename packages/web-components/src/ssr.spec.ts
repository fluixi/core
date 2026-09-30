// @vitest-environment node
/**
 * A light DOM element rendered on the server: its content goes out inside its tag, with the
 * props that have no attribute form carried for the client.
 */
import { describe, it, expect, vi } from 'vitest';

describe('an element rendered on the server', () => {
  it('renders its content inside its tag, from attributes and object props', async () => {
    const { typedElement, prop, defineCustomElement } = await import('./index.js');
    const { createNativeElement, insert, spread } = await import('@fluixi/dom');
    const { renderToString } = await import('@fluixi/dom/server');
    // What compiled JSX does: create the element, then insert its (reactive) children.
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
    defineCustomElement('fx-ssr-deals', Deals);

    const out = renderToString(() => {
      const section = createNativeElement('section');
      const deals = createNativeElement('fx-ssr-deals');
      spread({ element: deals, props: { heading: 'Pipeline', items: ['Maison Ndiaye', 'Keur Tech'] } });
      section.appendChild(deals);
      return section;
    }, { hydrationKeys: false });

    expect(out).toContain('<h2>Pipeline</h2>');
    expect(out).toContain('<li>Maison Ndiaye</li><li>Keur Tech</li>');
    expect(out).toContain('data-fx-ssr');
    expect(out).toMatch(/data-fx-props="\{&quot;items&quot;:\[&quot;Maison Ndiaye&quot;,&quot;Keur Tech&quot;\]\}"/);
  });

  it('renders an element from a second copy of the package (a dev reload), with the renderer of the first copy', async () => {
    await import('./index.js'); // the first copy registers the renderer
    vi.resetModules();
    const second = await import('./index.js');
    const { createNativeElement, insert, spread } = await import('@fluixi/dom');
    const { renderToString } = await import('@fluixi/dom/server');

    class Badge extends second.typedElement({ label: second.prop.string('') }) {
      protected override render(): unknown {
        const node = createNativeElement('span');
        insert(node, () => this.label);
        return node;
      }
    }
    second.defineCustomElement('fx-ssr-badge', Badge);

    const out = renderToString(() => {
      const wrap = createNativeElement('div');
      const badge = createNativeElement('fx-ssr-badge');
      spread({ element: badge, props: { label: 'Nouveau' } });
      wrap.appendChild(badge);
      return wrap;
    }, { hydrationKeys: false });
    expect(out).toContain('<span>Nouveau</span>');
  });

  it('leaves a tag no element is defined for as it is', async () => {
    const { createNativeElement } = await import('@fluixi/dom');
    const { renderToString } = await import('@fluixi/dom/server');
    const out = renderToString(() => {
      const section = createNativeElement('section');
      section.appendChild(createNativeElement('fx-ssr-unknown'));
      return section;
    }, { hydrationKeys: false });
    expect(out).toBe('<section><fx-ssr-unknown></fx-ssr-unknown></section>');
  });

  it('carries only props that survive JSON, and leaves class instances to hydration', async () => {
    const { typedElement, prop, defineCustomElement } = await import('./index.js');
    const { createNativeElement, spread } = await import('@fluixi/dom');
    const { renderToString } = await import('@fluixi/dom/server');
    class Schema {
      get shape() {
        return { email: true };
      }
    }
    class Form extends typedElement({ schema: prop.any<unknown>(undefined), options: prop.object<{ value: string }[]>([]) }) {
      protected override render(): unknown {
        return null;
      }
    }
    defineCustomElement('fx-ssr-schema-form', Form);

    const out = renderToString(() => {
      const form = createNativeElement('fx-ssr-schema-form');
      spread({ element: form, props: { schema: new Schema(), options: [{ value: 'fr' }] } });
      return form;
    }, { hydrationKeys: false });

    expect(out).toContain('data-fx-props="{&quot;options&quot;:[{&quot;value&quot;:&quot;fr&quot;}]}"');
    expect(out).not.toContain('&quot;schema&quot;');
  });
});
