// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { flush } from '@fluixi/reactive/signal';
import { renderToString } from '@fluixi/server';
import { hydrate } from '@fluixi/dom';
import { App } from './App';

// True hydration of REAL compiled JSX: render on the server, drop the HTML into
// a container, then hydrate(), the client must reuse the server DOM (no
// recreation) and wire up events/reactivity onto those existing nodes.
describe('hydrate compiled JSX', () => {
  it('reuses server DOM and makes the counter interactive', async () => {
    const html = renderToString(() => App({ url: '/home' }));
    const container = document.createElement('div');
    document.body.appendChild(container); // delegated events bubble to document
    container.innerHTML = html;

    const serverMain = container.querySelector('#app');
    const serverInc = container.querySelector('.inc');
    const serverValue = container.querySelector('.value');
    expect(serverValue!.textContent).toBe('3');

    hydrate(() => App({ url: '/home' }), container);

    // same nodes → reused, not recreated
    expect(container.querySelector('#app')).toBe(serverMain);
    expect(container.querySelector('.inc')).toBe(serverInc);
    expect(container.querySelector('.value')).toBe(serverValue);
    // not duplicated
    expect(container.querySelectorAll('#app').length).toBe(1);
    expect(container.querySelectorAll('.counter').length).toBe(1);

    // event + reactivity wired onto the existing server node
    (serverInc as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(serverValue!.textContent).toBe('4');
  });
});
