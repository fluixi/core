# @fluixi/realtime

A WebSocket client whose state is signals: status, last message, last error. It reconnects
with backoff, queues what you send while it connects, encodes messages the way you choose,
and opens nothing during server rendering.

```ts
import { createWebSocket, json } from '@fluixi/realtime';

const live = createWebSocket('/live', { serializer: json<Incoming, Outgoing>() });

live.status();                            // 'connecting', then 'open'
live.send({ type: 'watch', id: 'p-12' }); // 'queued' until open, then 'sent'
live.subscribe((message) => refresh(message));
```

- Created in a component, the connection closes with it; created in a module, it is shared
  and `subscribe` and `on` end with the component that called them.
- `send` returns what happened (`sent`, `queued`, `queue-full`, `too-large`, `closed`); a
  message is never dropped quietly.
- Text and binary frames, raw by default, `json()` or your own serializer.
- Reconnection, connect timeout, heartbeat by silence, size and queue limits.
- Depends on `@fluixi/reactive` only; works outside Fluixi components too.

Docs: [Realtime](https://docs.fluixi.com/v1/en/realtime).
