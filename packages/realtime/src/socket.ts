import { batch, getOwner, onCleanup, signal, untrack, type Accessor } from '@fluixi/reactive';
import { raw, type Serializer } from './serializers.js';
import { byteSize, globalTransport, type CloseInfo, type RawData, type SendData, type WebSocketLike, type WebSocketTransport } from './transport.js';

export const CONNECTION_STATUSES = ['idle', 'connecting', 'open', 'reconnecting', 'closing', 'closed'] as const;
/**
 * - `idle`: never connected, or on the server, where nothing connects.
 * - `reconnecting`: waiting before the next attempt.
 * - `closed`: closed on request, refused by `reconnect.when`, or out of attempts.
 */
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const REALTIME_ERROR_CODES = [
  'connect-failed',
  'connect-timeout',
  'connection-error',
  'heartbeat-timeout',
  'message-too-large',
  'decode-failed',
  'reconnect-exhausted',
] as const;
export type RealtimeErrorCode = (typeof REALTIME_ERROR_CODES)[number];

export class RealtimeError extends Error {
  readonly code: RealtimeErrorCode;
  /** What failed underneath, when something did. */
  readonly cause?: unknown;
  constructor(code: RealtimeErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'RealtimeError';
    this.code = code;
    if (options && 'cause' in options) this.cause = options.cause;
  }
}

/**
 * What `send` did with a message. Only `sent` means the transport took it; `queued` means it
 * waits for the connection to open.
 */
export type SendResult = 'sent' | 'queued' | 'queue-full' | 'too-large' | 'closed';

export interface ReconnectPolicy {
  /** Attempts after a lost connection before giving up. Default: Infinity */
  attempts?: number;
  /** First delay, in ms. Default: 500 */
  delay?: number;
  /** Longest delay, in ms. Default: 30000 */
  maxDelay?: number;
  /** Growth of the delay per failed attempt. Default: 2 */
  factor?: number;
  /** Spread each delay over its upper half, so clients cut off together do not return together. Default: true */
  jitter?: boolean;
  /**
   * Whether a close calls for another attempt. Default: everything but 1000 (normal) and 1008
   * (policy violation, what a server answers when the person may not connect).
   */
  when?: (close: CloseInfo) => boolean;
}

export interface Heartbeat<Out> {
  /** How often `message` is sent while open, in ms. */
  interval: number;
  /** Sent every `interval`. Without it nothing is sent and only silence is watched. */
  message?: Out;
  /**
   * Silence that counts as a dead connection, in ms: no frame for that long drops the socket and
   * reconnects. The server must send something at least that often. Default: twice `interval`
   */
  timeout?: number;
}

export interface WebSocketOptions<In, Out> {
  protocols?: string | string[];
  /** Encoding of messages; frames pass as they are without one. */
  serializer?: Serializer<In, Out>;
  /**
   * Connect once created, in a browser. The attempt starts when the code running now has
   * finished, so a hydrating page still reads `idle`, as the server rendered it; messages sent
   * before then are queued. Default: true
   */
  connect?: boolean;
  /** Form of binary frames. Default: 'arraybuffer' */
  binaryType?: 'arraybuffer' | 'blob';
  /** Reconnection after a lost connection, or false for none. Default: on, with the defaults of {@link ReconnectPolicy} */
  reconnect?: ReconnectPolicy | boolean;
  /** Time an attempt has to open, in ms. Default: 10000 */
  connectTimeout?: number;
  heartbeat?: Heartbeat<Out>;
  /** Messages kept while not open, sent in order once open; 0 refuses them. Default: 100 */
  queueLimit?: number;
  /** Largest message either way, in bytes; a larger incoming one closes with 1009. Default: 1 MiB */
  maxMessageSize?: number;
  /** Keep the last message in `data()`. Off for streams consumed through `subscribe` only. Default: true */
  keepLatest?: boolean;
  /** Opens the socket. Default: the runtime's `WebSocket`, in a browser only. */
  transport?: WebSocketTransport;
}

export interface ConnectionInfo {
  /** The address of the current or last attempt. */
  url: string | undefined;
  /** The subprotocol the server chose. */
  protocol: string;
  /** Failed attempts since the connection was last open. */
  attempt: number;
  closeCode: number | undefined;
  closeReason: string | undefined;
}

export interface ConnectionEvents<Out> {
  open: () => void;
  close: (close: CloseInfo) => void;
  error: (error: RealtimeError) => void;
  /** Queued messages that will never be sent: the connection closed for good before opening. */
  discard: (messages: Out[]) => void;
}

