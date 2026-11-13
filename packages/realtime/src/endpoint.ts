/// <reference types="node" />
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';

/** What a server connection can send. */
export type ServerSendData = string | Uint8Array | ArrayBuffer;

/** What `send` did: only `sent` means the frame went to the socket. */
export type ServerSendResult = 'sent' | 'buffer-full' | 'closed';

export interface ServerConnection<Context> {
  /** What `authenticate` returned for this connection. */
  readonly context: Context;
  /** Bytes queued in the socket and not yet written. */
  readonly buffered: number;
  send(data: ServerSendData): ServerSendResult;
  /**
   * Settles once at most `bytes` wait unsent (half of `maxBuffered` by default), or the
   * connection closed: after `buffer-full`, wait on it before sending more. Node's socket gives
   * no event for this through `ws`, so it is checked every 20 ms while it waits.
   */
  drained(bytes?: number): Promise<void>;
  close(code?: number, reason?: string): void;
  /** Text frames arrive as strings, binary ones as bytes. */
  on(event: 'message', handler: (data: string | Uint8Array) => void): () => void;
  on(event: 'close', handler: (code: number, reason: string) => void): () => void;
}

export interface WebSocketServerOptions<Context> {
  /** The address path this server answers; other upgrades are left to the next hook. */
  path: string;
  /**
   * Who connects, from the upgrade request (its cookie, a ticket in the address); null answers
   * 401. Runs after the origin check.
   */
  authenticate: (request: IncomingMessage) => Context | null | Promise<Context | null>;
  /**
   * Pages allowed to connect, as origins (`https://app.example.test`) or a function. A browser
   * sends its cookies with any socket it opens, so without this check another site could open
   * one as your user. Default: the request's own host. A request without an `Origin` header
   * does not come from a browser page and is let through to `authenticate`.
   */
  origins?: string[] | ((origin: string, request: IncomingMessage) => boolean);
  onConnection: (connection: ServerConnection<Context>) => void;
  /** Open connections at most; more answer 503. Default: 10000 */
  maxConnections?: number;
  /** Largest incoming message in bytes; a larger one closes the connection with 1009. Default: 1 MiB */
  maxMessageSize?: number;
  /** Bytes a connection may hold unsent before `send` answers `buffer-full`. Default: 4 MiB */
  maxBuffered?: number;
  /**
   * Protocol ping interval in ms; a connection that has not answered the previous ping is
   * dropped. Pings are invisible to browser code, so `keepAlive` sends a frame it can see.
   * Default: 25000
   */
  pingInterval?: number;
  /** A text frame sent every `pingInterval`, for clients that watch for silence. */
  keepAlive?: string;
  /**
   * Longest life of a connection, in ms. Past it the server closes with `CLOSE_REAUTHENTICATE`,
   * which the client answers by reconnecting, through `authenticate` again: a person whose
   * access ended stops receiving by then. Default: none
   */
  maxAge?: number;
}

const DRAIN_POLL_MS = 20;

/** The close code for a connection past `maxAge`: reconnect, authenticating again. */
export const CLOSE_REAUTHENTICATE = 4100;

export interface RealtimeServer {
  /** For `defineServer({ upgrade })`: true when the request was for `path`. */
  upgrade(request: IncomingMessage, socket: Duplex, head: Buffer): boolean;
  /** Open connections. */
  size(): number;
  /** Refuses new connections, closes open ones with 1001, and drops what is left after `timeout` ms. */
  close(timeout?: number): Promise<void>;
}

const REFUSALS = {
  401: 'Unauthorized',
  403: 'Forbidden',
  503: 'Service Unavailable',
} as const;

/**
 * A WebSocket endpoint for the app's server module, on the `ws` library.
 *
 * ```ts
 * const live = createWebSocketServer({ path: '/live', authenticate: sessionFrom, onConnection });
 * export default defineServer({ upgrade: live.upgrade, shutdown: () => live.close() });
 * ```
 */
