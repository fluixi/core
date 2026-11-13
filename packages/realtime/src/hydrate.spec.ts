// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNativeElement, hydrate, renderToString } from '@fluixi/dom';
import { createWebSocket } from './index.js';

afterEach(() => vi.unstubAllGlobals());

describe('hydration', () => {
  it('opens one connection per component on the client, and closes it with the view', () => {
    const sockets: { url: string; close: ReturnType<typeof vi.fn> }[] = [];
    vi.stubGlobal(
      'WebSocket',
      class {
        binaryType = 'blob';
        close = vi.fn();
        constructor(readonly url: string) {
          sockets.push(this);
        }
      },
    );
    const view = () => {
      createWebSocket('wss://example.test/live');
      return createNativeElement('p');
    };

    // The server pass: jsdom has a document, so this spec only checks the client half; the
    // server half is in ssr.spec.ts, where there is none.
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = renderToString(() => createNativeElement('p'), { hydrationKeys: false });

    const dispose = hydrate(view, container);
    expect(sockets.map((socket) => socket.url)).toEqual(['wss://example.test/live']);
    dispose();
    expect(sockets[0]!.close).toHaveBeenCalledWith(1000, '');
  });
});
