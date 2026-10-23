// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { flush } from '@fluixi/reactive/signal';
import { renderToStringAsync, hydrate, setRequestStore } from '@fluixi/dom';
import { App } from './App';

afterEach(() => {
  setRequestStore(null);
  delete (window as any).__FX_DATA__;
});

describe('resource-data transport (no hydration flash)', () => {
  it('serializes resolved data and seeds it on the client — no refetch flash', async () => {
    setRequestStore(new AsyncLocalStorage());

    // server: async render resolves the loader and serializes its data
    const html = await renderToStringAsync(() => App({ url: '/home' }));
    expect(html).toContain('User #7'); // resolved data in the HTML
    expect(html).toContain('__FX_DATA__'); // + the seed script

    // pull the JSON transport out and set the global like getServerData would read it
    // (innerHTML doesn't run <script> blocks, so we seed it manually for the test)
    const m = html.match(/<script type="application\/json" id="__FX_DATA__">(\{.*?\})<\/script>/);
    expect(m).toBeTruthy();
    (window as any).__FX_DATA__ = JSON.parse(m![1]);

    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = html;

    hydrate(() => App({ url: '/home' }), container);

    // seeded → shows the data immediately, no flash back to "loading..."
    expect(container.querySelector('.user')!.textContent).toBe('User #7');

    // and it stays put (a refetch would briefly flip to loading then back)
    await new Promise((r) => setTimeout(r, 30));
    await flush();
    expect(container.querySelector('.user')!.textContent).toBe('User #7');
  });
});
