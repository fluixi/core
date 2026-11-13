---
"@fluixi/start": minor
---

New: `forwardUpgrade({ to, prefix })` from `@fluixi/start/server` pipes WebSocket upgrades under the specified prefix (default `/api`) to the target origin, setting the host to the target and forwarding the caller's IP via `x-forwarded-for`, while forwarding refusals, returning a 502 when unreachable, and closing both sides when either ends.
