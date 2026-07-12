// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@fluixi/core';
import { html } from '@fluixi/core';
import { App } from './App';

/** Render the whole showcase and assert a spread of features produced DOM. */
describe('lit-showcase App', () => {
  it('renders every feature section without error', () => {
    const root = document.createElement('div');
    render(() => html`<${App} />`, root);

    // sections rendered
    expect(root.querySelectorAll('section').length).toBeGreaterThanOrEqual(10);
    // events section has buttons
    expect(root.querySelectorAll('button').length).toBeGreaterThan(3);
    // each list rendered ALL 3 items (alpha/beta/gamma), not just the first
    expect(root.querySelectorAll('ul li').length).toBe(3);
    expect(root.textContent).toContain('alpha');
    expect(root.textContent).toContain('gamma');
    // raw html injected an <em>
    expect(root.querySelector('[html], .box em, em')).toBeTruthy();
    // svg namespaced element present
    const circle = root.querySelector('circle');
    expect(circle?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    // two-way input exists
    expect(root.querySelector('input')).toBeTruthy();
  });

  it('reacts: clicking +1 updates the count text', () => {
    const root = document.createElement('div');
    document.body.appendChild(root); // delegated events listen on document
    render(() => html`<${App} />`, root);
    const inc = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('@click +1'))!;
    expect(root.textContent).toContain('count is 0');
    inc.dispatchEvent(new Event('click', { bubbles: true }));
    expect(root.textContent).toContain('count is 1');
    root.remove();
  });

  it('the each list is reactive: fewer/more change the item count', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    render(() => html`<${App} />`, root);
    expect(root.querySelectorAll('ul li').length).toBe(3);
    const fewer = [...root.querySelectorAll('button')].find((b) => b.textContent === 'fewer')!;
    fewer.dispatchEvent(new Event('click', { bubbles: true }));
    expect(root.querySelectorAll('ul li').length).toBe(2);
    root.remove();
  });
});
