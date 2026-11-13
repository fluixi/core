import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createRoot, effect, flush } from '@fluixi/reactive';
import { createWebSocket, json, type CloseInfo, type RawData, type SendData, type WebSocketConnection, type WebSocketLike } from './index.js';

class FakeSocket implements WebSocketLike {
  protocol = '';
  bufferedAmount = 0;
  binaryType: 'arraybuffer' | 'blob' = 'blob';
  sent: SendData[] = [];
  closedWith: [number | undefined, string | undefined] | undefined;
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: ((event: CloseInfo) => void) | null = null;
  constructor(readonly url: string, readonly protocols?: string | string[]) {}
  send(data: SendData) {
    this.sent.push(data);
  }
  close(code?: number, reason?: string) {
    this.closedWith = [code, reason];
    queueMicrotask(() => this.onclose?.({ code: code ?? 1005, reason: reason ?? '', wasClean: true }));
  }
  /** Server side of the fake. */
  accept(protocol = '') {
    this.protocol = protocol;
    this.onopen?.({});
  }
  receive(data: unknown) {
    this.onmessage?.({ data });
  }
  drop(code = 1006, reason = '') {
    this.onerror?.({});
    this.onclose?.({ code, reason, wasClean: false });
  }
}

function fakeTransport() {
  const sockets: FakeSocket[] = [];
  const transport = vi.fn((url: string, protocols?: string | string[]) => {
    const socket = new FakeSocket(url, protocols);
    sockets.push(socket);
    return socket;
  });
  return { transport, sockets, last: () => sockets[sockets.length - 1]! };
}

