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
  /**
   * Calls `handler` when messages may have been missed: the bus lost its connection and has it
   * back. The channel server answers with `resync` to every member.
   */
  onGap?(handler: () => void): () => void;
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

type Notification = { channel: string; payload?: string };

/** The part of a Postgres client the bus uses; `pg`'s `Client` is one. */
export interface PostgresNotifyClient {
  query(sql: string, params?: unknown[]): Promise<unknown>;
  on(event: 'notification', listener: (notification: Notification) => void): unknown;
  /** The connection failed or ended: with a factory for `listen`, the bus opens another. */
  on(event: 'error' | 'end', listener: (error?: unknown) => void): unknown;
  off?(event: 'notification', listener: (notification: Notification) => void): unknown;
  /** Opens the connection, for a client made unconnected (`new pg.Client(...)`); called before `LISTEN`. */
  connect?(): Promise<unknown>;
  /** Closes the connection; called when the bus closes or replaces it. */
  end?(): Promise<unknown>;
}

export interface PostgresBusOptions {
  /**
   * The client kept for listening: a direct connection, since a pooler in transaction mode drops
   * `LISTEN`. A function making one lets the bus replace a connection that fails or ends: it
   * tries again with growing waits, and once listening again reports a gap (`onGap`), since
   * what was published meanwhile was missed. A client given as is is not replaced.
   */
  listen: PostgresNotifyClient | (() => PostgresNotifyClient);
  /** First wait before opening a lost listening connection again, in ms; doubles up to 30 s. Default: 500 */
  reconnectDelay?: number;
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
  const make = typeof options.listen === 'function' ? options.listen : null;
  let client: PostgresNotifyClient = make ? make() : (options.listen as PostgresNotifyClient);
  const notify = () => options.notify ?? client;
  const handlers = new Set<(channel: string, message: ChannelMessage) => void>();
  const gaps = new Set<() => void>();
  const firstDelay = options.reconnectDelay ?? 500;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const listener = (notification: Notification) => {
    if (notification.channel !== pgChannel || !notification.payload) return;
    let parsed: { c: string; m: ChannelMessage };
    try {
      parsed = JSON.parse(notification.payload);
    } catch {
      return;
    }
    for (const handler of handlers) handler(parsed.c, parsed.m);
  };
  /** Listens on `next`, and replaces it when it fails, if the bus can make another. */
  const attach = async (next: PostgresNotifyClient) => {
    let lost = false;
    const onLost = () => {
      if (lost || closed || !make) return;
      lost = true;
      next.off?.('notification', listener);
      void next.end?.().catch(() => {});
      replace(firstDelay);
    };
    next.on('notification', listener);
    next.on('error', onLost);
    next.on('end', onLost);
    try {
      // A client the bus made is the bus's to connect; one given as is is connected already.
      if (make) await next.connect?.();
      await next.query(`LISTEN ${pgChannel}`);
    } catch (error) {
      // The caller retries; this connection's own error event must not schedule another.
      lost = true;
      next.off?.('notification', listener);
      void next.end?.().catch(() => {});
      throw error;
    }
  };
  const replace = (delay: number) => {
    retry = setTimeout(async () => {
      if (closed) return;
      try {
        client = make!();
        await attach(client);
        for (const gap of [...gaps]) gap();
      } catch {
        replace(Math.min(delay * 2, 30_000));
      }
    }, delay);
    (retry as { unref?: () => void }).unref?.();
  };

  return {
    async start() {
      await attach(client);
    },
    async close() {
      closed = true;
      clearTimeout(retry);
      client.off?.('notification', listener);
      await client.query(`UNLISTEN ${pgChannel}`).catch(() => {});
      if (make) await client.end?.().catch(() => {});
    },
    onGap(handler) {
      gaps.add(handler);
      return () => void gaps.delete(handler);
    },
    async publish(channel, message) {
      const payload = JSON.stringify({ c: channel, m: message });
      if (new TextEncoder().encode(payload).length > MAX_PAYLOAD) {
        throw new Error(`postgresBus: a message on "${channel}" is over ${MAX_PAYLOAD} bytes; publish ids and let clients fetch`);
      }
      await notify().query('SELECT pg_notify($1, $2)', [pgChannel, payload]);
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => void handlers.delete(handler);
    },
  };
}
