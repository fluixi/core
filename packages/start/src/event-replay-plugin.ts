import { eventCaptureScript } from '@fluixi/server';
import type { ResolvedConfig } from './config.js';

/**
 * Puts `@fluixi/server`'s event-capture script at the top of the app's `<head>`. Through Vite's
 * HTML hook, so it is in every page dev serves and in the built `index.html` that the server,
 * prerendering and the adapters all start from; `startClient` replays what it recorded.
 */
export function eventReplayVitePlugin(cfg: Pick<ResolvedConfig, 'ssr' | 'eventReplay'>): any {
  return {
    name: 'fluixi-event-replay',
    transformIndexHtml: {
      order: 'pre',
      handler(html: string): string {
        if (!cfg.ssr || !cfg.eventReplay || html.includes('__FX_REPLAY__')) return html;
        // Before anything else in <head>: a click while the rest is still loading is the one
        // this exists for.
        return html.replace(/<head(\s[^>]*)?>/i, (open) => `${open}${eventCaptureScript()}`);
      },
    },
  };
}
