// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToString, renderToStringAsync } from '@fluixi/server';
import { App } from './App';

// End-to-end SSR proof: this .tsx is compiled by @fluixi/vite-plugin (the real
// imperative compiler), then rendered to an HTML string by @fluixi/server — no
// browser. renderToString switches the runtime to server mode and builds a
// serializable tree. The root app is invoked as a plain function, exactly as
// the real SSR entry (startServer/renderRequest) does.
describe('SSR example — compiled JSX → HTML', () => {
  it('sync renderToString emits the shell (resource still loading)', () => {
    // Interpolations are bracketed by `<!--fx-->` markers so the server's markup has the
    // same shape as the client's template — that is what lets hydration adopt the nodes
    // rather than rebuild them. Stripped so the assertions read as the markup does.
    const html = renderToString(() => App({ url: '/home' })).replace(/<!--fx\/?-->/g, '');
    expect(html).toContain('<h1>Fluixi SSR</h1>');
    expect(html).toContain('/home'); // props.url rendered
    expect(html).toContain('class="counter"');
    expect(html).toContain('<span class="value">3</span>'); // reactive signal
    expect(html).toContain('loading…'); // resource not awaited in sync mode
    expect(html).not.toContain('User #7');
  });

  it('async renderToStringAsync awaits the data loader', async () => {
    const html = await renderToStringAsync(() => App({ url: '/' }));
    expect(html).toContain('<h1>Fluixi SSR</h1>');
    expect(html).toContain('User #7'); // resolved resource data is in the HTML
    expect(html).not.toContain('loading…');
  });

  it('produces self-contained markup (no document errors under plain Node)', () => {
    const html = renderToString(() => App({}));
    expect(html.startsWith('<main id="app">')).toBe(true);
    expect(html.endsWith('</main>')).toBe(true);
  });
});
