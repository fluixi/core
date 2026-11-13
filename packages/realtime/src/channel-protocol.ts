/**
 * A message on a channel. `id` orders a channel's messages for the app that publishes them (an
 * event sequence, say); a client sends back the last one it saw to catch up after a reconnect.
 */
export interface ChannelMessage<T = unknown> {
  id: string;
  type: string;
  data: T;
}

/** Frames a client sends. */
export type ClientFrame = { t: 'join'; c: string; since?: string } | { t: 'leave'; c: string };

/** Frames the server sends. */
export type ServerFrame =
  | { t: 'msg'; c: string; m: ChannelMessage }
  | { t: 'joined'; c: string }
  | { t: 'denied'; c: string }
  | { t: 'resync'; c: string }
  | { t: 'ping' };

/** The keep-alive frame, sent on every protocol ping so browsers can watch for silence. */
export const PING_FRAME = '{"t":"ping"}';

/** A client frame, or undefined for anything else. */
export function parseClientFrame(text: string): ClientFrame | undefined {
  let frame: unknown;
  try {
    frame = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!frame || typeof frame !== 'object') return undefined;
  const { t, c, since } = frame as Record<string, unknown>;
  if (typeof c !== 'string' || !c || c.length > 200) return undefined;
  if (t === 'leave') return { t, c };
  if (t !== 'join') return undefined;
  if (since === undefined) return { t, c };
  return typeof since === 'string' && since.length <= 200 ? { t, c, since } : undefined;
}
