/**
 * WsClient — singleton Socket.IO connection manager.
 *
 * One connection per browser session, shared across all workspace features.
 * The same socket is used for every namespace-level room (workspace:<id>).
 *
 * Usage:
 *   configureWsClient(env.wsUrl, () => sessionStore.token());
 *   const socket = getWsClient().connect();
 */

import { io, type Socket } from 'socket.io-client';

const WS_NAMESPACE = '/ws';

class WsClient {
  private socket: Socket | null = null;
  private readonly wsBaseUrl: string;
  private readonly getToken: () => string | null;

  constructor(wsBaseUrl: string, getToken: () => string | null) {
    this.wsBaseUrl = wsBaseUrl;
    this.getToken = getToken;
  }

  /**
   * Return the existing connected socket, or create a new one.
   * Called each time a consumer needs the socket (e.g. workspace layout mount).
   */
  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    // Disconnect stale socket before creating a new one.
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    const token = this.getToken();
    console.log('socket token', token)

    this.socket = io(`${this.wsBaseUrl}${WS_NAMESPACE}`, {
      // Start with polling so extraHeaders (Bearer token) are sent in the
      // HTTP handshake, then upgrade to WebSocket.
      transports: ['polling', 'websocket'],
      extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 15_000,
      randomizationFactor: 0.5,
      reconnectionAttempts: Infinity,
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

// ── Module-level singleton ─────────────────────────────────────────────────────

let _client: WsClient | null = null;

export function configureWsClient(
  wsBaseUrl: string,
  getToken: () => string | null,
): void {
  _client = new WsClient(wsBaseUrl, getToken);
}

export function getWsClient(): WsClient {
  if (!_client) {
    throw new Error('[WsClient] Not configured. Call configureWsClient() first.');
  }
  return _client;
}
