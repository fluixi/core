// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToString } from '@fluixi/server';
import { hydrate } from '@fluixi/dom';
import { TextHoleApp } from './TextHoleApp';

describe('hydrate a text hole', () => {
  it('adopts the server text instead of appending a second copy', () => {
    const html = renderToString(() => TextHoleApp());
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = html;

    expect(container.querySelector('.cmd')!.textContent).toBe('npm create fluixi@latest');

    hydrate(() => TextHoleApp(), container);

    // The bug: the client inserts the string again, so the element reads it twice.
    expect(container.querySelector('.cmd')!.textContent).toBe('npm create fluixi@latest');
  });
});
