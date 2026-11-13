---
"@fluixi/realtime": minor
---

New entry `@fluixi/realtime/server`: `createWebSocketServer({ path, authenticate, origins, onConnection, maxConnections, maxMessageSize, maxBuffered, pingInterval, keepAlive })` creates a WebSocket server on the app's host that checks origins, returns 401 when `authenticate` is null, 403 for invalid origins, 503 when exceeding `maxConnections` or during shutdown, closes oversized messages with code 1009, sends protocol pings to drop silent connections, uses `keepAlive` to send a text heartbeat, and provides `on('message')` with text strings and binary bytes while `close()` sends code 1001 and terminates after a timeout.
