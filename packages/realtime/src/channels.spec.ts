import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { createRoot } from '@fluixi/reactive';
import { createChannelClient, globalTransport, type ChannelClient, type ChannelMessage } from './index.js';
import { createChannelServer, memoryBus, postgresBus, type ChannelServer, type ChannelServerOptions, type PostgresNotifyClient } from './server.js';

type User = { id: string; teams: string[] };

const cleanup: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  for (const step of cleanup.splice(0).reverse()) await step();
});

/** A channel server on a real HTTP server, with an event log it replays from. */
async function serve(options: Partial<ChannelServerOptions<User>> = {}) {
  const log: { channel: string; message: ChannelMessage }[] = [];
  const channels: ChannelServer = createChannelServer<User>({
    path: '/live',
    origins: () => true,
    authenticate: () => ({ id: 'u1', teams: ['a'] }),
    authorize: (user, channel) => user.teams.includes(channel.split(':')[1]!),
    replay: (channel, since) => {
      const at = log.findIndex((entry) => entry.message.id === since);
      return at < 0 ? null : log.slice(at + 1).filter((entry) => entry.channel === channel).map((entry) => entry.message);
    },
    ...options,
  });
  await channels.start();
  const http: Server = createServer();
  http.on('upgrade', (request, socket, head) => void channels.upgrade(request, socket, head));
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  cleanup.push(() => new Promise<void>((resolve) => http.close(() => resolve())), () => channels.close(100));
  let sequence = 0;
  const publish = (channel: string, data: unknown) => {
    const message = { id: String(++sequence), type: 'task.changed', data };
    log.push({ channel, message });
    return channels.publish(channel, message);
  };
  return { channels, publish, url: `ws://127.0.0.1:${(http.address() as AddressInfo).port}/live` };
}

function client(url: string): ChannelClient {
  const live = createChannelClient(url, { transport: globalTransport(), reconnect: { delay: 10, jitter: false } });
  cleanup.push(() => live.dispose());
  return live;
}

/** Waits until a client is connected to `channels`. */
function connectionsOf(channels: ChannelServer): Promise<void> {
  return vi.waitFor(() => expect(channels.size()).toBeGreaterThan(0));
}

