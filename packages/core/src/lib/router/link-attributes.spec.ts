// @vitest-environment jsdom
/** Attributes passed to <Link> as accessors follow their value, like on any element. */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@fluixi/dom';
import { createSignal } from '@fluixi/reactive/signal';
import { ensureIntegration } from '../render/component.js';
import { Link, Router, createMemoryHistory } from './index.js';

beforeEach(() => ensureIntegration());

describe('<Link> attributes', () => {
  it('follows accessor attributes and leaves event handlers alone', async () => {
    const [title, setTitle] = createSignal('Clients');
    const [current, setCurrent] = createSignal(true);
    const container = document.createElement('div');
    document.body.appendChild(container);
    let clicked = false;

    const Page = () =>
      Link({
        href: '/app/crm',
        title: () => title(),
        'aria-current': () => (current() ? 'page' : undefined),
        onFocus: () => (clicked = true),
        children: 'Clients',
      } as never);
    render(() => Router({ routes: [{ path: '/', component: Page }], history: createMemoryHistory('/') } as never), container);
    await Promise.resolve();

    const a = container.querySelector('a')!;
    expect(a.getAttribute('title')).toBe('Clients');
    expect(a.getAttribute('aria-current')).toBe('page');
    expect(a.hasAttribute('onFocus')).toBe(false);

    setTitle('Clientes');
    setCurrent(false);
    await Promise.resolve();
    expect(a.getAttribute('title')).toBe('Clientes');
    expect(a.hasAttribute('aria-current')).toBe(false);
    expect(clicked).toBe(false);
  });
});
