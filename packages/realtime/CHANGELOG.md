# @fluixi/realtime

## 1.0.0-alpha.111

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.111

## 1.0.0-alpha.110

### Patch Changes

- Updated dependencies [92ab3a4]
- Updated dependencies [454e933]
- Updated dependencies [092d4aa]
- Updated dependencies [efae582]
- Updated dependencies [6146dbb]
  - @fluixi/reactive@1.0.0-alpha.110

## 1.0.0-alpha.109

### Minor Changes

- 29bc686: `postgresBus.listen` now accepts a function that creates a client, automatically reconnects with exponential back-off and reports `onGap` when listening resumes, and the channel server sends a resync to every member on a gap and a server connection's `drained()` settles once its unsent bytes fall to a bound.
- 442f5de: New: `createChannelClient` creates a client that subscribes to a channel with a handler and `onResync` and `onDenied` callbacks, automatically rejoining with the last ID after a reconnect, and `createChannelServer` creates a server with `authorize`, `replay`, `bus`, `maxChannels`, and endpoint options, offering `start`, `publish`, `upgrade`, and `close` methods, while `memoryBus` and `postgresBus` provide bus implementations for messaging.
- 2b627f6: New package. `createWebSocket(url, options)` returns signals `status`, `connected`, `data`, `error`, `info`, `buffered` and provides methods `send`, `subscribe`, `on`, `connect`, `close`, and `dispose` with reconnection backoff, timeout, heartbeat, queue limits and customizable serializers. Nothing connects during server rendering.
- 7d613a2: `createWebSocketServer` and `createChannelServer` now accept a `maxAge` option that closes a connection with `CLOSE_REAUTHENTICATE` (4100) after the specified time, causing the client to reconnect and run `authenticate` again.
- 76bd5a4: New entry `@fluixi/realtime/server`: `createWebSocketServer({ path, authenticate, origins, onConnection, maxConnections, maxMessageSize, maxBuffered, pingInterval, keepAlive })` creates a WebSocket server on the app's host that checks origins, returns 401 when `authenticate` is null, 403 for invalid origins, 503 when exceeding `maxConnections` or during shutdown, closes oversized messages with code 1009, sends protocol pings to drop silent connections, uses `keepAlive` to send a text heartbeat, and provides `on('message')` with text strings and binary bytes while `close()` sends code 1001 and terminates after a timeout.

### Patch Changes

- c530572: The library now builds with mix-builder 0.4.3, sharing chunks across ES module entries so each module and its state appears only once and the published ES module files are 50-80 % smaller, with CDN globals using a single copy of the signal graph.
- c6a0192: An effect that calls `connect`, `send`, `close` or subscribes to a channel no longer re-runs on each connection status change.
- Updated dependencies [c530572]
- Updated dependencies [1c9e2d6]
- Updated dependencies [7bac1da]
- Updated dependencies [6da921b]
  - @fluixi/reactive@1.0.0-alpha.109
