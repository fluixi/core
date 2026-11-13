// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNativeElement, hydrate, insert, renderToString } from '@fluixi/dom';
import { createWebSocket } from './index.js';

afterEach(() => vi.unstubAllGlobals());

class StubSocket {
  static opened: StubSocket[] = [];
  binaryType = 'blob';
  close = vi.fn();
  onopen: ((event: unknown) => void) | null = null;
  constructor(readonly url: string) {
    StubSocket.opened.push(this);
  }
}

/** A component that shows the connection's status, so server and client text can be compared. */
function Live() {
  const live = createWebSocket('wss://example.test/live');
  const p = createNativeElement('p');
  insert(p, () => live.status());
  return p;
}

describe('server render then hydration', () => {
  it('renders idle on the server, hydrates the same text, then opens one connection', async () => {
    vi.stubGlobal('WebSocket', StubSocket);
    StubSocket.opened = [];
    const container = document.createElement('div');
    document.body.appendChild(container);

    // The server pass: no document there, which is what keeps it from connecting.
    vi.stubGlobal('document', undefined);
    const html = renderToString(() => Live());
    vi.unstubAllGlobals();
    vi.stubGlobal('WebSocket', StubSocket);
    expect(StubSocket.opened).toHaveLength(0);
    expect(html).toContain('idle');

    container.innerHTML = html;
    const serverText = container.textContent;
    const dispose = hydrate(() => Live(), container);
    // Hydration reads what the server rendered: nothing has started yet.
    expect(container.textContent).toBe(serverText);
    expect(StubSocket.opened).toHaveLength(0);

    await Promise.resolve();
    expect(StubSocket.opened.map((socket) => socket.url)).toEqual(['wss://example.test/live']);
    dispose();
    expect(StubSocket.opened[0]!.close).toHaveBeenCalledWith(1000, '');
  });

  it('opens a shared connection once, whatever hydrates around it', async () => {
    vi.stubGlobal('WebSocket', StubSocket);
    StubSocket.opened = [];
    const shared = createWebSocket('wss://example.test/shared');
    const container = document.createElement('div');
    container.innerHTML = '<p></p><p></p>';
    const view = () => {
      const a = createNativeElement('p');
      const b = createNativeElement('p');
      insert(a, () => shared.status());
      insert(b, () => shared.status());
      return [a, b];
    };
    const dispose = hydrate(view, container);
    await Promise.resolve();
    expect(StubSocket.opened).toHaveLength(1);
    dispose();
    expect(StubSocket.opened[0]!.close).not.toHaveBeenCalled();
    shared.dispose();
  });
});
