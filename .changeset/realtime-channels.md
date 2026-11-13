---
"@fluixi/realtime": minor
---

New: `createChannelClient` creates a client that subscribes to a channel with a handler and `onResync` and `onDenied` callbacks, automatically rejoining with the last ID after a reconnect, and `createChannelServer` creates a server with `authorize`, `replay`, `bus`, `maxChannels`, and endpoint options, offering `start`, `publish`, `upgrade`, and `close` methods, while `memoryBus` and `postgresBus` provide bus implementations for messaging.
