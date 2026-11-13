/** What a WebSocket can carry: text, or bytes in any of the forms the browser accepts. */
export type SendData = string | ArrayBufferLike | ArrayBufferView | Blob;

/** What arrives: text frames as strings, binary frames as `ArrayBuffer` or `Blob` per `binaryType`. */
export type RawData = string | ArrayBuffer | Blob;

export interface CloseInfo {
  code: number;
  reason: string;
  wasClean: boolean;
}

/**
 * The part of the WebSocket interface the connection uses. The browser's `WebSocket` is one;
 * a test double or another runtime's client can be another.
 */
export interface WebSocketLike {
  readonly protocol: string;
  readonly bufferedAmount: number;
  binaryType: 'arraybuffer' | 'blob';
  send(data: SendData): void;
  close(code?: number, reason?: string): void;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: CloseInfo) => void) | null;
}

/** Opens a socket. */
export type WebSocketTransport = (url: string, protocols?: string | string[]) => WebSocketLike;

/** The runtime's own `WebSocket`, when there is one. */
export function globalTransport(): WebSocketTransport | undefined {
  const Native = (globalThis as { WebSocket?: new (url: string, protocols?: string | string[]) => unknown }).WebSocket;
  // The native handler properties take richer event types than WebSocketLike names, so the
  // instance is compatible at runtime but not by declaration.
  return Native ? (url, protocols) => new Native(url, protocols) as WebSocketLike : undefined;
}

/** Size in bytes of an outgoing or incoming message. */
export function byteSize(data: unknown): number {
  if (typeof data === 'string') {
    // Each UTF-16 unit is at most 3 bytes in UTF-8: count exactly only when the bound is close.
    return data.length < 1024 ? new TextEncoder().encode(data).length : utf8Length(data);
  }
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) return data.byteLength;
  if (typeof Blob !== 'undefined' && data instanceof Blob) return data.size;
  return (data as { byteLength?: number }).byteLength ?? 0;
}

function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit < 0x80) bytes += 1;
    else if (unit < 0x800) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff && i + 1 < text.length) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}
