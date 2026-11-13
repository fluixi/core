# Realtime

A WebSocket connection whose state is signals: what it is doing, the last message, the last
error. It reconnects on its own, holds what you send until it can go out, and opens nothing
during server rendering.

```ts
import { createWebSocket, json } from '@fluixi/realtime';

type Incoming = { type: 'task.changed'; id: string };
type Outgoing = { type: 'watch'; project: string };

const live = createWebSocket('/live', { serializer: json<Incoming, Outgoing>() });

live.status();                                  // 'connecting', then 'open'
live.send({ type: 'watch', project: 'p-12' });  // 'queued' until open, then 'sent'
live.subscribe((message) => refresh(message.id));
```

`@fluixi/realtime` depends on `@fluixi/reactive` only. Its signals are plain functions and
`subscribe` takes a callback, so it works outside Fluixi components too.

## Reading the connection

| Read | Holds |
|---|---|
| `status()` | `idle`, `connecting`, `open`, `reconnecting`, `closing` or `closed` |
| `connected()` | `status() === 'open'` |
| `data()` | the last message, decoded |
| `error()` | the last `RealtimeError`, cleared when the connection opens |
| `info()` | `url`, the `protocol` the server chose, failed `attempt`s, `closeCode`, `closeReason` |
| `buffered()` | bytes the browser still holds after the last send |

`idle` means it never connected, which is also what it stays on the server. `reconnecting`
means it is waiting before the next attempt. `closed` is final until you call `connect()`:
after `close()`, after a close the policy does not retry, or out of attempts.

```tsx
<Show when={live.connected()} fallback={<span>Reconnecting</span>}>
  <LiveBoard />
</Show>
```

## Messages

`data()` keeps one message, the last. Reading it in a template shows the latest state;
it never grows. For a stream where every message matters, use `subscribe`, and turn
`keepLatest` off if nothing reads `data()`:

```ts
const ticks = createWebSocket('/ticks', { keepLatest: false });
ticks.subscribe((frame) => chart.push(frame));
```

Every subscriber gets every message. A subscriber that throws does not stop the others; its
error is reported on its own.

Without a serializer, frames pass as they are: text as strings, binary as `ArrayBuffer`
(`binaryType: 'blob'` for `Blob`). `json()` encodes and decodes JSON on text frames. Your own
serializer is two functions:

```ts
const msgpack = {
  encode: (message: Outgoing) => encode(message),               // string, ArrayBuffer, view or Blob
  decode: (frame: RawData) => decode(frame as ArrayBuffer) as Incoming,
};
```

A frame the serializer cannot decode sets `error()` to `decode-failed` and is skipped; the
connection stays open.

## Sending

`send` says what happened to the message:

| Result | Meaning |
|---|---|
| `sent` | the browser took it |
| `queued` | the connection is opening or waiting to reconnect; it goes out once open, in order |
| `queue-full` | `queueLimit` messages already wait (100 by default, 0 queues nothing) |
| `too-large` | over `maxMessageSize` once encoded (1 MiB by default) |
| `closed` | idle, closing or closed: nothing will send it |

`sent` means the browser accepted the frame, not that the server received it. The browser
gives no backpressure: `buffered()` reads how much it still holds, after each send and then
every 100 ms until it reaches zero. Slow down when it grows.

When the connection closes for good with messages still queued, the `discard` event hands
them back:

```ts
live.on('discard', (messages) => saveForLater(messages));
```

## Reconnecting

A lost connection comes back with growing waits: 500 ms, then doubling up to 30 s, each
spread over its upper half so clients cut off together do not return together. A close with
1000 (normal) or 1008 (policy violation, what a server answers someone who may not connect)
is not retried.

```ts
createWebSocket('/live', {
  reconnect: { attempts: 10, delay: 1000, maxDelay: 60_000, when: (close) => close.code !== 4401 },
  connectTimeout: 5000, // an attempt not open by then is dropped and retried
});
```

`reconnect: false` turns it off. Out of attempts, `status()` is `closed` and `error()` is
`reconnect-exhausted`.

### Detecting a dead connection

A connection can die without a close: a laptop asleep, a proxy dropping idle sockets. The
browser cannot send WebSocket pings, so silence is the sign:

```ts
createWebSocket('/live', { heartbeat: { interval: 25_000, message: { type: 'ping' }, timeout: 60_000 } });
```

`message` goes out every `interval`. No frame received within `timeout` drops the socket and
reconnects. The server must send something at least that often, a reply to the ping or its
own heartbeat.

## Who owns a connection

Created inside a component, a connection belongs to it and closes when the component goes:

```tsx
function Ticker() {
  const ticks = createWebSocket('/ticks');
  return <p>{String(ticks.data() ?? '')}</p>;
}
```

Created outside any component, in a module or a service, it is shared and lives until
`dispose()`. Components consume it with `subscribe` and `on`, which end with the component
and leave the connection open for the others:

```ts
// src/data/live.ts
export const live = createWebSocket('/live', { serializer: json<Incoming, Outgoing>() });
```

```tsx
function TaskList() {
  live.subscribe((message) => message.type === 'task.changed' && tasks.refetch());
  return <For each={tasks()}>{(task) => <TaskRow task={task} />}</For>;
}
```

`close()` stops without reconnecting and `connect()` opens again; `dispose()` closes for good
and drops every subscriber. `connect: false` creates the connection without opening it;
`connect()` opens it at once.

## Server rendering

Without a `document` nothing connects, even though Node 22 has a `WebSocket`: a module or a
component evaluated on the server leaves the connection `idle`, `connect()` does nothing and
`send` answers `closed`. In the browser the first attempt starts once the running task ends:
hydration still reads `idle`, so a component that shows the status hydrates the text the
server sent, then updates as the connection opens. Messages sent before that are queued.
Hydration runs a component once, so it opens one connection, and a shared one created in a
module opens once per page.

