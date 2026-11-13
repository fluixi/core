---
"@fluixi/realtime": minor
---

`createWebSocketServer` and `createChannelServer` now accept a `maxAge` option that closes a connection with `CLOSE_REAUTHENTICATE` (4100) after the specified time, causing the client to reconnect and run `authenticate` again.
