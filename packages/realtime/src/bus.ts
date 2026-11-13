import type { ChannelMessage } from './channel-protocol.js';

/**
 * Carries published messages to every server instance, the publishing one included. One process
 * needs no more than `memoryBus()`; several need a shared bus such as `postgresBus`.
 */
export interface RealtimeBus {
  publish(channel: string, message: ChannelMessage): Promise<void>;
  subscribe(handler: (channel: string, message: ChannelMessage) => void): () => void;
  /** Called by the channel server's `start()`. */
  start?(): Promise<void>;
  /** Called by the channel server's `close()`. */
  close?(): Promise<void>;
}

/** Delivers within this process only. */
export function memoryBus(): RealtimeBus {
  const handlers = new Set<(channel: string, message: ChannelMessage) => void>();
  return {
    async publish(channel, message) {
      for (const handler of handlers) handler(channel, message);
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => void handlers.delete(handler);
    },
  };
}

/** The part of a Postgres client the bus uses; `pg`'s `Client` is one. */
export interface PostgresNotifyClient {
  query(sql: string, params?: unknown[]): Promise<unknown>;
  on(event: 'notification', listener: (notification: { channel: string; payload?: string }) => void): unknown;
  off?(event: 'notification', listener: (notification: { channel: string; payload?: string }) => void): unknown;
}

export interface PostgresBusOptions {
  /**
   * A client kept for listening: a direct connection, since a pooler in transaction mode drops
   * `LISTEN`. Reconnecting it is the app's job; messages published while it is down are missed,
   * which replay on the clients' next join covers.
   */
  listen: PostgresNotifyClient;
  /** Where `NOTIFY` goes; a pooled client is fine. Default: `listen` */
  notify?: Pick<PostgresNotifyClient, 'query'>;
  /** The Postgres channel. Default: 'fluixi_realtime' */
  channel?: string;
}

/** Postgres refuses a NOTIFY payload of 8000 bytes or more. */
const MAX_PAYLOAD = 7999;

/**
 * Fans out through Postgres `LISTEN`/`NOTIFY`, so every server on the same database delivers
 * what any of them publishes. Payloads stay under 8000 bytes: publish ids, not records.
 */
export function postgresBus(options: PostgresBusOptions): RealtimeBus {
  const pgChannel = options.channel ?? 'fluixi_realtime';
  if (!/^[a-z_][a-z0-9_]*$/.test(pgChannel)) throw new Error(`postgresBus: "${pgChannel}" is not a plain lowercase identifier`);
  const notify = options.notify ?? options.listen;
  const handlers = new Set<(channel: string, message: ChannelMessage) => void>();
  const listener = (notification: { channel: string; payload?: string }) => {
    if (notification.channel !== pgChannel || !notification.payload) return;
    let parsed: { c: string; m: ChannelMessage };
    try {
      parsed = JSON.parse(notification.payload);
    } catch {
      return;
    }
    for (const handler of handlers) handler(parsed.c, parsed.m);
  };
  return {
    async start() {
      options.listen.on('notification', listener);
      await options.listen.query(`LISTEN ${pgChannel}`);
    },
    async close() {
      options.listen.off?.('notification', listener);
      await options.listen.query(`UNLISTEN ${pgChannel}`);
    },
    async publish(channel, message) {
      const payload = JSON.stringify({ c: channel, m: message });
      if (new TextEncoder().encode(payload).length > MAX_PAYLOAD) {
        throw new Error(`postgresBus: a message on "${channel}" is over ${MAX_PAYLOAD} bytes; publish ids and let clients fetch`);
      }
      await notify.query('SELECT pg_notify($1, $2)', [pgChannel, payload]);
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => void handlers.delete(handler);
    },
  };
}