/** Opens now, instead of after the running task as a created connection does on its own. */
function start<T extends { connect(): void }>(socket: T): T {
  socket.connect();
  return socket;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createWebSocket', () => {
  it('connects once the running task ends, and reports the open connection', async () => {
    const { transport, last } = fakeTransport();
    const socket = createWebSocket('wss://example.test/live', { transport, protocols: ['v1'] });
    expect(socket.status()).toBe('idle');
    expect(transport).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(transport).toHaveBeenCalledWith('wss://example.test/live', ['v1']);
    expect(socket.status()).toBe('connecting');
    expect(last().binaryType).toBe('arraybuffer');

    last().accept('v1');
    expect(socket.status()).toBe('open');
    expect(socket.connected()).toBe(true);
    expect(socket.info()).toMatchObject({ url: 'wss://example.test/live', protocol: 'v1', attempt: 0 });
  });

  it('queues what is sent before the first attempt starts', async () => {
    const { transport, last } = fakeTransport();
    const socket = createWebSocket('wss://example.test', { transport });
    expect(socket.send('early')).toBe('queued');
    await Promise.resolve();
    last().accept();
    expect(last().sent).toEqual(['early']);
  });

  it('does not start a first attempt that close() came before', async () => {
    const { transport } = fakeTransport();
    const socket = createWebSocket('wss://example.test', { transport });
    socket.close();
    await Promise.resolve();
    expect(transport).not.toHaveBeenCalled();
  });

  it('waits for connect() when told not to connect', () => {
    const { transport } = fakeTransport();
    const socket = createWebSocket('wss://example.test', { transport, connect: false });
    expect(socket.status()).toBe('idle');
    expect(socket.send('x')).toBe('closed');
    socket.connect();
    expect(transport).toHaveBeenCalledTimes(1);
    socket.connect();
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('resolves the address on every attempt, for short-lived tickets', async () => {
    const { transport, last } = fakeTransport();
    let ticket = 0;
    start(createWebSocket(async () => `wss://example.test/live?ticket=${++ticket}`, { transport, reconnect: { jitter: false } }));
    await vi.advanceTimersByTimeAsync(0);
    expect(last().url).toBe('wss://example.test/live?ticket=1');
    last().drop();
    await vi.advanceTimersByTimeAsync(500);
    expect(last().url).toBe('wss://example.test/live?ticket=2');
  });

  it('keeps the latest message and calls every subscriber', () => {
    const { transport, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport }));
    const first = vi.fn();
    const second = vi.fn();
    socket.subscribe(first);
    const stop = socket.subscribe(second);
    last().accept();
    last().receive('a');
    stop();
    last().receive('b');
    expect(socket.data()).toBe('b');
    expect(first.mock.calls).toEqual([['a'], ['b']]);
    expect(second.mock.calls).toEqual([['a']]);
  });

  it('notifies readers of data() for a repeated message', async () => {
    const { transport, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport }));
    last().accept();
    const seen: unknown[] = [];
    const dispose = createRoot((dispose) => {
      effect(() => void seen.push(socket.data()));
      return dispose;
    });
    await flush();
    last().receive('same');
    await flush();
    last().receive('same');
    await flush();
    expect(seen).toEqual([undefined, 'same', 'same']);
    dispose();
  });

  it('holds nothing in data() with keepLatest off', () => {
    const { transport, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport, keepLatest: false }));
    const handler = vi.fn();
    socket.subscribe(handler);
    last().accept();
    last().receive('a');
    expect(socket.data()).toBeUndefined();
    expect(handler).toHaveBeenCalledWith('a');
  });

  it('keeps calling subscribers when one throws', async () => {
    const { transport, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport }));
    const after = vi.fn();
    socket.subscribe(() => {
      throw new Error('handler bug');
    });
    socket.subscribe(after);
    last().accept();
    const reported = new Promise((resolve) => {
      const original = queueMicrotask;
      vi.stubGlobal('queueMicrotask', (task: () => void) =>
        original(() => {
          try {
            task();
          } catch (error) {
            resolve(error);
          }
        }),
      );
    });
    last().receive('a');
    expect(after).toHaveBeenCalledWith('a');
    expect(await reported).toMatchObject({ message: 'handler bug' });
    vi.unstubAllGlobals();
  });

  it('sends text and binary frames as they are by default', () => {
    const { transport, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport }));
    last().accept();
    const bytes = new Uint8Array([1, 2, 3]);
    expect(socket.send('hello')).toBe('sent');
    expect(socket.send(bytes)).toBe('sent');
    expect(last().sent).toEqual(['hello', bytes]);

    const buffer = new Uint8Array([9]).buffer;
    last().receive(buffer);
    expect(socket.data()).toBe(buffer);
  });

  it('encodes and decodes through a serializer', () => {
    const { transport, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport, serializer: json<{ n: number }, { op: string }>() }));
    last().accept();
    socket.send({ op: 'ping' });
    expect(last().sent).toEqual(['{"op":"ping"}']);
    last().receive('{"n":1}');
    expect(socket.data()).toEqual({ n: 1 });
  });

  it('reports a frame that fails to decode and stays open', () => {
    const { transport, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport, serializer: json() }));
    const handler = vi.fn();
    socket.subscribe(handler);
    last().accept();
    last().receive('{not json');
    expect(socket.error()?.code).toBe('decode-failed');
    expect(socket.status()).toBe('open');
    expect(handler).not.toHaveBeenCalled();
  });

  it('queues messages sent while connecting and sends them in order once open', () => {
    const { transport, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport, queueLimit: 2 }));
    expect(socket.send('a')).toBe('queued');
    expect(socket.send('b')).toBe('queued');
    expect(socket.send('c')).toBe('queue-full');
    last().accept();
    expect(last().sent).toEqual(['a', 'b']);
  });

  it('refuses messages over the size limit both ways', () => {
    const { transport, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport, maxMessageSize: 4, reconnect: false }));
    last().accept();
    expect(socket.send('12345')).toBe('too-large');
    expect(socket.send('é€')).toBe('too-large'); // 2 characters, 5 bytes
    expect(last().sent).toEqual([]);
    last().receive(new Uint8Array(5).buffer);
    expect(socket.error()?.code).toBe('message-too-large');
    expect(last().closedWith?.[0]).toBe(1009);
    expect(socket.status()).toBe('closed');
  });

  it('tells which queued messages a final close leaves unsent', () => {
    const { transport } = fakeTransport();
    const socket = createWebSocket('wss://example.test', { transport });
    const discarded = vi.fn();
    socket.on('discard', discarded);
    socket.send('a');
    socket.close();
    expect(discarded).toHaveBeenCalledWith(['a']);
  });

  it('reports bytes still buffered and polls until they drain', () => {
    const { transport, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport }));
    last().accept();
    last().bufferedAmount = 2048;
    socket.send('x');
    expect(socket.buffered()).toBe(2048);
    last().bufferedAmount = 0;
    vi.advanceTimersByTime(100);
    expect(socket.buffered()).toBe(0);
  });

  it('reconnects with growing delays after a lost connection', async () => {
    const { transport, sockets, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport, reconnect: { delay: 100, factor: 2, jitter: false } }));
    last().accept();
    last().drop(1006);
    expect(socket.status()).toBe('reconnecting');
    expect(socket.info()).toMatchObject({ attempt: 1, closeCode: 1006 });
    await vi.advanceTimersByTimeAsync(99);
    expect(sockets).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(sockets).toHaveLength(2);
    last().drop(1006);
    await vi.advanceTimersByTimeAsync(199);
    expect(sockets).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(sockets).toHaveLength(3);
    last().accept();
    expect(socket.status()).toBe('open');
    expect(socket.info().attempt).toBe(0);
  });

  it('keeps queued messages across a reconnect', async () => {
    const { transport, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport, reconnect: { delay: 10, jitter: false } }));
    last().accept();
    last().drop();
    expect(socket.send('while away')).toBe('queued');
    await vi.advanceTimersByTimeAsync(10);
    last().accept();
    expect(last().sent).toEqual(['while away']);
  });

  it('gives up after the last attempt', async () => {
    const { transport, sockets, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport, reconnect: { attempts: 2, delay: 10, jitter: false } }));
    const closes: CloseInfo[] = [];
    socket.on('close', (close) => closes.push(close));
    last().drop();
    await vi.advanceTimersByTimeAsync(10);
    last().drop();
    await vi.advanceTimersByTimeAsync(20);
    last().drop();
    await vi.advanceTimersByTimeAsync(1000);
    expect(sockets).toHaveLength(3);
    expect(socket.status()).toBe('closed');
    expect(socket.error()?.code).toBe('reconnect-exhausted');
    expect(closes).toHaveLength(3);
  });

  it('does not reconnect after a normal close or a policy refusal', async () => {
    for (const code of [1000, 1008]) {
      const { transport, sockets, last } = fakeTransport();
      const socket = start(createWebSocket('wss://example.test', { transport }));
      last().accept();
      last().drop(code);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(socket.status()).toBe('closed');
      expect(sockets).toHaveLength(1);
    }
  });

  it('times out an attempt that never opens, then tries again', async () => {
    const { transport, sockets, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport, connectTimeout: 1000, reconnect: { delay: 10, jitter: false } }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(socket.error()?.code).toBe('connect-timeout');
    expect(sockets[0]!.closedWith?.[0]).toBe(4001);
    expect(socket.status()).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(10);
    expect(sockets).toHaveLength(2);
    last().accept();
    expect(socket.error()).toBeUndefined();
  });

  it('stops at an address the transport refuses outright', () => {
    const socket = start(createWebSocket('nope', {
      transport: () => {
        throw new SyntaxError('bad url');
      },
    }));
    expect(socket.status()).toBe('closed');
    expect(socket.error()).toMatchObject({ code: 'connect-failed' });
  });

  it('sends the heartbeat and drops a silent connection', async () => {
    const { transport, sockets, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', {
      transport,
      heartbeat: { interval: 1000, message: 'ping', timeout: 2500 },
      reconnect: { delay: 10, jitter: false },
    }));
    last().accept();
    await vi.advanceTimersByTimeAsync(2000);
    expect(last().sent).toEqual(['ping', 'ping']);
    last().receive('pong');
    await vi.advanceTimersByTimeAsync(2499);
    expect(socket.status()).toBe('open');
    await vi.advanceTimersByTimeAsync(1);
    expect(socket.error()?.code).toBe('heartbeat-timeout');
    expect(sockets[0]!.closedWith?.[0]).toBe(4000);
    await vi.advanceTimersByTimeAsync(10);
    expect(sockets).toHaveLength(2);
  });

  it('closes on request without reconnecting, and connect() opens again', async () => {
    const { transport, sockets, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport }));
    last().accept();
    socket.close(1000, 'bye');
    expect(socket.status()).toBe('closing');
    expect(socket.send('late')).toBe('closed');
    await vi.advanceTimersByTimeAsync(0);
    expect(socket.status()).toBe('closed');
    expect(socket.info()).toMatchObject({ closeCode: 1000, closeReason: 'bye' });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sockets).toHaveLength(1);
    socket.connect();
    expect(sockets).toHaveLength(2);
  });

  it('ignores events from a socket it already left', async () => {
    const { transport, sockets, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport, connectTimeout: 100, reconnect: { delay: 10, jitter: false } }));
    await vi.advanceTimersByTimeAsync(110);
    last().accept();
    sockets[0]!.onopen?.({});
    sockets[0]!.receive('stale');
    expect(socket.data()).toBeUndefined();
    expect(socket.status()).toBe('open');
  });
});

