/**
 * start puts the event-capture script into the app's HTML, so clicks made on the server-rendered
 * page before it hydrates are replayed instead of lost.
 */
import { describe, it, expect } from 'vitest';
import { eventReplayVitePlugin } from './event-replay-plugin.js';
import { resolveConfig } from './config.js';

const html = '<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>App</title></head><body><div id="root"></div></body></html>';
const transform = (cfg: Parameters<typeof eventReplayVitePlugin>[0], source = html) =>
  eventReplayVitePlugin(cfg).transformIndexHtml.handler(source) as string;

describe('the event-capture script', () => {
  it('goes first in <head> by default', () => {
    const out = transform(resolveConfig({}));
    expect(out).toMatch(/<head><script>\(function\(\)\{var q=window\.__FX_REPLAY__=/);
    expect(out.indexOf('__FX_REPLAY__')).toBeLessThan(out.indexOf('<meta charset'));
  });

  it('is added once, though the hook runs again on its own output', () => {
    const once = transform(resolveConfig({}));
    expect(transform(resolveConfig({}), once)).toBe(once);
  });

  it('is left out when turned off, and with ssr: false', () => {
    expect(transform(resolveConfig({ eventReplay: false }))).toBe(html);
    expect(transform(resolveConfig({ ssr: false }))).toBe(html);
  });
});
