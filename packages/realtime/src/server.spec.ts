import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { createWebSocket, globalTransport, json } from './index.js';
import { createWebSocketServer, type RealtimeServer, type ServerConnection, type WebSocketServerOptions } from './server.js';

type User = { id: string };

let http: Server | undefined;
let live: RealtimeServer | undefined;

afterEach(async () => {
  await live?.close(100);
  await new Promise<void>((resolve) => (http ? http.close(() => resolve()) : resolve()));
  http = live = undefined;
});

async function start(options: Partial<WebSocketServerOptions<User>> = {}) {
  const connections: ServerConnection<User>[] = [];
  live = createWebSocketServer<User>({
    path: '/live',
    authenticate: (request: IncomingMessage) => (request.headers.cookie === 'session=ok' ? { id: 'u1' } : null),
    onConnection: (connection) => connections.push(connection),
    ...options,
  });
  const server = live;
  http = createServer((_, response) => response.end('page'));
  http.on('upgrade', (request, socket, head) => {
    if (!server.upgrade(request, socket, head)) socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
  });
  await new Promise<void>((resolve) => http!.listen(0, '127.0.0.1', resolve));
  const port = (http.address() as AddressInfo).port;
  return { port, host: `127.0.0.1:${port}`, connections };
}

/** Opens a `ws` client and resolves with it once open, or with the refusal's status code. */
function client(url: string, headers: Record<string, string> = {}, extra: object = {}): Promise<WebSocket | number> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { headers, ...extra });
    ws.once('open', () => resolve(ws));
    ws.once('unexpected-response', (_, response) => resolve(response.statusCode ?? 0));
    ws.once('error', () => resolve(0));
  });
}

const signedIn = { cookie: 'session=ok' };

describe('createWebSocketServer', () => {
  it('accepts a signed-in page from its own host and hands over the context', async () => {
    const { port, host, connections } = await start();
    const ws = await client(`ws://${host}/live`, { ...signedIn, origin: `http://${host}` });
    expect(ws).toBeInstanceOf(WebSocket);
    await vi.waitFor(() => expect(connections).toHaveLength(1));
    expect(connections[0]!.context).toEqual({ id: 'u1' });
    expect(live!.size()).toBe(1);
    expect(port).toBeGreaterThan(0);
  });

  it('refuses another site with 403, before authenticating', async () => {
    const authenticate = vi.fn(() => ({ id: 'u1' }));
    const { host } = await start({ authenticate });
    expect(await client(`ws://${host}/live`, { ...signedIn, origin: 'https://evil.example.test' })).toBe(403);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('takes the allowed origins from a list', async () => {
    const { host } = await start({ origins: ['https://app.example.test'] });
    expect(await client(`ws://${host}/live`, { ...signedIn, origin: 'https://app.example.test' })).toBeInstanceOf(WebSocket);
    expect(await client(`ws://${host}/live`, { ...signedIn, origin: `http://${host}` })).toBe(403);
  });

  it('answers 401 without a session, or when authenticate throws', async () => {
    const { host } = await start();
    expect(await client(`ws://${host}/live`)).toBe(401);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await live!.close(100);
    await new Promise<void>((resolve) => http!.close(() => resolve()));
    const second = await start({
      authenticate: () => {
        throw new Error('store down');
      },
    });
    expect(await client(`ws://${second.host}/live`, signedIn)).toBe(401);
    error.mockRestore();
  });

  it('leaves other paths to the next hook', async () => {
    const { host } = await start();
    expect(await client(`ws://${host}/other`, signedIn)).toBe(404);
  });

  it('answers 503 past the connection limit', async () => {
    const { host } = await start({ maxConnections: 1 });
    expect(await client(`ws://${host}/live`, signedIn)).toBeInstanceOf(WebSocket);
    expect(await client(`ws://${host}/live`, signedIn)).toBe(503);
  });

  it('delivers text as strings and binary as bytes, and closes on an oversized message', async () => {
    const { host, connections } = await start({ maxMessageSize: 8 });
    const ws = (await client(`ws://${host}/live`, signedIn)) as WebSocket;
    await vi.waitFor(() => expect(connections).toHaveLength(1));
    const received: (string | Uint8Array)[] = [];
    connections[0]!.on('message', (data) => received.push(data));
    ws.send('hi');
    ws.send(new Uint8Array([1, 2]));
    await vi.waitFor(() => expect(received).toHaveLength(2));
    expect(received[0]).toBe('hi');
    expect([...(received[1] as Uint8Array)]).toEqual([1, 2]);
    const closed = new Promise<number>((resolve) => ws.once('close', resolve));
    ws.send('123456789');
    expect(await closed).toBe(1009);
  });

  it('says when a send cannot go out', async () => {
    const { host, connections } = await start({ maxBuffered: -1 });
    await client(`ws://${host}/live`, signedIn);
    await vi.waitFor(() => expect(connections).toHaveLength(1));
    expect(connections[0]!.send('x')).toBe('buffer-full');
    connections[0]!.close();
    await vi.waitFor(() => expect(connections[0]!.send('x')).toBe('closed'));
  });

  it('drops a connection that stops answering pings, and sends the keep-alive frame', async () => {
    const { host } = await start({ pingInterval: 30, keepAlive: '{"type":"ping"}' });
    const quiet = (await client(`ws://${host}/live`, signedIn, { autoPong: false })) as WebSocket;
    const frames: string[] = [];
    quiet.on('message', (data) => frames.push(String(data)));
    const code = await new Promise<number>((resolve) => quiet.once('close', resolve));
    expect(code).toBe(1006);
    expect(frames[0]).toBe('{"type":"ping"}');
  });

  it('closes open connections with 1001 and refuses new ones while closing', async () => {
    const { host } = await start();
    const ws = (await client(`ws://${host}/live`, signedIn)) as WebSocket;
    const closed = new Promise<number>((resolve) => ws.once('close', resolve));
    const closing = live!.close(1000);
    expect(await client(`ws://${host}/live`, signedIn)).toBe(503);
    expect(await closed).toBe(1001);
    await closing;
    expect(live!.size()).toBe(0);
  });

  it('serves the browser client end to end', async () => {
    const { host, connections } = await start({
      origins: () => true,
      authenticate: () => ({ id: 'u1' }),
      onConnection: (connection) => {
        connections.push(connection);
        connection.on('message', (data) => connection.send(data));
      },
    });
    const socket = createWebSocket(`ws://${host}/live`, { transport: globalTransport(), serializer: json<{ n: number }, { n: number }>() });
    expect(socket.send({ n: 7 })).toBe('queued');
    await vi.waitFor(() => expect(socket.data()).toEqual({ n: 7 }));
    socket.dispose();
  });
});

describe('the browser entry', () => {
  it('imports nothing from Node or ws, directly or through its modules', () => {
    const seen = new Set<string>();
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      for (const [, spec] of source.matchAll(/from '([^']+)'/g)) {
        expect(spec).not.toMatch(/^(node:|ws$)/);
        if (spec!.startsWith('./')) visit(spec!.replace(/\.js$/, '.ts'));
      }
    };
    visit('./index.ts');
    expect(seen.has('./server.ts')).toBe(false);
    expect(seen.size).toBeGreaterThan(2);
  });
});
