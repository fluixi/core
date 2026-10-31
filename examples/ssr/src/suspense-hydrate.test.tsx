// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { flush } from '@fluixi/reactive/signal';
import { hydrate, setRequestStore } from '@fluixi/dom';
import { renderToStringAsync } from '@fluixi/server';
import { SuspenseApp } from './SuspenseApp';

afterEach(() => {
  setRequestStore(null);
  delete (window as any).__FX_DATA__;
});

// A component that reads a resource with a throwing accessor (`user().name`) under
// <Suspense> suspends during hydration; its content is adopted once, not rebuilt beside
// itself ("User #9User #9"). The guarded pattern (user.loading/user.latest) is covered by
// examples/html-counter's SsrApp.
describe('JSX <Suspense> SSR + hydrate — duplicate check', () => {
  it('does not double the Suspense content on hydration', async () => {
    setRequestStore(new AsyncLocalStorage());
    const body = await renderToStringAsync(() => SuspenseApp({ url: '/' }));

    const root = document.createElement('div');
    document.body.appendChild(root);
    root.innerHTML = body.replace(/<script type="application\/json"[^>]*>[^<]*<\/script>/, '');

    hydrate(() => SuspenseApp({ url: '/' }), root);
    await vi.waitFor(() => expect(root.querySelector('.async')?.textContent).toBe('User #9'));
    await flush();

    expect(root.querySelectorAll('.async').length).toBe(1);
    expect(root.querySelector('.async')!.textContent).toBe('User #9');
  });
});
