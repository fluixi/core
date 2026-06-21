// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { flush } from '@fluixi/reactive/signal';
import { renderToString } from '@fluixi/server';
import { hydrate } from '@fluixi/dom';
import { ChildrenApp } from './ChildrenApp';

// Native children passed THROUGH a component boundary must hydrate (adopt the
// server DOM) exactly once — not duplicate.
describe('hydrate component-children', () => {
  it('does not duplicate native children passed to a component', async () => {
    const html = renderToString(() => ChildrenApp());
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = html;

    // server HTML: exactly one input + one button inside the wrapper
    expect(container.querySelectorAll('.field').length).toBe(1);
    const serverInput = container.querySelector('.field');
    const serverButton = container.querySelector('.bump');

    hydrate(() => ChildrenApp(), container);

    // no duplication — every native child (incl. across void elements) adopted once
    expect(container.querySelectorAll('.field').length).toBe(1);
    expect(container.querySelectorAll('.field2').length).toBe(1);
    expect(container.querySelectorAll('br').length).toBe(1);
    expect(container.querySelectorAll('.bump').length).toBe(1);
    expect(container.querySelectorAll('.wrap').length).toBe(1);
    // same nodes reused, not recreated
    expect(container.querySelector('.field')).toBe(serverInput);
    expect(container.querySelector('.bump')).toBe(serverButton);

    // interactivity wired onto the existing server button
    (serverButton as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(container.querySelector('.count')!.textContent).toBe('1');
  });
});
