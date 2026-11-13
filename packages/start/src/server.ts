import { request as httpRequest, type IncomingMessage, type OutgoingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { Duplex } from 'node:stream';

/**
 * What the app's server module (`src/server.ts`) default-exports: code that lives as long as
 * the server process, beside the request handler. `start` and `shutdown` may return a promise,
 * which is awaited.
 */
export interface ServerHooks {
  /** Runs once the server listens: open long-lived connections, start listeners. */
  start?(): unknown;
  /**
   * An HTTP upgrade request (a WebSocket). Return true when the hook took the socket; an
   * upgrade no hook takes is answered 404.
   */
  upgrade?(request: IncomingMessage, socket: Duplex, head: Buffer): boolean | Promise<boolean>;
  /**
   * Runs on SIGTERM or SIGINT, after the server stopped accepting connections and before it
   * closes: close sockets, flush what is buffered. Bounded by `shutdownTimeoutSeconds`.
   */
  shutdown?(): unknown;
}

/** Identity helper for the types of `src/server.ts`. */
export function defineServer(hooks: ServerHooks): ServerHooks {
  return hooks;
}

export function isServerHooks(value: unknown): value is ServerHooks {
  if (!value || typeof value !== 'object') return false;
  const hooks = value as Record<string, unknown>;
  return ['start', 'upgrade', 'shutdown'].every((key) => hooks[key] === undefined || typeof hooks[key] === 'function');
}

/** Hands an upgrade to the hook, and refuses it when the hook does not take it or fails. */
export async function routeUpgrade(hooks: ServerHooks | undefined, request: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
  let taken = false;
  try {
    taken = !!(await hooks?.upgrade?.(request, socket, head));
  } catch (error) {
    console.error(error);
  }
  if (!taken && !socket.destroyed) socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
}

export interface ForwardUpgradeOptions {
  /** The origin upgrades go to, `http://localhost:3301`. The path and query are kept. */
  to: string;
  /** Upgrades under this path are forwarded. `/api` by default. */
  prefix?: string;
}

/**
 * Forwards WebSocket upgrades under a prefix to another origin, the way `forward` passes `/api`
 * requests: the browser keeps talking to one origin. The upgraded connection is piped as is,
 * so nothing here reads or changes what travels on it; authenticate on the far side.
 *
 * @example
 * ```ts
 * // src/server.ts
 * export default defineServer({ upgrade: forwardUpgrade({ to: process.env.API_URL! }) });
 * ```
 */
export function forwardUpgrade(options: ForwardUpgradeOptions): NonNullable<ServerHooks['upgrade']> {
  const prefix = (options.prefix ?? '/api').replace(/\/$/, '');
  const origin = new URL(options.to);
  return (request, socket, head) => {
    const path = request.url ?? '/';
    const pathname = path.split('?')[0]!;
    if (pathname !== prefix && !pathname.startsWith(prefix + '/')) return false;
    pipeUpgrade(origin, request, socket, head);
    return true;
  };
}

function pipeUpgrade(origin: URL, request: IncomingMessage, socket: Duplex, head: Buffer): void {
  const send = origin.protocol === 'https:' ? httpsRequest : httpRequest;
  const headers: OutgoingHttpHeaders = { ...request.headers, host: origin.host };
  // IPv4 callers reach a dual-stack server as `::ffff:a.b.c.d`; the API reads plain IPv4.
  const address = request.socket.remoteAddress?.replace(/^::ffff:(?=\d+\.)/, '');
  // This server's view of the caller, replacing whatever the client claimed, as `forward` does.
  if (address) headers['x-forwarded-for'] = address;
  const upstream = send({
    protocol: origin.protocol,
    hostname: origin.hostname,
    port: origin.port,
    path: request.url,
    method: request.method,
    headers,
  });
  const fail = () => {
    if (!socket.destroyed) socket.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  };
  upstream.once('error', fail);
  socket.once('error', () => upstream.destroy());
  // A refusal (401, 403, 503) is passed back whole, so the client sees why.
  upstream.once('response', (response) => {
    socket.write(statusBlock(response.statusCode ?? 502, response.statusMessage ?? '', response.rawHeaders));
    response.pipe(socket);
  });
  upstream.once('upgrade', (response, far, farHead) => {
    socket.write(statusBlock(101, response.statusMessage ?? 'Switching Protocols', response.rawHeaders));
    if (farHead.length) socket.write(farHead);
    if (head.length) far.write(new Uint8Array(head));
    // Either side ending ends both: HTTP servers keep a socket half open after its peer's end,
    // and the WebSocket close handshake has already happened inside the stream by then.
    for (const [from, to] of [[far, socket], [socket, far]] as const) {
      from.once('end', () => to.destroy());
      from.once('close', () => to.destroy());
      from.once('error', () => to.destroy());
    }
    far.pipe(socket);
    socket.pipe(far);
  });
  upstream.end();
}

function statusBlock(status: number, message: string, rawHeaders: string[]): string {
  let block = `HTTP/1.1 ${status} ${message}\r\n`;
  for (let i = 0; i < rawHeaders.length; i += 2) block += `${rawHeaders[i]}: ${rawHeaders[i + 1]}\r\n`;
  return block + '\r\n';
}
