// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { renderToString, renderToStringAsync } from '@fluixi/server';
import { render, createResource } from '@fluixi/core';
import { hydrate, setRequestStore } from '@fluixi/dom';
import { flush } from '@fluixi/reactive/signal';
import { html } from '@fluixi/core';
import { SsrApp } from './Ssr';

afterEach(() => {
  setRequestStore(null);
  delete (window as any).__FX_DATA__;
});

// Proof that html``-authored apps work with SSR + async resources + hydration,
// exactly like the JSX examples/ssr app — because html`` compiles to the same
// @fluixi/dom calls, the server renderer and hydration behave identically.
describe('html`` app through SSR + resources', () => {
  it('sync renderToString emits the shell (resources still loading)', () => {
    // Interpolations are bracketed by `<!--fx-->` markers so the server's markup has the
    // same shape as the client's template — that is what lets hydration adopt the nodes
    // rather than rebuild them. Stripped here so the assertions read as the markup does.
    const out = renderToString(() => SsrApp({ url: '/home' })).replace(/<!--\/?fx-->/g, '');
    expect(out).toContain('<h1>Fluixi SSR</h1>');
    expect(out).toContain('/home');                     // props.url
    expect(out).toContain('<span class="value">3</span>'); // reactive signal
    expect(out).toContain('loading…');                  // resource loading getter
    expect(out).not.toContain('User #7');
  });

  it('async renderToStringAsync awaits the resources', async () => {
    const out = await renderToStringAsync(() => SsrApp({ url: '/' }));
    expect(out).toContain('User #7');
    expect(out).toContain('User #9');
    expect(out).not.toContain('loading…');
  });

  it('client render resolves the resources', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => SsrApp({ url: '/' }), host);

    await new Promise((r) => setTimeout(r, 30));
    await flush();

    expect(host.querySelector('.user')?.textContent).toBe('User #7');
    expect(host.querySelector('.async')?.textContent).toContain('User #9');
  });

  it('hydrates server markup without duplicating resource text', async () => {
    setRequestStore(new AsyncLocalStorage());
    const body = await renderToStringAsync(() => SsrApp({ url: '/' }));

    const root = document.createElement('div');
    document.body.appendChild(root);
    // strip the transport so the client refetches → resources resolve post-hydration
    root.innerHTML = body.replace(/<script type="application\/json"[^>]*>[^<]*<\/script>/, '');

    hydrate(html`<SsrApp url=${'/'} />`, root);
    await new Promise((r) => setTimeout(r, 40));
    await flush();

    expect(root.querySelectorAll('.async').length).toBe(1);
    expect(root.querySelector('.async')!.textContent).toContain('User #9'); // resolved, not doubled
    expect(root.querySelector('.user')!.textContent).toBe('User #7');
  });
});