To use the client in Node or in tests, pass `transport`: `globalTransport()` for the
runtime's own `WebSocket`, or anything that implements `WebSocketLike`.

## Signing in

The browser's `WebSocket` sends no custom headers, so a bearer token cannot go in an
`Authorization` header. Two ways work:

- **The session cookie.** A socket on the same site carries the cookie, and the server reads
  the session from the upgrade request like any other request. The server must check the
  `Origin` header: without that check, another site can open a socket that carries your
  user's cookie.
- **A short-lived ticket** when the socket is on another domain. Fetch a single-use ticket
  over an authenticated request; the address function runs before every attempt, so each
  reconnect gets a fresh one:

```ts
createWebSocket(async () => {
  const { ticket } = await api.post('/api/realtime/ticket');
  return `wss://live.example.test/?ticket=${ticket}`;
});
```

Never put a long-lived token in the address: addresses end up in server and proxy logs.

## The server side

`@fluixi/realtime/server` is the endpoint, on the `ws` library (an optional peer: install it
in the app that serves sockets). It plugs into the server module:

```ts
// src/server.ts
import { defineServer } from '@fluixi/start/server';
import { createWebSocketServer } from '@fluixi/realtime/server';

const live = createWebSocketServer({
  path: '/live',
  authenticate: (request) => sessionFromCookie(request.headers.cookie), // null answers 401
  onConnection(connection) {
    connection.on('message', (data) => connection.send(data));
  },
});

export default defineServer({ upgrade: live.upgrade, shutdown: () => live.close() });
```

- **Origin.** A browser page from another site is refused with 403 before `authenticate`
  runs. By default only pages from the request's own host may connect; `origins` takes a
  list or a function. A client that sends no `Origin` is not a browser page and goes on to
  `authenticate`.
- **Limits.** `maxConnections` (10000, then 503), `maxMessageSize` (1 MiB, then close with
  1009), `maxBuffered` (4 MiB unsent, then `send` answers `buffer-full`).
- **Dead connections.** A protocol ping every `pingInterval` (25 s); a connection that missed
  the previous one is dropped. Pings are invisible to browser code, so `keepAlive` sends a
  text frame on the same beat for clients with a `heartbeat` timeout.
- **Shutdown.** `close()` refuses new connections, closes open ones with 1001 (the client
  reconnects to another instance), and drops what is left after 5 s.

Text frames reach `on('message')` as strings, binary ones as bytes. `send` answers `sent`,
`buffer-full` or `closed`.

## Channels

Most apps want named streams, not a raw socket: "changes to this organisation's tasks". The
channel server and client add that on top, with an access check per channel and catch-up after
a reconnect.

```ts
// src/server.ts
import { defineServer } from '@fluixi/start/server';
import { createChannelServer, postgresBus } from '@fluixi/realtime/server';

export const channels = createChannelServer({
  path: '/live',
  authenticate: (request) => sessionFromCookie(request.headers.cookie),
  authorize: (user, channel) => user.organizations.includes(channel.split(':')[1]),
  replay: (channel, since) => events.after(channel, since), // null when it cannot: clients resync
  bus: postgresBus({ listen: pgListenClient }),
});

export default defineServer({ start: channels.start, upgrade: channels.upgrade, shutdown: () => channels.close() });

// wherever a change is saved
await channels.publish(`org:${orgId}`, { id: String(event.sequence), type: 'task.changed', data: { id: task.id } });
```

```ts
// in the browser
import { createChannelClient } from '@fluixi/realtime';

export const live = createChannelClient('/live');

function TaskList() {
  live.subscribe(`org:${orgId}`, (message) => message.type === 'task.changed' && tasks.refetch(), {
    onResync: () => tasks.refetch(),
  });
  // ...
}
```

- **Joining.** The first subscriber to a channel joins it, the last to stop leaves it, and a
  subscription made in a component stops with it. `authorize` runs on every join; a refusal
  calls `onDenied`. One connection joins 100 channels at most (`maxChannels`).
- **Catching up.** Every message carries an `id` the app orders. After a reconnect the client
  rejoins with the last id it saw, and `replay` returns what came after it. Messages published
  while the replay runs are held and sent after it, without duplicates. Without `replay`, or
  when it returns null, the client gets `onResync`: refetch what the channel feeds.
- **Several servers.** `publish` goes through the bus, so every instance delivers it.
  `memoryBus()` is the default for one process; `postgresBus` uses `LISTEN`/`NOTIFY` on a
  direct connection (a pooler in transaction mode drops `LISTEN`). Postgres refuses payloads
  of 8000 bytes or more: publish ids and let the page fetch the record through the API, which
  checks access again.
- **Protocol.** JSON frames: `join`, `leave` from the client; `msg`, `joined`, `denied`,
  `resync`, `ping` from the server. Anything else from a client closes it with 1008. The
  server sends `ping` on every protocol ping, and the client treats 60 s of silence as a dead
  connection (`silenceTimeout`).

## Errors

`error()` and the `error` event carry a `RealtimeError` with a `code`:

| Code | When |
|---|---|
| `connect-failed` | the address function threw, or the transport refused the address |
| `connect-timeout` | not open within `connectTimeout` |
| `connection-error` | the browser reported a failure; the close that follows has the code |
| `heartbeat-timeout` | no frame within `heartbeat.timeout` |
| `message-too-large` | a frame over `maxMessageSize` arrived; closed with 1009 |
| `decode-failed` | the serializer threw on a frame |
| `reconnect-exhausted` | out of attempts |