export function createWebSocketServer<Context>(options: WebSocketServerOptions<Context>): RealtimeServer {
  const maxConnections = options.maxConnections ?? 10_000;
  const maxMessageSize = options.maxMessageSize ?? 1024 * 1024;
  const maxBuffered = options.maxBuffered ?? 4 * 1024 * 1024;
  const pingInterval = options.pingInterval ?? 25_000;
  const wss = new WebSocketServer({ noServer: true, maxPayload: maxMessageSize });
  const alive = new WeakSet<WebSocket>();
  /** Handshakes past the path check, counted with open connections against the limit. */
  let pending = 0;
  let closing = false;

  const ping = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.has(ws)) {
        ws.terminate();
        continue;
      }
      alive.delete(ws);
      ws.ping();
      if (options.keepAlive !== undefined) ws.send(options.keepAlive);
    }
  }, pingInterval);
  ping.unref?.();

  const allowedOrigin = (request: IncomingMessage): boolean => {
    const origin = request.headers.origin;
    if (!origin) return true;
    if (typeof options.origins === 'function') return options.origins(origin, request);
    if (options.origins) return options.origins.includes(origin);
    try {
      return new URL(origin).host === request.headers.host;
    } catch {
      return false;
    }
  };

  const refuse = (socket: Duplex, status: keyof typeof REFUSALS) => {
    if (socket.destroyed) return;
    socket.end(`HTTP/1.1 ${status} ${REFUSALS[status]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  };

  const accept = async (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (closing || wss.clients.size + pending >= maxConnections) return refuse(socket, 503);
    if (!allowedOrigin(request)) return refuse(socket, 403);
    pending += 1;
    let context: Context | null;
    try {
      context = await options.authenticate(request);
    } catch (error) {
      console.error(error);
      context = null;
    } finally {
      pending -= 1;
    }
    if (context === null) return refuse(socket, 401);
    if (closing || socket.destroyed) return refuse(socket, 503);
    wss.handleUpgrade(request, socket, head, (ws) => {
      alive.add(ws);
      ws.on('pong', () => alive.add(ws));
      // A protocol error (an oversized or malformed frame) closes the socket on its own; without
      // a listener the error would end the process.
      ws.on('error', () => {});
      if (options.maxAge) {
        const timer = setTimeout(() => ws.close(CLOSE_REAUTHENTICATE, 'reauthenticate'), options.maxAge);
        timer.unref?.();
        ws.once('close', () => clearTimeout(timer));
      }
      options.onConnection(wrap(ws, context as Context, maxBuffered));
    });
  };

  return {
    upgrade(request, socket, head) {
      const path = new URL(request.url ?? '/', 'http://localhost').pathname;
      if (path !== options.path) return false;
      void accept(request, socket, head);
      return true;
    },
    size: () => wss.clients.size,
    close(timeout = 5000) {
      closing = true;
      clearInterval(ping);
      const open = [...wss.clients];
      for (const ws of open) ws.close(1001, 'server shutting down');
      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          for (const ws of wss.clients) ws.terminate();
        }, timeout);
        timer.unref?.();
        const done = () => {
          if (wss.clients.size) return;
          clearTimeout(timer);
          wss.close(() => resolve());
        };
        for (const ws of open) ws.once('close', done);
        done();
      });
    },
  };
}

function wrap<Context>(ws: WebSocket, context: Context, maxBuffered: number): ServerConnection<Context> {
  return {
    context,
    get buffered() {
      return ws.bufferedAmount;
    },
    send(data) {
      if (ws.readyState !== ws.OPEN) return 'closed';
      if (ws.bufferedAmount > maxBuffered) return 'buffer-full';
      ws.send(data);
      return 'sent';
    },
    drained(bytes = maxBuffered / 2) {
      return new Promise<void>((resolve) => {
        const check = () => {
          if (ws.readyState !== ws.OPEN || ws.bufferedAmount <= bytes) return resolve();
          setTimeout(check, DRAIN_POLL_MS);
        };
        check();
      });
    },
    close(code = 1000, reason = '') {
      ws.close(code, reason);
    },
    on(event: 'message' | 'close', handler: (...args: never[]) => void) {
      const listener =
        event === 'message'
          ? (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
              const bytes = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data as ArrayBuffer);
              (handler as (data: string | Uint8Array) => void)(isBinary ? new Uint8Array(bytes) : bytes.toString('utf8'));
            }
          : (code: number, reason: Buffer) => (handler as (code: number, reason: string) => void)(code, reason.toString('utf8'));
      ws.on(event, listener);
      return () => void ws.off(event, listener);
    },
  } as ServerConnection<Context>;
}
