import { getOwner, onCleanup, untrack, type Accessor } from '@fluixi/reactive';
import { json } from './serializers.js';
import type { ChannelMessage, ClientFrame, ServerFrame } from './channel-protocol.js';
import { createWebSocket, type ConnectionStatus, type RealtimeError, type WebSocketConnection, type WebSocketOptions } from './socket.js';

export interface ChannelHandlers {
  /**
   * After a reconnect, the server could not send what was missed while away: refetch what the
   * channel feeds.
   */
  onResync?: () => void;
  /** The server refused the channel. */
  onDenied?: () => void;
}

export interface ChannelClientOptions extends Omit<WebSocketOptions<ServerFrame, ClientFrame>, 'serializer' | 'heartbeat'> {
  /**
   * Silence that counts as a dead connection, in ms. The channel server sends a frame on every
   * ping (25 s by default). Default: 60000
   */
  silenceTimeout?: number;
}

export interface ChannelClient {
  status: Accessor<ConnectionStatus>;
  connected: Accessor<boolean>;
  error: Accessor<RealtimeError | undefined>;
  /**
   * Calls `handler` with every message on `channel`. The first subscriber joins it, the last to
   * stop leaves it. Inside a reactive owner, stops with it.
   */
  subscribe<T = unknown>(channel: string, handler: (message: ChannelMessage<T>) => void, handlers?: ChannelHandlers): () => void;
  /** The connection underneath. */
  connection: WebSocketConnection<ServerFrame, ClientFrame>;
  dispose(): void;
}

interface Channel {
  subscribers: Set<{ handler: (message: ChannelMessage) => void } & ChannelHandlers>;
  /** The last message id seen, sent back on the next join. */
  last: string | undefined;
  /** Joined since the connection last opened. */
  joined: boolean;
}

/**
 * Channels from a channel server (`createChannelServer` in `@fluixi/realtime/server`) over one
 * connection. After a reconnect each channel rejoins with the last id it saw.
 */
export function createChannelClient(url: string | (() => string | Promise<string>), options: ChannelClientOptions = {}): ChannelClient {
  const { silenceTimeout = 60_000, ...socketOptions } = options;
  const connection = createWebSocket(url, {
    ...socketOptions,
    serializer: json<ServerFrame, ClientFrame>(),
    heartbeat: { interval: silenceTimeout / 2, timeout: silenceTimeout },
  });
  const channels = new Map<string, Channel>();

  const join = (name: string, channel: Channel) => {
    if (channel.joined || !untrack(connection.connected)) return;
    channel.joined = true;
    connection.send(channel.last === undefined ? { t: 'join', c: name } : { t: 'join', c: name, since: channel.last });
  };

  connection.on('open', () => {
    for (const [name, channel] of channels) {
      channel.joined = false;
      join(name, channel);
    }
  });
  connection.subscribe((frame) => {
    if (frame.t === 'ping' || frame.t === 'joined') return;
    const channel = channels.get(frame.c);
    if (!channel) return;
    const subscribers = [...channel.subscribers];
    if (frame.t === 'msg') {
      channel.last = frame.m.id;
      for (const subscriber of subscribers) subscriber.handler(frame.m);
    } else if (frame.t === 'resync') {
      for (const subscriber of subscribers) subscriber.onResync?.();
    } else if (frame.t === 'denied') {
      channels.delete(frame.c);
      for (const subscriber of subscribers) subscriber.onDenied?.();
    }
  });

  const client: ChannelClient = {
    status: connection.status,
    connected: connection.connected,
    error: connection.error,
    connection,
    subscribe(name, handler, handlers = {}) {
      let channel = channels.get(name);
      if (!channel) {
        channel = { subscribers: new Set(), last: undefined, joined: false };
        channels.set(name, channel);
      }
      const subscriber = { handler: handler as (message: ChannelMessage) => void, ...handlers };
      channel.subscribers.add(subscriber);
      join(name, channel);
      const stop = () => {
        const current = channels.get(name);
        if (!current?.subscribers.delete(subscriber) || current.subscribers.size) return;
        channels.delete(name);
        if (current.joined && untrack(connection.connected)) connection.send({ t: 'leave', c: name });
      };
      if (getOwner()) onCleanup(stop);
      return stop;
    },
    dispose() {
      channels.clear();
      connection.dispose();
    },
  };
  return client;
}
