// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { flush } from '@fluixi/reactive/signal';
import { hydrate, setRequestStore } from '@fluixi/dom';
import { renderToStringAsync } from '@fluixi/server';
import { html } from '@fluixi/lit';
import { SsrApp } from './Ssr';

afterEach(() => {
  setRequestStore(null);
  delete (window as any).__FX_DATA__;
});

// KNOWN FRAMEWORK BUG (not lit-specific — same compiled output as JSX): content
// inside <Suspense> duplicates on hydration ("User #9User #9"). When the client
// resource is pending at hydrate time the child re-suspends instead of adopting
// the server-resolved markup, then rebuilds (twice, via the boundary's two read
// paths) without reconciling the leftover server DOM. Diagnosed in
// @fluixi/dom + core/render/suspense.ts; repro below (unseeded → post-hydration
// resolve). Skipped until the Suspense+SSR-hydration reconciliation is fixed.
describe('SSR + hydrate <Suspense> — reactive text must not double', () => {
  it.skip('updates the adopted Suspense text in place (no "User #9User #9")', async () => {
    setRequestStore(new AsyncLocalStorage());
    const body = await renderToStringAsync(() => SsrApp({ url: '/' }));

    const root = document.createElement('div');
    document.body.appendChild(root);
    // strip the __FX_DATA__ transport so the client refetches (resolves post-hydration)
    root.innerHTML = body.replace(/<script type="application\/json"[^>]*>[^<]*<\/script>/, '');

    hydrate(html`<SsrApp url=${'/'} />`, root);
    await new Promise((r) => setTimeout(r, 40));
    await flush();

    const span = root.querySelector('.async')!;
    expect(root.querySelectorAll('.async').length).toBe(1);
    expect(span.textContent).toBe('User #9'); // currently "User #9User #9"
  });
});
