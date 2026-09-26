import { describe, it, expect, vi } from 'vitest';
import { createServer } from 'node:http';
import { createRequestHandler, serveNode } from './handler.js';

describe('@fluixi/start fetch handler', () => {
  it('renders a Request into an HTML Response (url = pathname+search)', async () => {
    const handler = createRequestHandler((url) => `<p>${url}</p>`);
    const res = await handler(new Request('http://x/foo?a=1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toBe('<p>/foo?a=1</p>');
  });

  it('awaits async render', async () => {
    const handler = createRequestHandler(async (url) => {
      await Promise.resolve();
      return `async:${url}`;
    });
    expect(await (await handler(new Request('http://x/p'))).text()).toBe('async:/p');
  });

  it('returns 500 with the message on render error', async () => {
    const handler = createRequestHandler(() => {
      throw new Error('boom');
    });
    const res = await handler(new Request('http://x/'));
    expect(res.status).toBe(500);
    expect(await res.text()).toContain('boom');
  });
});

describe('listening on a port that is taken', () => {
  const occupy = () =>
    new Promise<{ server: import('node:http').Server; port: number }>((done) => {
      const server = createServer();
      server.listen(0, () => done({ server, port: (server.address() as { port: number }).port }));
    });

  it('exits non-zero and names the port, rather than staying up with nothing listening', async () => {
    const { server, port } = await occupy();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const second = serveNode(async () => new Response('x'), { port, onListen: () => undefined });
      await new Promise((r) => second.once('error', r));
      expect(exit).toHaveBeenCalledWith(1);
      expect(error.mock.calls[0][0]).toContain(`port ${port} is already in use`);
    } finally {
      exit.mockRestore();
      error.mockRestore();
      server.close();
    }
  });

  it('hands the error to onListenError when given one', async () => {
    const { server, port } = await occupy();
    try {
      const seen = await new Promise<NodeJS.ErrnoException>((onListenError) =>
        serveNode(async () => new Response('x'), { port, onListen: () => undefined, onListenError }),
      );
      expect(seen.code).toBe('EADDRINUSE');
    } finally {
      server.close();
    }
  });
});
