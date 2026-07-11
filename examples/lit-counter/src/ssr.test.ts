// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToString, renderToStringAsync } from '@fluixi/server';
import { render } from '@fluixi/core';
import { flush } from '@fluixi/reactive/signal';
import { SsrApp } from './Ssr';

// Proof that html``-authored apps work with SSR + resources + <Suspense>, exactly
// like the JSX examples/ssr app — because html`` compiles to the same @fluixi/dom
// calls, the server renderer and Suspense boundary behave identically.
describe('html`` app through SSR + Suspense', () => {
  it('sync renderToString emits the shell + fallbacks (data still loading)', () => {
    const html = renderToString(() => SsrApp({ url: '/home' }));
    expect(html).toContain('<h1>Fluixi SSR</h1>');
    expect(html).toContain('/home');            // props.url
    expect(html).toContain('<span class="value">3</span>'); // reactive signal
    expect(html).toContain('loading…');         // resource getter fallback
    expect(html).toContain('loading name…');    // <Suspense> fallback serialized
    expect(html).not.toContain('User #7');
    expect(html).not.toContain('User #9');
  });

  it('async renderToStringAsync awaits resources + resolves Suspense', async () => {
    const html = await renderToStringAsync(() => SsrApp({ url: '/' }));
    expect(html).toContain('User #7');          // resource getter resolved
    expect(html).toContain('User #9');          // Suspense content resolved
    expect(html).not.toContain('loading name…');
  });

  it('renders + resolves on the client too (Suspense fallback → content)', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => SsrApp({ url: '/' }), host);

    expect(host.querySelector('.fb')?.textContent).toBe('loading name…');

    await new Promise((r) => setTimeout(r, 30));
    await flush();

    expect(host.querySelector('.async')?.textContent).toContain('User #9');
    expect(host.querySelector('.fb')).toBeNull();
  });
});