describe('ownership', () => {
  it('closes a connection created inside an owner when the owner goes', () => {
    const { transport, last } = fakeTransport();
    let socket!: WebSocketConnection<RawData, SendData>;
    const dispose = createRoot((dispose) => {
      socket = start(createWebSocket('wss://example.test', { transport }));
      return dispose;
    });
    last().accept();
    dispose();
    expect(last().closedWith?.[0]).toBe(1000);
    expect(socket.status()).toBe('closing');
  });

  it('keeps a shared connection when a consumer goes, and ends only its subscriptions', () => {
    const { transport, last } = fakeTransport();
    const shared = start(createWebSocket('wss://example.test', { transport }));
    last().accept();
    const inComponent = vi.fn();
    const elsewhere = vi.fn();
    shared.subscribe(elsewhere);
    const dispose = createRoot((dispose) => {
      shared.subscribe(inComponent);
      shared.on('close', inComponent);
      return dispose;
    });
    dispose();
    last().receive('after');
    expect(shared.status()).toBe('open');
    expect(last().closedWith).toBeUndefined();
    expect(inComponent).not.toHaveBeenCalled();
    expect(elsewhere).toHaveBeenCalledWith('after');
  });

  it('dispose() closes for good', async () => {
    const { transport, sockets, last } = fakeTransport();
    const socket = start(createWebSocket('wss://example.test', { transport }));
    last().accept();
    socket.dispose();
    socket.connect();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sockets).toHaveLength(1);
  });
});

describe('types', () => {
  it('derives message types from the serializer, raw frames without one', () => {
    const typed = createWebSocket('wss://example.test', { connect: false, serializer: json<{ n: number }, { op: 'ping' }>() });
    expectTypeOf(typed.data).returns.toEqualTypeOf<{ n: number } | undefined>();
    expectTypeOf(typed.send).parameter(0).toEqualTypeOf<{ op: 'ping' }>();
    const plain = createWebSocket('wss://example.test', { connect: false });
    expectTypeOf(plain.data).returns.toEqualTypeOf<RawData | undefined>();
    expectTypeOf(plain.send).parameter(0).toEqualTypeOf<SendData>();
  });
});
