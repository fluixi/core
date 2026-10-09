/**
 * A dynamic element rendered on the server keeps its attributes and its children.
 * It came out as a bare `<div></div>`, so every layout component built on it (a fluixi-ui
 * Stack, Row, Grid) rendered empty, and the client hydrated against nothing.
 */
import { describe, expect, it } from 'vitest';
import { createDynamicElement, createNativeElement, hydrate, renderToString } from '@fluixi/dom';

describe('createDynamicElement on the server', () => {
  it('renders its attributes and children', () => {
    const html = renderToString(() =>
      createDynamicElement('section', {
        class: 'stack',
        'data-stack': '',
        get children() {
          const inner = createNativeElement('span');
          inner.appendChild(createNativeElement('b'));
          return ['first', inner];
        },
      }),
    );
    expect(html).toMatch(/^<section[^>]*class="stack"/);
    expect(html).toContain('data-stack=""');
    expect(html).toContain('first');
    expect(html).toContain('<span');
    expect(html).toContain('</section>');
  });

  it('marks the element for hydration like any other native element', () => {
    const html = renderToString(() => createDynamicElement('div', { children: 'x' }));
    expect(html).toContain('data-hk=');
  });

  it('hydrates in place: the server\'s element and children are kept, nothing doubles', () => {
    const view = () =>
      createDynamicElement('section', {
        class: 'stack',
        get children() {
          return ['first', createDynamicElement('span', { children: 'in' }), () => 'live'];
        },
      });
    const container = document.createElement('div');
    container.innerHTML = renderToString(view);
    const serverSection = container.firstElementChild;
    const serverSpan = container.querySelector('span');

    const dispose = hydrate(() => view(), container);
    try {
      expect(container.querySelectorAll('section')).toHaveLength(1);
      expect(container.querySelectorAll('span')).toHaveLength(1);
      expect(container.textContent).toBe('firstinlive');
      expect(container.firstElementChild).toBe(serverSection);
      expect(container.querySelector('span')).toBe(serverSpan);
    } finally {
      dispose();
    }
  });
});
