/// <reference types="node" />
import { memoryBus, type RealtimeBus } from './bus.js';
import { parseClientFrame, PING_FRAME, type ChannelMessage, type ServerFrame } from './channel-protocol.js';
import { createWebSocketServer, type RealtimeServer, type ServerConnection, type WebSocketServerOptions } from './endpoint.js';

export interface ChannelServerOptions<Context> extends Omit<WebSocketServerOptions<Context>, 'onConnection' | 'keepAlive'> {
  /** Whether this connection may receive `channel`; asked on every join. */
  authorize: (context: Context, channel: string) => boolean | Promise<boolean>;
  /**
   * The messages on `channel` after `since`, oldest first, for a client that reconnects. Null,
   * or no `replay` at all, sends `resync`: the client refetches what it shows.
   */
  replay?: (channel: string, since: string, context: Context) => ChannelMessage[] | null | Promise<ChannelMessage[] | null>;
  /** Fan-out across server instances. Default: `memoryBus()`, one process. */
  bus?: RealtimeBus;
  /** Channels one connection may join at once; more are denied. Default: 100 */
  maxChannels?: number;
}

export interface ChannelServer extends RealtimeServer {
  /** Starts the bus; call it from the server module's `start`. */
  start(): Promise<void>;
  /** Sends `message` to every connection on `channel`, on every instance through the bus. */
  publish<T>(channel: string, message: ChannelMessage<T>): Promise<void>;
}

/** Per connection and channel: live messages wait in `held` while a replay is under way. */
interface Membership {
  held: ChannelMessage[] | null;
}

/**
 * Channels over a WebSocket endpoint: clients join by name, the app authorises each join,
 * published messages reach every member, and a client coming back with the last id it saw gets
 * what it missed, or `resync` when the app cannot replay.
 */
export function createChannelServer<Context>(options: ChannelServerOptions<Context>): ChannelServer {
  const bus = options.bus ?? memoryBus();
  const maxChannels = options.maxChannels ?? 100;
  const members = new Map<string, Map<ServerConnection<Context>, Membership>>();

  const send = (connection: ServerConnection<Context>, frame: ServerFrame) => connection.send(JSON.stringify(frame));

  const deliver = (channel: string, message: ChannelMessage) => {
    for (const [connection, membership] of members.get(channel) ?? []) {
      if (membership.held) membership.held.push(message);
      else send(connection, { t: 'msg', c: channel, m: message });
    }
  };
  const unsubscribe = bus.subscribe(deliver);
  // The bus may have missed messages: every member refetches what it shows.
  const unwatchGaps = bus.onGap?.(() => {
    for (const [channel, set] of members) for (const connection of set.keys()) send(connection, { t: 'resync', c: channel });
  });

  const leave = (connection: ServerConnection<Context>, channel: string) => {
    const set = members.get(channel);
    set?.delete(connection);
    if (set && !set.size) members.delete(channel);
  };

  const join = async (connection: ServerConnection<Context>, joined: Set<string>, channel: string, since: string | undefined) => {
    if (joined.has(channel)) return;
    if (joined.size >= maxChannels) return void send(connection, { t: 'denied', c: channel });
    joined.add(channel);
    let allowed = false;
    try {
      allowed = await options.authorize(connection.context, channel);
    } catch (error) {
      console.error(error);
    }
    if (!joined.has(channel)) return; // left, or closed, while authorising
    if (!allowed) {
      joined.delete(channel);
      return void send(connection, { t: 'denied', c: channel });
    }
    // Membership first, so nothing published during the replay is lost: it waits in `held`.
    const membership: Membership = { held: since === undefined ? null : [] };
    if (!members.has(channel)) members.set(channel, new Map());
    members.get(channel)!.set(connection, membership);
    send(connection, { t: 'joined', c: channel });
    if (since === undefined) return;

    let missed: ChannelMessage[] | null = null;
    try {
      missed = options.replay ? await options.replay(channel, since, connection.context) : null;
    } catch (error) {
      console.error(error);
    }
    const held = membership.held ?? [];
    membership.held = null;
    if (!joined.has(channel)) return;
    if (missed === null) {
      send(connection, { t: 'resync', c: channel });
      return;
    }
    const replayed = new Set(missed.map((message) => message.id));
    for (const message of missed) send(connection, { t: 'msg', c: channel, m: message });
    for (const message of held) if (!replayed.has(message.id)) send(connection, { t: 'msg', c: channel, m: message });
  };

  const server = createWebSocketServer<Context>({
    ...options,
    keepAlive: PING_FRAME,
    onConnection(connection) {
      const joined = new Set<string>();
      connection.on('message', (data) => {
        const frame = typeof data === 'string' ? parseClientFrame(data) : undefined;
        // Only this protocol is spoken here: anything else is a client to stop talking to.
        if (!frame) return connection.close(1008, 'unexpected frame');
        if (frame.t === 'join') void join(connection, joined, frame.c, frame.since);
        else {
          joined.delete(frame.c);
          leave(connection, frame.c);
        }
      });
      connection.on('close', () => {
        for (const channel of joined) leave(connection, channel);
        joined.clear();
      });
    },
  });

  return {
    ...server,
    async start() {
      await bus.start?.();
    },
    publish: (channel, message) => bus.publish(channel, message),
    async close(timeout) {
      unsubscribe();
      unwatchGaps?.();
      await server.close(timeout);
      await bus.close?.();
    },
  };
}
