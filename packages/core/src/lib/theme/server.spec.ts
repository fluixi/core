import { describe, it, expect } from 'vitest';
import { createRequestContext, runWithRequestContext, takeResponseHeaders } from '@fluixi/dom';
import { createHead, renderHead, runWithHead } from '@fluixi/head';
import { createTheme } from './index.js';

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
});
