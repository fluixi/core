import { describe, it, expect } from 'vitest';
import { createRequestContext, runWithRequestContext, takeResponseHeaders } from '@fluixi/dom';
import { createHead, renderHead, runWithHead } from '@fluixi/head';
import { createTheme } from './index.js';
import { createColorScheme } from './color-scheme.js';

const cookie = (value: string) => `theme=${encodeURIComponent(JSON.stringify({ v: 1, value, createdAt: 1 }))}`;

describe('createTheme on the server', () => {
  it('reads the request cookie and puts the attribute on <html>', () => {
    const request = new Request('http://x.test/', { headers: { cookie: cookie('dark') } });
    const head = createHead();
    const value = runWithRequestContext(createRequestContext({ request }), () =>
      runWithHead(head, () => createTheme({ themes: ['light', 'dark'] as const, default: 'light' }).value()),
    );
    expect(value).toBe('dark');
    expect(renderHead(head).htmlAttrs).toEqual({ 'data-theme': 'dark' });
    // The before-paint script travels with it, reading the same cookie.
    expect(renderHead(head).headHtml).toMatch(/<script[^>]*>\(function\(\)\{try\{var c=\{"s":\{"from":"cookie","name":"theme"\}/);
  });

  it('sends a choice made during the request as Set-Cookie', () => {
    const request = new Request('http://x.test/');
    runWithRequestContext(createRequestContext({ request }), () =>
      createTheme({ themes: ['light', 'dark'] as const, default: 'light' }).set('dark'),
    );
    expect(takeResponseHeaders(request)!.getSetCookie()[0]).toMatch(/^theme=.*Max-Age=31536000.*SameSite=Lax$/);
  });

  it('works outside a request, without persistence', () => {
    const theme = createTheme({ themes: ['light', 'dark'] as const, default: 'light' });
    theme.set('dark');
    expect(theme.value()).toBe('dark');
  });

  it('renders a color scheme from the cookie, with its script', () => {
    const cookie = `color-scheme=${encodeURIComponent(JSON.stringify({ v: 1, value: 'dark', createdAt: 1 }))}`;
    const request = new Request('http://x.test/', { headers: { cookie } });
    const head = createHead();
    runWithRequestContext(createRequestContext({ request }), () => runWithHead(head, () => createColorScheme()));
    const rendered = renderHead(head);
    expect(rendered.htmlAttrs).toEqual({ 'data-theme': 'dark' });
    expect(rendered.headHtml).toContain('"name":"color-scheme"');
  });

  it('renders system, not a guess, for CSS that follows the OS itself', () => {
    const head = createHead();
    runWithRequestContext(createRequestContext({ request: new Request('http://x.test/') }), () =>
      runWithHead(head, () => createColorScheme({ systemAs: 'system' })),
    );
    expect(renderHead(head).htmlAttrs).toEqual({ 'data-theme': 'system' });
  });

  it('sends the browser bar colours: both while following the OS, the chosen one after', () => {
    const themeColor = { light: '#fafaf9', dark: '#111110' };
    const render = (cookie: string) => {
      const head = createHead();
      const request = new Request('http://x.test/', { headers: cookie ? { cookie } : {} });
      runWithRequestContext(createRequestContext({ request }), () => runWithHead(head, () => createColorScheme({ themeColor })));
      return renderHead(head).headHtml;
    };
    const following = render('');
    expect(following).toContain('content="#fafaf9" media="(prefers-color-scheme: light)"');
    expect(following).toContain('content="#111110" media="(prefers-color-scheme: dark)"');
    expect(following).toContain('name="color-scheme" content="light dark"');

    const chosen = render(`color-scheme=${encodeURIComponent(JSON.stringify({ v: 1, value: 'dark', createdAt: 1 }))}`);
    expect(chosen.match(/<meta name="theme-color"/g)).toHaveLength(1);
    expect(chosen).toContain('name="theme-color" content="#111110"');
    expect(chosen).toContain('name="color-scheme" content="dark"');
  });
});
