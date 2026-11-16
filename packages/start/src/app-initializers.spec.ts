/**
 * App initializers run before the app renders: once per request on the server, inside it, so
 * the page reads what they set up in that request's root.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { inject, injectionToken, provideAppInitializer, provideRoot } from '@fluixi/di';
import { resetInjection } from '@fluixi/di/testing';
import { renderRequestAsync } from '@fluixi/server';
import { createHandlerFrom } from './handler-core.js';

afterEach(() => resetInjection());

const Settings = injectionToken<{ theme: string | null }>('Settings', { factory: () => ({ theme: null }) });
const App = () => `theme:${inject(Settings).theme}`;
const handler = () =>
  createHandlerFrom({
    template: '<html><head></head><body><div id="root"></div></body></html>',
    mod: { render: (url: string) => renderRequestAsync(App, { url }) } as never,
    cfg: { ssr: true, mountId: 'root' },
  });

describe('app initializers on the server', () => {
  it('run in each request before its render, once', async () => {
    let runs = 0;
    provideRoot([
      provideAppInitializer(async () => {
        const settings = inject(Settings);
        runs++;
        await new Promise((r) => setTimeout(r, 5));
        settings.theme = 'dark';
      }),
    ]);
    const h = handler();
    const [a, b] = await Promise.all([h(new Request('http://x/')), h(new Request('http://x/'))]);
    expect(await a.text()).toContain('theme:dark');
    expect(await b.text()).toContain('theme:dark');
    // One per request, though both start (the handler) and the render ask for them.
    expect(runs).toBe(2);
  });

  it('answer 500 when one fails, without rendering', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rendered = false;
    provideRoot([
      provideAppInitializer(() => {
        throw new Error('settings unreachable');
      }),
    ]);
    const h = createHandlerFrom({
      template: '<html><head></head><body><div id="root"></div></body></html>',
      mod: { render: () => ((rendered = true), '') } as never,
      cfg: { ssr: true, mountId: 'root' },
    });
    const res = await h(new Request('http://x/'));
    expect(res.status).toBe(500);
    expect(rendered).toBe(false);
    logged.mockRestore();
  });
});
