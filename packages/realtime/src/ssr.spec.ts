import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNativeElement, renderToString } from '@fluixi/dom';

afterEach(() => vi.unstubAllGlobals());

describe('on the server', () => {
  it('imports without touching browser globals', async () => {
    for (const name of ['window', 'document', 'WebSocket', 'Blob']) {
      vi.stubGlobal(name, undefined);
    }
    const module = await import('./index.js');
    expect(typeof module.createWebSocket).toBe('function');
  });

  it('opens nothing while rendering, even where the runtime has a WebSocket', async () => {
    const opened = vi.fn();
    vi.stubGlobal(
      'WebSocket',
      class {
        constructor() {
          opened();
        }
      },
    );
    const { createWebSocket } = await import('./index.js');
    let status = '';
    const html = renderToString(() => {
      const socket = createWebSocket('wss://example.test');
      socket.connect();
      status = socket.status();
      return createNativeElement('p');
    });
    expect(html).toMatch(/^<p/);
    expect(opened).not.toHaveBeenCalled();
    expect(status).toBe('idle');
  });
});