export interface WebSocketConnection<In, Out> {
  status: Accessor<ConnectionStatus>;
  connected: Accessor<boolean>;
  /** The last message received, when `keepLatest` is on. */
  data: Accessor<In | undefined>;
  /** The last error, cleared when the connection opens. */
  error: Accessor<RealtimeError | undefined>;
  info: Accessor<ConnectionInfo>;
  /**
   * Bytes the transport still holds after the last send. The browser fires no event as this
   * drains, so it is read after each send and then polled until it reaches zero.
   */
  buffered: Accessor<number>;
  /** Opens the connection; nothing happens while open or connecting, or on the server. */
  connect(): void;
  send(message: Out): SendResult;
  /** Calls `handler` with every message. Inside a reactive owner, unsubscribes with it. */
  subscribe(handler: (message: In) => void): () => void;
  on<E extends keyof ConnectionEvents<Out>>(event: E, handler: ConnectionEvents<Out>[E]): () => void;
  /** Closes without reconnecting; `connect()` opens again. */
  close(code?: number, reason?: string): void;
  /** Closes for good and drops every subscriber. Runs with the owner that created the connection. */
  dispose(): void;
}

const NO_RECONNECT_CODES = new Set([1000, 1008]);
/** Closes the client starts. 4000 to 4999 are free for applications. */
const CLOSE_TOO_LARGE = 1009;
const CLOSE_HEARTBEAT = 4000;
const CLOSE_TIMEOUT = 4001;
const BUFFER_POLL_MS = 100;

/**
 * A WebSocket connection whose state is signals.
 *
 * Created inside a reactive owner (a component), it closes with that owner; created outside one
 * (a module, an app-wide service), it lives until `dispose()`, and components consume it with
 * `subscribe` and `on`, which end with theirs. On the server, without a `transport`, nothing
 * connects; in the browser the first attempt waits for the running task, hydration included.
 */
