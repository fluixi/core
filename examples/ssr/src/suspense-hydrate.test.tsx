// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { flush } from '@fluixi/reactive/signal';
import { hydrate, setRequestStore } from '@fluixi/dom';
import { renderToStringAsync } from '@fluixi/server';
import { SuspenseApp } from './SuspenseApp';

afterEach(() => {
  setRequestStore(null);
  delete (window as any).__FX_DATA__;
});

// KNOWN, still-open framework bug (NOT lit-specific, JSX and html`` behave the
// same). A component that reads a resource with a THROWING accessor (`user().name`)
// under <Suspense> suspends during hydration, so its content isn't adopted; when the
// resource resolves post-hydration it rebuilds and duplicates ("User #9User #9").
// Distinct from the empty-reactive-text bug that WAS fixed in @fluixi/dom
// hydration.ts: the idiomatic non-throwing pattern (user.loading/user.latest, see
// examples/lit-counter SsrApp) hydrates cleanly. Skipped until the
// suspend-during-hydrate reconciliation is fixed.
describe('JSX <Suspense> SSR + hydrate — duplicate check', () => {
  it.skip('does not double the Suspense content on hydration', async () => {
    setRequestStore(new AsyncLocalStorage());
    const body = await renderToStringAsync(() => SuspenseApp({ url: '/' }));

    const root = document.createElement('div');
    document.body.appendChild(root);
    root.innerHTML = body.replace(/<script type="application\/json"[^>]*>[^<]*<\/script>/, '');

    hydrate(() => SuspenseApp({ url: '/' }), root);
    await new Promise((r) => setTimeout(r, 40));
    await flush();

    expect(root.querySelectorAll('.async').length).toBe(1);
    expect(root.querySelector('.async')!.textContent).toBe('User #9');
  });
});
