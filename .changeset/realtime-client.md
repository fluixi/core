---
"@fluixi/realtime": minor
---

New package. `createWebSocket(url, options)` returns signals `status`, `connected`, `data`, `error`, `info`, `buffered` and provides methods `send`, `subscribe`, `on`, `connect`, `close`, and `dispose` with reconnection backoff, timeout, heartbeat, queue limits and customizable serializers. Nothing connects during server rendering.
