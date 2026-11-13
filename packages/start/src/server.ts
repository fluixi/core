import type { IncomingMessage } from 'node:http';
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