describe('channels', () => {
  it('delivers what is published to the members of a channel only', async () => {
    const { channels, publish, url } = await serve();
    const live = client(url);
    const received: unknown[] = [];
    live.subscribe('team:a', (message) => received.push(message.data));
    await connectionsOf(channels);
    await vi.waitFor(async () => {
      await publish('team:a', 1);
      expect(received).toContain(1);
    });
    await publish('team:b', 'not mine');
    await publish('team:a', 2);
    await vi.waitFor(() => expect(received.at(-1)).toBe(2));
    expect(received).not.toContain('not mine');
  });

  it('tells the subscriber when the app refuses a channel', async () => {
    const { url } = await serve();
    const live = client(url);
    const denied = vi.fn();
    live.subscribe('team:b', () => {}, { onDenied: denied });
    await vi.waitFor(() => expect(denied).toHaveBeenCalled());
  });

  it('replays what was missed after a reconnect, in order', async () => {
    const { channels, publish, url } = await serve();
    const live = client(url);
    const received: ChannelMessage[] = [];
    live.subscribe('team:a', (message) => received.push(message));
    await connectionsOf(channels);
    // Publish until the join has landed: earlier ones may go out before it.
    await vi.waitFor(async () => {
      await publish('team:a', 'first');
      expect(received.length).toBeGreaterThan(0);
    });
    live.connection.close();
    await vi.waitFor(() => expect(live.status()).toBe('closed'));
    await publish('team:a', 'while away 1');
    await publish('team:a', 'while away 2');
    live.connection.connect();
    await vi.waitFor(() => expect(received.slice(-2).map((message) => message.data)).toEqual(['while away 1', 'while away 2']));
    const ids = received.map((message) => Number(message.id));
    expect(ids).toEqual([...new Set(ids)].sort((a, b) => a - b));
  });

  it('asks for a resync when the app cannot replay', async () => {
    const { channels, publish, url } = await serve({ replay: () => null });
    const live = client(url);
    const resync = vi.fn();
    const received = vi.fn();
    live.subscribe('team:a', received, { onResync: resync });
    await connectionsOf(channels);
    await vi.waitFor(async () => {
      await publish('team:a', 'x');
      expect(received).toHaveBeenCalled();
    });
    expect(resync).not.toHaveBeenCalled();
    live.connection.close();
    await vi.waitFor(() => expect(live.status()).toBe('closed'));
    live.connection.connect();
    await vi.waitFor(() => expect(resync).toHaveBeenCalledTimes(1));
  });

  it('holds what is published during a replay and sends it after, without duplicates', async () => {
    let release!: () => void;
    let publishDuring!: () => Promise<void>;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { publish, url } = await serve({
      replay: async () => {
        await publishDuring();
        await gate;
        return [{ id: '2', type: 't', data: 'replayed' }];
      },
    });
    publishDuring = async () => {
      await publish('team:a', 'during'); // id 2, the same one the replay returns
      await publish('team:a', 'after'); // id 3
      release();
    };
    await publish('team:a', 'before'); // id 1
    const ws = new WebSocket(url);
    const frames: { t: string; m?: ChannelMessage }[] = [];
    ws.on('message', (data) => frames.push(JSON.parse(String(data))));
    await new Promise((resolve) => ws.once('open', resolve));
    ws.send(JSON.stringify({ t: 'join', c: 'team:a', since: '1' }));
    await vi.waitFor(() => expect(frames.filter((frame) => frame.t === 'msg')).toHaveLength(2));
    expect(frames.filter((frame) => frame.t === 'msg').map((frame) => frame.m!.id)).toEqual(['2', '3']);
    ws.close();
  });

  it('leaves the channel when its last subscriber stops, with the owner it was made in', async () => {
    const { channels, publish, url } = await serve();
    const live = client(url);
    const received = vi.fn();
    const dispose = createRoot((dispose) => {
      live.subscribe('team:a', received);
      return dispose;
    });
    await connectionsOf(channels);
    await vi.waitFor(async () => {
      await publish('team:a', 1);
      expect(received).toHaveBeenCalled();
    });
    dispose();
    received.mockClear();
    await new Promise((resolve) => setTimeout(resolve, 30));
    await publish('team:a', 2);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(received).not.toHaveBeenCalled();
    expect(live.connected()).toBe(true);
  });

  it('closes a connection that speaks anything but the protocol', async () => {
    const { url } = await serve();
    const ws = new WebSocket(url);
    await new Promise((resolve) => ws.once('open', resolve));
    const closed = new Promise<number>((resolve) => ws.once('close', resolve));
    ws.send('{"t":"subscribe-everything"}');
    expect(await closed).toBe(1008);
  });

  it('denies channels past the limit for one connection', async () => {
    const { url } = await serve({ authorize: () => true, maxChannels: 1 });
    const live = client(url);
    const denied = vi.fn();
    live.subscribe('team:a', () => {});
    live.subscribe('team:x', () => {}, { onDenied: denied });
    await vi.waitFor(() => expect(denied).toHaveBeenCalled());
  });

  it('reaches clients on another instance through a shared bus', async () => {
    const bus = memoryBus();
    const first = await serve({ bus });
    const second = await serve({ bus });
    const live = client(second.url);
    const received: unknown[] = [];
    live.subscribe('team:a', (message) => received.push(message.data));
    await connectionsOf(second.channels);
    await vi.waitFor(async () => {
      await first.publish('team:a', 'from the first');
      expect(received).toContain('from the first');
    });
  });
});

describe('postgresBus', () => {
  function fakePg() {
    let listener: ((notification: { channel: string; payload?: string }) => void) | undefined;
    const queries: [string, unknown[] | undefined][] = [];
    const pg: PostgresNotifyClient = {
      async query(sql, params) {
        queries.push([sql, params]);
        if (sql.startsWith('SELECT pg_notify')) listener?.({ channel: params![0] as string, payload: params![1] as string });
      },
      on: (_, fn) => (listener = fn),
      off: () => (listener = undefined),
    };
    return { pg, queries };
  }

  it('listens on start, notifies on publish and hands notifications to subscribers', async () => {
    const { pg, queries } = fakePg();
    const bus = postgresBus({ listen: pg });
    const received = vi.fn();
    bus.subscribe(received);
    await bus.start!();
    await bus.publish('team:a', { id: '1', type: 't', data: null });
    expect(queries[0]![0]).toBe('LISTEN fluixi_realtime');
    expect(queries[1]).toEqual(['SELECT pg_notify($1, $2)', ['fluixi_realtime', '{"c":"team:a","m":{"id":"1","type":"t","data":null}}']]);
    expect(received).toHaveBeenCalledWith('team:a', { id: '1', type: 't', data: null });
    await bus.close!();
    expect(queries.at(-1)![0]).toBe('UNLISTEN fluixi_realtime');
  });

  it('refuses a payload Postgres would refuse, and an unsafe channel name', async () => {
    const { pg } = fakePg();
    await expect(postgresBus({ listen: pg }).publish('team:a', { id: '1', type: 't', data: 'x'.repeat(8000) })).rejects.toThrow(/8000|7999/);
    expect(() => postgresBus({ listen: pg, channel: 'x; DROP TABLE y' })).toThrow(/identifier/);
  });
});
