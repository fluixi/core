import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocketServer, type WebSocket as ServerSocket } from 'ws';
import type { AddressInfo } from 'node:net';
import { createWebSocket, globalTransport, json, type RawData, type SendData, type WebSocketConnection } from './index.js';

let server: WebSocketServer;
let address: string;
const clients: ServerSocket[] = [];

beforeAll(async () => {
  server = new WebSocketServer({ port: 0 });
  await new Promise<void>((resolve) => server.once('listening', resolve));
  address = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
  server.on('connection', (client, request) => {
    clients.push(client);
    if (request.url === '/refuse') return client.close(1008, 'not allowed');
    // Echo, keeping the frame's kind.
    client.on('message', (data, isBinary) => client.send(data, { binary: isBinary }));
  });
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const transport = globalTransport()!;

function until(check: () => boolean, timeout = 2000): Promise<void> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (check()) return resolve();
      if (Date.now() - started > timeout) return reject(new Error('timed out'));
      setTimeout(poll, 5);
    };
    poll();
  });
}

describe('against a WebSocket server', () => {
  it('opens, sends JSON and gets it back', async () => {
    const socket = createWebSocket(address, { transport, serializer: json<{ n: number }, { n: number }>() });
    await until(() => socket.connected());
    socket.send({ n: 42 });
    await until(() => socket.data() !== undefined);
    expect(socket.data()).toEqual({ n: 42 });
    socket.dispose();
  });

  it('carries binary frames as ArrayBuffer', async () => {
    const socket: WebSocketConnection<RawData, SendData> = createWebSocket(address, { transport });
    expect(socket.send(new Uint8Array([1, 2, 3]))).toBe('queued');
    await until(() => socket.data() !== undefined);
    expect([...new Uint8Array(socket.data() as ArrayBuffer)]).toEqual([1, 2, 3]);
    socket.dispose();
  });

  it('comes back after the server drops it', async () => {
    const socket = createWebSocket(address, { transport, reconnect: { delay: 20, jitter: false } });
    await until(() => socket.connected());
    const before = clients.length;
    clients[clients.length - 1]!.terminate();
    await until(() => socket.status() === 'reconnecting');
    await until(() => socket.connected() && clients.length === before + 1);
    socket.dispose();
  });

  it('stays closed when the server refuses with a policy violation', async () => {
    const socket = createWebSocket(`${address}/refuse`, { transport, reconnect: { delay: 20 } });
    await until(() => socket.status() === 'closed');
    expect(socket.info()).toMatchObject({ closeCode: 1008, closeReason: 'not allowed' });
    socket.dispose();
  });

  it('closes cleanly on request', async () => {
    const socket = createWebSocket(address, { transport });
    await until(() => socket.connected());
    socket.close(1000, 'done');
    await until(() => socket.status() === 'closed');
    expect(socket.info().closeCode).toBe(1000);
  });
});