export function createWebSocket(url: string | (() => string | Promise<string>), options?: WebSocketOptions<RawData, SendData> & { serializer?: undefined }): WebSocketConnection<RawData, SendData>;
export function createWebSocket<In, Out>(url: string | (() => string | Promise<string>), options: WebSocketOptions<In, Out> & { serializer: Serializer<In, Out> }): WebSocketConnection<In, Out>;
export function createWebSocket<In, Out>(
  url: string | (() => string | Promise<string>),
  options: WebSocketOptions<In, Out> = {},
): WebSocketConnection<In, Out> {
  const serializer = (options.serializer ?? raw) as Serializer<In, Out>;
  const policy = reconnectPolicy(options.reconnect);
  const connectTimeout = options.connectTimeout ?? 10_000;
  const queueLimit = options.queueLimit ?? 100;
  const maxMessageSize = options.maxMessageSize ?? 1024 * 1024;
  const keepLatest = options.keepLatest ?? true;
  // A server render has no document: `globalThis.WebSocket` exists in Node 22, and a module or
  // component evaluated there must still open nothing.
  const transport = options.transport ?? (typeof document === 'undefined' ? undefined : globalTransport());

  const status = signal<ConnectionStatus>('idle');
  const data = signal<In | undefined>(undefined, { equals: false });
  const error = signal<RealtimeError | undefined>(undefined);
  const info = signal<ConnectionInfo>({ url: undefined, protocol: '', attempt: 0, closeCode: undefined, closeReason: undefined });
  const buffered = signal(0);

  const subscribers = new Set<(message: In) => void>();
  const listeners: { [E in keyof ConnectionEvents<Out>]: Set<ConnectionEvents<Out>[E]> } = {
    open: new Set(),
    close: new Set(),
    error: new Set(),
    discard: new Set(),
  };
  const queue: { message: Out; frame: SendData }[] = [];

  let socket: WebSocketLike | undefined;
  /** Bumped on every attempt and on close: callbacks from an older attempt find it changed. */
  let generation = 0;
  let failures = 0;
  let disposed = false;
  /** The automatic first connect, until it runs or something else decides. */
  let autoConnect = options.connect !== false && !!transport;
  let connectTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let beatTimer: ReturnType<typeof setInterval> | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let bufferTimer: ReturnType<typeof setTimeout> | undefined;

  const emit = <E extends keyof ConnectionEvents<Out>>(event: E, ...args: Parameters<ConnectionEvents<Out>[E]>) => {
    for (const listener of [...listeners[event]]) call(listener as (...a: unknown[]) => void, args);
  };
  const fail = (code: RealtimeErrorCode, message: string, cause?: unknown) => {
    const failure = new RealtimeError(code, message, cause === undefined ? undefined : { cause });
    error.set(failure);
    emit('error', failure);
  };
  const patchInfo = (patch: Partial<ConnectionInfo>) => info.set((current) => ({ ...current, ...patch }));

  const clearTimers = () => {
    clearTimeout(connectTimer);
    clearInterval(beatTimer);
    clearTimeout(silenceTimer);
    clearTimeout(bufferTimer);
    connectTimer = beatTimer = silenceTimer = bufferTimer = undefined;
  };

  const watchSilence = () => {
    if (!options.heartbeat) return;
    clearTimeout(silenceTimer);
    const timeout = options.heartbeat.timeout ?? options.heartbeat.interval * 2;
    silenceTimer = setTimeout(() => {
      fail('heartbeat-timeout', `No frame for ${timeout} ms`);
      drop(CLOSE_HEARTBEAT, 'heartbeat timeout');
    }, timeout);
  };

  const trackBuffer = () => {
    clearTimeout(bufferTimer);
    const amount = socket?.bufferedAmount ?? 0;
    buffered.set(amount);
    if (amount > 0) bufferTimer = setTimeout(trackBuffer, BUFFER_POLL_MS);
  };

  const transmit = (frame: SendData) => {
    socket!.send(frame);
    trackBuffer();
  };

  const discardQueue = () => {
    if (!queue.length) return;
    const lost = queue.splice(0).map((entry) => entry.message);
    emit('discard', lost);
  };

  /** A socket that is gone: reconnect when the policy allows, else stop. */
  const lost = (close: CloseInfo) => {
    clearTimers();
    socket = undefined;
    patchInfo({ closeCode: close.code, closeReason: close.reason });
    const retry = policy && !disposed && policy.when(close);
    if (retry && failures < policy.attempts) {
      const delay = backoff(policy, failures);
      failures += 1;
      patchInfo({ attempt: failures });
      status.set('reconnecting');
      emit('close', close);
      retryTimer = setTimeout(open, delay);
      return;
    }
    status.set('closed');
    if (retry) fail('reconnect-exhausted', `Gave up after ${failures} attempts`);
    discardQueue();
    emit('close', close);
  };

  /** Lets go of the socket at once instead of waiting for a closing handshake that may never come. */
  const drop = (code: number, reason: string) => {
    const current = socket;
    generation += 1;
    if (current) {
      current.onopen = current.onmessage = current.onerror = current.onclose = null;
      try {
        current.close(code, reason);
      } catch {
        // Closing a socket that never opened can throw in some runtimes; it is gone either way.
      }
    }
    lost({ code, reason, wasClean: false });
  };

  const open = async () => {
    retryTimer = undefined;
    const attempt = ++generation;
    status.set('connecting');
    let address: string;
    try {
      address = typeof url === 'function' ? await url() : url;
    } catch (cause) {
      if (attempt !== generation) return;
      fail('connect-failed', 'Could not get the connection address', cause);
      return lost({ code: 1006, reason: '', wasClean: false });
    }
    if (attempt !== generation) return;
    patchInfo({ url: address });

    let next: WebSocketLike;
    try {
      next = transport!(address, options.protocols);
    } catch (cause) {
      // An address the transport refuses outright (bad scheme, malformed) will not get better.
      fail('connect-failed', `Could not open ${address}`, cause);
      status.set('closed');
      discardQueue();
      return;
    }
    socket = next;
    next.binaryType = options.binaryType ?? 'arraybuffer';
    connectTimer = setTimeout(() => {
      fail('connect-timeout', `Not open after ${connectTimeout} ms`);
      drop(CLOSE_TIMEOUT, 'connect timeout');
    }, connectTimeout);

    next.onopen = () => {
      if (attempt !== generation) return;
      clearTimeout(connectTimer);
      failures = 0;
      batch(() => {
        error.set(undefined);
        patchInfo({ protocol: next.protocol, attempt: 0, closeCode: undefined, closeReason: undefined });
        status.set('open');
      });
      for (const entry of queue.splice(0)) transmit(entry.frame);
      if (options.heartbeat) {
        const { interval, message } = options.heartbeat;
        if (message !== undefined) beatTimer = setInterval(() => socket && transmit(serializer.encode(message)), interval);
        watchSilence();
      }
      emit('open');
    };
    next.onmessage = (event) => {
      if (attempt !== generation) return;
      watchSilence();
      const frame = event.data as RawData;
      if (byteSize(frame) > maxMessageSize) {
        fail('message-too-large', `Received a message over ${maxMessageSize} bytes`);
        return drop(CLOSE_TOO_LARGE, 'message too large');
      }
      let message: In;
      try {
        message = serializer.decode(frame);
      } catch (cause) {
        return fail('decode-failed', 'Could not decode a message', cause);
      }
      if (keepLatest) data.set(() => message);
      for (const subscriber of [...subscribers]) call(subscriber, [message]);
    };
    // The browser says nothing about why; the close event that follows carries the code.
    next.onerror = () => attempt === generation && fail('connection-error', 'The connection failed');
    next.onclose = (close) => {
      if (attempt !== generation) return;
      lost({ code: close.code, reason: close.reason, wasClean: close.wasClean });
    };
  };

  const connection: WebSocketConnection<In, Out> = {
    status,
    connected: () => status() === 'open',
    data,
    error,
    info,
    buffered,
    connect() {
      autoConnect = false;
      if (disposed || !transport) return;
      // Commands read the state without tracking it: called from an effect, they must not make
      // it run again on every status change.
      const now = untrack(status);
      if (now === 'open' || now === 'connecting') return;
      if (now === 'closing') drop(1000, '');
      clearTimeout(retryTimer);
      failures = 0;
      void open();
    },
    send(message) {
      const now = untrack(status);
      if (disposed || (now === 'idle' && !autoConnect) || now === 'closing' || now === 'closed') return 'closed';
      const frame = serializer.encode(message);
      if (byteSize(frame) > maxMessageSize) return 'too-large';
      if (now === 'open') {
        transmit(frame);
        return 'sent';
      }
      if (queue.length >= queueLimit) return 'queue-full';
      queue.push({ message, frame });
      return 'queued';
    },
    subscribe(handler) {
      subscribers.add(handler);
      const stop = () => void subscribers.delete(handler);
      if (getOwner()) onCleanup(stop);
      return stop;
    },
    on(event, handler) {
      const set = listeners[event] as Set<typeof handler>;
      set.add(handler);
      const stop = () => void set.delete(handler);
      if (getOwner()) onCleanup(stop);
      return stop;
    },
    close(code = 1000, reason = '') {
      autoConnect = false;
      clearTimeout(retryTimer);
      retryTimer = undefined;
      const current = socket;
      generation += 1;
      clearTimers();
      if (!current) {
        if (untrack(status) !== 'idle') status.set('closed');
        discardQueue();
        return;
      }
      status.set('closing');
      current.onopen = current.onmessage = current.onerror = null;
      current.onclose = (close) => {
        socket = undefined;
        patchInfo({ closeCode: close.code, closeReason: close.reason });
        status.set('closed');
        emit('close', close);
      };
      discardQueue();
      current.close(code, reason);
    },
    dispose() {
      if (disposed) return;
      connection.close();
      disposed = true;
      subscribers.clear();
      for (const set of Object.values(listeners)) set.clear();
    },
  };

  if (getOwner()) onCleanup(() => connection.dispose());
  if (autoConnect) queueMicrotask(() => autoConnect && connection.connect());
  return connection;
}

function reconnectPolicy(option: ReconnectPolicy | boolean | undefined): Required<ReconnectPolicy> | undefined {
  if (option === false) return undefined;
  const given = option === true || option === undefined ? {} : option;
  return {
    attempts: given.attempts ?? Infinity,
    delay: given.delay ?? 500,
    maxDelay: given.maxDelay ?? 30_000,
    factor: given.factor ?? 2,
    jitter: given.jitter ?? true,
    when: given.when ?? ((close) => !NO_RECONNECT_CODES.has(close.code)),
  };
}

/** The wait before attempt `failures + 1`. */
export function backoff(policy: Required<ReconnectPolicy>, failures: number): number {
  const full = Math.min(policy.maxDelay, policy.delay * policy.factor ** failures);
  return policy.jitter ? full / 2 + Math.random() * (full / 2) : full;
}

/** One handler failing must not stop the others: its error is reported on its own. */
function call(handler: (...args: never[]) => void, args: unknown[]): void {
  try {
    (handler as (...a: unknown[]) => void)(...args);
  } catch (failure) {
    queueMicrotask(() => {
      throw failure;
    });
  }
}
