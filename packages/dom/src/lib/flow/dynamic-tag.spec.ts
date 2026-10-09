// @vitest-environment jsdom
/**
 * `<Dynamic component="tag">` builds that element, with its props live and its children in
 * it; a component function is rendered as a component. The tag case returned a `{ tag, props }`
 * descriptor nothing rendered, so a plugin's page, named by its custom element tag, was empty.
 */
import { describe, expect, it } from 'vitest';
import { createSignal } from '@fluixi/reactive/signal';
import { createComponent, insert, render } from '../dom/index.js';
import { Dynamic } from './dynamic.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Dynamic', () => {
  it('builds an element from a tag, keeping its props live', async () => {
    const [title, setTitle] = createSignal('first');
    const root = document.createElement('div');
    render(
      () =>
        createComponent(Dynamic, {
          component: 'section',
          get title() {
            return title();
          },
          children: 'inside',
        }),
      root,
    );
    await tick();
    const section = root.querySelector('section');
    expect(section?.getAttribute('title') ?? (section as unknown as { title?: string })?.title).toBe('first');
    expect(section?.textContent).toBe('inside');
    setTitle('second');
    await tick();
    expect(root.querySelector('section')).toBe(section);
    expect((section as unknown as { title: string }).title).toBe('second');
  });

  it('gives a custom element its props as properties', async () => {
    const root = document.createElement('div');
    const settings = { a: 1 };
    render(() => createComponent(Dynamic, { component: 'x-plugin-page', settings, locale: 'en' }), root);
    await tick();
    const element = root.querySelector('x-plugin-page') as unknown as { settings: unknown; locale: string };
    expect(element.settings).toBe(settings);
    expect(element.locale).toBe('en');
  });

  it('switches what it renders when the component changes', async () => {
    const [which, setWhich] = createSignal<string | ((props: { label: string }) => unknown)>('article');
    const root = document.createElement('div');
    const Label = (props: { label: string }) => {
      const span = document.createElement('span');
      insert(span, () => props.label);
      return span;
    };
    render(
      () =>
        createComponent(Dynamic, {
          get component() {
            return which();
          },
          label: 'from a component',
        }),
      root,
    );
    await tick();
    expect(root.querySelector('article')).not.toBeNull();
    setWhich(() => Label);
    await tick();
    expect(root.querySelector('article')).toBeNull();
    expect(root.querySelector('span')?.textContent).toBe('from a component');
  });
});
